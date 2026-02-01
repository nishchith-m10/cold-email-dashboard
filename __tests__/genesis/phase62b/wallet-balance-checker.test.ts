/**
 * GENESIS PART VI - PHASE 62.A: PAYMENT-FIRST MODEL
 * Wallet Balance Checker Tests
 */

import { WalletBalanceChecker } from '@/lib/genesis/phase62b/wallet-balance-checker';
import {
  MINIMUM_IGNITION_BALANCE,
  LOW_BALANCE_WARNING,
  HEALTHY_BALANCE,
} from '@/lib/genesis/phase62b/payment-types';

describe('WalletBalanceChecker', () => {
  const workspaceId = '123e4567-e89b-12d3-a456-426614174000';

  describe('determineState', () => {
    it('should return exhausted for negative balance', () => {
      expect(WalletBalanceChecker.determineState(-5)).toBe('exhausted');
      expect(WalletBalanceChecker.determineState(-0.01)).toBe('exhausted');
    });

    it('should return insufficient for balance < $6', () => {
      expect(WalletBalanceChecker.determineState(0)).toBe('insufficient');
      expect(WalletBalanceChecker.determineState(5.99)).toBe('insufficient');
    });

    it('should return low_balance for balance $6-$10', () => {
      expect(WalletBalanceChecker.determineState(6)).toBe('low_balance');
      expect(WalletBalanceChecker.determineState(9.99)).toBe('low_balance');
    });

    it('should return funded for balance $10-$20', () => {
      expect(WalletBalanceChecker.determineState(10)).toBe('funded');
      expect(WalletBalanceChecker.determineState(19.99)).toBe('funded');
    });

    it('should return healthy for balance >= $20', () => {
      expect(WalletBalanceChecker.determineState(20)).toBe('healthy');
      expect(WalletBalanceChecker.determineState(100)).toBe('healthy');
    });
  });

  describe('canIgnite', () => {
    it('should return true for balance >= $6', () => {
      expect(WalletBalanceChecker.canIgnite(6)).toBe(true);
      expect(WalletBalanceChecker.canIgnite(10)).toBe(true);
      expect(WalletBalanceChecker.canIgnite(100)).toBe(true);
    });

    it('should return false for balance < $6', () => {
      expect(WalletBalanceChecker.canIgnite(5.99)).toBe(false);
      expect(WalletBalanceChecker.canIgnite(0)).toBe(false);
      expect(WalletBalanceChecker.canIgnite(-10)).toBe(false);
    });

    it('should handle exact threshold', () => {
      expect(WalletBalanceChecker.canIgnite(MINIMUM_IGNITION_BALANCE)).toBe(true);
      expect(WalletBalanceChecker.canIgnite(MINIMUM_IGNITION_BALANCE - 0.01)).toBe(false);
    });
  });

  describe('getWalletBalance', () => {
    it('should return complete wallet information', () => {
      const result = WalletBalanceChecker.getWalletBalance(workspaceId, 50);

      expect(result.workspace_id).toBe(workspaceId);
      expect(result.balance).toBe(50);
      expect(result.state).toBe('healthy');
      expect(result.can_ignite).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should include warnings for low balance', () => {
      const result = WalletBalanceChecker.getWalletBalance(workspaceId, 8);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('low'))).toBe(true);
    });

    it('should include errors for insufficient balance', () => {
      const result = WalletBalanceChecker.getWalletBalance(workspaceId, 3);

      expect(result.can_ignite).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('generateWarnings', () => {
    it('should generate exhausted warnings', () => {
      const warnings = WalletBalanceChecker.generateWarnings(-5, 'exhausted');

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('negative'))).toBe(true);
      expect(warnings.some(w => w.includes('hibernate'))).toBe(true);
    });

    it('should generate insufficient warnings', () => {
      const warnings = WalletBalanceChecker.generateWarnings(3, 'insufficient');

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('Minimum balance'))).toBe(true);
    });

    it('should generate low balance warnings', () => {
      const warnings = WalletBalanceChecker.generateWarnings(8, 'low_balance');

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('low'))).toBe(true);
    });

    it('should generate funded warnings', () => {
      const warnings = WalletBalanceChecker.generateWarnings(15, 'funded');

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('adequate'))).toBe(true);
    });

    it('should not generate warnings for healthy balance', () => {
      const warnings = WalletBalanceChecker.generateWarnings(50, 'healthy');

      expect(warnings).toHaveLength(0);
    });
  });

  describe('validateIgnition', () => {
    it('should validate sufficient balance', () => {
      const result = WalletBalanceChecker.validateIgnition(workspaceId, 50);

      expect(result.valid).toBe(true);
      expect(result.can_proceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject insufficient balance', () => {
      const result = WalletBalanceChecker.validateIgnition(workspaceId, 3);

      expect(result.valid).toBe(false);
      expect(result.can_proceed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Insufficient'))).toBe(true);
    });

    it('should warn for low but sufficient balance', () => {
      const result = WalletBalanceChecker.validateIgnition(workspaceId, 8);

      expect(result.valid).toBe(true);
      expect(result.can_proceed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should include balance details', () => {
      const result = WalletBalanceChecker.validateIgnition(workspaceId, 50);

      expect(result.wallet_balance).toBe(50);
      expect(result.minimum_required).toBe(MINIMUM_IGNITION_BALANCE);
    });
  });

  describe('calculateBalanceAfterIgnition', () => {
    it('should calculate correct new balance', () => {
      const result = WalletBalanceChecker.calculateBalanceAfterIgnition(50, 6);

      expect(result.new_balance).toBe(44);
      expect(result.new_state).toBe('healthy');
    });

    it('should determine correct state after ignition', () => {
      const result = WalletBalanceChecker.calculateBalanceAfterIgnition(10, 6);

      expect(result.new_balance).toBe(4);
      expect(result.new_state).toBe('insufficient');
    });

    it('should generate warnings for new state', () => {
      const result = WalletBalanceChecker.calculateBalanceAfterIgnition(12, 6);

      expect(result.new_balance).toBe(6);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('isSufficientForOperation', () => {
    it('should return true if balance >= cost', () => {
      expect(WalletBalanceChecker.isSufficientForOperation(10, 5)).toBe(true);
      expect(WalletBalanceChecker.isSufficientForOperation(10, 10)).toBe(true);
    });

    it('should return false if balance < cost', () => {
      expect(WalletBalanceChecker.isSufficientForOperation(5, 10)).toBe(false);
      expect(WalletBalanceChecker.isSufficientForOperation(0, 1)).toBe(false);
    });
  });

  describe('calculateTopUpAmount', () => {
    it('should calculate top-up for ignition', () => {
      const amount = WalletBalanceChecker.calculateTopUpAmount(3, 'ignition');

      expect(amount).toBe(MINIMUM_IGNITION_BALANCE - 3);
    });

    it('should calculate top-up for healthy state', () => {
      const amount = WalletBalanceChecker.calculateTopUpAmount(10, 'healthy');

      expect(amount).toBe(HEALTHY_BALANCE - 10);
    });

    it('should return 0 if already above target', () => {
      const amount = WalletBalanceChecker.calculateTopUpAmount(50, 'healthy');

      expect(amount).toBe(0);
    });
  });

  describe('getStateDescription', () => {
    it('should return descriptions for all states', () => {
      const states = ['exhausted', 'insufficient', 'low_balance', 'funded', 'healthy'] as const;

      states.forEach(state => {
        const description = WalletBalanceChecker.getStateDescription(state);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
      });
    });
  });

  describe('formatBalance', () => {
    it('should format balance with $ and 2 decimals', () => {
      expect(WalletBalanceChecker.formatBalance(10)).toBe('$10.00');
      expect(WalletBalanceChecker.formatBalance(10.5)).toBe('$10.50');
      expect(WalletBalanceChecker.formatBalance(10.123)).toBe('$10.12');
    });

    it('should handle negative balances', () => {
      expect(WalletBalanceChecker.formatBalance(-5)).toBe('$-5.00');
    });

    it('should handle zero', () => {
      expect(WalletBalanceChecker.formatBalance(0)).toBe('$0.00');
    });
  });

  describe('checkThresholds', () => {
    it('should check all thresholds for healthy balance', () => {
      const result = WalletBalanceChecker.checkThresholds(50);

      expect(result.can_ignite).toBe(true);
      expect(result.is_low).toBe(false);
      expect(result.is_healthy).toBe(true);
      expect(result.is_exhausted).toBe(false);
    });

    it('should check all thresholds for low balance', () => {
      const result = WalletBalanceChecker.checkThresholds(8);

      expect(result.can_ignite).toBe(true);
      expect(result.is_low).toBe(true);
      expect(result.is_healthy).toBe(false);
      expect(result.is_exhausted).toBe(false);
    });

    it('should check all thresholds for insufficient balance', () => {
      const result = WalletBalanceChecker.checkThresholds(3);

      expect(result.can_ignite).toBe(false);
      expect(result.is_low).toBe(true);
      expect(result.is_healthy).toBe(false);
      expect(result.is_exhausted).toBe(false);
    });

    it('should check all thresholds for exhausted balance', () => {
      const result = WalletBalanceChecker.checkThresholds(-5);

      expect(result.can_ignite).toBe(false);
      expect(result.is_low).toBe(true);
      expect(result.is_healthy).toBe(false);
      expect(result.is_exhausted).toBe(true);
    });
  });

  describe('Integration: Complete Ignition Flow', () => {
    it('should validate and process ignition correctly', () => {
      const initialBalance = 50;

      // 1. Validate ignition
      const validation = WalletBalanceChecker.validateIgnition(workspaceId, initialBalance);
      expect(validation.valid).toBe(true);

      // 2. Calculate balance after ignition
      const afterIgnition = WalletBalanceChecker.calculateBalanceAfterIgnition(
        initialBalance,
        6
      );
      expect(afterIgnition.new_balance).toBe(44);
      expect(afterIgnition.new_state).toBe('healthy');

      // 3. Get wallet info after ignition
      const walletInfo = WalletBalanceChecker.getWalletBalance(
        workspaceId,
        afterIgnition.new_balance
      );
      expect(walletInfo.can_ignite).toBe(true);
    });

    it('should reject ignition for insufficient balance', () => {
      const initialBalance = 3;

      // Validate ignition
      const validation = WalletBalanceChecker.validateIgnition(workspaceId, initialBalance);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Calculate top-up needed
      const topUp = WalletBalanceChecker.calculateTopUpAmount(initialBalance, 'ignition');
      expect(topUp).toBeGreaterThan(0);
    });
  });
});
