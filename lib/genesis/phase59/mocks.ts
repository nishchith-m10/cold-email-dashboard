/**
 * PHASE 59: MOCK IMPLEMENTATIONS
 * 
 * In-memory mock implementations for testing.
 */

import {
  CostEntry,
  RevenueEntry,
  CostCategory,
  CostLedgerDB,
  RateLimitService,
  RateLimitState,
  RateLimitOverrideToken,
  RateLimitStore,
  RateLimitWindowType,
} from './types';

/**
 * Mock Cost Ledger Database
 */
export class MockCostLedgerDB implements CostLedgerDB {
  private costs: CostEntry[] = [];
  private revenues: RevenueEntry[] = [];
  private nextCostId = 1;
  private nextRevenueId = 1;

  async recordCost(entry: Omit<CostEntry, 'id' | 'createdAt'>): Promise<CostEntry> {
    const cost: CostEntry = {
      ...entry,
      id: `cost_${this.nextCostId++}`,
      createdAt: new Date(),
    };

    this.costs.push(cost);
    return cost;
  }

  async recordRevenue(entry: Omit<RevenueEntry, 'id' | 'createdAt'>): Promise<RevenueEntry> {
    const revenue: RevenueEntry = {
      ...entry,
      id: `revenue_${this.nextRevenueId++}`,
      createdAt: new Date(),
    };

    this.revenues.push(revenue);
    return revenue;
  }

  async getCosts(workspaceId: string, start: Date, end: Date): Promise<CostEntry[]> {
    return this.costs.filter(
      (cost) =>
        cost.workspaceId === workspaceId &&
        cost.periodStart >= start &&
        cost.periodEnd <= end
    );
  }

  async getCostsByCategory(
    workspaceId: string,
    category: CostCategory,
    start: Date,
    end: Date
  ): Promise<CostEntry[]> {
    return this.costs.filter(
      (cost) =>
        cost.workspaceId === workspaceId &&
        cost.category === category &&
        cost.periodStart >= start &&
        cost.periodEnd <= end
    );
  }

  async getRevenue(workspaceId: string, start: Date, end: Date): Promise<RevenueEntry[]> {
    return this.revenues.filter(
      (revenue) =>
        revenue.workspaceId === workspaceId &&
        revenue.periodStart >= start &&
        revenue.periodEnd <= end
    );
  }

  async getTotalCosts(workspaceId: string, start: Date, end: Date): Promise<number> {
    const costs = await this.getCosts(workspaceId, start, end);
    return costs.reduce((sum, cost) => sum + cost.amountCents, 0);
  }

  async getTotalRevenue(workspaceId: string, start: Date, end: Date): Promise<number> {
    const revenues = await this.getRevenue(workspaceId, start, end);
    return revenues.reduce((sum, revenue) => sum + revenue.amountCents, 0);
  }

  // Test helpers
  clear(): void {
    this.costs = [];
    this.revenues = [];
    this.nextCostId = 1;
    this.nextRevenueId = 1;
  }

  getAllCosts(): CostEntry[] {
    return [...this.costs];
  }

  getAllRevenues(): RevenueEntry[] {
    return [...this.revenues];
  }
}

/**
 * Mock Rate Limit Store
 */
export class MockRateLimitStore implements RateLimitStore {
  private states: Map<string, RateLimitState> = new Map();
  private globalStates: Map<RateLimitService, RateLimitState> = new Map();
  private overrides: Map<string, RateLimitOverrideToken[]> = new Map();

  async getState(workspaceId: string, service: RateLimitService): Promise<RateLimitState | null> {
    const key = `${workspaceId}:${service}`;
    return this.states.get(key) || null;
  }

  async incrementRequests(
    workspaceId: string,
    service: RateLimitService,
    count: number = 1
  ): Promise<RateLimitState> {
    const key = `${workspaceId}:${service}`;
    let state = this.states.get(key);

    if (!state) {
      // Initialize new state
      state = {
        workspaceId,
        service,
        currentRequests: 0,
        maxRequests: 100, // Default
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000), // 1 minute
        remainingRequests: 100,
        isThrottled: false,
      };
    }

