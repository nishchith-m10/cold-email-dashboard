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

// Orchestrator + integration imports (lazy)
import { IgnitionOrchestrator, MockDropletFactory, MockSidecarClient, MockWorkflowDeployer } from '@/lib/genesis/ignition-orchestrator';
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
 */
function buildOrchestrator() {
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

  // Droplet factory — mock for now (real requires DO API token)
  const dropletFactory = new MockDropletFactory();

  // Sidecar client — mock for now (real requires workspace/droplet context)
  const sidecarClient = new MockSidecarClient();

  // Workflow deployer — mock for now (no real n8n API client yet)
  const workflowDeployer = new MockWorkflowDeployer();

  return new IgnitionOrchestrator(
    stateDB,
    credentialVault,
    partitionManager,
    dropletFactory,
    sidecarClient,
    workflowDeployer,
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

    // 6. Build orchestrator & ignite
    const orchestrator = buildOrchestrator();
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
