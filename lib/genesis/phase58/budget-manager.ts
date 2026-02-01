/**
 * PHASE 58: BUDGET MANAGER
 * 
 * Simplified budget management with spending limits, forecasting, and alerts.
 */

import {
  Budget,
  BudgetStatus,
  BudgetDB,
  TransactionDB,
} from './types';

export class BudgetManager {
  constructor(
    private budgetDB: BudgetDB,
    private transactionDB?: TransactionDB
  ) {}

  async createBudget(params: Omit<Budget, 'id' | 'createdAt' | 'updatedAt' | 'spentCents'>): Promise<Budget> {
    const budget = await this.budgetDB.createBudget({
      ...params,
      spentCents: 0,
    });
    return budget;
  }

  async getBudgetStatus(budgetId: string): Promise<BudgetStatus> {
    const budget = await this.budgetDB.getBudget(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const remainingCents = budget.totalLimitCents - budget.spentCents;
    const percentageUsed = (budget.spentCents / budget.totalLimitCents) * 100;

    return {
      budgetId,
      totalLimitCents: budget.totalLimitCents,
      spentCents: budget.spentCents,
      remainingCents,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      isExceeded: budget.spentCents >= budget.totalLimitCents,
    };
  }

  async trackSpending(budgetId: string, amountCents: number): Promise<Budget> {
    return this.budgetDB.incrementSpent(budgetId, amountCents);
  }
}
