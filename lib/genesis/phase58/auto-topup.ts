/**
 * PHASE 58: INTELLIGENT AUTO-TOPUP
 * 
 * Multiple topup strategies: fixed amount, percentage-based, predictive ML,
 * scheduled topup, and usage-based calculations.
 */

import {
  TopupStrategy,
  TopupStrategyConfig,
  FixedAmountConfig,
  PercentageConfig,
  PredictiveConfig,
  ScheduledConfig,
  UsageBasedConfig,
  TopupResult,
  WalletDB,
  TransactionDB,
  PaymentMethodDB,
  TransactionType,
} from './types';
import { WalletManager } from './wallet-core';
import { TransactionManager } from './transaction-manager';

/**
 * Auto-Topup Manager
 * Handles intelligent auto-topup with multiple strategies
 */
export class AutoTopupManager {
  constructor(
    private walletDB: WalletDB,
    private _walletManager: WalletManager,
    private transactionManager: TransactionManager,
    private transactionDB?: TransactionDB,
    private _paymentMethodDB?: PaymentMethodDB
  ) {}

  /**
   * Check if auto-topup should be triggered
   */
  async shouldTriggerTopup(workspaceId: string): Promise<boolean> {
    const wallet = await this.walletDB.getWallet(workspaceId);
    if (!wallet || !wallet.autoTopup.enabled) {
      return false;
    }

    // Check if below threshold
    const availableBalance = wallet.balanceCents - wallet.reservedCents;
    if (availableBalance > wallet.autoTopup.thresholdCents) {
      return false;
    }

    // Check topup limits
    if (this.hasExceededTopupLimits(wallet as any)) {
      return false;
    }

    return true;
  }

  /**
   * Execute auto-topup based on configured strategy
   */
  async executeTopup(workspaceId: string): Promise<TopupResult> {
    const wallet = await this.walletDB.getWallet(workspaceId);
    if (!wallet) {
      return {
        success: false,
        amountCents: 0,
        newBalanceCents: 0,
        error: 'Wallet not found',
      };
    }

    if (!wallet.autoTopup.enabled) {
      return {
        success: false,
        amountCents: 0,
        newBalanceCents: wallet.balanceCents,
        error: 'Auto-topup not enabled',
      };
    }

    // Calculate topup amount based on strategy
    const amountCents = await this.calculateTopupAmount(
      workspaceId,
      wallet.autoTopup.config
    );

    if (amountCents <= 0) {
      return {
        success: false,
        amountCents: 0,
        newBalanceCents: wallet.balanceCents,
        error: 'Invalid topup amount calculated',
      };
    }

    // Check maximum topup limit
    if (wallet.autoTopup.maxAmountPerPeriod) {
      const periodStart = this.getPeriodStart(wallet.autoTopup.maxAmountPeriod || 'month');
      const periodTopupAmount = await this.getTopupAmountInPeriod(
        workspaceId,
        periodStart,
        new Date()
      );

      if (periodTopupAmount + amountCents > wallet.autoTopup.maxAmountPerPeriod) {
        return {
          success: false,
          amountCents: 0,
          newBalanceCents: wallet.balanceCents,
          error: `Would exceed maximum topup limit for period (${wallet.autoTopup.maxAmountPerPeriod} cents)`,
        };
      }
    }

    // Execute payment (placeholder - would integrate with Stripe)
    const paymentSuccess = await this.processPayment(workspaceId, amountCents);
    
    if (!paymentSuccess) {
      return {
        success: false,
        amountCents,
        newBalanceCents: wallet.balanceCents,
        error: 'Payment processing failed',
      };
    }

    // Create topup transaction
    const transactionType = this.getTransactionTypeForStrategy(wallet.autoTopup.strategy);
    const transaction = await this.transactionManager.createTransaction({
      workspaceId,
      type: transactionType,
      amountCents,
      description: `Auto-topup (${wallet.autoTopup.strategy})`,
      tags: ['auto-topup'],
      metadata: {
        topupStrategy: wallet.autoTopup.strategy,
        triggerThresholdCents: wallet.autoTopup.thresholdCents,
      },
    });

    // Update topup count
    await this.walletDB.updateWallet(workspaceId, {
      autoTopup: {
        ...wallet.autoTopup,
        lastTopupAt: new Date(),
        topupCountThisPeriod: wallet.autoTopup.topupCountThisPeriod + 1,
      },
    });

    const updatedWallet = await this.walletDB.getWallet(workspaceId);

    return {
      success: true,
      amountCents,
      newBalanceCents: updatedWallet?.balanceCents || 0,
      transactionId: transaction.id,
      metadata: {
        strategy: wallet.autoTopup.strategy,
        previousBalance: wallet.balanceCents,
      },
    };
  }

