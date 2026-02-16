/**
 * PHASE 58 HARDENING TESTS: CONCURRENCY & RACE CONDITIONS
 * 
 * Tests for simultaneous operations, race conditions, and lock conflicts.
 * These tests push the system to 16-nines quality by stress-testing concurrency.
 */

import { WalletManager } from '@/lib/genesis/phase58/wallet-core';
import { TransactionManager } from '@/lib/genesis/phase58/transaction-manager';
import { MockWalletDB, MockTransactionDB, MockAuditLogDB } from '@/lib/genesis/phase58/mocks';
import { TransactionType } from '@/lib/genesis/phase58/types';

describe('Phase 58 Hardening: Concurrency & Race Conditions', () => {
  let walletDB: MockWalletDB;
  let transactionDB: MockTransactionDB;
  let auditDB: MockAuditLogDB;
  let walletManager: WalletManager;
  let transactionManager: TransactionManager;

  beforeEach(() => {
    walletDB = new MockWalletDB();
    transactionDB = new MockTransactionDB();
    auditDB = new MockAuditLogDB();
    walletManager = new WalletManager(walletDB, auditDB);
    transactionManager = new TransactionManager(transactionDB, walletDB, auditDB);
  });

  describe('Concurrent Transactions', () => {
    test('should handle two simultaneous deposits without race condition', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 1000,
      });

      // Execute two deposits concurrently
      const [deposit1, deposit2] = await Promise.all([
        walletManager.deposit({
          workspaceId: 'ws_1',
          amountCents: 500,
          source: 'stripe_1',
        }),
        walletManager.deposit({
          workspaceId: 'ws_1',
          amountCents: 300,
          source: 'stripe_2',
        }),
      ]);

      // Final balance should be sum of all operations
      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(1800); // 1000 + 500 + 300
      expect(wallet?.lifetimeDepositsCents).toBe(1800);
    });

    test('should handle simultaneous deductions without overdraft', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 1000,
      });

      // Try to deduct more than available when combined
      const promises = [
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 600,
          description: 'Scrape 1',
        }),
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 600,
          description: 'Scrape 2',
        }),
      ];

      // One should succeed, one should fail
      const results = await Promise.allSettled(promises);
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      // Final balance should reflect only the successful transaction
      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(400); // 1000 - 600
    });

    test('should handle rapid sequential transactions correctly', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      // Execute 20 small transactions rapidly
      const promises = Array.from({ length: 20 }, (_, i) =>
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 100,
          description: `Rapid transaction ${i}`,
        })
      );

      await Promise.all(promises);

      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(8000); // 10000 - (20 * 100)
      expect(wallet?.lifetimeUsageCents).toBe(2000);
    });

    test('should handle concurrent reserve and deduct operations', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      // Try to reserve and deduct simultaneously
      const [reserved, deducted] = await Promise.allSettled([
        walletManager.reserve({
          workspaceId: 'ws_1',
          amountCents: 4000,
          reason: 'Scheduled campaign',
        }),
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 7000,
          description: 'Large scrape',
        }),
      ]);

      // Both could succeed or one might fail depending on execution order
      // The key is that the final state must be consistent
      const wallet = await walletManager.getWallet('ws_1');
      const available = wallet!.balanceCents - wallet!.reservedCents;

      // Available balance should never be negative
      expect(available).toBeGreaterThanOrEqual(0);

      // Total should be consistent
      if (reserved.status === 'fulfilled' && deducted.status === 'fulfilled') {
        expect(wallet?.balanceCents).toBe(3000); // 10000 - 7000
        expect(wallet?.reservedCents).toBe(4000);
      }
    });

    test('should handle concurrent refunds without double-refund', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      const original = await transactionManager.createTransaction({
        workspaceId: 'ws_1',
        type: TransactionType.APIFY_SCRAPE,
        amountCents: 1000,
        description: 'Original',
      });

      // Try to refund the same transaction twice simultaneously
      const refundPromises = [
        transactionManager.refundTransaction({
          transactionId: original.id,
          reason: 'Refund attempt 1',
        }),
        transactionManager.refundTransaction({
          transactionId: original.id,
          reason: 'Refund attempt 2',
        }),
      ];

      const results = await Promise.allSettled(refundPromises);

      // Only one refund should succeed
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      // Balance should reflect only one refund
      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.balanceCents).toBe(10000); // Back to original
    });

    test('should maintain consistency during high-concurrency wallet creation', async () => {
      // Create 10 wallets concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        walletManager.createWallet({
          workspaceId: `ws_${i}`,
          initialBalanceCents: 1000,
        })
      );

      const wallets = await Promise.all(promises);

      // All wallets should be created successfully
      expect(wallets.length).toBe(10);

      // All wallets should have unique IDs
      const uniqueIds = new Set(wallets.map((w) => w.workspaceId));
      expect(uniqueIds.size).toBe(10);

      // All wallets should have correct initial balance
      wallets.forEach((w) => {
        expect(w.balanceCents).toBe(1000);
      });
    });
  });

  describe('Reserve Lock Conflicts', () => {
    test('should prevent over-reservation in concurrent reserve calls', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      // Try to reserve 40% and 40% simultaneously (should exceed 50% max)
      const promises = [
        walletManager.reserve({
          workspaceId: 'ws_1',
          amountCents: 4000, // 40%
          reason: 'Reserve 1',
        }),
        walletManager.reserve({
          workspaceId: 'ws_1',
          amountCents: 4000, // 40%
          reason: 'Reserve 2',
        }),
      ];

      const results = await Promise.allSettled(promises);

      // At least one should succeed, second might fail due to 50% limit
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      expect(succeeded).toBeGreaterThanOrEqual(1);

      // Total reserved should never exceed 50%
      const wallet = await walletManager.getWallet('ws_1');
      expect(wallet?.reservedCents).toBeLessThanOrEqual(5000); // 50% of 10000
    });

    test('should handle concurrent reserve and release on same wallet', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      // First reserve some funds
      await walletManager.reserve({
        workspaceId: 'ws_1',
        amountCents: 3000,
        reason: 'Initial reserve',
      });

      // Now try to reserve more and release simultaneously
      const [reserved, released] = await Promise.allSettled([
        walletManager.reserve({
          workspaceId: 'ws_1',
          amountCents: 2000,
          reason: 'Additional reserve',
        }),
        walletManager.releaseReserve({
          workspaceId: 'ws_1',
          amountCents: 1000,
          reason: 'Partial release',
        }),
      ]);

      // Both operations should succeed with correct final state
      const wallet = await walletManager.getWallet('ws_1');

      // Reserved should be consistent
      if (reserved.status === 'fulfilled' && released.status === 'fulfilled') {
        expect(wallet?.reservedCents).toBe(4000); // 3000 + 2000 - 1000
      }
    });
  });

  describe('Transaction Isolation', () => {
    test('should isolate transactions across different workspaces', async () => {
      // Create two wallets
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 5000,
      });

      await walletManager.createWallet({
        workspaceId: 'ws_2',
        initialBalanceCents: 3000,
      });

      // Execute transactions on both wallets concurrently
      const [tx1, tx2] = await Promise.all([
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 1000,
          description: 'Workspace 1 operation',
        }),
        transactionManager.createTransaction({
          workspaceId: 'ws_2',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 500,
          description: 'Workspace 2 operation',
        }),
      ]);

      // Each wallet should have correct balance
      const wallet1 = await walletManager.getWallet('ws_1');
      const wallet2 = await walletManager.getWallet('ws_2');

      expect(wallet1?.balanceCents).toBe(4000); // 5000 - 1000
      expect(wallet2?.balanceCents).toBe(2500); // 3000 - 500

      // Transactions should not interfere with each other
      expect(tx1.workspaceId).toBe('ws_1');
      expect(tx2.workspaceId).toBe('ws_2');
    });

    test('should handle concurrent operations on same wallet without state corruption', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 20000,
      });

      // Mix of operations: deposit, deduct, reserve, release
      const operations = [
        walletManager.deposit({
          workspaceId: 'ws_1',
          amountCents: 1000,
          source: 'stripe',
        }),
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.APIFY_SCRAPE,
          amountCents: 500,
          description: 'Operation 1',
        }),
        walletManager.reserve({
          workspaceId: 'ws_1',
          amountCents: 3000,
          reason: 'Reserve funds',
        }),
        transactionManager.createTransaction({
          workspaceId: 'ws_1',
          type: TransactionType.CSE_SEARCH,
          amountCents: 200,
          description: 'Operation 2',
        }),
      ];

      await Promise.all(operations);

      const wallet = await walletManager.getWallet('ws_1');

      // Final state should be consistent
      // 20000 + 1000 - 500 - 200 = 20300
      expect(wallet?.balanceCents).toBe(20300);
      expect(wallet?.reservedCents).toBe(3000);
      expect(wallet?.lifetimeDepositsCents).toBe(21000); // 20000 + 1000
      expect(wallet?.lifetimeUsageCents).toBe(700); // 500 + 200
    });
  });

  describe('Audit Log Consistency', () => {
    test('should record all concurrent operations in audit log', async () => {
      await walletManager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 10000,
      });

      // Execute 5 operations concurrently
      const operations = Array.from({ length: 5 }, (_, i) =>
        walletManager.deposit({
          workspaceId: 'ws_1',
          amountCents: 100 * (i + 1),
          source: `source_${i}`,
        })
      );

      await Promise.all(operations);

      // Audit log should have all operations
      const logs = await auditDB.getLogs('ws_1');

      // 1 creation + 5 deposits = 6 total
      expect(logs.length).toBe(6);

      // All logs should be for the correct workspace
      logs.forEach((log: any) => {
        expect(log.workspaceId).toBe('ws_1');
      });
    });
  });
});
