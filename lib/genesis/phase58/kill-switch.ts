/**
 * PHASE 58: KILL-SWITCH SYSTEM
 * 
 * Granular service-level kill switches with graceful degradation,
 * emergency override tokens, and priority-based resource allocation.
 */

import {
  KillSwitchMode,
  KillSwitchConfiguration,
  ServiceKillSwitchConfig,
  PreFlightCheckRequest,
  PreFlightCheckResult,
  WalletDB,
  TransactionDB,
  DEFAULT_GRACE_PERIOD_SECONDS,
} from './types';
import { getServiceById } from '@/lib/genesis/phase57/service-matrix';

/**
 * Kill-Switch Manager
 * Controls service access based on wallet balance and configuration
 */
export class KillSwitchManager {
  constructor(
    private walletDB: WalletDB,
    private _transactionDB?: TransactionDB
  ) {}

  /**
   * Perform pre-flight check for service operation
   */
  async preFlightCheck(request: PreFlightCheckRequest): Promise<PreFlightCheckResult> {
    const wallet = await this.walletDB.getWallet(request.workspaceId);
    if (!wallet) {
      return {
        approved: false,
        currentBalanceCents: 0,
        estimatedCostCents: request.estimatedCostCents,
        projectedBalanceCents: 0,
        reason: 'Wallet not found',
      };
    }

    // Get kill-switch configuration
    const killSwitchConfig = this.getKillSwitchConfig(wallet as any);
    
    // Check if override token is active
    if (this.hasValidOverrideToken(killSwitchConfig)) {
      return {
        approved: true,
        currentBalanceCents: wallet.balanceCents,
        estimatedCostCents: request.estimatedCostCents,
        projectedBalanceCents: wallet.balanceCents - request.estimatedCostCents,
        reason: 'Override token active',
      };
    }

    // Get service-specific configuration
    const serviceConfig = this.getServiceConfig(killSwitchConfig, request.serviceId);
    
    if (!serviceConfig) {
      // Service not configured, use global minimum
      return this.checkGlobalMinimum(
        wallet.balanceCents,
        wallet.reservedCents,
        request.estimatedCostCents,
        killSwitchConfig.globalMinBalanceCents
      );
    }

    if (!serviceConfig.enabled) {
      // Kill-switch disabled for this service
      return {
        approved: true,
        currentBalanceCents: wallet.balanceCents,
        estimatedCostCents: request.estimatedCostCents,
        projectedBalanceCents: wallet.balanceCents - request.estimatedCostCents,
        reason: 'Service exempt from kill-switch',
      };
    }

    // Check service-specific minimum balance
    const availableBalance = wallet.balanceCents - wallet.reservedCents;
    const projectedBalance = availableBalance - request.estimatedCostCents;
    
    if (projectedBalance < serviceConfig.minBalanceCents) {
      // Check if in grace period
      const gracePeriodEndsAt = await this.getGracePeriodEnd(
        request.workspaceId,
        serviceConfig.gracePeriodSeconds || killSwitchConfig.gracePeriodSeconds
      );

      if (gracePeriodEndsAt && gracePeriodEndsAt > new Date()) {
        // Still in grace period
        return {
        approved: true,
        currentBalanceCents: wallet.balanceCents,
        estimatedCostCents: request.estimatedCostCents,
        projectedBalanceCents: projectedBalance,
        reason: 'Grace period active',
        gracePeriodEndsAt,
      };
      }

      return {
        approved: false,
        currentBalanceCents: wallet.balanceCents,
        estimatedCostCents: request.estimatedCostCents,
        projectedBalanceCents: projectedBalance,
        reason: `Insufficient balance. Service ${request.serviceId} requires minimum ${serviceConfig.minBalanceCents} cents`,
      };
    }

    // Sufficient balance
    return {
      approved: true,
      currentBalanceCents: wallet.balanceCents,
      estimatedCostCents: request.estimatedCostCents,
      projectedBalanceCents: projectedBalance,
    };
  }