  /**
   * Calculate topup amount based on strategy
   */
  private async calculateTopupAmount(
    workspaceId: string,
    config: TopupStrategyConfig
  ): Promise<number> {
    switch (config.strategy) {
      case TopupStrategy.FIXED_AMOUNT:
        return this.calculateFixedAmount(config);
        
      case TopupStrategy.PERCENTAGE:
        return this.calculatePercentageAmount(workspaceId, config);
        
      case TopupStrategy.PREDICTIVE:
        return this.calculatePredictiveAmount(workspaceId, config);
        
      case TopupStrategy.USAGE_BASED:
        return this.calculateUsageBasedAmount(workspaceId, config);
        
      default:
        return 0;
    }
  }

  /**
   * Fixed amount strategy
   */
  private calculateFixedAmount(config: FixedAmountConfig): number {
    return config.amountCents;
  }

  /**
   * Percentage-based strategy
   */
  private async calculatePercentageAmount(
    workspaceId: string,
    config: PercentageConfig
  ): Promise<number> {
    const wallet = await this.walletDB.getWallet(workspaceId);
    if (!wallet) {
      return 0;
    }

    const amountCents = Math.round(wallet.balanceCents * (config.percentage / 100));
    
    if (config.minimumCents && amountCents < config.minimumCents) {
      return config.minimumCents;
    }

    return amountCents;
  }

  /**
   * Predictive ML-based strategy
   */
  private async calculatePredictiveAmount(
    workspaceId: string,
    config: PredictiveConfig
  ): Promise<number> {
    if (!this.transactionDB) {
      return config.minimumCents || 5000; // Default $50
    }

    // Get transactions from lookback period
    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - config.lookbackDays);

    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate: lookbackStart,
      endDate: new Date(),
    });

    if (transactions.length === 0) {
      return config.minimumCents || 5000;
    }

    // Calculate average daily spend
    const totalSpent = transactions
      .filter((tx) => tx.direction === 'debit')
      .reduce((sum, tx) => sum + tx.amountCents, 0);

    const averageDailySpend = totalSpent / config.lookbackDays;

    // Predict depletion time
    const wallet = await this.walletDB.getWallet(workspaceId);
    if (!wallet) {
      return config.minimumCents || 5000;
    }

    const daysUntilDepletion = wallet.balanceCents / averageDailySpend;
    
    // If will run out within buffer period, topup enough for lookback period
    if (daysUntilDepletion < (config.bufferHours / 24)) {
      const topupAmount = Math.round(averageDailySpend * config.lookbackDays);
      return Math.max(topupAmount, config.minimumCents || 0);
    }

    return 0; // Not yet time to topup
  }

  /**
   * Usage-based strategy
   */
  private async calculateUsageBasedAmount(
    workspaceId: string,
    config: UsageBasedConfig
  ): Promise<number> {
    if (!this.transactionDB) {
      return config.minimumCents || 5000;
    }

    // Get last 7 days of transactions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate: weekAgo,
      endDate: new Date(),
    });

    if (transactions.length === 0) {
      return config.minimumCents || 5000;
    }

    // Calculate average daily spend
    const totalSpent = transactions
      .filter((tx) => tx.direction === 'debit')
      .reduce((sum, tx) => sum + tx.amountCents, 0);

    const averageDailySpend = totalSpent / 7;

    // Topup = average daily spend × multiplier
    const topupAmount = Math.round(averageDailySpend * config.multiplier);

    return Math.max(topupAmount, config.minimumCents || 0);
  }

  /**
   * Check if topup limits have been exceeded
   */
  private hasExceededTopupLimits(wallet: any): boolean {
    if (!wallet.autoTopup.maxAmountPerPeriod) {
      return false;
    }

    // Check topup count (placeholder - would track in DB)
    const MAX_TOPUPS_PER_MONTH = 10;
    if (wallet.autoTopup.topupCountThisPeriod >= MAX_TOPUPS_PER_MONTH) {
      return true;
    }

    return false;
  }

  /**
   * Get topup amount in period
   */
  private async getTopupAmountInPeriod(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (!this.transactionDB) {
      return 0;
    }

    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate,
      endDate,
    });

    return transactions
      .filter((tx) => tx.type.startsWith('auto_topup_'))
      .reduce((sum, tx) => sum + tx.amountCents, 0);
  }

  /**
   * Get period start date
   */
  private getPeriodStart(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': {
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      }
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return now;
    }
  }

  /**
   * Process payment (placeholder for Stripe integration)
   */
  private async processPayment(_workspaceId: string, _amountCents: number): Promise<boolean> {
    // TODO: Integrate with Stripe
    // 1. Get default payment method
    // 2. Create Stripe charge
    // 3. Handle success/failure
    // 4. Implement fallback chain if primary fails
    
    // For now, return true (mock success)
    return true;
  }

  /**
   * Get transaction type for strategy
   */
  private getTransactionTypeForStrategy(strategy: TopupStrategy): TransactionType {
    const typeMap: Record<TopupStrategy, TransactionType> = {
      [TopupStrategy.FIXED_AMOUNT]: TransactionType.AUTO_TOPUP_FIXED,
      [TopupStrategy.PERCENTAGE]: TransactionType.AUTO_TOPUP_FIXED,
      [TopupStrategy.PREDICTIVE]: TransactionType.AUTO_TOPUP_PREDICTIVE,
      [TopupStrategy.SCHEDULED]: TransactionType.AUTO_TOPUP_SCHEDULED,
      [TopupStrategy.USAGE_BASED]: TransactionType.AUTO_TOPUP_USAGE_BASED,
    };

    return typeMap[strategy];
  }
}

