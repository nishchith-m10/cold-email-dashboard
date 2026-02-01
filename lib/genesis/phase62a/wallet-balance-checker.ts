/**
 * GENESIS PART VI - PHASE 62.A: PAYMENT-FIRST MODEL
 * Wallet Balance Checker
 * 
 * Validates wallet balance for various operations
 */

import type {
  WalletBalance,
  WalletState,
  IgnitionValidation,
} from './payment-types';
import {
  MINIMUM_IGNITION_BALANCE,
  LOW_BALANCE_WARNING,
  HEALTHY_BALANCE,
} from './payment-types';

/**
 * Wallet Balance Checker
 * Validates wallet balance and determines operational state
 */
export class WalletBalanceChecker {
  /**
   * Determine wallet state based on balance
   */
  static determineState(balance: number): WalletState {
    if (balance < 0) {
      return 'exhausted';
    }
    
    if (balance < MINIMUM_IGNITION_BALANCE) {
      return 'insufficient';
    }
    
    if (balance < LOW_BALANCE_WARNING) {
      return 'low_balance';
    }
    
    if (balance < HEALTHY_BALANCE) {
      return 'funded';
    }
    
    return 'healthy';
  }

  /**
   * Check if wallet balance is sufficient for ignition
   */
  static canIgnite(balance: number): boolean {
    return balance >= MINIMUM_IGNITION_BALANCE;
  }

  /**
   * Get wallet balance information
   */
  static getWalletBalance(
    workspaceId: string,
    balance: number
  ): WalletBalance {
    const state = this.determineState(balance);
    const canIgnite = this.canIgnite(balance);
    const warnings = this.generateWarnings(balance, state);

    return {
      workspace_id: workspaceId,
      balance,
      state,
      can_ignite: canIgnite,
      warnings,
    };
  }

  /**
   * Generate warnings based on balance and state
   */
  static generateWarnings(balance: number, state: WalletState): string[] {
    const warnings: string[] = [];

    switch (state) {
      case 'exhausted':
        warnings.push('Balance is negative. Droplet will hibernate.');
        warnings.push('Add funds immediately to reactivate services.');
        break;

      case 'insufficient':
        warnings.push(`Minimum balance of $${MINIMUM_IGNITION_BALANCE.toFixed(2)} required for ignition.`);
        warnings.push('Please add funds to continue.');
        break;

      case 'low_balance':
        const needed = LOW_BALANCE_WARNING - balance;
        warnings.push(`Balance is low. Consider adding $${needed.toFixed(2)} or more.`);
        break;

      case 'funded':
        warnings.push('Balance is adequate but could be higher for sustained operations.');
        break;

      case 'healthy':
        // No warnings for healthy balance
        break;
    }

    return warnings;
  }

  /**
   * Validate ignition request
   */
  static validateIgnition(
    workspaceId: string,
    currentBalance: number
  ): IgnitionValidation {
    const canProceed = this.canIgnite(currentBalance);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!canProceed) {
      errors.push(
        `Insufficient balance. Current: $${currentBalance.toFixed(2)}, Required: $${MINIMUM_IGNITION_BALANCE.toFixed(2)}`
      );
      errors.push('Please add funds before attempting ignition.');
    } else if (currentBalance < LOW_BALANCE_WARNING) {
      warnings.push('Balance is sufficient for ignition but may run out quickly.');
      warnings.push(`Consider adding funds to reach at least $${HEALTHY_BALANCE.toFixed(2)} for sustained operations.`);
    }

    return {
      valid: canProceed,
      wallet_balance: currentBalance,
      minimum_required: MINIMUM_IGNITION_BALANCE,
      can_proceed: canProceed,
      errors,
      warnings,
    };
  }

  /**
   * Calculate balance after ignition
   */
  static calculateBalanceAfterIgnition(
    currentBalance: number,
    dropletCost: number
  ): {
    new_balance: number;
    new_state: WalletState;
    warnings: string[];
  } {
    const newBalance = currentBalance - dropletCost;
    const newState = this.determineState(newBalance);
    const warnings = this.generateWarnings(newBalance, newState);

    return {
      new_balance: newBalance,
      new_state: newState,
      warnings,
    };
  }

  /**
   * Check if balance is sufficient for operation
   */
  static isSufficientForOperation(
    balance: number,
    operationCost: number
  ): boolean {
    return balance >= operationCost;
  }

  /**
   * Calculate required top-up amount
   */
  static calculateTopUpAmount(
    currentBalance: number,
    targetState: 'ignition' | 'healthy' = 'healthy'
  ): number {
    const targetBalance = targetState === 'ignition'
      ? MINIMUM_IGNITION_BALANCE
      : HEALTHY_BALANCE;

    if (currentBalance >= targetBalance) {
      return 0;
    }

    return targetBalance - currentBalance;
  }

  /**
   * Get human-readable state description
   */
  static getStateDescription(state: WalletState): string {
    const descriptions: Record<WalletState, string> = {
      exhausted: 'Balance exhausted - services hibernated',
      insufficient: 'Insufficient funds - cannot start services',
      low_balance: 'Low balance - add funds soon',
      funded: 'Funded - can operate',
      healthy: 'Healthy balance - optimal operation',
    };

    return descriptions[state];
  }

  /**
   * Format balance for display
   */
  static formatBalance(balance: number): string {
    return `$${balance.toFixed(2)}`;
  }

  /**
   * Check multiple balance thresholds
   */
  static checkThresholds(balance: number): {
    can_ignite: boolean;
    is_low: boolean;
    is_healthy: boolean;
    is_exhausted: boolean;
  } {
    return {
      can_ignite: balance >= MINIMUM_IGNITION_BALANCE,
      is_low: balance < LOW_BALANCE_WARNING,
      is_healthy: balance >= HEALTHY_BALANCE,
      is_exhausted: balance < 0,
    };
  }
}
