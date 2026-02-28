/**
 * DOMAIN 6, TASK 6.3.1: Onboarding Launch API
 *
 * POST /api/onboarding/launch
 *
 * Validates auth → verifies all onboarding stages complete →
 * assembles IgnitionConfig → calls IgnitionOrchestrator.ignite()
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canAccessWorkspace } from '@/lib/api-workspace-guard';
import { EncryptionService } from '@/lib/genesis/phase64/credential-vault-service';
import { IgnitionConfigAssembler } from '@/lib/genesis/ignition-config-assembler';
import { buildManifestFromOnboarding, persistManifest, ManifestValidationError } from '@/lib/genesis/workspace-manifest';

// Orchestrator + integration imports (lazy)
import { IgnitionOrchestrator, HttpWorkflowDeployer } from '@/lib/genesis/ignition-orchestrator';
import { DropletFactoryAdapter, DeferredHttpSidecarClient } from '@/lib/genesis/integration-adapters';
import { SupabaseIgnitionStateDB } from '@/lib/genesis/supabase-ignition-state-db';
import { SupabasePartitionManager } from '@/lib/genesis/supabase-partition-manager';
import { CredentialVault } from '@/lib/genesis/credential-vault';

// ============================================
// LAZY SERVICE INITIALISATION
// ============================================

let assembler: IgnitionConfigAssembler | null = null;

function getAssembler(): IgnitionConfigAssembler | { error: string } {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    return { error: 'ENCRYPTION_MASTER_KEY not configured' };
  }
  if (!assembler) {
    assembler = new IgnitionConfigAssembler({
      supabaseClient: supabaseAdmin!,
      encryptionService: new EncryptionService(masterKey),
    });
  }
  return assembler;
}

/**
 * Validate that all required infrastructure env vars are present.
 * Returns an array of missing var names — empty means all good.
 */
function checkRequiredEnvVars(): string[] {
  const required: Array<{ key: string; label: string }> = [
    { key: 'INTERNAL_ENCRYPTION_KEY', label: 'Internal encryption key — required for DO token decryption and credential operations' },
    { key: 'GENESIS_JWT_PRIVATE_KEY', label: 'JWT private key — required for sidecar communication' },
    { key: 'CREDENTIAL_MASTER_KEY', label: 'Credential master key — required for credential encryption' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL — required for database operations' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role key — required for admin operations' },
    { key: 'GHCR_READ_TOKEN', label: 'GitHub Container Registry read token — required for private sidecar image pull on droplets' },
  ];

  return required
    .filter(({ key }) => !process.env[key])
    .map(({ key, label }) => `${key}: ${label}`);
}

/**
 * Build the IgnitionOrchestrator wiring.
 *
 * All integrations use REAL implementations — no mock fallbacks.
 * If a required env var is missing, the caller should reject the request
 * via checkRequiredEnvVars() before reaching this function.
 */
function buildOrchestrator(workspaceId: string) {
  const masterKey = process.env.CREDENTIAL_MASTER_KEY!;
  const admin = supabaseAdmin!;

  // State DB — always use Supabase
  const stateDB = new SupabaseIgnitionStateDB();

  // Partition manager
  const partitionManager = new SupabasePartitionManager();

  // Credential vault
  const credentialVault = new CredentialVault(masterKey, {
    insert: async (record) => {
      const { data } = await admin
        .schema('genesis').from('credential_store' as any)
        .insert(record as any)
        .select('id')
        .single();
      return { id: (data as any)?.id || 'unknown' };
    },
    update: async (id, updates) => {
      await admin.schema('genesis').from('credential_store' as any).update(updates as any).eq('id', id);
    },
    select: async (workspace_id) => {
      const { data } = await admin
        .schema('genesis').from('credential_store' as any)
        .select('*')
        .eq('workspace_id', workspace_id);
      return (data as any[]) || [];
    },
    selectOne: async (id) => {
      const { data } = await admin
        .schema('genesis').from('credential_store' as any)
        .select('*')
        .eq('id', id)
        .single();
      return data as any;
    },
    delete: async (id) => {
      await admin.schema('genesis').from('credential_store' as any).delete().eq('id', id);
    },
    logAction: async (record) => {
      await admin.schema('genesis').from('credential_audit_log' as any).insert(record as any).select();
    },
  });

  // Real integrations — no fallbacks
  const dropletFactory = new DropletFactoryAdapter();
  const sidecarClient = new DeferredHttpSidecarClient(workspaceId);
  const workflowDeployer = new HttpWorkflowDeployer(sidecarClient);

  return new IgnitionOrchestrator(
    stateDB,
    credentialVault,
    partitionManager,
    dropletFactory,
    sidecarClient,
    workflowDeployer,
    { supabaseAdmin: supabaseAdmin! },
  );
}

