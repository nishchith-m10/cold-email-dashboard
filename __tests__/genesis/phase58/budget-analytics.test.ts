/**
 * PHASE 58 TESTS: BUDGET MANAGER & ANALYTICS
 */

import { BudgetManager } from '@/lib/genesis/phase58/budget-manager';
import { FinancialAnalytics } from '@/lib/genesis/phase58/analytics';
import { MockBudgetDB, MockTransactionDB, MockWalletDB } from '@/lib/genesis/phase58/mocks';
import { BudgetPeriod, LimitAction, AlertChannel } from '@/lib/genesis/phase58/types';

describe('Phase 58: Budget Manager & Analytics', () => {
  describe('BudgetManager', () => {
    let budgetDB: MockBudgetDB;
    let manager: BudgetManager;

    beforeEach(() => {
      budgetDB = new MockBudgetDB();
      manager = new BudgetManager(budgetDB);
    });

    test('should create budget', async () => {
      const budget = await manager.createBudget({
        workspaceId: 'ws_1',
        name: 'Monthly Budget',
        period: BudgetPeriod.MONTHLY,
        totalLimitCents: 50000,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        alerts: {
          at50Percent: true,
          at75Percent: true,
          at90Percent: true,
          at100Percent: true,
          channels: [AlertChannel.EMAIL],
        },
        exceedAction: LimitAction.WARN,
      });

      expect(budget.name).toBe('Monthly Budget');
      expect(budget.totalLimitCents).toBe(50000);
      expect(budget.spentCents).toBe(0);
    });

    test('should get budget status', async () => {
      const budget = await manager.createBudget({
        workspaceId: 'ws_1',
        name: 'Test Budget',
        period: BudgetPeriod.MONTHLY,
        totalLimitCents: 10000,
        periodStart: new Date(),
        periodEnd: new Date(),
        alerts: {
          at50Percent: false,
          at75Percent: false,
          at90Percent: false,
          at100Percent: true,
          channels: [AlertChannel.EMAIL],
        },
        exceedAction: LimitAction.WARN,
      });

      await manager.trackSpending(budget.id, 3000);

      const status = await manager.getBudgetStatus(budget.id);

      expect(status.totalLimitCents).toBe(10000);
      expect(status.spentCents).toBe(3000);
      expect(status.remainingCents).toBe(7000);
      expect(status.percentageUsed).toBe(30);
      expect(status.isExceeded).toBe(false);
    });

    test('should detect budget exceeded', async () => {
      const budget = await manager.createBudget({
        workspaceId: 'ws_1',
        name: 'Test Budget',
        period: BudgetPeriod.MONTHLY,
        totalLimitCents: 1000,
        periodStart: new Date(),
        periodEnd: new Date(),
        alerts: {
          at50Percent: false,
          at75Percent: false,
          at90Percent: false,
          at100Percent: true,
          channels: [AlertChannel.EMAIL],
        },
        exceedAction: LimitAction.WARN,
      });

      await manager.trackSpending(budget.id, 1200);

      const status = await manager.getBudgetStatus(budget.id);

      expect(status.isExceeded).toBe(true);
      expect(status.percentageUsed).toBe(120);
    });
  });

  describe('FinancialAnalytics', () => {
    let transactionDB: MockTransactionDB;
    let walletDB: MockWalletDB;
    let analytics: FinancialAnalytics;

    beforeEach(() => {
      transactionDB = new MockTransactionDB();
      walletDB = new MockWalletDB();
      analytics = new FinancialAnalytics(transactionDB, walletDB);
    });

    test('should generate spending forecast', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: 'production' as any,
        status: 'active' as any,
        balanceCents: 10000,
        reservedCents: 0,
        lifetimeDepositsCents: 10000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: 'fixed_amount' as any, thresholdCents: 500, config: { strategy: 'fixed_amount' as any, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      // Create some transactions
      await transactionDB.createTransaction({
        workspaceId: 'ws_1',
        type: 'apify_scrape' as any,
        category: 'service_usage' as any,
        direction: 'debit' as any,
        amountCents: 300,
        status: 'settled' as any,
        balanceBeforeCents: 10000,
        balanceAfterCents: 9700,
        description: 'Test',
        tags: [],
        metadata: {},
      });

      const forecast = await analytics.generateSpendingForecast('ws_1');

      expect(forecast.workspaceId).toBe('ws_1');
      expect(forecast.projectedBurnRateCents).toBeGreaterThan(0);
      expect(forecast.estimatedDaysRemaining).toBeGreaterThan(0);
    });

    test('should analyze burn rate', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: 'production' as any,
        status: 'active' as any,
        balanceCents: 10000,
        reservedCents: 0,
        lifetimeDepositsCents: 10000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: 'fixed_amount' as any, thresholdCents: 500, config: { strategy: 'fixed_amount' as any, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      const analysis = await analytics.analyzeBurnRate('ws_1');

      expect(analysis.workspaceId).toBe('ws_1');
      expect(analysis.period).toBe(BudgetPeriod.WEEKLY);
      expect(analysis.trend).toBe('stable');
    });
  });
});
