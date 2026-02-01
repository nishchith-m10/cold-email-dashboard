/**
 * PHASE 58 TESTS: TRANSACTION MANAGER
 */

import { TransactionManager, TransactionAnalytics } from '@/lib/genesis/phase58/transaction-manager';
import { MockWalletDB, MockTransactionDB, MockAuditLogDB } from '@/lib/genesis/phase58/mocks';
import {
  TransactionType,
  TransactionCategory,
  TransactionDirection,
  TransactionStatus,
  WalletType,
  WalletStatus,
  LimitAction,
  AlertChannel,
  TopupStrategy,
} from '@/lib/genesis/phase58/types';

describe('Phase 58: Transaction Manager', () => {
  let walletDB: MockWalletDB;
  let transactionDB: MockTransactionDB;
  let auditDB: MockAuditLogDB;
  let manager: TransactionManager;

  beforeEach(() => {
    walletDB = new MockWalletDB();
    transactionDB = new MockTransactionDB();
    auditDB = new MockAuditLogDB();
    manager = new TransactionManager(transactionDB, walletDB, auditDB);
  });

  describe('createTransaction', () => {
    test('should create credit transaction', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 1000,
        reservedCents: 0,
        lifetimeDepositsCents: 1000,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: TopupStrategy.FIXED_AMOUNT, thresholdCents: 500, config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.DEPOSIT,
        amountCents: 5000,
        description: 'Test deposit',
      });

      expect(transaction.type).toBe(TransactionType.DEPOSIT);
      expect(transaction.amountCents).toBe(5000);
      expect(transaction.category).toBe(TransactionCategory.FUNDING);
      expect(transaction.direction).toBe(TransactionDirection.CREDIT);
    });

    test('should create debit transaction', async () => {
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

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Apify scrape',
      });

      expect(transaction.type).toBe(TransactionType.APIFY_SCRAPE);
      expect(transaction.direction).toBe(TransactionDirection.DEBIT);
      expect(transaction.category).toBe(TransactionCategory.SERVICE_USAGE);
    });

    test('should throw error for insufficient balance', async () => {
      await walletDB.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.PRODUCTION,
        status: WalletStatus.ACTIVE,
        balanceCents: 100,
        reservedCents: 0,
        lifetimeDepositsCents: 100,
        lifetimeUsageCents: 0,
        limits: { limitAction: LimitAction.WARN },
        alerts: { at75Percent: true, at50Percent: true, at25Percent: true, at10Percent: true, channels: [AlertChannel.EMAIL] },
        autoTopup: { enabled: false, strategy: TopupStrategy.FIXED_AMOUNT, thresholdCents: 500, config: { strategy: TopupStrategy.FIXED_AMOUNT, amountCents: 5000 }, topupCountThisPeriod: 0 },
        lastTransactionAt: new Date(),
      });

      await expect(
        manager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 200,
          description: 'Test',
        })
      ).rejects.toThrow('Insufficient balance');
    });

    test('should update wallet balance on transaction', async () => {
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

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
      });

      const wallet = await walletDB.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(4800);
    });

    test('should settle transaction automatically', async () => {
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

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.DEPOSIT,
        amountCents: 1000,
        description: 'Test deposit',
      });

      expect(transaction.status).toBe(TransactionStatus.SETTLED);
      expect(transaction.settledAt).toBeDefined();
    });
  });

  describe('refundTransaction', () => {
    test('should refund a transaction', async () => {
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

      const original = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Apify scrape',
      });

      const refund = await manager.refundTransaction({
        transactionId: original.id,
        reason: 'Failed scrape',
      });

      expect(refund.type).toBe(TransactionType.REFUND);
      expect(refund.amountCents).toBe(200);
      expect(refund.direction).toBe(TransactionDirection.CREDIT);
    });

    test('should handle partial refund', async () => {
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

      const original = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Apify scrape',
      });

      const refund = await manager.refundTransaction({
        transactionId: original.id,
        reason: 'Partial failure',
        amountCents: 100,
      });

      expect(refund.amountCents).toBe(100);
    });

    test('should throw error for non-existent transaction', async () => {
      await expect(
        manager.refundTransaction({
          transactionId: 'non_existent',
          reason: 'test',
        })
      ).rejects.toThrow('Transaction not found');
    });

    test('should throw error for already refunded transaction', async () => {
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

      const original = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
      });

      await manager.refundTransaction({
        transactionId: original.id,
        reason: 'First refund',
      });

      await expect(
        manager.refundTransaction({
          transactionId: original.id,
          reason: 'Second refund',
        })
      ).rejects.toThrow('Transaction already refunded');
    });
  });

  describe('disputeTransaction', () => {
    test('should dispute a transaction', async () => {
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

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
      });

      const disputed = await manager.disputeTransaction({
        transactionId: transaction.id,
        reason: 'Unauthorized charge',
      });

      expect(disputed.status).toBe(TransactionStatus.DISPUTED);
    });

    test('should throw error for already disputed transaction', async () => {
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

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
      });

      await manager.disputeTransaction({
        transactionId: transaction.id,
        reason: 'First dispute',
      });

      await expect(
        manager.disputeTransaction({
          transactionId: transaction.id,
          reason: 'Second dispute',
        })
      ).rejects.toThrow('Transaction already disputed');
    });
  });

  describe('resolveDispute', () => {
    test('should approve dispute and refund', async () => {
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

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
      });

      await manager.disputeTransaction({
        transactionId: transaction.id,
        reason: 'Test dispute',
      });

      const resolved = await manager.resolveDispute({
        transactionId: transaction.id,
        approved: true,
        resolution: 'User was correct',
      });

      expect(resolved.type).toBe(TransactionType.REFUND);
    });

    test('should deny dispute and restore to settled', async () => {
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

      const transaction = await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
      });

      await manager.disputeTransaction({
        transactionId: transaction.id,
        reason: 'Test dispute',
      });

      const resolved = await manager.resolveDispute({
        transactionId: transaction.id,
        approved: false,
        resolution: 'Charge was valid',
      });

      expect(resolved.status).toBe(TransactionStatus.SETTLED);
    });
  });

  describe('listTransactions', () => {
    test('should list all transactions for workspace', async () => {
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

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.DEPOSIT,
        amountCents: 1000,
        description: 'Deposit 1',
      });

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Scrape 1',
      });

      const transactions = await manager.listTransactions({ workspaceId: 'ws_1' });
      expect(transactions.length).toBe(2);
    });

    test('should filter by transaction type', async () => {
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

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.DEPOSIT,
        amountCents: 1000,
        description: 'Deposit',
      });

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Scrape',
      });

      const deposits = await manager.listTransactions({
        workspaceId: 'ws_1',
        type: TransactionType.DEPOSIT,
      });

      expect(deposits.length).toBe(1);
      expect(deposits[0].type).toBe(TransactionType.DEPOSIT);
    });
  });

  describe('TransactionAnalytics', () => {
    test('should calculate total spent in period', async () => {
      const analytics = new TransactionAnalytics(transactionDB);

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

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Scrape 1',
      });

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.CSE_SEARCH,
        amountCents: 50,
        description: 'Search 1',
      });

      const total = await analytics.getTotalSpent(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-12-31')
      );

      expect(total).toBe(250);
    });

    test('should get spending by service', async () => {
      const analytics = new TransactionAnalytics(transactionDB);

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

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test',
        metadata: { serviceId: 'apify_managed' },
      });

      await manager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.CSE_SEARCH,
        amountCents: 50,
        description: 'Test',
        metadata: { serviceId: 'google_cse' },
      });

      const byService = await analytics.getSpendingByService(
        'ws_1',
        new Date('2026-01-01'),
        new Date('2026-12-31')
      );

      expect(byService['apify_managed']).toBe(200);
      expect(byService['google_cse']).toBe(50);
    });
  });
});
