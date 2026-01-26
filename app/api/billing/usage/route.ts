import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { auth } from '@clerk/nextjs/server';
import { getWorkspaceAccess, isSuperAdmin } from '@/lib/workspace-access';
import { checkBudgetReset } from '@/lib/budget-alerts';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/usage
 * 
 * Returns workspace-level usage metrics for billing purposes.
 * 
 * Query params:
 * - workspace_id: string (defaults to DEFAULT_WORKSPACE_ID)
 * - month: string (YYYY-MM format, defaults to current month)
 * 
 * Returns:
 * - period: { month, start_date, end_date }
 * - usage: { emails_sent, replies, opt_outs, llm_cost_usd, api_calls }
 * - limits: { emails_limit, cost_limit } (based on plan)
 * - plan: { name, features }
 */
export async function GET(req: NextRequest) {
  // SECURITY: Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json({
      period: { month: '', start_date: '', end_date: '' },
      usage: { emails_sent: 0, replies: 0, opt_outs: 0, llm_cost_usd: 0, api_calls: 0 },
      limits: { emails_limit: null, cost_limit: null },
      plan: { name: 'free', features: [] },
    }, { headers: API_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // SECURITY: Verify user has access to this workspace
  if (!isSuperAdmin(userId)) {
    const access = await getWorkspaceAccess(userId, workspaceId);
    if (!access) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: API_HEADERS }
      );
    }
  }
  
  // Parse month parameter (YYYY-MM format)
  const monthParam = searchParams.get('month');
  const now = new Date();
  let year: number, month: number;
  
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  
  // Calculate date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0); // Last day of month
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  try {
    // Fetch workspace plan info
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('plan, settings')
      .eq('id', workspaceId)
      .single();

    const plan = workspace?.plan || 'free';

    // Fetch email events count for the month
    const { count: emailsSent } = await supabaseAdmin
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'sent')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDateStr}T23:59:59Z`);

    const { count: replies } = await supabaseAdmin
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'replied')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDateStr}T23:59:59Z`);

    const { count: optOuts } = await supabaseAdmin
      .from('email_events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'opt_out')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDateStr}T23:59:59Z`);

    // Fetch LLM usage/costs for the month
    const { data: llmData } = await supabaseAdmin
      .from('llm_usage')
      .select('cost_usd')
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDateStr}T23:59:59Z`);

    const llmCostUsd = llmData?.reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0) || 0;
    const apiCalls = llmData?.length || 0;

    // Plan limits (can be extended with a pricing table later)
    const planLimits = getPlanLimits(plan);
    const planFeatures = getPlanFeatures(plan);

    // Check for budget reset (non-blocking)
    // Compare current month with previous month
    const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    const previousMonthDate = new Date(year, month - 2, 1); // month - 2 because month is 1-indexed
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const prevStartDate = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const prevEndDate = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 0);
    const prevEndDateStr = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}-${String(prevEndDate.getDate()).padStart(2, '0')}`;

    // Fetch previous month's cost (non-blocking)
    Promise.all([
      supabaseAdmin
        .from('llm_usage')
        .select('cost_usd')
        .eq('workspace_id', workspaceId)
        .gte('created_at', `${prevStartDate}T00:00:00Z`)
        .lte('created_at', `${prevEndDateStr}T23:59:59Z`)
        .then(({ data: prevLlmData }) => {
          const previousMonthCost = prevLlmData?.reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0) || 0;
          
          // Check for budget reset
          checkBudgetReset(workspaceId, llmCostUsd, previousMonthCost, currentMonth).catch((err) => {
            console.error(`[Budget Alert] Error checking budget reset for workspace ${workspaceId}:`, err);
          });
        })
    ]).catch((err) => {
      console.error('[Budget Alert] Error fetching previous month data:', err);
    });

    return NextResponse.json({
      period: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        start_date: startDate,
        end_date: endDateStr,
      },
      usage: {
        emails_sent: emailsSent || 0,
        replies: replies || 0,
        opt_outs: optOuts || 0,
        llm_cost_usd: Number(llmCostUsd.toFixed(4)),
        api_calls: apiCalls,
      },
      limits: planLimits,
      plan: {
        name: plan,
        features: planFeatures,
      },
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Billing usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// PLAN CONFIGURATION
// ============================================

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

function getPlanFeatures(plan: string): string[] {
  const features: Record<string, string[]> = {
    free: [
      'Basic analytics',
      'Email tracking',
      '500 emails/month',
    ],
    starter: [
      'Advanced analytics',
      'Email tracking',
      'Click tracking',
      '5,000 emails/month',
      'Multiple campaigns',
    ],
    pro: [
      'Full analytics suite',
      'All tracking features',
      'Reply detection',
      '25,000 emails/month',
      'Unlimited campaigns',
      'Team collaboration',
      'Priority support',
    ],
    enterprise: [
      'Everything in Pro',
      'Unlimited emails',
      'Unlimited team members',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
  };

  return features[plan] || features.free;
}