    state.currentRequests += count;
    state.remainingRequests = Math.max(0, state.maxRequests - state.currentRequests);

    this.states.set(key, state);
    return state;
  }

  async getGlobalState(service: RateLimitService): Promise<RateLimitState | null> {
    return this.globalStates.get(service) || null;
  }

  async incrementGlobalRequests(
    service: RateLimitService,
    count: number = 1
  ): Promise<RateLimitState> {
    let state = this.globalStates.get(service);

    if (!state) {
      state = {
        workspaceId: 'global',
        service,
        currentRequests: 0,
        maxRequests: 10000, // Default global limit
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
        remainingRequests: 10000,
        isThrottled: false,
      };
    }

    state.currentRequests += count;
    state.remainingRequests = Math.max(0, state.maxRequests - state.currentRequests);

    this.globalStates.set(service, state);
    return state;
  }

  async resetWindow(workspaceId: string, service: RateLimitService): Promise<void> {
    const key = `${workspaceId}:${service}`;
    const state = this.states.get(key);

    if (state) {
      state.currentRequests = 0;
      state.remainingRequests = state.maxRequests;
      state.windowStart = new Date();
      state.windowEnd = new Date(Date.now() + 60000);
      this.states.set(key, state);
    }
  }

  async applyOverride(token: RateLimitOverrideToken): Promise<void> {
    const overrides = this.overrides.get(token.workspaceId) || [];
    overrides.push(token);
    this.overrides.set(token.workspaceId, overrides);
  }

  async getActiveOverrides(workspaceId: string): Promise<RateLimitOverrideToken[]> {
    const overrides = this.overrides.get(workspaceId) || [];
    const now = new Date();

    return overrides.filter(
      (override) => override.validFrom <= now && override.validUntil >= now
    );
  }

  // Test helpers
  clear(): void {
    this.states.clear();
    this.globalStates.clear();
    this.overrides.clear();
  }

  setState(workspaceId: string, service: RateLimitService, state: RateLimitState): void {
    const key = `${workspaceId}:${service}`;
    this.states.set(key, state);
  }

  setGlobalState(service: RateLimitService, state: RateLimitState): void {
    this.globalStates.set(service, state);
  }

  getAllStates(): Map<string, RateLimitState> {
    return new Map(this.states);
  }

  getAllGlobalStates(): Map<RateLimitService, RateLimitState> {
    return new Map(this.globalStates);
  }
}

/**
 * Test Data Factory
 * 
 * Helper to generate test data.
 */
export class TestDataFactory {
  /**
   * Create sample cost entry
   */
  static createCostEntry(overrides?: Partial<Omit<CostEntry, 'id' | 'createdAt'>>): Omit<CostEntry, 'id' | 'createdAt'> {
    return {
      workspaceId: 'ws_test',
      category: CostCategory.MANAGED_SERVICE,
      source: 'apify_scraping' as any,
      amountCents: 1000,
      currency: 'USD',
      unitsConsumed: 100,
      unitType: 'requests',
      unitCostCents: 10,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      metadata: {},
      ...overrides,
    };
  }

  /**
   * Create sample revenue entry
   */
  static createRevenueEntry(overrides?: Partial<Omit<RevenueEntry, 'id' | 'createdAt'>>): Omit<RevenueEntry, 'id' | 'createdAt'> {
    return {
      workspaceId: 'ws_test',
      source: 'subscription_fee' as any,
      amountCents: 9900, // $99
      currency: 'USD',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      metadata: {},
      ...overrides,
    };
  }

