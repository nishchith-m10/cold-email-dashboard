/**
 * PHASE 59 TESTS: COST LEDGER MANAGER
 */

import { CostLedgerManager, CostValidator } from '@/lib/genesis/phase59/cost-ledger';
import { MockCostLedgerDB, TestDataFactory } from '@/lib/genesis/phase59/mocks';
import { CostCategory, CostSource, RevenueSource } from '@/lib/genesis/phase59/types';

describe('Phase 59: Cost Ledger Manager', () => {
  let db: MockCostLedgerDB;
  let manager: CostLedgerManager;

  beforeEach(() => {
    db = new MockCostLedgerDB();
    manager = new CostLedgerManager(db);
  });

  describe('recordCost', () => {
    test('should record cost with valid data', async () => {
      const cost = await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      expect(cost.id).toBeDefined();
      expect(cost.workspaceId).toBe('ws_1');
      expect(cost.amountCents).toBe(600);
      expect(cost.unitCostCents).toBe(600);
    });

    test('should calculate unit cost correctly', async () => {
      const cost = await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.MANAGED_SERVICE,
        source: CostSource.APIFY_SCRAPING,
        amountCents: 1000,
        unitsConsumed: 100,
        unitType: 'requests',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      expect(cost.unitCostCents).toBe(10); // 1000 / 100
    });

    test('should reject empty workspace ID', async () => {
      await expect(
        manager.recordCost({
          workspaceId: '',
          category: CostCategory.INFRASTRUCTURE,
          source: CostSource.DROPLET,
          amountCents: 600,
          unitsConsumed: 1,
          unitType: 'month',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
        })
      ).rejects.toThrow('Workspace ID is required');
    });

    test('should reject negative amount', async () => {
      await expect(
        manager.recordCost({
          workspaceId: 'ws_1',
          category: CostCategory.INFRASTRUCTURE,
          source: CostSource.DROPLET,
          amountCents: -100,
          unitsConsumed: 1,
          unitType: 'month',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
        })
      ).rejects.toThrow('Cost amount cannot be negative');
    });

    test('should reject negative units', async () => {
      await expect(
        manager.recordCost({
          workspaceId: 'ws_1',
          category: CostCategory.INFRASTRUCTURE,
          source: CostSource.DROPLET,
          amountCents: 100,
          unitsConsumed: -1,
          unitType: 'month',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
        })
      ).rejects.toThrow('Units consumed cannot be negative');
    });

    test('should reject invalid period', async () => {
      await expect(
        manager.recordCost({
          workspaceId: 'ws_1',
          category: CostCategory.INFRASTRUCTURE,
          source: CostSource.DROPLET,
          amountCents: 100,
          unitsConsumed: 1,
          unitType: 'month',
          periodStart: new Date('2026-01-31'),
          periodEnd: new Date('2026-01-01'),
        })
      ).rejects.toThrow('Period start must be before period end');
    });

    test('should handle zero units with zero cost', async () => {
      const cost = await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 0,
        unitsConsumed: 0,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      expect(cost.unitCostCents).toBe(0);
    });
  });

  describe('recordRevenue', () => {
    test('should record revenue with valid data', async () => {
      const revenue = await manager.recordRevenue({
        workspaceId: 'ws_1',
        source: RevenueSource.SUBSCRIPTION_FEE,
        amountCents: 9900,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      expect(revenue.id).toBeDefined();
      expect(revenue.workspaceId).toBe('ws_1');
      expect(revenue.amountCents).toBe(9900);
    });

    test('should reject negative revenue', async () => {
      await expect(
        manager.recordRevenue({
          workspaceId: 'ws_1',
          source: RevenueSource.SUBSCRIPTION_FEE,
          amountCents: -100,
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
        })
      ).rejects.toThrow('Revenue amount cannot be negative');
    });
  });

  describe('getCosts', () => {
    test('should retrieve costs for workspace in period', async () => {
      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const costs = await manager.getCosts(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(costs.length).toBe(1);
      expect(costs[0].workspaceId).toBe('ws_1');
    });

    test('should not retrieve costs outside period', async () => {
      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
      });

      const costs = await manager.getCosts(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(costs.length).toBe(0);
    });

    test('should isolate costs by workspace', async () => {
      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      await manager.recordCost({
        workspaceId: 'ws_2',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const costs = await manager.getCosts(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(costs.length).toBe(1);
      expect(costs[0].workspaceId).toBe('ws_1');
    });
  });

  describe('getCostsByCategory', () => {
    test('should filter costs by category', async () => {
      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.MANAGED_SERVICE,
        source: CostSource.APIFY_SCRAPING,
        amountCents: 1000,
        unitsConsumed: 100,
        unitType: 'requests',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const infraCosts = await manager.getCostsByCategory(
        'ws_1',
        CostCategory.INFRASTRUCTURE,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(infraCosts.length).toBe(1);
      expect(infraCosts[0].category).toBe(CostCategory.INFRASTRUCTURE);
    });
  });

  describe('getTotalCosts', () => {
    test('should sum all costs for period', async () => {
      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.INFRASTRUCTURE,
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.MANAGED_SERVICE,
        source: CostSource.APIFY_SCRAPING,
        amountCents: 1000,
        unitsConsumed: 100,
        unitType: 'requests',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const total = await manager.getTotalCosts(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(total).toBe(1600);
    });
  });

  describe('getTotalRevenue', () => {
    test('should sum all revenue for period', async () => {
      await manager.recordRevenue({
        workspaceId: 'ws_1',
        source: RevenueSource.SUBSCRIPTION_FEE,
        amountCents: 9900,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      await manager.recordRevenue({
        workspaceId: 'ws_1',
        source: RevenueSource.WALLET_USAGE,
        amountCents: 2000,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const total = await manager.getTotalRevenue(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(total).toBe(11900);
    });
  });

  describe('getCostBreakdownByCategory', () => {
    test('should group costs by category', async () => {
      await manager.recordInfrastructureCost({
        workspaceId: 'ws_1',
        source: CostSource.DROPLET,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      await manager.recordManagedServiceCost({
        workspaceId: 'ws_1',
        source: CostSource.APIFY_SCRAPING,
        amountCents: 1000,
        unitsConsumed: 100,
        unitType: 'requests',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const breakdown = await manager.getCostBreakdownByCategory(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(breakdown[CostCategory.INFRASTRUCTURE]).toBe(600);
      expect(breakdown[CostCategory.MANAGED_SERVICE]).toBe(1000);
      expect(breakdown[CostCategory.SHARED_OVERHEAD]).toBe(0);
    });
  });

  describe('bulkRecordCosts', () => {
    test('should record multiple costs', async () => {
      const costs = await manager.bulkRecordCosts([
        {
          workspaceId: 'ws_1',
          category: CostCategory.INFRASTRUCTURE,
          source: CostSource.DROPLET,
          amountCents: 600,
          unitsConsumed: 1,
          unitType: 'month',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
        },
        {
          workspaceId: 'ws_1',
          category: CostCategory.MANAGED_SERVICE,
          source: CostSource.APIFY_SCRAPING,
          amountCents: 1000,
          unitsConsumed: 100,
          unitType: 'requests',
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
        },
      ]);

      expect(costs.length).toBe(2);
    });
  });

  describe('getAverageUnitCost', () => {
    test('should calculate average unit cost', async () => {
      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.MANAGED_SERVICE,
        source: CostSource.APIFY_SCRAPING,
        amountCents: 1000,
        unitsConsumed: 100,
        unitType: 'requests',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      await manager.recordCost({
        workspaceId: 'ws_1',
        category: CostCategory.MANAGED_SERVICE,
        source: CostSource.APIFY_SCRAPING,
        amountCents: 500,
        unitsConsumed: 50,
        unitType: 'requests',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      const avg = await manager.getAverageUnitCost(
        'ws_1',
        CostSource.APIFY_SCRAPING,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(avg.totalUnits).toBe(150);
      expect(avg.averageCostCents).toBe(10); // (1000 + 500) / (100 + 50)
    });

    test('should return zero for no costs', async () => {
      const avg = await manager.getAverageUnitCost(
        'ws_1',
        CostSource.APIFY_SCRAPING,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(avg.averageCostCents).toBe(0);
      expect(avg.totalUnits).toBe(0);
    });
  });
});

describe('Phase 59: Cost Validator', () => {
  describe('validateCostEntry', () => {
    test('should validate correct cost entry', () => {
      const entry = TestDataFactory.createCostEntry();
      const cost = {
        ...entry,
        id: 'cost_1',
        createdAt: new Date(),
      };

      const result = CostValidator.validateCostEntry(cost);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    test('should detect excessive cost', () => {
      const entry = TestDataFactory.createCostEntry({ amountCents: 200_000_000 });
      const cost = {
        ...entry,
        id: 'cost_1',
        createdAt: new Date(),
      };

      const result = CostValidator.validateCostEntry(cost);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Cost amount exceeds $1M - please verify');
    });

    test('should detect unit cost mismatch', () => {
      const entry = TestDataFactory.createCostEntry({
        amountCents: 1000,
        unitsConsumed: 100,
        unitCostCents: 5, // Should be 10
      });
      const cost = {
        ...entry,
        id: 'cost_1',
        createdAt: new Date(),
      };

      const result = CostValidator.validateCostEntry(cost);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Unit cost does not match calculated value');
    });
  });
});
