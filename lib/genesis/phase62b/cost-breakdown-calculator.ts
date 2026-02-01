/**
 * GENESIS PART VI - PHASE 62.A: PAYMENT-FIRST MODEL
 * Cost Breakdown Calculator
 * 
 * Calculates operational costs and runway estimates
 */

import type { CostBreakdown, CostItem } from './payment-types';
import {
  DROPLET_MONTHLY_COST,
  AI_USAGE_MIN,
  AI_USAGE_MAX,
  AI_USAGE_AVERAGE,
} from './payment-types';

/**
 * Cost Breakdown Calculator
 * Provides transparent cost estimates for clients
 */
export class CostBreakdownCalculator {
  /**
   * Generate cost breakdown for a workspace
   */
  static generateBreakdown(currentBalance: number): CostBreakdown {
    const items = this.getStandardCostItems();
    
    const monthlyMinimum = items
      .filter(item => item.period === 'monthly')
      .reduce((sum, item) => sum + item.cost, 0) + AI_USAGE_MIN;
    
    const monthlyMaximum = items
      .filter(item => item.period === 'monthly')
      .reduce((sum, item) => sum + item.cost, 0) + AI_USAGE_MAX;
    
    const monthlyAverage = items
      .filter(item => item.period === 'monthly')
      .reduce((sum, item) => sum + item.cost, 0) + AI_USAGE_AVERAGE;

    const estimatedRunwayMonths = this.calculateRunway(
      currentBalance,
      monthlyAverage
    );

    return {
      items,
      monthly_minimum: monthlyMinimum,
      monthly_maximum: monthlyMaximum,
      monthly_average: monthlyAverage,
      current_balance: currentBalance,
      estimated_runway_months: estimatedRunwayMonths,
    };
  }

  /**
   * Get standard cost items
   */
  private static getStandardCostItems(): CostItem[] {
    return [
      {
        name: 'Dedicated Server (DigitalOcean)',
        cost: DROPLET_MONTHLY_COST,
        period: 'monthly',
        description: 'Your private n8n automation server',
      },
      {
        name: 'AI API Usage (OpenAI/Claude)',
        cost: AI_USAGE_AVERAGE,
        period: 'variable',
        description: 'Token usage for email generation and personalization',
      },
      {
        name: 'Platform Fee',
        cost: 0,
        period: 'monthly',
        description: 'Free during beta period',
      },
    ];
  }

  /**
   * Calculate estimated runway in months
   */
  static calculateRunway(
    currentBalance: number,
    monthlyBurn: number
  ): number {
    if (monthlyBurn <= 0) {
      return Infinity;
    }

    if (currentBalance <= 0) {
      return 0;
    }

    return currentBalance / monthlyBurn;
  }

  /**
   * Calculate runway in days
   */
  static calculateRunwayDays(
    currentBalance: number,
    monthlyBurn: number
  ): number {
    const months = this.calculateRunway(currentBalance, monthlyBurn);
    return months * 30; // Approximate
  }

  /**
   * Format runway for display
   */
  static formatRunway(months: number): string {
    if (months === Infinity) {
      return 'Unlimited';
    }

    if (months < 1) {
      const days = Math.floor(months * 30);
      return `~${days} days`;
    }

    if (months < 2) {
      return '~1-2 months';
    }

    if (months < 4) {
      return '~2-4 months';
    }

    if (months < 6) {
      return '~4-6 months';
    }

    if (months < 12) {
      return '~6-12 months';
    }

    return '1+ year';
  }

  /**
   * Calculate total estimated monthly cost
   */
  static calculateMonthlyTotal(
    includeAIMin: boolean = false
  ): number {
    const baseCost = DROPLET_MONTHLY_COST;
    const aiCost = includeAIMin ? AI_USAGE_MIN : AI_USAGE_AVERAGE;
    return baseCost + aiCost;
  }

  /**
   * Calculate AI usage cost based on volume
   */
  static estimateAIUsage(
    leadCount: number,
    emailsPerLead: number = 3
  ): {
    estimated_cost: number;
    breakdown: string;
  } {
    // Rough estimates:
    // Research: 500 tokens per lead (~$0.005)
    // Email generation: 200 tokens per email (~$0.002)
    const researchCost = leadCount * 0.005;
    const emailCost = leadCount * emailsPerLead * 0.002;
    const totalCost = researchCost + emailCost;

    return {
      estimated_cost: totalCost,
      breakdown: `${leadCount} leads × ${emailsPerLead} emails = ~$${totalCost.toFixed(2)}`,
    };
  }

  /**
   * Get cost summary text
   */
  static getCostSummary(breakdown: CostBreakdown): string {
    return `
Monthly Infrastructure: $${DROPLET_MONTHLY_COST.toFixed(2)}/mo
AI API Usage: ~$${AI_USAGE_MIN.toFixed(2)}-${AI_USAGE_MAX.toFixed(2)}/mo (variable)
Platform Fee: $0 (beta)

Total Estimated: ~$${breakdown.monthly_minimum.toFixed(2)}-${breakdown.monthly_maximum.toFixed(2)}/mo

Current Balance: $${breakdown.current_balance.toFixed(2)}
Estimated Runway: ${this.formatRunway(breakdown.estimated_runway_months)}
    `.trim();
  }

  /**
   * Check if balance is sufficient for N months
   */
  static isSufficientForDuration(
    currentBalance: number,
    months: number,
    monthlyBurn: number = AI_USAGE_AVERAGE + DROPLET_MONTHLY_COST
  ): boolean {
    const requiredBalance = months * monthlyBurn;
    return currentBalance >= requiredBalance;
  }

  /**
   * Calculate recommended top-up amount
   */
  static calculateRecommendedTopUp(
    currentBalance: number,
    targetMonths: number = 3
  ): number {
    const monthlyBurn = DROPLET_MONTHLY_COST + AI_USAGE_AVERAGE;
    const targetBalance = targetMonths * monthlyBurn;
    
    if (currentBalance >= targetBalance) {
      return 0;
    }

    return Math.ceil(targetBalance - currentBalance);
  }

  /**
   * Get cost item by name
   */
  static getCostItem(name: string): CostItem | undefined {
    return this.getStandardCostItems().find(item => item.name === name);
  }

  /**
   * Format cost range
   */
  static formatCostRange(min: number, max: number): string {
    return `$${min.toFixed(2)}-$${max.toFixed(2)}`;
  }
}