  /**
   * Batch pre-flight check for multiple services
   */
  async batchPreFlightCheck(
    requests: PreFlightCheckRequest[]
  ): Promise<PreFlightCheckResult[]> {
    const results: PreFlightCheckResult[] = [];
    
    for (const request of requests) {
      const result = await this.preFlightCheck(request);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate emergency override token
   */
  generateOverrideToken(params: {
    workspaceId: string;
    durationHours: number;
    reason: string;
  }): { token: string; expiresAt: Date } {
    const token = this.createToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + params.durationHours);

    return { token, expiresAt };
  }

  /**
   * Validate override token
   */
  async validateOverrideToken(params: {
    workspaceId: string;
    token: string;
  }): Promise<boolean> {
    const wallet = await this.walletDB.getWallet(params.workspaceId);
    if (!wallet) {
      return false;
    }

    const killSwitchConfig = this.getKillSwitchConfig(wallet as any);
    
    if (!killSwitchConfig.overrideToken || !killSwitchConfig.overrideTokenExpiresAt) {
      return false;
    }

    if (killSwitchConfig.overrideToken !== params.token) {
      return false;
    }

    if (killSwitchConfig.overrideTokenExpiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get service priority ranking
   */
  getServicePriorities(config: KillSwitchConfiguration): ServiceKillSwitchConfig[] {
    return [...config.serviceConfigs].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Suggest services to disable based on priority
   */
  suggestServicesToDisable(params: {
    config: KillSwitchConfiguration;
    targetSavingsCents: number;
  }): string[] {
    const sorted = this.getServicePriorities(params.config);
    const toDisable: string[] = [];
    let savings = 0;

    // Start with lowest priority services
    for (let i = sorted.length - 1; i >= 0; i--) {
      const service = sorted[i];
      toDisable.push(service.serviceId);
      
      // Estimate savings (placeholder - would need historical data)
      const estimatedServiceCost = 100; // cents per day
      savings += estimatedServiceCost;

      if (savings >= params.targetSavingsCents) {
        break;
      }
    }

    return toDisable;
  }

  /**
   * Check if wallet has valid override token
   */
  private hasValidOverrideToken(config: KillSwitchConfiguration): boolean {
    if (!config.overrideToken || !config.overrideTokenExpiresAt) {
      return false;
    }

    return config.overrideTokenExpiresAt > new Date();
  }

  /**
   * Get service-specific configuration
   */
  private getServiceConfig(
    config: KillSwitchConfiguration,
    serviceId: string
  ): ServiceKillSwitchConfig | undefined {
    return config.serviceConfigs.find((s) => s.serviceId === serviceId);
  }

  /**
   * Check against global minimum balance
   */
  private checkGlobalMinimum(
    balanceCents: number,
    reservedCents: number,
    estimatedCostCents: number,
    globalMinBalanceCents: number
  ): PreFlightCheckResult {
    const availableBalance = balanceCents - reservedCents;
    const projectedBalance = availableBalance - estimatedCostCents;

    if (projectedBalance < globalMinBalanceCents) {
      return {
        approved: false,
        currentBalanceCents: balanceCents,
        estimatedCostCents,
        projectedBalanceCents: projectedBalance,
        reason: `Insufficient balance. Global minimum is ${globalMinBalanceCents} cents`,
      };
    }

    return {
      approved: true,
      currentBalanceCents: balanceCents,
      estimatedCostCents,
      projectedBalanceCents: projectedBalance,
    };
  }

  /**
   * Get grace period end time
   */
  private async getGracePeriodEnd(
    _workspaceId: string,
    _gracePeriodSeconds: number
  ): Promise<Date | null> {
    // TODO: Track when grace period started in database
    // For now, return null (no grace period)
    return null;
  }

  /**
   * Create random override token
   */
  private createToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'ko_'; // kill-switch override prefix
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Get kill-switch configuration from wallet
   */
  private getKillSwitchConfig(_wallet: any): KillSwitchConfiguration {
    // TODO: Store in wallet metadata or separate table
    // For now, return default configuration
    return {
      enabled: true,
      mode: KillSwitchMode.SERVICE_LEVEL,
      globalMinBalanceCents: 100, // $1.00
      serviceConfigs: this.getDefaultServiceConfigs(),
      gracePeriodSeconds: DEFAULT_GRACE_PERIOD_SECONDS,
    };
  }

  /**
   * Get default service configurations
   */
  private getDefaultServiceConfigs(): ServiceKillSwitchConfig[] {
    return [
      {
        serviceId: 'apify_managed',
        enabled: true,
        minBalanceCents: 500, // $5.00
        priority: 3,
        gracePeriodSeconds: 3600, // 1 hour
      },
      {
        serviceId: 'google_cse',
        enabled: true,
        minBalanceCents: 100, // $1.00
        priority: 5,
        gracePeriodSeconds: 7200, // 2 hours
      },
      {
        serviceId: 'residential_proxies',
        enabled: true,
        minBalanceCents: 200, // $2.00
        priority: 2,
        gracePeriodSeconds: 1800, // 30 minutes
      },
      {
        serviceId: 'email_verification',
        enabled: true,
        minBalanceCents: 100, // $1.00
        priority: 4,
        gracePeriodSeconds: 3600, // 1 hour
      },
    ];
  }
}

/**
 * Kill-Switch Event Logger
 * Tracks kill-switch activations and restorations
 */
export class KillSwitchEventLogger {
  private events: KillSwitchEvent[] = [];

  logKillSwitchActivated(params: {
    workspaceId: string;
    serviceId: string;
    reason: string;
    balanceCents: number;
    minBalanceCents: number;
  }): void {
    this.events.push({
      timestamp: new Date(),
      workspaceId: params.workspaceId,
      serviceId: params.serviceId,
      event: 'activated',
      reason: params.reason,
      balanceCents: params.balanceCents,
      minBalanceCents: params.minBalanceCents,
    });
  }

  logKillSwitchRestored(params: {
    workspaceId: string;
    serviceId: string;
    reason: string;
    balanceCents: number;
  }): void {
    this.events.push({
      timestamp: new Date(),
      workspaceId: params.workspaceId,
      serviceId: params.serviceId,
      event: 'restored',
      reason: params.reason,
      balanceCents: params.balanceCents,
    });
  }

  logOverrideTokenUsed(params: {
    workspaceId: string;
    token: string;
    expiresAt: Date;
  }): void {
    this.events.push({
      timestamp: new Date(),
      workspaceId: params.workspaceId,
      event: 'override_token_used',
      token: params.token,
      expiresAt: params.expiresAt,
    });
  }

  getEvents(workspaceId?: string): KillSwitchEvent[] {
    if (!workspaceId) {
      return this.events;
    }
    return this.events.filter((e) => e.workspaceId === workspaceId);
  }

  clearEvents(): void {
    this.events = [];
  }
}

interface KillSwitchEvent {
  timestamp: Date;
  workspaceId: string;
  serviceId?: string;
  event: 'activated' | 'restored' | 'override_token_used';
  reason?: string;
  balanceCents?: number;
  minBalanceCents?: number;
  token?: string;
  expiresAt?: Date;
}

/**
 * Priority-Based Service Disabler
 * Automatically disables low-priority services when budget is tight
 */
export class PriorityBasedDisabler {
  constructor(private _killSwitchManager: KillSwitchManager) {}

  /**
   * Analyze and suggest service disablement to meet budget
   */
  async analyzeBudgetShortfall(params: {
    workspaceId: string;
    targetMonthlyCents: number;
    currentMonthlyCents: number;
  }): Promise<{
    shortfallCents: number;
    suggestedDisablements: Array<{
      serviceId: string;
      serviceName: string;
      estimatedSavingsCents: number;
      priority: number;
    }>;
    totalEstimatedSavingsCents: number;
  }> {
    const shortfallCents = params.currentMonthlyCents - params.targetMonthlyCents;
    
    if (shortfallCents <= 0) {
      return {
        shortfallCents: 0,
        suggestedDisablements: [],
        totalEstimatedSavingsCents: 0,
      };
    }

    // Get service usage and priorities
    // TODO: Get actual usage from transaction DB
    const serviceUsage = [
      { serviceId: 'apify_managed', monthlyCents: 1500, priority: 3 },
      { serviceId: 'google_cse', monthlyCents: 500, priority: 5 },
      { serviceId: 'residential_proxies', monthlyCents: 800, priority: 2 },
      { serviceId: 'email_verification', monthlyCents: 300, priority: 4 },
    ];

    // Sort by priority (lowest first)
    const sorted = serviceUsage.sort((a, b) => a.priority - b.priority);
    
    const suggestedDisablements: any[] = [];
    let totalSavings = 0;

    for (const service of sorted) {
      const serviceDefinition = getServiceById(service.serviceId);
      
      suggestedDisablements.push({
        serviceId: service.serviceId,
        serviceName: serviceDefinition?.displayName || service.serviceId,
        estimatedSavingsCents: service.monthlyCents,
        priority: service.priority,
      });

      totalSavings += service.monthlyCents;

      if (totalSavings >= shortfallCents) {
        break;
      }
    }

    return {
      shortfallCents,
      suggestedDisablements,
      totalEstimatedSavingsCents: totalSavings,
    };
  }
}
