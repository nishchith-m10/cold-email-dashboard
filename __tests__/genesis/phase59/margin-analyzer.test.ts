/**
 * PHASE 59 TESTS: MARGIN ANALYZER
 */

import { MarginAnalyzer, MarginReportFormatter } from '@/lib/genesis/phase59/margin-analyzer';
import { CostLedgerManager } from '@/lib/genesis/phase59/cost-ledger';
import { MockCostLedgerDB, TestDataFactory } from '@/lib/genesis/phase59/mocks';

describe('Phase 59: Margin Analyzer', () => {
  let db: MockCostLedgerDB;
  let costLedger: CostLedgerManager;
  let analyzer: MarginAnalyzer;

  beforeEach(() => {
    db = new MockCostLedgerDB();
    costLedger = new CostLedgerManager(db);
    analyzer = new MarginAnalyzer(costLedger);
  });

  describe('generateMarginReport', () => {
    test('should generate report with realistic data', async () => {
      const { costs, revenues, periodStart, periodEnd } = TestDataFactory.createMarginReportData();

      // Record all costs and revenues
      await costLedger.bulkRecordCosts(costs);
      await costLedger.bulkRecordRevenue(revenues);

      const report = await analyzer.generateMarginReport({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
      });

      expect(report).toBeDefined();
      expect(report.workspaceId).toBe('ws_test');
      expect(report.revenue.totalRevenueCents).toBe(12100); // $121
      expect(report.costs.totalCostsCents).toBe(2200); // $22
      expect(report.margin.grossProfitCents).toBe(9900); // $99
      expect(report.margin.isProfitable).toBe(true);
    });

    test('should calculate correct margin percentage', async () => {
      const { costs, revenues, periodStart, periodEnd } = TestDataFactory.createMarginReportData();

      await costLedger.bulkRecordCosts(costs);
      await costLedger.bulkRecordRevenue(revenues);

      const report = await analyzer.generateMarginReport({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
      });

      // (12100 - 2200) / 12100 * 100 = 81.82%
      expect(report.margin.grossMarginPercent).toBeCloseTo(81.82, 0);
    });

    test('should handle zero revenue', async () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart,
        periodEnd,
      });

      const report = await analyzer.generateMarginReport({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
      });

      expect(report.revenue.totalRevenueCents).toBe(0);
      expect(report.margin.grossMarginPercent).toBe(0);
      expect(report.margin.isProfitable).toBe(false);
    });

    test('should handle zero costs', async () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      await costLedger.recordRevenue({
        workspaceId: 'ws_test',
        source: 'subscription_fee' as any,
        amountCents: 9900,
        periodStart,
        periodEnd,
      });

      const report = await analyzer.generateMarginReport({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
      });

      expect(report.costs.totalCostsCents).toBe(0);
      expect(report.margin.grossMarginPercent).toBe(100);
      expect(report.margin.isProfitable).toBe(true);
    });

    test('should calculate break-even correctly', async () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      await costLedger.recordRevenue({
        workspaceId: 'ws_test',
        source: 'subscription_fee' as any,
        amountCents: 5000,
        periodStart,
        periodEnd,
      });

      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 10000,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart,
        periodEnd,
      });

      const report = await analyzer.generateMarginReport({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
      });

      expect(report.margin.breakEven.coverageRatio).toBe(0.5); // 5000 / 10000
      expect(report.margin.breakEven.requiredMonthlyCents).toBe(10000);
    });
  });

  describe('getTopCostDrivers', () => {
    test('should identify top cost sources', async () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 600,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart,
        periodEnd,
      });

      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'managed_service' as any,
        source: 'apify_scraping' as any,
        amountCents: 2000,
        unitsConsumed: 100,
        unitType: 'requests',
        periodStart,
        periodEnd,
      });

      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'managed_service' as any,
        source: 'google_cse' as any,
        amountCents: 400,
        unitsConsumed: 100,
        unitType: 'searches',
        periodStart,
        periodEnd,
      });

      const drivers = await analyzer.getTopCostDrivers({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
        limit: 2,
      });

      expect(drivers.length).toBe(2);
      expect(drivers[0].source).toBe('apify_scraping');
      expect(drivers[0].amountCents).toBe(2000);
      expect(drivers[0].percentOfTotal).toBeCloseTo(66.67, 0);
    });
  });

  describe('calculateUnitEconomics', () => {
    test('should calculate per-user metrics', async () => {
      const { costs, revenues, periodStart, periodEnd } = TestDataFactory.createMarginReportData();

      await costLedger.bulkRecordCosts(costs);
      await costLedger.bulkRecordRevenue(revenues);

      const unitEconomics = await analyzer.calculateUnitEconomics({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
        totalUsers: 10,
      });

      expect(unitEconomics.revenuePerUser).toBe(1210); // 12100 / 10
      expect(unitEconomics.costPerUser).toBe(220); // 2200 / 10
      expect(unitEconomics.profitPerUser).toBe(990); // 9900 / 10
    });

    test('should calculate per-transaction metrics', async () => {
      const { costs, revenues, periodStart, periodEnd } = TestDataFactory.createMarginReportData();

      await costLedger.bulkRecordCosts(costs);
      await costLedger.bulkRecordRevenue(revenues);

      const unitEconomics = await analyzer.calculateUnitEconomics({
        workspaceId: 'ws_test',
        periodStart,
        periodEnd,
        totalTransactions: 100,
      });

      expect(unitEconomics.revenuePerTransaction).toBe(121); // 12100 / 100
      expect(unitEconomics.costPerTransaction).toBe(22); // 2200 / 100
    });
  });

  describe('projectCustomerLifetimeValue', () => {
    test('should calculate CLV with realistic churn', async () => {
      const clv = await analyzer.projectCustomerLifetimeValue({
        workspaceId: 'ws_test',
        monthlyRevenueCents: 9900,
        monthlyChurnRate: 0.05, // 5% monthly churn
        averageMarginPercent: 80,
      });

      expect(clv.expectedMonths).toBe(20); // 1 / 0.05
      expect(clv.lifetimeValueCents).toBe(198000); // 9900 * 20
      expect(clv.totalProfitCents).toBe(158400); // 198000 * 0.8
    });

    test('should handle zero churn', async () => {
      const clv = await analyzer.projectCustomerLifetimeValue({
        workspaceId: 'ws_test',
        monthlyRevenueCents: 9900,
        monthlyChurnRate: 0,
        averageMarginPercent: 80,
      });

      expect(clv.expectedMonths).toBe(120); // Capped at 10 years
    });
  });

  describe('compareWorkspaceMargins', () => {
    test('should compare multiple workspaces', async () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      // Workspace 1: High margin
      await costLedger.recordRevenue({
        workspaceId: 'ws_1',
        source: 'subscription_fee' as any,
        amountCents: 10000,
        periodStart,
        periodEnd,
      });
      await costLedger.recordCost({
        workspaceId: 'ws_1',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 1000,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart,
        periodEnd,
      });

      // Workspace 2: Low margin
      await costLedger.recordRevenue({
        workspaceId: 'ws_2',
        source: 'subscription_fee' as any,
        amountCents: 10000,
        periodStart,
        periodEnd,
      });
      await costLedger.recordCost({
        workspaceId: 'ws_2',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 8000,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart,
        periodEnd,
      });

      const comparison = await analyzer.compareWorkspaceMargins({
        workspaceIds: ['ws_1', 'ws_2'],
        periodStart,
        periodEnd,
      });

      expect(comparison.length).toBe(2);
      expect(comparison[0].workspaceId).toBe('ws_1'); // Sorted by margin
      expect(comparison[0].marginPercent).toBeGreaterThan(comparison[1].marginPercent);
    });
  });

  describe('calculateProfitabilityTrend', () => {
    test('should calculate trend over multiple periods', async () => {
      // January
      await costLedger.recordRevenue({
        workspaceId: 'ws_test',
        source: 'subscription_fee' as any,
        amountCents: 9900,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });
      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 1000,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });

      // February
      await costLedger.recordRevenue({
        workspaceId: 'ws_test',
        source: 'subscription_fee' as any,
        amountCents: 9900,
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
      });
      await costLedger.recordCost({
        workspaceId: 'ws_test',
        category: 'infrastructure' as any,
        source: 'droplet' as any,
        amountCents: 800,
        unitsConsumed: 1,
        unitType: 'month',
        periodStart: new Date('2026-02-01'),
        periodEnd: new Date('2026-02-28'),
      });

      const trend = await analyzer.calculateProfitabilityTrend({
        workspaceId: 'ws_test',
        periods: [
          { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
          { start: new Date('2026-02-01'), end: new Date('2026-02-28') },
        ],
      });

      expect(trend.length).toBe(2);
      expect(trend[0].grossProfitCents).toBe(8900); // January
      expect(trend[1].grossProfitCents).toBe(9100); // February (improved)
    });
  });
});