  /**
   * Create sample rate limit state
   */
  static createRateLimitState(
    workspaceId: string,
    service: RateLimitService,
    overrides?: Partial<RateLimitState>
  ): RateLimitState {
    return {
      workspaceId,
      service,
      currentRequests: 0,
      maxRequests: 100,
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 60000),
      remainingRequests: 100,
      isThrottled: false,
      ...overrides,
    };
  }

  /**
   * Create sample override token
   */
  static createOverrideToken(
    workspaceId: string,
    service: RateLimitService,
    overrides?: Partial<RateLimitOverrideToken>
  ): RateLimitOverrideToken {
    const now = new Date();
    return {
      id: `override_${Date.now()}`,
      workspaceId,
      service,
      overrideLimit: 200,
      validFrom: now,
      validUntil: new Date(now.getTime() + 86400000), // 24 hours
      reason: 'Test override',
      issuedBy: 'admin_test',
      metadata: {},
      createdAt: now,
      ...overrides,
    };
  }

  /**
   * Create realistic margin report data
   */
  static createMarginReportData(workspaceId: string = 'ws_test') {
    const periodStart = new Date('2026-01-01');
    const periodEnd = new Date('2026-01-31');

    const costs: Array<Omit<CostEntry, 'id' | 'createdAt'>> = [
      // Infrastructure
      {
        workspaceId,
        category: CostCategory.INFRASTRUCTURE,
        source: 'droplet' as any,
        amountCents: 600, // $6
        currency: 'USD',
        unitsConsumed: 1,
        unitType: 'month',
        unitCostCents: 600,
        periodStart,
        periodEnd,
        metadata: {},
      },
      {
        workspaceId,
        category: CostCategory.INFRASTRUCTURE,
        source: 'bandwidth' as any,
        amountCents: 80, // $0.80
        currency: 'USD',
        unitsConsumed: 8,
        unitType: 'GB',
        unitCostCents: 10,
        periodStart,
        periodEnd,
        metadata: {},
      },
      // Managed Services
      {
        workspaceId,
        category: CostCategory.MANAGED_SERVICE,
        source: 'apify_scraping' as any,
        amountCents: 1155, // $11.55
        currency: 'USD',
        unitsConsumed: 770,
        unitType: 'scrapes',
        unitCostCents: 2, // $0.015 wholesale
        periodStart,
        periodEnd,
        metadata: {},
      },
      {
        workspaceId,
        category: CostCategory.MANAGED_SERVICE,
        source: 'google_cse' as any,
        amountCents: 360, // $3.60
        currency: 'USD',
        unitsConsumed: 900,
        unitType: 'searches',
        unitCostCents: 0, // $0.004 wholesale
        periodStart,
        periodEnd,
        metadata: {},
      },
      // Shared Overhead
      {
        workspaceId,
        category: CostCategory.SHARED_OVERHEAD,
        source: 'redis_cache' as any,
        amountCents: 5,
        currency: 'USD',
        unitsConsumed: 1,
        unitType: 'allocation',
        unitCostCents: 5,
        periodStart,
        periodEnd,
        metadata: {},
      },
    ];

    const revenues: Array<Omit<RevenueEntry, 'id' | 'createdAt'>> = [
      // Subscription
      {
        workspaceId,
        source: 'subscription_fee' as any,
        amountCents: 9900, // $99
        currency: 'USD',
        periodStart,
        periodEnd,
        metadata: {},
      },
      // Wallet usage
      {
        workspaceId,
        source: 'wallet_usage' as any,
        amountCents: 1540, // $15.40
        currency: 'USD',
        periodStart,
        periodEnd,
        metadata: { service: 'apify' },
      },
      {
        workspaceId,
        source: 'wallet_usage' as any,
        amountCents: 450, // $4.50
        currency: 'USD',
        periodStart,
        periodEnd,
        metadata: { service: 'cse' },
      },
      {
        workspaceId,
        source: 'wallet_usage' as any,
        amountCents: 210, // $2.10
        currency: 'USD',
        periodStart,
        periodEnd,
        metadata: { service: 'proxies' },
      },
    ];

    return { costs, revenues, periodStart, periodEnd };
  }
}
