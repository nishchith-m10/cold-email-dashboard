/**
 * PHASE 59: COST LEDGER MANAGER
 * 
 * Manages cost and revenue tracking for per-tenant margin analysis.
 */

import {
  CostEntry,
  RevenueEntry,
  CostCategory,
  CostSource,
  RevenueSource,
  CostLedgerDB,
} from './types';

/**
 * Cost Ledger Manager
 * 
 * Handles recording and querying of costs and revenue for margin analysis.
 */
export class CostLedgerManager {
  constructor(private db: CostLedgerDB) {}

  /**
   * Record a cost entry
   */
  async recordCost(params: {
    workspaceId: string;
    category: CostCategory;
    source: CostSource;
    amountCents: number;
    unitsConsumed: number;
    unitType: string;
    periodStart: Date;
    periodEnd: Date;
    externalInvoiceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<CostEntry> {
    // Validation
    if (!params.workspaceId || params.workspaceId.trim() === '') {
      throw new Error('Workspace ID is required');
    }

    if (params.amountCents < 0) {
      throw new Error('Cost amount cannot be negative');
    }

    if (params.unitsConsumed < 0) {
      throw new Error('Units consumed cannot be negative');
    }

    if (params.periodStart > params.periodEnd) {
      throw new Error('Period start must be before period end');
    }

    // Calculate unit cost
    const unitCostCents = params.unitsConsumed > 0 
      ? Math.round(params.amountCents / params.unitsConsumed)
      : 0;

    const entry: Omit<CostEntry, 'id' | 'createdAt'> = {
      workspaceId: params.workspaceId,
      category: params.category,
      source: params.source,
      amountCents: params.amountCents,
      currency: 'USD',
      unitsConsumed: params.unitsConsumed,
      unitType: params.unitType,
      unitCostCents,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      externalInvoiceId: params.externalInvoiceId,
      metadata: params.metadata || {},
    };

    return this.db.recordCost(entry);
  }

  /**
   * Record a revenue entry
   */
  async recordRevenue(params: {
    workspaceId: string;
    source: RevenueSource;
    amountCents: number;
    periodStart: Date;
    periodEnd: Date;
    externalTransactionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<RevenueEntry> {
    // Validation
    if (!params.workspaceId || params.workspaceId.trim() === '') {
      throw new Error('Workspace ID is required');
    }

    if (params.amountCents < 0) {
      throw new Error('Revenue amount cannot be negative');
    }

    if (params.periodStart > params.periodEnd) {
      throw new Error('Period start must be before period end');
    }

    const entry: Omit<RevenueEntry, 'id' | 'createdAt'> = {
      workspaceId: params.workspaceId,
      source: params.source,
      amountCents: params.amountCents,
      currency: 'USD',
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      externalTransactionId: params.externalTransactionId,
      metadata: params.metadata || {},
    };

    return this.db.recordRevenue(entry);
  }

  /**
   * Get all costs for workspace in period
   */
  async getCosts(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CostEntry[]> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    return this.db.getCosts(workspaceId, periodStart, periodEnd);
  }

  /**
   * Get costs by category
   */
  async getCostsByCategory(
    workspaceId: string,
    category: CostCategory,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CostEntry[]> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    return this.db.getCostsByCategory(workspaceId, category, periodStart, periodEnd);
  }

  /**
   * Get costs by source
   */
  async getCostsBySource(
    workspaceId: string,
    source: CostSource,
    periodStart: Date,
    periodEnd: Date
  ): Promise<CostEntry[]> {
    const allCosts = await this.getCosts(workspaceId, periodStart, periodEnd);
    return allCosts.filter((cost) => cost.source === source);
  }

  /**
   * Get all revenue for workspace in period
   */
  async getRevenue(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueEntry[]> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    return this.db.getRevenue(workspaceId, periodStart, periodEnd);
  }

  /**
   * Get revenue by source
   */
  async getRevenueBySource(
    workspaceId: string,
    source: RevenueSource,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueEntry[]> {
    const allRevenue = await this.getRevenue(workspaceId, periodStart, periodEnd);
    return allRevenue.filter((rev) => rev.source === source);
  }

  /**
   * Get total costs for period
   */
  async getTotalCosts(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    return this.db.getTotalCosts(workspaceId, periodStart, periodEnd);
  }

  /**
   * Get total revenue for period
   */
  async getTotalRevenue(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    return this.db.getTotalRevenue(workspaceId, periodStart, periodEnd);
  }

  /**
   * Get cost breakdown by category
   */
  async getCostBreakdownByCategory(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<CostCategory, number>> {
    const costs = await this.getCosts(workspaceId, periodStart, periodEnd);

    const breakdown: Record<CostCategory, number> = {
      [CostCategory.INFRASTRUCTURE]: 0,
      [CostCategory.MANAGED_SERVICE]: 0,
      [CostCategory.SHARED_OVERHEAD]: 0,
    };

    costs.forEach((cost) => {
      breakdown[cost.category] += cost.amountCents;
    });

    return breakdown;
  }

  /**
   * Get cost breakdown by source
   */
  async getCostBreakdownBySource(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, number>> {
    const costs = await this.getCosts(workspaceId, periodStart, periodEnd);

    const breakdown: Record<string, number> = {};

    costs.forEach((cost) => {
      if (!breakdown[cost.source]) {
        breakdown[cost.source] = 0;
      }
      breakdown[cost.source] += cost.amountCents;
    });

    return breakdown;
  }

  /**
   * Get revenue breakdown by source
   */
  async getRevenueBreakdownBySource(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Record<string, number>> {
    const revenue = await this.getRevenue(workspaceId, periodStart, periodEnd);

    const breakdown: Record<string, number> = {};

    revenue.forEach((rev) => {
      if (!breakdown[rev.source]) {
        breakdown[rev.source] = 0;
      }
      breakdown[rev.source] += rev.amountCents;
    });

    return breakdown;
  }

  /**
   * Record infrastructure cost (helper method)
   */
  async recordInfrastructureCost(params: {
    workspaceId: string;
    source: CostSource;
    amountCents: number;
    unitsConsumed: number;
    unitType: string;
    periodStart: Date;
    periodEnd: Date;
    metadata?: Record<string, unknown>;
  }): Promise<CostEntry> {
    return this.recordCost({
      ...params,
      category: CostCategory.INFRASTRUCTURE,
    });
  }

  /**
   * Record managed service cost (helper method)
   */
  async recordManagedServiceCost(params: {
    workspaceId: string;
    source: CostSource;
    amountCents: number;
    unitsConsumed: number;
    unitType: string;
    periodStart: Date;
    periodEnd: Date;
    metadata?: Record<string, unknown>;
  }): Promise<CostEntry> {
    return this.recordCost({
      ...params,
      category: CostCategory.MANAGED_SERVICE,
    });
  }

  /**
   * Record shared overhead cost (helper method)
   */
  async recordSharedOverheadCost(params: {
    workspaceId: string;
    source: CostSource;
    amountCents: number;
    unitsConsumed: number;
    unitType: string;
    periodStart: Date;
    periodEnd: Date;
    metadata?: Record<string, unknown>;
  }): Promise<CostEntry> {
    return this.recordCost({
      ...params,
      category: CostCategory.SHARED_OVERHEAD,
    });
  }

  /**
   * Bulk record costs (for batch imports)
   */
  async bulkRecordCosts(
    costs: Array<Omit<Parameters<typeof this.recordCost>[0], 'metadata'> & { metadata?: Record<string, unknown> }>
  ): Promise<CostEntry[]> {
    const results: CostEntry[] = [];

    for (const cost of costs) {
      const entry = await this.recordCost(cost);
      results.push(entry);
    }

    return results;
  }

  /**
   * Bulk record revenue (for batch imports)
   */
  async bulkRecordRevenue(
    revenues: Array<Parameters<typeof this.recordRevenue>[0]>
  ): Promise<RevenueEntry[]> {
    const results: RevenueEntry[] = [];

    for (const revenue of revenues) {
      const entry = await this.recordRevenue(revenue);
      results.push(entry);
    }

    return results;
  }

  /**
   * Calculate average unit cost for a source
   */
  async getAverageUnitCost(
    workspaceId: string,
    source: CostSource,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ averageCostCents: number; totalUnits: number }> {
    const costs = await this.getCostsBySource(workspaceId, source, periodStart, periodEnd);

    if (costs.length === 0) {
      return { averageCostCents: 0, totalUnits: 0 };
    }

    const totalCents = costs.reduce((sum, cost) => sum + cost.amountCents, 0);
    const totalUnits = costs.reduce((sum, cost) => sum + cost.unitsConsumed, 0);

    const averageCostCents = totalUnits > 0 ? Math.round(totalCents / totalUnits) : 0;

    return { averageCostCents, totalUnits };
  }
}

/**
 * Cost Validator
 * 
 * Validates cost entries for consistency and accuracy.
 */
export class CostValidator {
  /**
   * Validate cost entry is within reasonable bounds
   */
  static validateCostEntry(entry: CostEntry): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check amount is reasonable (not absurdly high)
    if (entry.amountCents > 100_000_000) { // $1M
      issues.push('Cost amount exceeds $1M - please verify');
    }

    // Check units make sense
    if (entry.unitsConsumed === 0 && entry.amountCents > 0) {
      issues.push('Zero units consumed but non-zero cost');
    }

    // Check unit cost consistency
    const calculatedUnitCost = entry.unitsConsumed > 0 
      ? Math.round(entry.amountCents / entry.unitsConsumed)
      : 0;

    if (Math.abs(calculatedUnitCost - entry.unitCostCents) > 1) {
      issues.push('Unit cost does not match calculated value');
    }

    // Check period makes sense
    if (entry.periodStart >= entry.periodEnd) {
      issues.push('Period start must be before period end');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate revenue entry
   */
  static validateRevenueEntry(entry: RevenueEntry): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check amount is reasonable
    if (entry.amountCents > 100_000_000) { // $1M
      issues.push('Revenue amount exceeds $1M - please verify');
    }

    // Check period makes sense
    if (entry.periodStart >= entry.periodEnd) {
      issues.push('Period start must be before period end');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check for duplicate entries
   */
  static detectDuplicate(
    entry: CostEntry | RevenueEntry,
    existing: Array<CostEntry | RevenueEntry>
  ): boolean {
    return existing.some((e) => {
      // Same workspace, amount, and period
      return (
        e.workspaceId === entry.workspaceId &&
        e.amountCents === entry.amountCents &&
        e.periodStart.getTime() === entry.periodStart.getTime() &&
        e.periodEnd.getTime() === entry.periodEnd.getTime() &&
        ('source' in e && 'source' in entry && e.source === entry.source)
      );
    });
  }
}
