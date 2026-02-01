/**
 * PHASE 58 TESTS: WALLET CORE
 */

import { WalletManager, WalletValidator } from '@/lib/genesis/phase58/wallet-core';
import { MockWalletDB, MockAuditLogDB } from '@/lib/genesis/phase58/mocks';
import { WalletType, WalletStatus, LimitAction } from '@/lib/genesis/phase58/types';

describe('Phase 58: Wallet Core', () => {
  let walletDB: MockWalletDB;
  let auditDB: MockAuditLogDB;
  let manager: WalletManager;

  beforeEach(() => {
    walletDB = new MockWalletDB();
    auditDB = new MockAuditLogDB();
    manager = new WalletManager(walletDB, auditDB);
  });

  describe('WalletManager.createWallet', () => {
    test('should create wallet with default settings', async () => {
      const wallet = await manager.createWallet({
        workspaceId: 'ws_1',
      });

      expect(wallet.workspaceId).toBe('ws_1');
      expect(wallet.type).toBe(WalletType.PRODUCTION);
      expect(wallet.status).toBe(WalletStatus.ACTIVE);
      expect(wallet.balanceCents).toBe(0);
      expect(wallet.reservedCents).toBe(0);
    });

    test('should create wallet with initial balance', async () => {
      const wallet = await manager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 5000,
      });

      expect(wallet.balanceCents).toBe(5000);
      expect(wallet.lifetimeDepositsCents).toBe(5000);
    });

    test('should create wallet with custom type', async () => {
      const wallet = await manager.createWallet({
        workspaceId: 'ws_1',
        type: WalletType.SANDBOX,
      });

      expect(wallet.type).toBe(WalletType.SANDBOX);
    });

    test('should create wallet with custom limits', async () => {
      const wallet = await manager.createWallet({
        workspaceId: 'ws_1',
        limits: {
          dailyCents: 10000,
          limitAction: LimitAction.HARD_LIMIT,
        },
      });

      expect(wallet.limits.dailyCents).toBe(10000);
      expect(wallet.limits.limitAction).toBe(LimitAction.HARD_LIMIT);
    });

    test('should create audit log on wallet creation', async () => {
      await manager.createWallet({
        workspaceId: 'ws_1',
        initialBalanceCents: 1000,
      });

      const logs = await auditDB.getLogs('ws_1');
      expect(logs.length).toBe(1);
    });
  });

  describe('WalletManager.deposit', () => {
    test('should deposit funds and update balance', async () => {
      await manager.createWallet({ workspaceId: 'ws_1' });

      const wallet = await manager.deposit({
        workspaceId: 'ws_1',
        amountCents: 5000,
        source: 'stripe',
      });

      expect(wallet.balanceCents).toBe(5000);
    });

    test('should update lifetime deposits', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 1000 });

      await manager.deposit({
        workspaceId: 'ws_1',
        amountCents: 2000,
        source: 'stripe',
      });

      const wallet = await manager.getWallet('ws_1');
      expect(wallet?.lifetimeDepositsCents).toBe(3000); // 1000 + 2000
    });

    test('should throw error for negative deposit', async () => {
      await manager.createWallet({ workspaceId: 'ws_1' });

      await expect(
        manager.deposit({
          workspaceId: 'ws_1',
          amountCents: -100,
          source: 'test',
        })
      ).rejects.toThrow('Deposit amount must be positive');
    });

    test('should throw error for non-existent wallet', async () => {
      await expect(
        manager.deposit({
          workspaceId: 'non_existent',
          amountCents: 100,
          source: 'test',
        })
      ).rejects.toThrow('Wallet not found');
    });

    test('should create audit log for deposit', async () => {
      await manager.createWallet({ workspaceId: 'ws_1' });

      await manager.deposit({
        workspaceId: 'ws_1',
        amountCents: 1000,
        source: 'stripe',
      });

      const logs = await auditDB.getLogs('ws_1');
      expect(logs.length).toBe(2); // Creation + deposit
      expect(logs[1].action).toBe('topup');
    });
  });

  describe('WalletManager.deduct', () => {
    test('should deduct funds and update balance', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });

      const wallet = await manager.deduct({
        workspaceId: 'ws_1',
        amountCents: 2000,
        source: 'apify_scrape',
      });

      expect(wallet.balanceCents).toBe(3000);
    });

    test('should update lifetime usage', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });

      await manager.deduct({
        workspaceId: 'ws_1',
        amountCents: 2000,
        source: 'test',
      });

      const wallet = await manager.getWallet('ws_1');
      expect(wallet?.lifetimeUsageCents).toBe(2000);
    });

    test('should throw error for insufficient balance', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 100 });

      await expect(
        manager.deduct({
          workspaceId: 'ws_1',
          amountCents: 200,
          source: 'test',
        })
      ).rejects.toThrow('Insufficient balance');
    });

    test('should respect reserved funds', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });
      await manager.reserve({
        workspaceId: 'ws_1',
        amountCents: 2000, // Reserve 2000 (40%, under 50% limit)
        reason: 'scheduled campaign',
      });

      await expect(
        manager.deduct({
          workspaceId: 'ws_1',
          amountCents: 3500, // Only 3000 available (5000 - 2000)
          source: 'test',
        })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('WalletManager.reserve', () => {
    test('should reserve funds', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });

      const wallet = await manager.reserve({
        workspaceId: 'ws_1',
        amountCents: 2000,
        reason: 'scheduled campaign',
      });

      expect(wallet.reservedCents).toBe(2000);
      expect(wallet.balanceCents).toBe(5000); // Balance unchanged
    });

    test('should throw error if insufficient balance to reserve', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 1000 });

      await expect(
        manager.reserve({
          workspaceId: 'ws_1',
          amountCents: 2000,
          reason: 'test',
        })
      ).rejects.toThrow('Insufficient balance to reserve');
    });

    test('should enforce maximum reservation percentage', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 10000 });

      await expect(
        manager.reserve({
          workspaceId: 'ws_1',
          amountCents: 6000, // 60% (exceeds 50% max)
          reason: 'test',
        })
      ).rejects.toThrow('Cannot reserve more than 50% of balance');
    });
  });

  describe('WalletManager.releaseReserve', () => {
    test('should release reserved funds', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });
      await manager.reserve({
        workspaceId: 'ws_1',
        amountCents: 2000,
        reason: 'test',
      });

      const wallet = await manager.releaseReserve({
        workspaceId: 'ws_1',
        amountCents: 2000,
        reason: 'campaign cancelled',
      });

      expect(wallet.reservedCents).toBe(0);
    });

    test('should throw error if releasing more than reserved', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });
      await manager.reserve({
        workspaceId: 'ws_1',
        amountCents: 1000,
        reason: 'test',
      });

      await expect(
        manager.releaseReserve({
          workspaceId: 'ws_1',
          amountCents: 2000,
          reason: 'test',
        })
      ).rejects.toThrow('Cannot release more than reserved');
    });
  });

  describe('WalletManager.getAvailableBalance', () => {
    test('should calculate available balance', async () => {
      await manager.createWallet({ workspaceId: 'ws_1', initialBalanceCents: 5000 });
      await manager.reserve({
        workspaceId: 'ws_1',
        amountCents: 2000,
        reason: 'test',
      });

      const available = await manager.getAvailableBalance('ws_1');
      expect(available).toBe(3000); // 5000 - 2000
    });

    test('should throw error for non-existent wallet', async () => {
      await expect(
        manager.getAvailableBalance('non_existent')
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('WalletValidator', () => {
    test('should validate minimum balance', () => {
      const wallet: any = { balanceCents: 150 };
      expect(WalletValidator.hasMinimumBalance(wallet)).toBe(true);
    });

    test('should reject below minimum', () => {
      const wallet: any = { balanceCents: 50 };
      expect(WalletValidator.hasMinimumBalance(wallet)).toBe(false);
    });

    test('should validate active status', () => {
      const wallet: any = { status: WalletStatus.ACTIVE };
      expect(WalletValidator.isActive(wallet)).toBe(true);
    });

    test('should reject suspended wallet', () => {
      const wallet: any = { status: WalletStatus.SUSPENDED };
      expect(WalletValidator.isActive(wallet)).toBe(false);
    });

    test('should validate sufficient funds', () => {
      const wallet: any = { balanceCents: 5000, reservedCents: 2000 };
      expect(WalletValidator.hasSufficientFunds(wallet, 2500)).toBe(true);
    });

    test('should reject insufficient funds', () => {
      const wallet: any = { balanceCents: 5000, reservedCents: 2000 };
      expect(WalletValidator.hasSufficientFunds(wallet, 3500)).toBe(false);
    });

    test('should get health status - healthy', () => {
      const wallet: any = {
        status: WalletStatus.ACTIVE,
        balanceCents: 10000,
        reservedCents: 2000,
      };

      const health = WalletValidator.getHealthStatus(wallet);
      expect(health.healthy).toBe(true);
      expect(health.issues.length).toBe(0);
    });

    test('should detect inactive wallet', () => {
      const wallet: any = {
        status: WalletStatus.SUSPENDED,
        balanceCents: 10000,
        reservedCents: 0,
      };

      const health = WalletValidator.getHealthStatus(wallet);
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Wallet status is suspended');
    });

    test('should warn on low balance', () => {
      const wallet: any = {
        status: WalletStatus.ACTIVE,
        balanceCents: 50,
        reservedCents: 0,
      };

      const health = WalletValidator.getHealthStatus(wallet);
      expect(health.warnings.length).toBeGreaterThan(0);
    });

    test('should warn on high reservation percentage', () => {
      const wallet: any = {
        status: WalletStatus.ACTIVE,
        balanceCents: 10000,
        reservedCents: 8000, // 80%
      };

      const health = WalletValidator.getHealthStatus(wallet);
      expect(health.warnings.some((w: string) => w.includes('80.0% of balance is reserved'))).toBe(true);
    });
  });
});
