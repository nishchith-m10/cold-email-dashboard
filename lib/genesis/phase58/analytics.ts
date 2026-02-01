/**
 * PHASE 58: FINANCIAL ANALYTICS
 * 
 * Simplified analytics for burn rate, forecasting, and ROI tracking.
 */

import {
  SpendingForecast,
  BurnRateAnalysis,
  BudgetPeriod,
  TransactionDB,
  WalletDB,
} from './types';

export class FinancialAnalytics {
  constructor(
    private transactionDB: TransactionDB,
    private walletDB: WalletDB
  ) {}

  async generateSpendingForecast(workspaceId: string): Promise<SpendingForecast> {
    const wallet = await this.walletDB.getWallet(workspaceId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get last 30 days transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate: thirtyDaysAgo,
      endDate: new Date(),
    });

    const totalSpent = transactions
      .filter((tx) => tx.direction === 'debit')
      .reduce((sum, tx) => sum + tx.amountCents, 0);

    const dailyBurnRate = totalSpent / 30;
    const daysRemaining = wallet.balanceCents / dailyBurnRate;

    return {
      workspaceId,
      projectedBurnRateCents: Math.round(dailyBurnRate),
      estimatedDaysRemaining: Math.round(daysRemaining),
      projectedDepletionDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000),
      confidence: 75,
      basedOnDays: 30,
    };
  }

  async analyzeBurnRate(workspaceId: string): Promise<BurnRateAnalysis> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const transactions = await this.transactionDB.listTransactions({
      workspaceId,
      startDate: weekAgo,
      endDate: new Date(),
    });

    const totalSpent = transactions
      .filter((tx) => tx.direction === 'debit')
      .reduce((sum, tx) => sum + tx.amountCents, 0);

    return {
      workspaceId,
      period: BudgetPeriod.WEEKLY,
      averageDailyCents: Math.round(totalSpent / 7),
      averageWeeklyCents: totalSpent,
      averageMonthlyCents: Math.round(totalSpent * 4.33),
      trend: 'stable',
      trendPercentage: 0,
    };
  }
}
