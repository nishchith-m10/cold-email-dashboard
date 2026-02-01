/**
 * PHASE 58 TESTS: INTEGRATION
 * 
 * Tests for interactions between wallet, transactions, kill-switch, and auto-topup modules.
 */

import { WalletManager } from '@/lib/genesis/phase58/wallet-core';
import { TransactionManager } from '@/lib/genesis/phase58/transaction-manager';
import { KillSwitchManager } from '@/lib/genesis/phase58/kill-switch';
import { BudgetManager } from '@/lib/genesis/phase58/budget-manager';
import { MockWalletDB, MockTransactionDB, MockBudgetDB } from '@/lib/genesis/phase58/mocks';
import {
  TransactionType,
  LimitAction,
  AlertChannel,
  BudgetPeriod,
} from '@/lib/genesis/phase58/types';

describe('Phase 58: Integration Tests', () => {
  let walletDB: MockWalletDB;
  let transactionDB: MockTransactionDB;
  let budgetDB: MockBudgetDB;
  let walletManager: WalletManager;
  let transactionManager: TransactionManager;
  let killSwitchManager: KillSwitchManager;
  let budgetManager: BudgetManager;

  beforeEach(() => {
    walletDB = new MockWalletDB();
    transactionDB = new MockTransactionDB();
    budgetDB = new MockBudgetDB();
    walletManager = new WalletManager(walletDB);
    transactionManager = new TransactionManager(transactionDB, walletDB);
    killSwitchManager = new KillSwitchManager(walletDB, transactionDB);
    budgetManager = new BudgetManager(budgetDB, transactionDB);
  });

  describe('Wallet + Transaction Integration', () => {
    test('should create transaction and update wallet balance', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 5000,
      });

      const transaction = await transactionManager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test scrape',
      });

      const wallet = await walletManager.getWallet('ws_1');

      expect(transaction.balanceBeforeCents).toBe(5000);
      expect(transaction.balanceAfterCents).toBe(4800);
      expect(wallet?.balanceCents).toBe(4800);
    });

    test('should track lifetime usage through transactions', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      await transactionManager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Scrape 1',
      });

      await transactionManager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.CSE_SEARCH,
        amountCents: 50,
        description: 'Search 1',
      });

      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(9750); // 10000 - 200 - 50
    });
  });

  describe('Kill-Switch + Wallet Integration', () => {
    test('should block operation when balance insufficient', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 300,
      });

      const preFlightResult = await killSwitchManager.preFlightCheck({
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        estimatedCostCents: 200,
      });

      expect(preFlightResult.approved).toBe(false);
    });

    test('should approve when balance sufficient', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      const preFlightResult = await killSwitchManager.preFlightCheck({
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        estimatedCostCents: 200,
      });

      expect(preFlightResult.approved).toBe(true);
    });
  });

  describe('Reserve + Deduct Integration', () => {
    test('should reserve funds then deduct from available balance', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      // Reserve 3000 for scheduled campaign
      await walletManager.reserve({
        workspaceId: 'ws_1',
        amountCents: 3000,
        reason: 'Scheduled campaign',
      });

      // Should be able to deduct from remaining 7000
      await transactionManager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 5000,
        description: 'Large scrape',
      });

      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(5000); // 10000 - 5000
      expect(wallet?.reservedCents).toBe(3000); // Still reserved
    });

    test('should prevent deduction when reserved funds cause shortage', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      await walletManager.reserve({
        workspaceId: 'ws_1',
        amountCents: 4000, // Reserve 4000 (40%, under 50% limit)
        reason: 'Large reservation',
      });

      // Only 6000 available, cannot deduct 7000
      await expect(
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 7000,
          description: 'Too large',
        })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Refund + Balance Integration', () => {
    test('should refund and restore wallet balance', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      const original = await transactionManager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 200,
        description: 'Test scrape',
      });

      const walletAfterCharge = await walletManager.getWallet('ws_1');
      expect(walletAfterCharge?.balanceCents).toBe(9800);

      await transactionManager.refundTransaction({
        transactionId: original.id,
        reason: 'Failed operation',
      });

      const walletAfterRefund = await walletManager.getWallet('ws_1');
      expect(walletAfterRefund?.balanceCents).toBe(10000); // Restored
    });
  });

  describe('Budget + Transaction Integration', () => {
    test('should track spending against budget', async () => {
      const budget = await budgetManager.createBudget({
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

      await budgetManager.trackSpending(budget.id, 10000);
      await budgetManager.trackSpending(budget.id, 5000);

      const status = await budgetManager.getBudgetStatus(budget.id);
      expect(status.spentCents).toBe(15000);
      expect(status.remainingCents).toBe(35000);
      expect(status.percentageUsed).toBe(30);
    });
  });
});
