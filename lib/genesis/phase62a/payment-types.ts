/**
 * GENESIS PART VI - PHASE 62.A: PAYMENT-FIRST MODEL
 * Type definitions for payment and wallet management
 */

/**
 * Wallet state
 */
export type WalletState =
  | 'insufficient'   // < $6 (cannot ignite)
  | 'funded'         // $6-$20 (can ignite, low balance warning)
  | 'healthy'        // > $20 (normal operation)
  | 'low_balance'    // < $10 after ignition (add funds warning)
  | 'exhausted';     // < $0 (droplet hibernates)

/**
 * Wallet balance information
 */
export interface WalletBalance {
  workspace_id: string;
  balance: number;
  state: WalletState;
  can_ignite: boolean;
  warnings: string[];
}

/**
 * Ignition validation result
 */
export interface IgnitionValidation {
  valid: boolean;
  wallet_balance: number;
  minimum_required: number;
  can_proceed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Cost breakdown item
 */
export interface CostItem {
  name: string;
  cost: number;
  period: 'monthly' | 'variable' | 'one-time';
  description: string;
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  items: CostItem[];
  monthly_minimum: number;
  monthly_maximum: number;
  monthly_average: number;
  current_balance: number;
  estimated_runway_months: number;
}

/**
 * Wallet transaction type
 */
export type WalletTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'droplet_charge'
  | 'ai_usage'
  | 'refund'
  | 'adjustment';

/**
 * Wallet transaction
 */
export interface WalletTransaction {
  id: string;
  workspace_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: Date;
}

/**
 * Minimum balance required for ignition
 */
export const MINIMUM_IGNITION_BALANCE = 6.0;

/**
 * Low balance warning threshold
 */
export const LOW_BALANCE_WARNING = 10.0;

/**
 * Healthy balance threshold
 */
export const HEALTHY_BALANCE = 20.0;

/**
 * Droplet monthly cost
 */
export const DROPLET_MONTHLY_COST = 6.0;

/**
 * Estimated AI usage range (monthly)
 */
export const AI_USAGE_MIN = 5.0;
export const AI_USAGE_MAX = 20.0;
export const AI_USAGE_AVERAGE = 12.5;
