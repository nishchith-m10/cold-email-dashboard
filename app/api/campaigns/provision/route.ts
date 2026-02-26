import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getWorkspaceAccess } from '@/lib/workspace-access';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_STRICT } from '@/lib/rate-limit';
import { deployForCampaign } from '@/lib/genesis/campaign-workflow-deployer';
import { HttpWorkflowDeployer } from '@/lib/genesis/ignition-orchestrator';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

interface ProvisionRequest {
  name: string;
  description?: string;
  templateId?: string;
  workspaceId: string;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`campaign-provision:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  // Parse request body
  let body: ProvisionRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }

  const { name, description, templateId, workspaceId } = body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Campaign name is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  if (!workspaceId || typeof workspaceId !== 'string') {
    return NextResponse.json(
      { error: 'Workspace ID is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Check workspace write access
  const access = await getWorkspaceAccess(userId, workspaceId);
  if (!access?.canWrite) {
    return NextResponse.json(
      { error: 'You do not have permission to create campaigns in this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  // Generate provision tracking ID using native crypto
  const provisionId = crypto.randomUUID();
  const campaignId = crypto.randomUUID();

  try {
    // Step 1: Create campaign with provisioning status
    const { error: insertError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        id: campaignId,
        workspace_id: workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        status: 'paused', // Start paused until provisioning completes
        provision_id: provisionId,
        template_id: templateId || null,
        n8n_status: 'unknown',
        version: 1,
      });

    if (insertError) {
      console.error('Campaign insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Step 2: Create initial provisioning status entries
    const steps = ['db', 'n8n_clone', 'webhook', 'activate'];
    const statusEntries = steps.map((step, index) => ({
      provision_id: provisionId,
      campaign_id: campaignId,
      step,
      status: index === 0 ? 'done' : 'pending', // DB step is already done
    }));

    const { error: statusError } = await supabaseAdmin
      .from('provisioning_status')
      .insert(statusEntries);

    if (statusError) {
      console.error('Provisioning status insert error:', statusError);
      // Don't fail - campaign was created, status tracking is secondary
    }

    // Step 3 (D3-001): If the workspace has an active ignition, deploy
    // campaign-specific workflows in the background. Deployment errors are
    // logged but do NOT fail the provision response — the campaign row is
    // already persisted and the UI can show a "deploying" state.
    let deployResult: { success: boolean; workflow_ids?: string[]; error?: string } | null = null;

    // Look up workspace identity (name + slug) for workflow naming
    const { data: wsRow } = await supabaseAdmin
      .from('workspaces')
      .select('name, slug')
      .eq('id', workspaceId)
      .maybeSingle();

    // Check if the workspace has an active ignition (partition_registry.status = 'active')
    const { data: registryRow } = await supabaseAdmin
      .schema('genesis')
      .from('partition_registry')
      .select('status')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .maybeSingle();

    if (registryRow && wsRow) {
      try {
        // Build a lightweight SidecarClient from fetch for HttpWorkflowDeployer
        const sidecarClient = {
          async sendCommand(dropletIp: string, command: { action: string; payload: unknown }) {
            const resp = await fetch(`http://${dropletIp}:3001/command`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(command),
            });
            return resp.json();
          },
        };

        const deployer = new HttpWorkflowDeployer(sidecarClient);

        deployResult = await deployForCampaign(
          {
            workspace_id: workspaceId,
            workspace_name: wsRow.name,
            workspace_slug: wsRow.slug,
            campaign_id: campaignId,
            campaign_name: name.trim(),
          },
          { supabaseAdmin, workflowDeployer: deployer }
        );

        if (deployResult.success && deployResult.workflow_ids && deployResult.workflow_ids.length > 0) {
          // Persist workflow IDs on the campaign row for lifecycle management
          await supabaseAdmin
            .from('campaigns')
            .update({ n8n_workflow_ids: deployResult.workflow_ids, n8n_status: 'active' })
            .eq('id', campaignId);
        } else if (deployResult && !deployResult.success) {
          console.warn(`[D3-001] Campaign workflow deploy failed for ${campaignId}: ${deployResult.error}`);
        }
      } catch (deployErr) {
        console.error('[D3-001] Campaign workflow deploy error:', deployErr);
      }
    }

    // Return success with IDs for tracking
    return NextResponse.json({
      success: true,
      campaignId,
      provisionId,
      message: 'Campaign created. Provisioning in progress.',
      workflowsDeployed: deployResult?.success ?? false,
    }, { status: 201, headers: API_HEADERS });

  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json(
      { error: 'Failed to provision campaign' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
