/**
 * PHASE 58 TESTS: KILL-SWITCH SYSTEM
 */

import { KillSwitchManager } from '@/lib/genesis/phase58/kill-switch';
import { MockWalletDB, MockTransactionDB } from '@/lib/genesis/phase58/mocks';
import { WalletType, WalletStatus, LimitAction, AlertChannel, TopupStrategy } from '@/lib/genesis/phase58/types';

describe('Phase 58: Kill-Switch System', () => {
  let walletDB: MockWalletDB;
  let transactionDB: MockTransactionDB;
  let manager: KillSwitchManager;

  beforeEach(() => {
    walletDB = new MockWalletDB();
    transactionDB = new MockTransactionDB();
    manager = new KillSwitchManager(walletDB, transactionDB);
  });

  describe('preFlightCheck', () => {
    test('should approve when balance sufficient', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 5000,
        reservedCents: 0,
        lifetimeDepositsCents: 5000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: TopupStrategy.FIXED_AMOUNT, thresholdCents: 500, config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      const result = await manager.preFlightCheck({
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        estimatedCostCents: 200,
      });

      expect(result.approved).toBe(true);
      expect(result.currentBalanceCents).toBe(5000);
      expect(result.projectedBalanceCents).toBe(4800);
    });

    test('should deny when balance insufficient', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 300,
        reservedCents: 0,
        lifetimeDepositsCents: 300,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: TopupStrategy.FIXED_AMOUNT, thresholdCents: 500, config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      const result = await manager.preFlightCheck({
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        estimatedCostCents: 200,
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toContain('requires minimum');
    });

    test('should deny when wallet not found', async () => {
      const result = await manager.preFlightCheck({
        workspaceId: 'non_existent',
        serviceId: 'apify_managed',
        estimatedCostCents: 200,
      });

      expect(result.approved).toBe(false);
      expect(result.reason).toBe('Wallet not found');
    });

    test('should respect reserved funds', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 5000,
        reservedCents: 4000, // Heavy reservation
        lifetimeDepositsCents: 5000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: TopupStrategy.FIXED_AMOUNT, thresholdCents: 500, config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      const result = await manager.preFlightCheck({
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        estimatedCostCents: 500, // Only 1000 available
      });

      expect(result.approved).toBe(true);
      expect(result.projectedBalanceCents).toBe(500); // 1000 - 500
    });
  });

  describe('generateOverrideToken', () => {
    test('should generate override token', () => {
      const result = manager.generateOverrideToken({
        workspaceId: 'ws_1',
        durationHours: 24,
        reason: 'Emergency maintenance',
      });

      expect(result.token).toMatch(/^ko_/);
      expect(result.token.length).toBeGreaterThan(10);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    test('should set correct expiration time', () => {
      const now = new Date();
      const result = manager.generateOverrideToken({
        workspaceId: 'ws_1',
        durationHours: 48,
        reason: 'Test',
      });

      const expectedExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const diff = Math.abs(result.expiresAt.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('batchPreFlightCheck', () => {
    test('should check multiple services', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 10000,
        reservedCents: 0,
        lifetimeDepositsCents: 10000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: TopupStrategy.FIXED_AMOUNT, thresholdCents: 500, config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      const results = await manager.batchPreFlightCheck([
        {
          workspaceId: 'ws_1',
          serviceId: 'apify_managed',
          estimatedCostCents: 200,
        },
        {
          workspaceId: 'ws_1',
          serviceId: 'google_cse',
          estimatedCostCents: 50,
        },
      ]);

      expect(results.length).toBe(2);
      expect(results[0].approved).toBe(true);
      expect(results[1].approved).toBe(true);
    });
  });
});
