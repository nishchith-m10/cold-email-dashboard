/**
 * PHASE 58: WALLET CORE
 * 
 * Core wallet management functionality: CRUD operations, balance management,
 * holds/reserves, spending limits, and alert triggers.
 */

import {
  Wallet,
  WalletType,
  WalletStatus,
  SpendingLimits,
  AlertConfiguration,
  AutoTopupConfiguration,
  WalletDB,
  AuditLogDB,
  LimitAction,
  AlertChannel,
  TopupStrategy,
  AuditAction,
  MIN_BALANCE_CENTS,
  MAX_RESERVED_PERCENTAGE,
} from './types';
import {
  validateWorkspaceId,
  validatePositiveAmount,
  validateAmountCents,
} from './validators';

/**
 * Wallet Core Manager
 * Handles all wallet operations with proper validation and audit logging
 */
export class WalletManager {
  constructor(
    private walletDB: WalletDB,
    private auditDB?: AuditLogDB
  ) {}

  /**
   * Create a new wallet for a workspace
   */
  async createWallet(params: {
    workspaceId: string;
    type?: WalletType;
    initialBalanceCents?: number;
    limits?: Partial<SpendingLimits>;
    alerts?: Partial<AlertConfiguration>;
  }): Promise<Wallet> {
    // Validate inputs
    validateWorkspaceId(params.workspaceId);
    if (params.initialBalanceCents !== undefined) {
      validateAmountCents(params.initialBalanceCents, 'Initial balance');
    }

    const wallet: Omit<Wallet, 'createdAt' | 'updatedAt'> = {
      workspaceId: params.workspaceId,
      type: params.type || WalletType.PRODUCTION,
      status: WalletStatus.ACTIVE,
      balanceCents: params.initialBalanceCents || 0,
      reservedCents: 0,
      lifetimeDepositsCents: params.initialBalanceCents || 0,
      lifetimeUsageCents: 0,
      limits: this.createDefaultLimits(params.limits),
      alerts: this.createDefaultAlerts(params.alerts),
      autoTopup: this.createDefaultAutoTopup(),
      lastTransactionAt: new Date(),
      metadata: {},
    };

    const created = await this.walletDB.createWallet(wallet);

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: params.workspaceId,
        action: AuditAction.STATUS_CHANGE,
        actor: { type: 'system', source: 'wallet_creation' },
        before: { balanceCents: 0, reservedCents: 0, status: WalletStatus.ACTIVE, timestamp: new Date() },
        after: { balanceCents: created.balanceCents, reservedCents: 0, status: WalletStatus.ACTIVE, timestamp: new Date() },
      });
    }

    return created;
  }

  /**
   * Get wallet by workspace ID
   */
  async getWallet(workspaceId: string): Promise<Wallet | null> {
    return this.walletDB.getWallet(workspaceId);
  }

  /**
   * Update wallet configuration
   */
  async updateWallet(
    workspaceId: string,
    updates: Partial<Omit<Wallet, 'workspaceId' | 'balanceCents' | 'reservedCents' | 'lifetimeDepositsCents' | 'lifetimeUsageCents'>>
  ): Promise<Wallet> {
    const before = await this.getWallet(workspaceId);
    if (!before) {
      throw new Error(`Wallet not found for workspace: ${workspaceId}`);
    }

    const updated = await this.walletDB.updateWallet(workspaceId, updates);

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId,
        action: AuditAction.CONFIG_CHANGE,
        actor: { type: 'system', source: 'wallet_update' },
        before: { balanceCents: before.balanceCents, reservedCents: before.reservedCents, status: before.status, timestamp: new Date() },
        after: { balanceCents: updated.balanceCents, reservedCents: updated.reservedCents, status: updated.status, timestamp: new Date() },
        metadata: updates,
      });
    }

    return updated;
  }

  /**
   * Deposit funds into wallet
   */
  async deposit(params: {
    workspaceId: string;
    amountCents: number;
    source: string;
    metadata?: Record<string, unknown>;
  }): Promise<Wallet> {
    // Validate inputs
    validateWorkspaceId(params.workspaceId);
    validatePositiveAmount(params.amountCents, 'Deposit amount');

    const before = await this.getWallet(params.workspaceId);
    if (!before) {
      throw new Error(`Wallet not found for workspace: ${params.workspaceId}`);
    }

    // Update both balance and lifetime deposits atomically
    await this.walletDB.updateWallet(params.workspaceId, {
      balanceCents: before.balanceCents + params.amountCents,
      lifetimeDepositsCents: before.lifetimeDepositsCents + params.amountCents,
    });

    const updated = await this.getWallet(params.workspaceId);
    if (!updated) {
      throw new Error(`Failed to retrieve wallet after deposit`);
    }

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: params.workspaceId,
        action: AuditAction.TOPUP,
        actor: { type: 'system', source: params.source },
        before: { balanceCents: before.balanceCents, reservedCents: before.reservedCents, status: before.status, timestamp: new Date() },
        after: { balanceCents: updated.balanceCents, reservedCents: updated.reservedCents, status: updated.status, timestamp: new Date() },
        metadata: params.metadata,
      });
    }

    return updated;
  }

  /**
   * Deduct funds from wallet
   */
  async deduct(params: {
    workspaceId: string;
    amountCents: number;
    source: string;
    metadata?: Record<string, unknown>;
  }): Promise<Wallet> {
    if (params.amountCents <= 0) {
      throw new Error('Deduct amount must be positive');
    }

    const before = await this.getWallet(params.workspaceId);
    if (!before) {
      throw new Error(`Wallet not found for workspace: ${params.workspaceId}`);
    }

    // Check sufficient balance
    const availableBalance = before.balanceCents - before.reservedCents;
    if (availableBalance < params.amountCents) {
      throw new Error(`Insufficient balance. Available: ${availableBalance}, Required: ${params.amountCents}`);
    }

    const updated = await this.walletDB.updateBalance(params.workspaceId, -params.amountCents);

    // Update lifetime usage
    await this.walletDB.updateWallet(params.workspaceId, {
      lifetimeUsageCents: before.lifetimeUsageCents + params.amountCents,
    });

    // Check if alerts should be triggered
    await this.checkAndTriggerAlerts(updated);

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: params.workspaceId,
        action: AuditAction.CHARGE,
        actor: { type: 'system', source: params.source },
        before: { balanceCents: before.balanceCents, reservedCents: before.reservedCents, status: before.status, timestamp: new Date() },
        after: { balanceCents: updated.balanceCents, reservedCents: updated.reservedCents, status: updated.status, timestamp: new Date() },
        metadata: params.metadata,
      });
    }

    return updated;
  }

  /**
   * Reserve funds (hold for pending operations)
   */
  async reserve(params: {
    workspaceId: string;
    amountCents: number;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<Wallet> {
    // Validate inputs
    validateWorkspaceId(params.workspaceId);
    validatePositiveAmount(params.amountCents, 'Reserve amount');

    const before = await this.getWallet(params.workspaceId);
    if (!before) {
      throw new Error(`Wallet not found for workspace: ${params.workspaceId}`);
    }

    // Check sufficient balance to reserve
    const availableBalance = before.balanceCents - before.reservedCents;
    if (availableBalance < params.amountCents) {
      throw new Error(`Insufficient balance to reserve. Available: ${availableBalance}, Requested: ${params.amountCents}`);
    }

    // Check max reservation limit
    const newReservedCents = before.reservedCents + params.amountCents;
    const maxReservable = before.balanceCents * (MAX_RESERVED_PERCENTAGE / 100);
    if (newReservedCents > maxReservable) {
      throw new Error(`Cannot reserve more than ${MAX_RESERVED_PERCENTAGE}% of balance`);
    }

    const updated = await this.walletDB.reserveFunds(params.workspaceId, params.amountCents);

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: params.workspaceId,
        action: AuditAction.RESERVE,
        actor: { type: 'system', source: 'wallet_manager' },
        before: { balanceCents: before.balanceCents, reservedCents: before.reservedCents, status: before.status, timestamp: new Date() },
        after: { balanceCents: updated.balanceCents, reservedCents: updated.reservedCents, status: updated.status, timestamp: new Date() },
        reason: params.reason,
        metadata: params.metadata,
      });
    }

    return updated;
  }

  /**
   * Release reserved funds
   */
  async releaseReserve(params: {
    workspaceId: string;
    amountCents: number;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<Wallet> {
    // Validate inputs
    validateWorkspaceId(params.workspaceId);
    validatePositiveAmount(params.amountCents, 'Release amount');

    const before = await this.getWallet(params.workspaceId);
    if (!before) {
      throw new Error(`Wallet not found for workspace: ${params.workspaceId}`);
    }

    if (before.reservedCents < params.amountCents) {
      throw new Error(`Cannot release more than reserved. Reserved: ${before.reservedCents}, Requested: ${params.amountCents}`);
    }

    const updated = await this.walletDB.releaseFunds(params.workspaceId, params.amountCents);

    // Audit log
    if (this.auditDB) {
      await this.auditDB.createLog({
        timestamp: new Date(),
        workspaceId: params.workspaceId,
        action: AuditAction.RELEASE,
        actor: { type: 'system', source: 'wallet_manager' },
        before: { balanceCents: before.balanceCents, reservedCents: before.reservedCents, status: before.status, timestamp: new Date() },
        after: { balanceCents: updated.balanceCents, reservedCents: updated.reservedCents, status: updated.status, timestamp: new Date() },
        reason: params.reason,
        metadata: params.metadata,
      });
    }

    return updated;
  }

  /**
   * Get available balance (balance - reserved)
   */
  async getAvailableBalance(workspaceId: string): Promise<number> {
    const wallet = await this.getWallet(workspaceId);
    if (!wallet) {
      throw new Error(`Wallet not found for workspace: ${workspaceId}`);
    }
    return wallet.balanceCents - wallet.reservedCents;
  }

  /**
   * Check spending limits
   */
  async checkSpendingLimits(params: {
    workspaceId: string;
    amountCents: number;
    serviceId?: string;
    campaignId?: string;
  }): Promise<{ allowed: boolean; reason?: string; action?: LimitAction }> {
    const wallet = await this.getWallet(params.workspaceId);
    if (!wallet) {
      return { allowed: false, reason: 'Wallet not found' };
    }

    // Check daily limit
    if (wallet.limits.dailyCents !== null && wallet.limits.dailyCents !== undefined) {
      // TODO: Get today's spending from transaction DB
      const todaySpent = 0; // Placeholder
      if (todaySpent + params.amountCents > wallet.limits.dailyCents) {
        return {
          allowed: wallet.limits.limitAction !== LimitAction.HARD_LIMIT,
          reason: 'Daily spending limit exceeded',
          action: wallet.limits.limitAction,
        };
      }
    }

    // Check service-specific limits
    if (params.serviceId && wallet.limits.perService) {
      const serviceLimit = wallet.limits.perService[params.serviceId];
      if (serviceLimit !== undefined) {
        // TODO: Get service spending from transaction DB
        const serviceSpent = 0; // Placeholder
        if (serviceSpent + params.amountCents > serviceLimit) {
          return {
            allowed: wallet.limits.limitAction !== LimitAction.HARD_LIMIT,
            reason: `Service ${params.serviceId} spending limit exceeded`,
            action: wallet.limits.limitAction,
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check if alerts should be triggered based on balance
   */
  private async checkAndTriggerAlerts(wallet: Wallet): Promise<void> {
    if (wallet.lifetimeDepositsCents === 0) {
      return; // No alerts if never deposited
    }

    const balancePercent = (wallet.balanceCents / wallet.lifetimeDepositsCents) * 100;

    const shouldAlert =
      (wallet.alerts.at75Percent && balancePercent <= 25) ||
      (wallet.alerts.at50Percent && balancePercent <= 50) ||
      (wallet.alerts.at25Percent && balancePercent <= 75) ||
      (wallet.alerts.at10Percent && balancePercent <= 90);

    if (shouldAlert) {
      // TODO: Trigger alert via configured channels
      // For now, just update last alert timestamp
      await this.walletDB.updateWallet(wallet.workspaceId, {
        alerts: {
          ...wallet.alerts,
          lastAlertSentAt: new Date(),
        },
      });
    }
  }

  /**
   * Create default spending limits
   */
  private createDefaultLimits(partial?: Partial<SpendingLimits>): SpendingLimits {
    return {
      dailyCents: partial?.dailyCents ?? null,
      weeklyCents: partial?.weeklyCents ?? null,
      monthlyCents: partial?.monthlyCents ?? null,
      perService: partial?.perService ?? {},
      perCampaign: partial?.perCampaign ?? {},
      limitAction: partial?.limitAction ?? LimitAction.WARN,
    };
  }

  /**
   * Create default alert configuration
   */
  private createDefaultAlerts(partial?: Partial<AlertConfiguration>): AlertConfiguration {
    return {
      at75Percent: partial?.at75Percent ?? true,
      at50Percent: partial?.at50Percent ?? true,
      at25Percent: partial?.at25Percent ?? true,
      at10Percent: partial?.at10Percent ?? true,
      customThresholds: partial?.customThresholds ?? [],
      channels: partial?.channels ?? [AlertChannel.EMAIL, AlertChannel.IN_APP],
    };
  }

  /**
   * Create default auto-topup configuration
   */
  private createDefaultAutoTopup(): AutoTopupConfiguration {
    return {
      enabled: false,
      strategy: TopupStrategy.FIXED_AMOUNT,
      thresholdCents: 500, // $5.00
      config: {
        strategy: TopupStrategy.FIXED_AMOUNT,
        amountCents: 5000, // $50.00
      },
      topupCountThisPeriod: 0,
    };
  }
}

/**
 * Wallet validation utilities
 */
export class WalletValidator {
  /**
   * Validate wallet has minimum balance
   */
  static hasMinimumBalance(wallet: Wallet): boolean {
    return wallet.balanceCents >= MIN_BALANCE_CENTS;
  }

  /**
   * Validate wallet is active
   */
  static isActive(wallet: Wallet): boolean {
    return wallet.status === WalletStatus.ACTIVE;
  }

  /**
   * Validate sufficient funds for operation
   */
  static hasSufficientFunds(wallet: Wallet, requiredCents: number): boolean {
    const available = wallet.balanceCents - wallet.reservedCents;
    return available >= requiredCents;
  }

  /**
   * Get wallet health status
   */
  static getHealthStatus(wallet: Wallet): {
    healthy: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!this.isActive(wallet)) {
      issues.push(`Wallet status is ${wallet.status}`);
    }

    if (!this.hasMinimumBalance(wallet)) {
      warnings.push(`Balance below minimum ($${MIN_BALANCE_CENTS / 100})`);
    }

    const availableBalance = wallet.balanceCents - wallet.reservedCents;
    if (availableBalance <= 0) {
      issues.push('No available balance (all funds reserved)');
    }

    const reservedPercentage = (wallet.reservedCents / wallet.balanceCents) * 100;
    if (reservedPercentage > 75) {
      warnings.push(`${reservedPercentage.toFixed(1)}% of balance is reserved`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
    };
  }
}
