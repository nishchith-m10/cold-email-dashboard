import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateLlmCost } from '@/lib/constants';
import { z } from 'zod';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';
import { checkBudgetAlerts } from '@/lib/budget-alerts';
import { resolveWebhookAuth } from '@/lib/webhook-auth';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

// Zod schema for cost event validation
const costEventSchema = z.object({
  workspace_id: z.string().max(100).optional(),
  campaign_name: z.string().max(200).optional(),
  campaign_group_id: z.string().uuid().optional(), // D4-005: campaign cost attribution
  contact_email: z.string().email().optional(),
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  tokens_in: z.number().int().min(0).optional(),
  tokens_out: z.number().int().min(0).optional(),
  raw_usage: z.number().min(0).optional(),
  cost_usd: z.number().min(0).optional(),
  purpose: z.string().max(200).optional(),
  workflow_id: z.string().max(100).optional(),
  run_id: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const batchCostEventsSchema = z.union([
  costEventSchema,
  z.array(costEventSchema).min(1).max(100),
]);



// Plan limits helper (matches billing/usage route)
interface PlanLimits {
  emails_limit: number | null;
  cost_limit: number | null;
  campaigns_limit: number | null;
  team_members_limit: number | null;
}

function getPlanLimits(plan: string): PlanLimits {
  const limits: Record<string, PlanLimits> = {
    free: {
      emails_limit: 500,
      cost_limit: 5.00,
      campaigns_limit: 1,
      team_members_limit: 1,
    },
    starter: {
      emails_limit: 5000,
      cost_limit: 50.00,
      campaigns_limit: 5,
      team_members_limit: 3,
    },
    pro: {
      emails_limit: 25000,
      cost_limit: 250.00,
      campaigns_limit: null, // unlimited
      team_members_limit: 10,
    },
    enterprise: {
      emails_limit: null, // unlimited
      cost_limit: null, // unlimited
      campaigns_limit: null,
      team_members_limit: null,
    },
  };

  return limits[plan] || limits.free;
}

// POST /api/cost-events - Receive cost events from n8n
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`cost-events:${clientId}`, RATE_LIMIT_WEBHOOK);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Early reject: missing token header (before body parse)
  const token = req.headers.get('x-webhook-token');
  if (!token) {
    return NextResponse.json(
      { error: 'Missing x-webhook-token header' },
      { status: 401 }
    );
  }

  // Check Supabase
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const rawBody = await req.json();
    
    // Validate with Zod
    const validation = batchCostEventsSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Handle both single event and batch
    const events = Array.isArray(validation.data) ? validation.data : [validation.data];

    // Resolve workspace from webhook token (D4-001: per-workspace tokens)
    // Use the first event's workspace_id as fallback for global-token path
    const payloadWsId = events[0]?.workspace_id;
    const authResult = await resolveWebhookAuth(token, payloadWsId);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const resolvedWorkspaceId = authResult.workspaceId;
    
    const results = [];
    const errors = [];
    const workspaceIds = new Set<string>();

    for (const event of events) {
      try {
        // Calculate cost if not provided
        let costUsd = event.cost_usd;
        if (costUsd === undefined && event.tokens_in !== undefined && event.tokens_out !== undefined) {
          costUsd = calculateLlmCost(
            event.provider,
            event.model,
            event.tokens_in,
            event.tokens_out
          );
        }

        // If still no cost and we have raw_usage, try to estimate
        if (costUsd === undefined && event.raw_usage !== undefined) {
          // For non-token APIs (Apify, etc.), just store raw_usage
          costUsd = 0; // Will need manual cost mapping or config
        }

        // Default to 0 if we can't calculate
        if (costUsd === undefined) {
          costUsd = 0;
        }

        // D4-001: workspace_id derived from token, not trusted from payload
        const workspaceId = resolvedWorkspaceId;
        workspaceIds.add(workspaceId);

        // Insert into llm_usage table
        const { data, error } = await supabaseAdmin
          .from('llm_usage')
          .insert({
            workspace_id: workspaceId,
            campaign_name: event.campaign_name || null,
            campaign_group_id: event.campaign_group_id || null, // D4-005
            contact_email: event.contact_email || null,
            provider: event.provider,
            model: event.model,
            tokens_in: event.tokens_in || 0,
            tokens_out: event.tokens_out || 0,
            cost_usd: costUsd,
            purpose: event.purpose || null,
            metadata: {
              workflow_id: event.workflow_id,
              run_id: event.run_id,
              raw_usage: event.raw_usage,
              ...event.metadata,
            },
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          errors.push({ event, error: error.message });
        } else {
          results.push({
            id: data.id,
            provider: event.provider,
            model: event.model,
            cost_usd: costUsd,
          });
        }
      } catch (err) {
        errors.push({ event, error: String(err) });
      }
    }

    // Check budget alerts for affected workspaces (non-blocking)
    if (results.length > 0 && workspaceIds.size > 0) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // Check budget for each workspace (in parallel, non-blocking)
      if (supabaseAdmin) {
        const supabase = supabaseAdmin; // Capture for closure
        Promise.all(
          Array.from(workspaceIds).map(async (workspaceId) => {
            try {
              // Get workspace plan
              const { data: workspace } = await supabase
                .from('workspaces')
                .select('plan')
                .eq('id', workspaceId)
                .single();

              const plan = workspace?.plan || 'free';

              // Get plan limits
              const planLimits = getPlanLimits(plan);
              const costLimit = planLimits.cost_limit;

              if (costLimit !== null && costLimit > 0) {
                // Get current month's cost
                const { data: llmData } = await supabase
                  .from('llm_usage')
                  .select('cost_usd')
                  .eq('workspace_id', workspaceId)
                  .gte('created_at', `${startDate}T00:00:00Z`)
                  .lte('created_at', `${endDateStr}T23:59:59Z`);

                const currentCost = llmData?.reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0) || 0;

                // Check budget alerts
                await checkBudgetAlerts(workspaceId, currentCost, costLimit, currentMonth);
              }
            } catch (err) {
              // Log but don't fail the request
              console.error(`[Budget Alert] Error checking budget for workspace ${workspaceId}:`, err);
            }
          })
        ).catch((err) => {
          // Log but don't fail the request
          console.error('[Budget Alert] Error in budget check:', err);
        });
      }
    }

    // Return results
    const status = errors.length > 0 && results.length === 0 ? 400 : 200;
    return NextResponse.json(
      {
        success: results.length > 0,
        inserted: results.length,
        errors: errors.length,
        results,
        error_details: errors.length > 0 ? errors : undefined,
      },
      { status, headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('Cost events API error:', error);
    return NextResponse.json(
      { error: 'Invalid JSON payload', details: String(error) },
      { status: 400 }
    );
  }
}

// GET /api/cost-events - Get recent cost events (authenticated via Clerk)
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ events: [], error: 'Database not configured' });
  }

  // D4-001 / D4-002: Require authenticated workspace access
  const accessError = await validateWorkspaceAccess(req, new URL(req.url).searchParams);
  if (accessError) {
    return accessError; // 401/403 response
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id query parameter is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('llm_usage')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: data,
      count: data.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
