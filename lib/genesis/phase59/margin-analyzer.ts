/**
 * PHASE 59: MARGIN ANALYZER
 * 
 * Generates comprehensive margin reports and profitability analysis.
 */

import { CostLedgerManager } from './cost-ledger';
import {
  MarginReport,
  MarginRevenueBreakdown,
  MarginCostBreakdown,
  MarginCalculations,
  BreakEvenAnalysis,
  CostCategory,
  CostSource,
  RevenueSource,
} from './types';

/**
 * Margin Analyzer
 * 
 * Analyzes costs and revenue to generate profitability reports.
 */
export class MarginAnalyzer {
  constructor(private costLedger: CostLedgerManager) {}

  /**
   * Generate comprehensive margin report for a workspace
   */
  async generateMarginReport(params: {
    workspaceId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<MarginReport> {
    const { workspaceId, periodStart, periodEnd } = params;

    // Get all costs and revenue for the period
    const [costs, revenue] = await Promise.all([
      this.costLedger.getCosts(workspaceId, periodStart, periodEnd),
      this.costLedger.getRevenue(workspaceId, periodStart, periodEnd),
    ]);

    // Build revenue breakdown
    const revenueBreakdown = await this.buildRevenueBreakdown(workspaceId, periodStart, periodEnd);

    // Build cost breakdown
    const costBreakdown = await this.buildCostBreakdown(workspaceId, periodStart, periodEnd);

    // Calculate margin
    const margin = this.calculateMargin(revenueBreakdown, costBreakdown);

    return {
      workspaceId,
      periodStart,
      periodEnd,
      revenue: revenueBreakdown,
      costs: costBreakdown,
      margin,
      generatedAt: new Date(),
    };
  }

  /**
   * Build revenue breakdown
   */
  private async buildRevenueBreakdown(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MarginRevenueBreakdown> {
    const allRevenue = await this.costLedger.getRevenue(workspaceId, periodStart, periodEnd);

    const breakdown: MarginRevenueBreakdown = {
      subscriptionCents: 0,
      walletUsageByService: {},
      totalWalletUsageCents: 0,
      overageChargesCents: 0,
      otherRevenueCents: 0,
      totalRevenueCents: 0,
    };

    allRevenue.forEach((rev) => {
      switch (rev.source) {
        case RevenueSource.SUBSCRIPTION_FEE:
          breakdown.subscriptionCents += rev.amountCents;
          break;

        case RevenueSource.WALLET_USAGE:
          // Extract service from metadata if available
          const service = (rev.metadata.service as string) || 'unknown';
          if (!breakdown.walletUsageByService[service]) {
            breakdown.walletUsageByService[service] = 0;
          }
          breakdown.walletUsageByService[service] += rev.amountCents;
          breakdown.totalWalletUsageCents += rev.amountCents;
          break;

        case RevenueSource.OVERAGE_CHARGES:
          breakdown.overageChargesCents += rev.amountCents;
          break;

        default:
          breakdown.otherRevenueCents += rev.amountCents;
          break;
      }

      breakdown.totalRevenueCents += rev.amountCents;
    });

    return breakdown;
  }

  /**
   * Build cost breakdown
   */
  private async buildCostBreakdown(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MarginCostBreakdown> {
    const allCosts = await this.costLedger.getCosts(workspaceId, periodStart, periodEnd);

    const breakdown: MarginCostBreakdown = {
      infrastructureCosts: {} as Record<CostSource, number>,
      totalInfrastructureCents: 0,
      managedServiceCosts: {} as Record<CostSource, number>,
      totalManagedServiceCents: 0,
      sharedOverheadCents: 0,
      totalCostsCents: 0,
    };

    allCosts.forEach((cost) => {
      switch (cost.category) {
        case CostCategory.INFRASTRUCTURE:
          if (!breakdown.infrastructureCosts[cost.source]) {
            breakdown.infrastructureCosts[cost.source] = 0;
          }
          breakdown.infrastructureCosts[cost.source] += cost.amountCents;
          breakdown.totalInfrastructureCents += cost.amountCents;
          break;

        case CostCategory.MANAGED_SERVICE:
          if (!breakdown.managedServiceCosts[cost.source]) {
            breakdown.managedServiceCosts[cost.source] = 0;
          }
          breakdown.managedServiceCosts[cost.source] += cost.amountCents;
          breakdown.totalManagedServiceCents += cost.amountCents;
          break;

        case CostCategory.SHARED_OVERHEAD:
          breakdown.sharedOverheadCents += cost.amountCents;
          break;
      }

      breakdown.totalCostsCents += cost.amountCents;
    });

    return breakdown;
  }

  /**
   * Calculate margin metrics
   */
  private calculateMargin(
    revenue: MarginRevenueBreakdown,
    costs: MarginCostBreakdown
  ): MarginCalculations {
    const grossProfitCents = revenue.totalRevenueCents - costs.totalCostsCents;

    const grossMarginPercent =
      revenue.totalRevenueCents > 0
        ? Math.round((grossProfitCents / revenue.totalRevenueCents) * 10000) / 100
        : 0;

    // Contribution margin = revenue - variable costs (managed services + infrastructure)
    const variableCosts = costs.totalManagedServiceCents + costs.totalInfrastructureCents;
    const contributionMarginCents = revenue.totalRevenueCents - variableCosts;

    // Break-even analysis
    const breakEven = this.calculateBreakEven(revenue, costs);

    return {
      grossProfitCents,
      grossMarginPercent,
      contributionMarginCents,
      breakEven,
      isProfitable: grossProfitCents > 0,
    };
  }

  /**
   * Calculate break-even analysis
   */
  private calculateBreakEven(
    revenue: MarginRevenueBreakdown,
    costs: MarginCostBreakdown
  ): BreakEvenAnalysis {
    // Required monthly revenue = total costs
    const requiredMonthlyCents = costs.totalCostsCents;

    // Coverage ratio = revenue / costs
    const coverageRatio =
      costs.totalCostsCents > 0
        ? Math.round((revenue.totalRevenueCents / costs.totalCostsCents) * 100) / 100
        : 0;

    // Months to break even (if currently unprofitable)
    let monthsToBreakEven: number | undefined;
    if (revenue.totalRevenueCents < costs.totalCostsCents) {
      const deficit = costs.totalCostsCents - revenue.totalRevenueCents;
      // Assuming linear growth, how many months to close the gap?
      // This is a simplified calculation
      monthsToBreakEven = revenue.totalRevenueCents > 0 
        ? Math.ceil(deficit / revenue.totalRevenueCents)
        : undefined;
    }

    return {
      requiredMonthlyCents,
      coverageRatio,
      monthsToBreakEven,
    };
  }

  /**
   * Calculate profitability trend over multiple periods
   */
  async calculateProfitabilityTrend(params: {
    workspaceId: string;
    periods: Array<{ start: Date; end: Date }>;
  }): Promise<Array<{
    period: { start: Date; end: Date };
    grossProfitCents: number;
    marginPercent: number;
  }>> {
    const results = [];

    for (const period of params.periods) {
      const report = await this.generateMarginReport({
        workspaceId: params.workspaceId,
        periodStart: period.start,
        periodEnd: period.end,
      });

      results.push({
        period,
        grossProfitCents: report.margin.grossProfitCents,
        marginPercent: report.margin.grossMarginPercent,
      });
    }

    return results;
  }

  /**
   * Compare margins across workspaces
   */
  async compareWorkspaceMargins(params: {
    workspaceIds: string[];
    periodStart: Date;
    periodEnd: Date;
  }): Promise<Array<{
    workspaceId: string;
    totalRevenueCents: number;
    totalCostsCents: number;
    grossProfitCents: number;
    marginPercent: number;
  }>> {
    const results = [];

    for (const workspaceId of params.workspaceIds) {
      const report = await this.generateMarginReport({
        workspaceId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      });

      results.push({
        workspaceId,
        totalRevenueCents: report.revenue.totalRevenueCents,
        totalCostsCents: report.costs.totalCostsCents,
        grossProfitCents: report.margin.grossProfitCents,
        marginPercent: report.margin.grossMarginPercent,
      });
    }

    // Sort by margin percentage descending
    results.sort((a, b) => b.marginPercent - a.marginPercent);

    return results;
  }

  /**
   * Get top cost drivers
   */
  async getTopCostDrivers(params: {
    workspaceId: string;
    periodStart: Date;
    periodEnd: Date;
    limit?: number;
  }): Promise<Array<{
    source: CostSource;
    amountCents: number;
    percentOfTotal: number;
  }>> {
    const costs = await this.costLedger.getCosts(
      params.workspaceId,
      params.periodStart,
      params.periodEnd
    );

    const totalCosts = costs.reduce((sum, cost) => sum + cost.amountCents, 0);

    // Group by source
    const bySource: Record<string, number> = {};
    costs.forEach((cost) => {
      if (!bySource[cost.source]) {
        bySource[cost.source] = 0;
      }
      bySource[cost.source] += cost.amountCents;
    });

    // Convert to array and sort
    const drivers = Object.entries(bySource).map(([source, amountCents]) => ({
      source: source as CostSource,
      amountCents,
      percentOfTotal: totalCosts > 0 
        ? Math.round((amountCents / totalCosts) * 10000) / 100
        : 0,
    }));

    drivers.sort((a, b) => b.amountCents - a.amountCents);

    return drivers.slice(0, params.limit || 10);
  }

  /**
   * Calculate Customer Lifetime Value (CLV) projection
   */
  async projectCustomerLifetimeValue(params: {
    workspaceId: string;
    monthlyRevenueCents: number;
    monthlyChurnRate: number; // 0-1 (e.g., 0.05 = 5%)
    averageMarginPercent: number; // 0-100
  }): Promise<{
    lifetimeValueCents: number;
    expectedMonths: number;
    totalProfitCents: number;
  }> {
    const { monthlyRevenueCents, monthlyChurnRate, averageMarginPercent } = params;

    // Expected lifetime = 1 / churn rate
    const expectedMonths = monthlyChurnRate > 0 ? 1 / monthlyChurnRate : Infinity;

    // Lifetime revenue = monthly revenue * expected months
    const lifetimeRevenueCents = isFinite(expectedMonths)
      ? Math.round(monthlyRevenueCents * expectedMonths)
      : monthlyRevenueCents * 120; // Cap at 10 years if no churn

    // Total profit = lifetime revenue * margin %
    const totalProfitCents = Math.round(
      lifetimeRevenueCents * (averageMarginPercent / 100)
    );

    return {
      lifetimeValueCents: lifetimeRevenueCents,
      expectedMonths: isFinite(expectedMonths) ? Math.round(expectedMonths) : 120,
      totalProfitCents,
    };
  }

  /**
   * Calculate Unit Economics
   */
  async calculateUnitEconomics(params: {
    workspaceId: string;
    periodStart: Date;
    periodEnd: Date;
    totalUsers?: number;
    totalTransactions?: number;
  }): Promise<{
    revenuePerUser?: number;
    costPerUser?: number;
    profitPerUser?: number;
    revenuePerTransaction?: number;
    costPerTransaction?: number;
  }> {
    const report = await this.generateMarginReport({
      workspaceId: params.workspaceId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    });

    const result: {
      revenuePerUser?: number;
      costPerUser?: number;
      profitPerUser?: number;
      revenuePerTransaction?: number;
      costPerTransaction?: number;
    } = {};

    if (params.totalUsers && params.totalUsers > 0) {
      result.revenuePerUser = Math.round(
        report.revenue.totalRevenueCents / params.totalUsers
      );
      result.costPerUser = Math.round(
        report.costs.totalCostsCents / params.totalUsers
      );
      result.profitPerUser = Math.round(
        report.margin.grossProfitCents / params.totalUsers
      );
    }

    if (params.totalTransactions && params.totalTransactions > 0) {
      result.revenuePerTransaction = Math.round(
        report.revenue.totalRevenueCents / params.totalTransactions
      );
      result.costPerTransaction = Math.round(
        report.costs.totalCostsCents / params.totalTransactions
      );
    }

    return result;
  }
}

/**
 * Margin Report Formatter
 * 
 * Formats margin reports for display/export.
 */
export class MarginReportFormatter {
  /**
   * Format margin report as text (similar to spec example)
   */
  static formatAsText(report: MarginReport): string {
    const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    let output = '';
    output += '┌─────────────────────────────────────────────────────────────────────────────┐\n';
    output += '│                    PER-TENANT MARGIN REPORT                                 │\n';
    output += '├─────────────────────────────────────────────────────────────────────────────┤\n';
    output += '│                                                                             │\n';
    output += `│  Workspace: ${report.workspaceId.padEnd(60)}│\n`;
    output += `│  Period: ${report.periodStart.toISOString().split('T')[0]} to ${report.periodEnd.toISOString().split('T')[0]}                        │\n`;
    output += '│                                                                             │\n';
    output += '│  REVENUE:                                                                  │\n';
    output += '│  ┌─────────────────────────────────────────────────────────────────────┐   │\n';
    output += `│  │  Subscription fee:              ${formatCents(report.revenue.subscriptionCents).padStart(8)}                              │   │\n`;
    
    Object.entries(report.revenue.walletUsageByService).forEach(([service, amount]) => {
      output += `│  │  Wallet usage (${service}):${formatCents(amount).padStart(15)}                           │   │\n`;
    });
    
    output += `│  │  Total wallet usage:            ${formatCents(report.revenue.totalWalletUsageCents).padStart(8)}                              │   │\n`;
    output += `│  │  ────────────────────────────────────────                          │   │\n`;
    output += `│  │  TOTAL REVENUE:                 ${formatCents(report.revenue.totalRevenueCents).padStart(8)}                             │   │\n`;
    output += '│  └─────────────────────────────────────────────────────────────────────┘   │\n';
    output += '│                                                                             │\n';
    output += '│  COSTS:                                                                    │\n';
    output += '│  ┌─────────────────────────────────────────────────────────────────────┐   │\n';
    
    Object.entries(report.costs.infrastructureCosts).forEach(([source, amount]) => {
      output += `│  │  ${source.padEnd(30)}: ${formatCents(amount).padStart(8)}                               │   │\n`;
    });
    
    Object.entries(report.costs.managedServiceCosts).forEach(([source, amount]) => {
      output += `│  │  ${source.padEnd(30)}: ${formatCents(amount).padStart(8)}                               │   │\n`;
    });
    
    output += `│  │  Shared overhead:               ${formatCents(report.costs.sharedOverheadCents).padStart(8)}                               │   │\n`;
    output += `│  │  ────────────────────────────────────────                          │   │\n`;
    output += `│  │  TOTAL COSTS:                   ${formatCents(report.costs.totalCostsCents).padStart(8)}                              │   │\n`;
    output += '│  └─────────────────────────────────────────────────────────────────────┘   │\n';
    output += '│                                                                             │\n';
    output += '│  MARGIN:                                                                   │\n';
    output += '│  ┌─────────────────────────────────────────────────────────────────────┐   │\n';
    output += `│  │  Gross Profit:                  ${formatCents(report.margin.grossProfitCents).padStart(8)}                              │   │\n`;
    output += `│  │  Margin:                        ${report.margin.grossMarginPercent.toFixed(1).padStart(5)}%                             │   │\n`;
    output += '│  └─────────────────────────────────────────────────────────────────────┘   │\n';
    output += '│                                                                             │\n';
    output += '└─────────────────────────────────────────────────────────────────────────────┘\n';

    return output;
  }

  /**
   * Format as JSON for API responses
   */
  static formatAsJSON(report: MarginReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Format as CSV for export
   */
  static formatAsCSV(reports: MarginReport[]): string {
    const headers = [
      'Workspace ID',
      'Period Start',
      'Period End',
      'Total Revenue',
      'Total Costs',
      'Gross Profit',
      'Margin %',
    ].join(',');

    const rows = reports.map((report) => {
      return [
        report.workspaceId,
        report.periodStart.toISOString(),
        report.periodEnd.toISOString(),
        (report.revenue.totalRevenueCents / 100).toFixed(2),
        (report.costs.totalCostsCents / 100).toFixed(2),
        (report.margin.grossProfitCents / 100).toFixed(2),
        report.margin.grossMarginPercent.toFixed(2),
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }
}