// ============================================
// POST — Launch ignition
// ============================================

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await req.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // 2. Workspace access
    const access = await canAccessWorkspace(userId, workspaceId, req.url);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Init assembler
    const asm = getAssembler();
    if ('error' in asm) {
      return NextResponse.json({ error: asm.error }, { status: 500 });
    }

    // 4. Verify all stages complete
    const stageCheck = await asm.areAllStagesComplete(workspaceId);
    if (!stageCheck.complete) {
      return NextResponse.json(
        {
          error: 'Not all onboarding stages are complete',
          missingStages: stageCheck.missingStages,
        },
        { status: 400 },
      );
    }

    // 5. Assemble config
    let config;
    try {
      config = await asm.assemble(workspaceId, userId);
    } catch (assembleErr: any) {
      return NextResponse.json(
        { error: assembleErr.message || 'Failed to assemble ignition config' },
        { status: 400 },
      );
    }

    // 5.5 Build + validate + persist WorkspaceManifest (Flaw-3 fix)
    //     This guarantees sender_email, calendly_url, webhook_token, etc. are
    //     all present before the orchestrator touches the variable map.
    let lockedManifest;
    try {
      const draft = await buildManifestFromOnboarding(
        supabaseAdmin!,
        workspaceId,
        'global',  // operator provides AI/scraping keys
      );
      lockedManifest = await persistManifest(supabaseAdmin!, draft);
      // Attach to config so the orchestrator derives variables from it
      config = { ...config, manifest: lockedManifest };
    } catch (manifestErr: any) {
      if (manifestErr instanceof ManifestValidationError) {
        return NextResponse.json(
          {
            error: 'Workspace manifest validation failed',
            field_errors: manifestErr.fieldErrors,
          },
          { status: 422 },
        );
      }
      // Non-validation errors (DB read failures etc.): fail hard
      console.error('[Launch] Manifest build failed:', manifestErr);
      return NextResponse.json(
        { error: manifestErr.message || 'Failed to build workspace manifest' },
        { status: 500 },
      );
    }

    // 6. Pre-flight: verify all infrastructure env vars are set
    const missingVars = checkRequiredEnvVars();
    if (missingVars.length > 0) {
      console.error('[Launch] Missing required env vars:', missingVars);
      return NextResponse.json(
        {
          error: 'Infrastructure not fully configured — cannot launch ignition',
          missing: missingVars,
        },
        { status: 503 },
      );
    }

    // 7. Build orchestrator & ignite
    const orchestrator = buildOrchestrator(workspaceId);
    const result = await orchestrator.ignite(config);

    return NextResponse.json({
      success: result.success,
      workspace_id: result.workspace_id,
      status: result.success ? 'active' : 'failed',
      partition_name: result.partition_name,
      droplet_id: result.droplet_id,
      droplet_ip: result.droplet_ip,
      workflow_ids: result.workflow_ids,
      duration_ms: result.duration_ms,
      error: result.error,
    });
  } catch (error) {
    console.error('Onboarding launch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
