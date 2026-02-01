/**
 * PHASE 58 TESTS: AUTO-TOPUP SYSTEM
 */

import { AutoTopupManager, TopupStrategyRecommender } from '@/lib/genesis/phase58/auto-topup';
import { WalletManager } from '@/lib/genesis/phase58/wallet-core';
import { TransactionManager } from '@/lib/genesis/phase58/transaction-manager';
import { MockWalletDB, MockTransactionDB, MockPaymentMethodDB } from '@/lib/genesis/phase58/mocks';
import {
  TopupStrategy,
  WalletType,
  WalletStatus,
  LimitAction,
  AlertChannel,
} from '@/lib/genesis/phase58/types';

describe('Phase 58: Auto-Topup System', () => {
  let walletDB: MockWalletDB;
  let transactionDB: MockTransactionDB;
  let paymentMethodDB: MockPaymentMethodDB;
  let walletManager: WalletManager;
  let transactionManager: TransactionManager;
  let autoTopupManager: AutoTopupManager;

  beforeEach(() => {
    walletDB = new MockWalletDB();
    transactionDB = new MockTransactionDB();
    paymentMethodDB = new MockPaymentMethodDB();
    walletManager = new WalletManager(walletDB);
    transactionManager = new TransactionManager(transactionDB, walletDB);
    autoTopupManager = new AutoTopupManager(
      walletDB,
      walletManager,
      transactionManager,
      transactionDB,
      paymentMethodDB
    );
  });

  describe('shouldTriggerTopup', () => {
    test('should trigger when below threshold', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 400, // Below 500 threshold
        reservedCents: 0,
        lifetimeDepositsCents: 5000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: {
          enabled: true,
          strategy: TopupStrategy.FIXED_AMOUNT,
          thresholdCents: 500,
          config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 },
          topupCountThisPeriod: 0,
        },
        lastTransactionAt: new Date(),
      });

      const shouldTrigger = await autoTopupManager.shouldTriggerTopup('ws_1');
      expect(shouldTrigger).toBe(true);
    });

    test('should not trigger when above threshold', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 6000, // Above 500 threshold
        reservedCents: 0,
        lifetimeDepositsCents: 6000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: {
          enabled: true,
          strategy: TopupStrategy.FIXED_AMOUNT,
          thresholdCents: 500,
          config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 },
          topupCountThisPeriod: 0,
        },
        lastTransactionAt: new Date(),
      });

      const shouldTrigger = await autoTopupManager.shouldTriggerTopup('ws_1');
      expect(shouldTrigger).toBe(false);
    });

    test('should not trigger when disabled', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 400,
        reservedCents: 0,
        lifetimeDepositsCents: 5000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: {
          enabled: false, // Disabled
          strategy: TopupStrategy.FIXED_AMOUNT,
          thresholdCents: 500,
          config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 },
          topupCountThisPeriod: 0,
        },
        lastTransactionAt: new Date(),
      });

      const shouldTrigger = await autoTopupManager.shouldTriggerTopup('ws_1');
      expect(shouldTrigger).toBe(false);
    });

    test('should respect reserved funds in threshold check', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 1000,
        reservedCents: 700, // Only 300 available
        lifetimeDepositsCents: 5000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: {
          enabled: true,
          strategy: TopupStrategy.FIXED_AMOUNT,
          thresholdCents: 500,
          config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 },
          topupCountThisPeriod: 0,
        },
        lastTransactionAt: new Date(),
      });

      const shouldTrigger = await autoTopupManager.shouldTriggerTopup('ws_1');
      expect(shouldTrigger).toBe(true); // 300 < 500
    });
  });

  describe('executeTopup', () => {
    test('should execute fixed amount topup', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 400,
        reservedCents: 0,
        lifetimeDepositsCents: 400,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: {
          enabled: true,
          strategy: TopupStrategy.FIXED_AMOUNT,
          thresholdCents: 500,
          config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 },
          topupCountThisPeriod: 0,
        },
        lastTransactionAt: new Date(),
      });

      const result = await autoTopupManager.executeTopup('ws_1');

      expect(result.success).toBe(true);
      expect(result.amountCents).toBe(5000);
      expect(result.newBalanceCents).toBe(5400); // 400 + 5000
    });

    test('should return error when wallet not found', async () => {
      const result = await autoTopupManager.executeTopup('non_existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not found');
    });

    test('should return error when auto-topup disabled', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 400,
        reservedCents: 0,
        lifetimeDepositsCents: 400,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: {
          enabled: false,
          strategy: TopupStrategy.FIXED_AMOUNT,
          thresholdCents: 500,
          config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 },
          topupCountThisPeriod: 0,
        },
        lastTransactionAt: new Date(),
      });

      const result = await autoTopupManager.executeTopup('ws_1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auto-topup not enabled');
    });
  });

  describe('TopupStrategyRecommender', () => {
    test('should recommend fixed amount for new workspaces', async () => {
      const recommender = new TopupStrategyRecommender(transactionDB);

      const recommendation = await recommender.recommendStrategy('ws_new');

      expect(recommendation.recommendedStrategy).toBe(TopupStrategy.FIXED_AMOUNT);
      expect(recommendation.reason).toContain('No transaction history');
    });
  });
});
