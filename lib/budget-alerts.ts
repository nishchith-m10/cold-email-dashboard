/**
 * Budget Alert Utilities
 * 
 * Helper functions for checking budget thresholds and creating notifications
 */

import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from './supabase';

interface BudgetAlertThreshold {
  percentage: number;
  alertType: 'warning' | 'danger' | 'info';
  title: string;
  messageTemplate: string;
}

const BUDGET_ALERT_THRESHOLDS: BudgetAlertThreshold[] = [
  {
    percentage: 80,
    alertType: 'warning',
    title: 'Budget Warning',
    messageTemplate: 'Your monthly budget has reached {percentage}% ({current}/{limit}).',
  },
  {
    percentage: 100,
    alertType: 'danger',
    title: 'Budget Exceeded',
    messageTemplate: 'Your monthly budget has been exceeded ({current}/{limit}).',
  },
];

/**
 * Check if budget alerts should be created and create them
 * 
 * @param workspaceId - Workspace ID
 * @param currentCost - Current cost for the month
 * @param costLimit - Cost limit for the plan (null if unlimited)
 * @param month - Month in YYYY-MM format
 * @returns Promise<void>
 */
export async function checkBudgetAlerts(
  workspaceId: string,
  currentCost: number,
  costLimit: number | null,
  month: string
): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured - skipping budget alerts');
    return;
  }

  if (costLimit === null || costLimit === 0) {
    // No limit, no alerts needed
    return;
  }

  const percentage = (currentCost / costLimit) * 100;

  // Check each threshold
  for (const threshold of BUDGET_ALERT_THRESHOLDS) {
    if (percentage >= threshold.percentage) {
      // Check if we've already sent this alert for this month
      const alertKey = `budget_${threshold.alertType}_${threshold.percentage}_${month}`;
      
      // Fetch budget alerts for this month to check payload
      const { data: allBudgetAlerts } = await supabaseAdmin
        .from('notifications')
        .select('payload')
        .eq('workspace_id', workspaceId)
        .eq('type', 'budget_alert')
        .gte('created_at', `${month}-01T00:00:00Z`)
        .lte('created_at', `${month}-31T23:59:59Z`);

      const hasExistingAlert = allBudgetAlerts?.some(
        (alert) => (alert.payload as { alert_key?: string })?.alert_key === alertKey
      );

      if (!hasExistingAlert) {
        // Create notification
        const message = threshold.messageTemplate
          .replace('{percentage}', Math.round(percentage).toString())
          .replace('{current}', `$${currentCost.toFixed(2)}`)
          .replace('{limit}', `$${costLimit.toFixed(2)}`);

        await supabaseAdmin
          .from('notifications')
          .insert({
            workspace_id: workspaceId,
            type: 'budget_alert',
            title: threshold.title,
            message,
            payload: {
              alert_key: alertKey,
              alert_type: threshold.alertType,
              percentage: Math.round(percentage),
              current_cost: currentCost,
              cost_limit: costLimit,
              month,
            },
            created_at: new Date().toISOString(),
          });

        console.log(`[Budget Alert] Created ${threshold.alertType} alert for workspace ${workspaceId} at ${percentage.toFixed(1)}%`);
      }
    }
  }
}

/**
 * Check if budget was reset (usage dropped significantly compared to previous period)
 * and create an info notification
 * 
 * @param workspaceId - Workspace ID
 * @param currentMonthCost - Current month's cost
 * @param previousMonthCost - Previous month's cost
 * @param currentMonth - Current month in YYYY-MM format
 * @returns Promise<void>
 */
export async function checkBudgetReset(
  workspaceId: string,
  currentMonthCost: number,
  previousMonthCost: number,
  currentMonth: string
): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('Supabase not configured - skipping budget reset check');
    return;
  }

  // Budget reset is detected when:
  // 1. Previous month had significant usage (> $1)
  // 2. Current month has very low usage (< 10% of previous month or < $0.50)
  const significantPreviousUsage = previousMonthCost > 1.0;
  const significantDrop = currentMonthCost < previousMonthCost * 0.1 || currentMonthCost < 0.5;

  if (significantPreviousUsage && significantDrop) {
    // Check if we've already sent this reset notification for this month
    const alertKey = `budget_reset_${currentMonth}`;

    const { data: allBudgetAlerts } = await supabaseAdmin
      .from('notifications')
      .select('payload')
      .eq('workspace_id', workspaceId)
      .eq('type', 'budget_alert')
      .gte('created_at', `${currentMonth}-01T00:00:00Z`)
      .lte('created_at', `${currentMonth}-31T23:59:59Z`);

    const hasExistingAlert = allBudgetAlerts?.some(
      (alert) => (alert.payload as { alert_key?: string })?.alert_key === alertKey
    );

    if (!hasExistingAlert) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          workspace_id: workspaceId,
          type: 'budget_alert',
          title: 'Budget Reset',
          message: `Your monthly budget has been reset. Starting fresh for ${currentMonth}.`,
          payload: {
            alert_key: alertKey,
            alert_type: 'info',
            current_cost: currentMonthCost,
            previous_cost: previousMonthCost,
            month: currentMonth,
          },
          created_at: new Date().toISOString(),
        });

      console.log(`[Budget Alert] Created reset notification for workspace ${workspaceId} for ${currentMonth}`);
    }
  }
}
