/**
 * DOMAIN 6, TASK 6.3.1: Onboarding Launch API
 *
 * POST /api/onboarding/launch
 *
 * TWO-PHASE IGNITION (designed for Vercel serverless ≤60 s):
 *
 *   Phase 1  (this endpoint, phase=1 or default):
 *     validate → manifest → partition → droplet + IP → save state → return
 *     Completes in ~30-40 s.
 *
 *   Phase 2  (this endpoint, phase=2):
 *     load state → quick sidecar health check → inject credentials →
 *     deploy workflows → activate → return
 *     Completes in ~30-40 s.
 *
 *   The frontend polls /api/onboarding/ignition-status between phases
 *   and triggers Phase 2 when the sidecar is ready.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canAccessWorkspace } from '@/lib/api-workspace-guard';
import { EncryptionService } from '@/lib/genesis/phase64/credential-vault-service';
import { IgnitionConfigAssembler } from '@/lib/genesis/ignition-config-assembler';
import { buildManifestFromOnboarding, persistManifest, ManifestValidationError } from '@/lib/genesis/workspace-manifest';
import { IgnitionOrchestrator, HttpWorkflowDeployer } from '@/lib/genesis/ignition-orchestrator';
import { DropletFactoryAdapter, DeferredHttpSidecarClient } from '@/lib/genesis/integration-adapters';
import { SupabaseIgnitionStateDB } from '@/lib/genesis/supabase-ignition-state-db';
import { SupabasePartitionManager } from '@/lib/genesis/supabase-partition-manager';
import { CredentialVault } from '@/lib/genesis/credential-vault';

export const maxDuration = 60;

// ============================================
// LAZY SERVICE INITIALISATION
// ============================================

let assembler: IgnitionConfigAssembler | null = null;

function getAssembler(): IgnitionConfigAssembler | { error: string } {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || process.env.CREDENTIAL_MASTER_KEY;
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

function checkRequiredEnvVars(): string[] {
  const required: Array<{ key: string; label: string }> = [
    { key: 'INTERNAL_ENCRYPTION_KEY', label: 'Internal encryption key' },
    { key: 'GENESIS_JWT_PRIVATE_KEY', label: 'JWT private key' },
    { key: 'CREDENTIAL_MASTER_KEY', label: 'Credential master key' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role key' },
    { key: 'GHCR_READ_TOKEN', label: 'GHCR read token' },
    { key: 'GENESIS_JWT_PUBLIC_KEY', label: 'JWT public key' },
  ];

  return required
    .filter(({ key }) => !process.env[key])
    .map(({ key, label }) => `${key}: ${label}`);
}

function buildOrchestrator(workspaceId: string, dropletId?: string) {
  const masterKey = process.env.CREDENTIAL_MASTER_KEY!;
  const admin = supabaseAdmin!;

  const stateDB = new SupabaseIgnitionStateDB();
  const partitionManager = new SupabasePartitionManager();

  const credentialVault = new CredentialVault(masterKey, {
    insert: async (record) => {
      const { data } = await admin
        .schema('genesis').from('workspace_credentials' as any)
        .insert(record as any)
        .select('id')
        .single();
      return { id: (data as any)?.id || 'unknown' };
    },
    update: async (id, updates) => {
      await admin.schema('genesis').from('workspace_credentials' as any).update(updates as any).eq('id', id);
    },
    select: async (workspace_id) => {
      const { data } = await admin
        .schema('genesis').from('workspace_credentials' as any)
        .select('*')
        .eq('workspace_id', workspace_id);
      return (data as any[]) || [];
    },
    selectOne: async (id) => {
      const { data } = await admin
        .schema('genesis').from('workspace_credentials' as any)
        .select('*')
        .eq('id', id)
        .single();
      return data as any;
    },
    delete: async (id) => {
      await admin.schema('genesis').from('workspace_credentials' as any).delete().eq('id', id);
    },
    logAction: async (record) => {
      await admin.schema('genesis').from('credential_audit_log' as any).insert(record as any).select();
    },
  });

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
// POST — Launch ignition (Phase 1 or Phase 2)
// ============================================

export async function POST(req: NextRequest) {
  try {
    // ── Pre-flight: env vars FIRST (before anything touches supabaseAdmin) ──
    const missingVars = checkRequiredEnvVars();
    if (missingVars.length > 0) {
      console.error('[Launch] Missing required env vars:', missingVars);
      return NextResponse.json(
        { error: 'Infrastructure not fully configured', missing: missingVars },
        { status: 503 },
      );
    }

    // ── Auth ──
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { workspaceId, phase = 1 } = body;
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const access = await canAccessWorkspace(userId, workspaceId, req.url);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (phase === 2) {
      return handlePhase2(workspaceId, userId, body);
    }

    return handlePhase1(workspaceId, userId);
  } catch (error) {
    console.error('Onboarding launch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// ============================================
// PHASE 1: Validate → Partition → Droplet
// ============================================

async function handlePhase1(workspaceId: string, userId: string) {
  // Fast-path: if Phase 1 already completed, skip re-validation and go to polling
  const existingStateDB = new SupabaseIgnitionStateDB();
  const existingState = await existingStateDB.load(workspaceId);
  if (existingState) {
    if (existingState.status === 'active') {
      return NextResponse.json({
        success: true,
        status: 'active',
        phase: 1,
        workspace_id: workspaceId,
        droplet_ip: existingState.droplet_ip,
      });
    }
    const resumableStatuses = ['handshake_pending', 'credentials_injecting', 'workflows_deploying'];
    const canResume = resumableStatuses.includes(existingState.status)
      || (existingState.status === 'failed' && existingState.droplet_ip && existingState.droplet_id);

    if (canResume) {
      // Reset failed state so Phase 2 can proceed
      if (existingState.status === 'failed') {
        await existingStateDB.save({
          ...existingState,
          status: 'handshake_pending',
          error_message: undefined as any,
          error_step: undefined as any,
          error_stack: undefined as any,
          current_step: 3,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'handshake_pending',
        phase: 1,
        workspace_id: workspaceId,
        droplet_id: existingState.droplet_id,
        droplet_ip: existingState.droplet_ip,
        partition_name: existingState.partition_name,
        polling: true,
      });
    }
  }

  // 1. Init assembler
  const asm = getAssembler();
  if ('error' in asm) {
    return NextResponse.json({ error: asm.error }, { status: 500 });
  }

  // 2. Verify all stages complete
  const stageCheck = await asm.areAllStagesComplete(workspaceId);
  if (!stageCheck.complete) {
    return NextResponse.json(
      { error: 'Not all onboarding stages are complete', missingStages: stageCheck.missingStages },
      { status: 400 },
    );
  }

  // 3. Assemble config
  let config;
  try {
    config = await asm.assemble(workspaceId, userId);
  } catch (assembleErr: any) {
    return NextResponse.json(
      { error: assembleErr.message || 'Failed to assemble ignition config' },
      { status: 400 },
    );
  }

  // 4. Build + validate + persist WorkspaceManifest
  try {
    const draft = await buildManifestFromOnboarding(supabaseAdmin!, workspaceId, 'global');
    const lockedManifest = await persistManifest(supabaseAdmin!, draft);
    config = { ...config, manifest: lockedManifest };
  } catch (manifestErr: any) {
    if (manifestErr instanceof ManifestValidationError) {
      return NextResponse.json(
        { error: 'Workspace manifest validation failed', field_errors: manifestErr.fieldErrors },
        { status: 422 },
      );
    }
    console.error('[Launch] Manifest build failed:', manifestErr);
    return NextResponse.json(
      { error: manifestErr.message || 'Failed to build workspace manifest' },
      { status: 500 },
    );
  }

  // 5. Run Phase 1 of ignition (partition + droplet only)
  const orchestrator = buildOrchestrator(workspaceId);
  const result = await orchestrator.ignitePhase1(config);

  if (!result.success) {
    return NextResponse.json({
      success: false,
      status: 'failed',
      error: result.error,
      phase: 1,
    });
  }

  return NextResponse.json({
    success: true,
    status: result.status,
    phase: 1,
    workspace_id: workspaceId,
    droplet_id: result.droplet_id,
    droplet_ip: result.droplet_ip,
    partition_name: result.partition_name,
    polling: true,
  });
}

// ============================================
// PHASE 2: Sidecar check → Credentials → Workflows
// ============================================

async function handlePhase2(workspaceId: string, userId: string, body: any) {
  const stateDB = new SupabaseIgnitionStateDB();
  const state = await stateDB.load(workspaceId);

  if (!state) {
    return NextResponse.json({ error: 'No ignition state found — run Phase 1 first' }, { status: 400 });
  }

  if (state.status === 'active') {
    return NextResponse.json({
      success: true,
      status: 'active',
      phase: 2,
      workspace_id: workspaceId,
      droplet_ip: state.droplet_ip,
      workflow_ids: state.workflow_ids,
    });
  }

  // Only proceed if Phase 1 completed (handshake_pending = droplet is ready, waiting for sidecar)
  if (state.status !== 'handshake_pending' && state.status !== 'credentials_injecting') {
    return NextResponse.json({
      success: false,
      status: state.status,
      phase: 2,
      error: `Cannot continue — current status is '${state.status}'`,
    });
  }

  // Quick sidecar/n8n health check
  const dropletIp = state.droplet_ip;
  if (!dropletIp) {
    return NextResponse.json({ success: false, status: 'waiting_for_sidecar', sidecar_ready: false });
  }

  let sidecarHealthy = false;
  let n8nBootstrapped = false;

  // Attempt 1: Direct sidecar port 3100 — also check n8n_bootstrapped flag
  try {
    const c1 = new AbortController();
    const t1 = setTimeout(() => c1.abort(), 8000);
    const r1 = await fetch(`http://${dropletIp}:3100/health`, { signal: c1.signal });
    clearTimeout(t1);
    const b1 = await r1.json();
    if (b1.status === 'ok') {
      sidecarHealthy = true;
      n8nBootstrapped = b1.n8n_bootstrapped === true;
    }
  } catch {
    // Port 3100 may not be reachable from Vercel — try fallback
  }

  // Attempt 2: n8n via HTTPS on sslip.io (Caddy → n8n on 443)
  if (!sidecarHealthy) {
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 8000);
      const r2 = await fetch(`https://${dropletIp}.sslip.io/healthz`, {
        signal: c2.signal,
        headers: { 'User-Agent': 'Genesis-HealthCheck/1.0' },
      });
      clearTimeout(t2);
      if (r2.ok || r2.status === 200 || r2.status === 401 || r2.status === 302) {
        sidecarHealthy = true;
        // Can't check bootstrap status from n8n directly — assume not ready yet
        n8nBootstrapped = false;
      }
    } catch {
      // n8n not ready either
    }
  }

  if (!sidecarHealthy) {
    return NextResponse.json({ success: false, status: 'waiting_for_sidecar', sidecar_ready: false });
  }

  // If the sidecar is up but hasn't finished its n8n bootstrap yet, keep waiting
  if (!n8nBootstrapped) {
    return NextResponse.json({ success: false, status: 'waiting_for_sidecar', sidecar_ready: true, n8n_bootstrapped: false });
  }

  // ── Record n8n owner credentials from cloud-init (sidecar handles actual setup) ──
  const existingOwner = (state as any).n8n_owner_email;
  if (!existingOwner) {
    try {
      const { data: fleetRow } = await supabaseAdmin!
        .schema('genesis')
        .from('fleet_status' as any)
        .select('postgres_password')
        .eq('droplet_id', Number(state.droplet_id))
        .maybeSingle() as { data: any };

      const { data: wsRow } = await supabaseAdmin!
        .from('workspaces')
        .select('slug')
        .eq('id', workspaceId)
        .single() as { data: any };

      const workspaceSlug = wsRow?.slug || workspaceId.slice(0, 8);
      const n8nOwnerEmail = `admin@${workspaceSlug}.io`;
      const n8nOwnerPassword = fleetRow?.postgres_password;

      if (n8nOwnerPassword) {
        const encService = new EncryptionService(
          process.env.ENCRYPTION_MASTER_KEY || process.env.CREDENTIAL_MASTER_KEY || ''
        );
        const encryptedPassword = encService.encrypt(n8nOwnerPassword, workspaceId);

        await supabaseAdmin!
          .schema('genesis')
          .from('ignition_state' as any)
          .update({
            n8n_owner_email: n8nOwnerEmail,
            n8n_owner_password: encryptedPassword,
          } as any)
          .eq('workspace_id', workspaceId);

        console.log(`[Launch] n8n owner creds recorded for workspace ${workspaceId}`);
      }
    } catch (ownerErr) {
      console.warn('[Launch] Failed to record n8n owner creds (non-fatal):', ownerErr);
    }
  }

  // Sidecar is ready — reassemble config and run Phase 2
  const asm = getAssembler();
  if ('error' in asm) {
    return NextResponse.json({ error: asm.error }, { status: 500 });
  }

  let config;
  try {
    config = await (asm as IgnitionConfigAssembler).assemble(workspaceId, userId);
    // Re-attach manifest
    if (supabaseAdmin) {
      const { data: manifestRow } = await supabaseAdmin
        .schema('genesis')
        .from('workspace_manifests' as any)
        .select('manifest')
        .eq('workspace_id', workspaceId)
        .maybeSingle() as { data: any };
      if (manifestRow?.manifest) {
        config = { ...config, manifest: manifestRow.manifest };
      }
    }
  } catch (assembleErr: any) {
    return NextResponse.json(
      { error: assembleErr.message || 'Failed to reassemble config for Phase 2' },
      { status: 400 },
    );
  }

  const realDropletId = state.droplet_id || undefined;
  const orchestrator = buildOrchestrator(workspaceId, realDropletId);
  const result = await orchestrator.ignitePhase2(config, state);

  return NextResponse.json({
    success: result.success,
    status: result.success ? 'active' : 'failed',
    phase: 2,
    workspace_id: workspaceId,
    droplet_ip: result.droplet_ip,
    workflow_ids: result.workflow_ids,
    duration_ms: result.duration_ms,
    n8n_owner_email: existingOwner || (state as any).n8n_owner_email,
    error: result.error,
  });
}
