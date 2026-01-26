import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { calculateLlmCost } from '@/lib/constants';
import { z } from 'zod';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';
import { checkBudgetAlerts } from '@/lib/budget-alerts';

export const dynamic = 'force-dynamic';

// Zod schema for cost event validation
const costEventSchema = z.object({
  workspace_id: z.string().max(100).optional(),
  campaign_name: z.string().max(200).optional(),
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

// Validate webhook token
function validateToken(req: NextRequest): boolean {
  const token = req.headers.get('x-webhook-token');
  const expectedToken = process.env.DASH_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    console.warn('DASH_WEBHOOK_TOKEN not configured - allowing all requests');
    return true;
  }
  
  return token === expectedToken;
}

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

  // Validate token
  if (!validateToken(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - invalid or missing X-Webhook-Token' },
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

        const workspaceId = event.workspace_id || DEFAULT_WORKSPACE_ID;
        workspaceIds.add(workspaceId);

        // Insert into llm_usage table
        const { data, error } = await supabaseAdmin
          .from('llm_usage')
          .insert({
            workspace_id: workspaceId,
            campaign_name: event.campaign_name || null,
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

// GET /api/cost-events - Get recent cost events (for debugging)
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ events: [], error: 'Database not configured' });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

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