describe('Phase 59: Margin Report Formatter', () => {
  test('should format report as text', async () => {
    const db = new MockCostLedgerDB();
    const costLedger = new CostLedgerManager(db);
    const analyzer = new MarginAnalyzer(costLedger);

    const { costs, revenues, periodStart, periodEnd } = TestDataFactory.createMarginReportData();

    await costLedger.bulkRecordCosts(costs);
    await costLedger.bulkRecordRevenue(revenues);

    const report = await analyzer.generateMarginReport({
      workspaceId: 'ws_test',
      periodStart,
      periodEnd,
    });

    const text = MarginReportFormatter.formatAsText(report);

    expect(text).toContain('PER-TENANT MARGIN REPORT');
    expect(text).toContain('ws_test');
    expect(text).toContain('REVENUE');
    expect(text).toContain('COSTS');
    expect(text).toContain('MARGIN');
  });

  test('should format report as JSON', async () => {
    const db = new MockCostLedgerDB();
    const costLedger = new CostLedgerManager(db);
    const analyzer = new MarginAnalyzer(costLedger);

    const { costs, revenues, periodStart, periodEnd } = TestDataFactory.createMarginReportData();

    await costLedger.bulkRecordCosts(costs);
    await costLedger.bulkRecordRevenue(revenues);

    const report = await analyzer.generateMarginReport({
      workspaceId: 'ws_test',
      periodStart,
      periodEnd,
    });

    const json = MarginReportFormatter.formatAsJSON(report);
    const parsed = JSON.parse(json);

    expect(parsed.workspaceId).toBe('ws_test');
    expect(parsed.revenue).toBeDefined();
    expect(parsed.costs).toBeDefined();
    expect(parsed.margin).toBeDefined();
  });

  test('should format multiple reports as CSV', () => {
    const reports = [
      {
        workspaceId: 'ws_1',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        revenue: { totalRevenueCents: 10000 } as any,
        costs: { totalCostsCents: 2000 } as any,
        margin: { grossProfitCents: 8000, grossMarginPercent: 80 } as any,
        generatedAt: new Date(),
      },
    ];

    const csv = MarginReportFormatter.formatAsCSV(reports);

    expect(csv).toContain('Workspace ID');
    expect(csv).toContain('Total Revenue');
    expect(csv).toContain('ws_1');
    expect(csv).toContain('100.00'); // $100 revenue
    expect(csv).toContain('20.00'); // $20 costs
  });
});
