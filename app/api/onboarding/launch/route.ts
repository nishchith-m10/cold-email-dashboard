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
import { IgnitionOrchestrator, MockDropletFactory, MockSidecarClient, MockWorkflowDeployer, HttpWorkflowDeployer } from '@/lib/genesis/ignition-orchestrator';
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
 * Build the IgnitionOrchestrator wiring.
 *
 * Uses real implementations when env vars are present, otherwise falls back to
 * mocks so the launch flow can be tested end-to-end without DO credentials.
 *
 * Real implementations are wired when:
 *   - DO_API_TOKEN is set → real DropletFactoryAdapter (DigitalOcean API)
 *   - GENESIS_JWT_PRIVATE_KEY is set → real DeferredHttpSidecarClient + HttpWorkflowDeployer
 */
function buildOrchestrator(workspaceId?: string) {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || process.env.DASH_WEBHOOK_TOKEN || 'dev-master-key-32-chars-minimum!!';
  const admin = supabaseAdmin!;

  // State DB — always use Supabase (uses getTypedSupabaseAdmin internally)
  const stateDB = new SupabaseIgnitionStateDB();

  // Partition manager (uses getTypedSupabaseAdmin internally)
  const partitionManager = new SupabasePartitionManager();

  // Credential vault
  const credentialVault = new CredentialVault(masterKey, {
    insert: async (record) => {
      const { data } = await admin
        .from('genesis.credential_store' as any)
        .insert(record as any)
        .select('id')
        .single();
      return { id: (data as any)?.id || 'unknown' };
    },
    update: async (id, updates) => {
      await admin.from('genesis.credential_store' as any).update(updates as any).eq('id', id);
    },
    select: async (workspace_id) => {
      const { data } = await admin
        .from('genesis.credential_store' as any)
        .select('*')
        .eq('workspace_id', workspace_id);
      return (data as any[]) || [];
    },
    selectOne: async (id) => {
      const { data } = await admin
        .from('genesis.credential_store' as any)
        .select('*')
        .eq('id', id)
        .single();
      return data as any;
    },
    delete: async (id) => {
      await admin.from('genesis.credential_store' as any).delete().eq('id', id);
    },
    logAction: async (record) => {
      await admin.from('genesis.credential_audit_log' as any).insert(record as any).select();
    },
  });

  // Droplet factory — real when DO_API_TOKEN is present
  const hasDoToken = !!process.env.DO_API_TOKEN;
  const dropletFactory = hasDoToken
    ? new DropletFactoryAdapter()
    : new MockDropletFactory();

  if (hasDoToken) {
    console.log('[Launch] Using REAL DropletFactory (DO_API_TOKEN present)');
  } else {
    console.warn('[Launch] Using MockDropletFactory — set DO_API_TOKEN for real provisioning');
  }

  // Sidecar client — real when JWT private key is present
  const hasJwtKey = !!process.env.GENESIS_JWT_PRIVATE_KEY;
  const sidecarClient = hasJwtKey && workspaceId
    ? new DeferredHttpSidecarClient(workspaceId)
    : new MockSidecarClient();

  if (hasJwtKey) {
    console.log('[Launch] Using REAL HttpSidecarClient (GENESIS_JWT_PRIVATE_KEY present)');
  } else {
    console.warn('[Launch] Using MockSidecarClient — set GENESIS_JWT_PRIVATE_KEY for real sidecar comms');
  }

  // Workflow deployer — real when sidecar client is real (it just wraps sidecar)
  const workflowDeployer = hasJwtKey && workspaceId
    ? new HttpWorkflowDeployer(sidecarClient)
    : new MockWorkflowDeployer();

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

    // 6. Build orchestrator & ignite
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