/**
 * Scheduled Topup Executor
 * Handles time-based topup scheduling
 */
export class ScheduledTopupExecutor {
  constructor(
    private walletDB: WalletDB,
    private _autoTopupManager: AutoTopupManager
  ) {}

  /**
   * Check if scheduled topup should run now
   */
  async shouldRunScheduledTopup(workspaceId: string): Promise<boolean> {
    const wallet = await this.walletDB.getWallet(workspaceId);
    if (!wallet || !wallet.autoTopup.enabled) {
      return false;
    }

    if (wallet.autoTopup.strategy !== TopupStrategy.SCHEDULED) {
      return false;
    }

    const config = wallet.autoTopup.config as ScheduledConfig;
    const now = new Date();

    for (const schedule of config.schedule) {
      if (this.matchesSchedule(now, schedule)) {
        // Check if already topped up within last hour
        if (wallet.autoTopup.lastTopupAt) {
          const hourAgo = new Date();
          hourAgo.setHours(hourAgo.getHours() - 1);
          if (wallet.autoTopup.lastTopupAt > hourAgo) {
            return false; // Already topped up recently
          }
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Check if current time matches schedule
   */
  private matchesSchedule(now: Date, schedule: any): boolean {
    if (schedule.dayOfWeek !== undefined && now.getDay() !== schedule.dayOfWeek) {
      return false;
    }

    if (schedule.dayOfMonth !== undefined && now.getDate() !== schedule.dayOfMonth) {
      return false;
    }

    if (now.getHours() !== schedule.hour) {
      return false;
    }

    if (now.getMinutes() !== schedule.minute) {
      return false;
    }

    return true;
  }

  /**
   * Execute all scheduled topups
   */
  async executeScheduledTopups(): Promise<void> {
    // TODO: Get all workspaces with scheduled topup enabled
    // For each, check if should run and execute
  }
}

/**
 * Topup Strategy Recommender
 * Analyzes usage patterns and recommends optimal strategy
 */
export class TopupStrategyRecommender {
  constructor(private transactionDB: TransactionDB) {}

  /**
   * Analyze workspace and recommend topup strategy
   */
  async recommendStrategy(workspaceId: string): Promise<{
    recommendedStrategy: TopupStrategy;
    reason: string;
    suggestedConfig: TopupStrategyConfig;
  }> {
    // Get last 30 days of transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate: thirtyDaysAgo,
      endDate: new Date(),
    });

    if (transactions.length === 0) {
      return {
        recommendedStrategy: TopupStrategy.FIXED_AMOUNT,
        reason: 'No transaction history. Fixed amount is safest for new workspaces.',
        suggestedConfig: {
          strategy: TopupStrategy.FIXED_AMOUNT,
          amountCents: 5000, // $50
        },
      };
    }

    // Analyze spend pattern variance
    const dailySpends = this.calculateDailySpends(transactions);
    const variance = this.calculateVariance(dailySpends);
    const mean = dailySpends.reduce((a, b) => a + b, 0) / dailySpends.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Low variance (< 0.3) = predictable spending = usage-based
    if (coefficientOfVariation < 0.3) {
      return {
        recommendedStrategy: TopupStrategy.USAGE_BASED,
        reason: 'Spending pattern is consistent. Usage-based topup is optimal.',
        suggestedConfig: {
          strategy: TopupStrategy.USAGE_BASED,
          multiplier: 7, // 7 days worth
          minimumCents: Math.round(mean * 3), // 3 days minimum
        },
      };
    }

    // High variance (> 0.7) = unpredictable = fixed amount
    if (coefficientOfVariation > 0.7) {
      return {
        recommendedStrategy: TopupStrategy.FIXED_AMOUNT,
        reason: 'Spending pattern is volatile. Fixed amount provides stability.',
        suggestedConfig: {
          strategy: TopupStrategy.FIXED_AMOUNT,
          amountCents: Math.round(mean * 10), // 10 days worth
        },
      };
    }

    // Medium variance = predictive
    return {
      recommendedStrategy: TopupStrategy.PREDICTIVE,
      reason: 'Moderate spending variability. Predictive strategy adapts to patterns.',
      suggestedConfig: {
        strategy: TopupStrategy.PREDICTIVE,
        lookbackDays: 14,
        bufferHours: 48,
        minimumCents: Math.round(mean * 3),
      },
    };
  }

  /**
   * Calculate daily spends
   */
  private calculateDailySpends(transactions: any[]): number[] {
    const dailyMap = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.direction !== 'debit') continue;
      
      const dateKey = tx.createdAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + tx.amountCents);
    }

    return Array.from(dailyMap.values());
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}
