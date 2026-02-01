/**
 * GENESIS PART VI - PHASE 62.A: PAYMENT-FIRST MODEL
 * Cost Breakdown Calculator Tests
 */

import { CostBreakdownCalculator } from '@/lib/genesis/phase62a/cost-breakdown-calculator';
import {
  DROPLET_MONTHLY_COST,
  AI_USAGE_MIN,
  AI_USAGE_MAX,
  AI_USAGE_AVERAGE,
} from '@/lib/genesis/phase62a/payment-types';

describe('CostBreakdownCalculator', () => {
  describe('generateBreakdown', () => {
    it('should generate complete cost breakdown', () => {
      const breakdown = CostBreakdownCalculator.generateBreakdown(50);

      expect(breakdown.items).toHaveLength(3);
      expect(breakdown.monthly_minimum).toBeGreaterThan(0);
      expect(breakdown.monthly_maximum).toBeGreaterThan(breakdown.monthly_minimum);
      expect(breakdown.current_balance).toBe(50);
      expect(breakdown.estimated_runway_months).toBeGreaterThan(0);
    });

    it('should include standard cost items', () => {
      const breakdown = CostBreakdownCalculator.generateBreakdown(50);

      const itemNames = breakdown.items.map(item => item.name);
      expect(itemNames).toContain('Dedicated Server (DigitalOcean)');
      expect(itemNames).toContain('AI API Usage (OpenAI/Claude)');
      expect(itemNames).toContain('Platform Fee');
    });

    it('should calculate monthly costs correctly', () => {
      const breakdown = CostBreakdownCalculator.generateBreakdown(50);

      expect(breakdown.monthly_minimum).toBe(DROPLET_MONTHLY_COST + AI_USAGE_MIN);
      expect(breakdown.monthly_maximum).toBe(DROPLET_MONTHLY_COST + AI_USAGE_MAX);
      expect(breakdown.monthly_average).toBe(DROPLET_MONTHLY_COST + AI_USAGE_AVERAGE);
    });

    it('should calculate runway based on average burn', () => {
      const balance = 100;
      const breakdown = CostBreakdownCalculator.generateBreakdown(balance);

      const expectedRunway = balance / breakdown.monthly_average;
      expect(breakdown.estimated_runway_months).toBeCloseTo(expectedRunway, 2);
    });
  });

  describe('calculateRunway', () => {
    it('should calculate correct runway', () => {
      expect(CostBreakdownCalculator.calculateRunway(100, 50)).toBe(2);
      expect(CostBreakdownCalculator.calculateRunway(100, 25)).toBe(4);
    });

    it('should return Infinity for zero burn rate', () => {
      expect(CostBreakdownCalculator.calculateRunway(100, 0)).toBe(Infinity);
    });

    it('should return 0 for zero or negative balance', () => {
      expect(CostBreakdownCalculator.calculateRunway(0, 10)).toBe(0);
      expect(CostBreakdownCalculator.calculateRunway(-10, 10)).toBe(0);
    });

    it('should handle fractional results', () => {
      const runway = CostBreakdownCalculator.calculateRunway(100, 33);
      expect(runway).toBeCloseTo(3.03, 2);
    });
  });

  describe('calculateRunwayDays', () => {
    it('should convert months to days', () => {
      expect(CostBreakdownCalculator.calculateRunwayDays(100, 50)).toBe(60);
      expect(CostBreakdownCalculator.calculateRunwayDays(100, 25)).toBe(120);
    });

    it('should handle fractional months', () => {
      const days = CostBreakdownCalculator.calculateRunwayDays(50, 100);
      expect(days).toBe(15); // 0.5 months × 30 days
    });
  });

  describe('formatRunway', () => {
    it('should format Infinity as Unlimited', () => {
      expect(CostBreakdownCalculator.formatRunway(Infinity)).toBe('Unlimited');
    });

    it('should format < 1 month in days', () => {
      expect(CostBreakdownCalculator.formatRunway(0.5)).toContain('days');
      expect(CostBreakdownCalculator.formatRunway(0.8)).toContain('days');
    });

    it('should format 1-2 months range', () => {
      expect(CostBreakdownCalculator.formatRunway(1.5)).toBe('~1-2 months');
    });

    it('should format 2-4 months range', () => {
      expect(CostBreakdownCalculator.formatRunway(3)).toBe('~2-4 months');
    });

    it('should format 4-6 months range', () => {
      expect(CostBreakdownCalculator.formatRunway(5)).toBe('~4-6 months');
    });

    it('should format 6-12 months range', () => {
      expect(CostBreakdownCalculator.formatRunway(8)).toBe('~6-12 months');
    });

    it('should format 1+ year', () => {
      expect(CostBreakdownCalculator.formatRunway(15)).toBe('1+ year');
    });
  });

  describe('calculateMonthlyTotal', () => {
    it('should calculate total with average AI usage', () => {
      const total = CostBreakdownCalculator.calculateMonthlyTotal();
      expect(total).toBe(DROPLET_MONTHLY_COST + AI_USAGE_AVERAGE);
    });

    it('should calculate total with minimum AI usage', () => {
      const total = CostBreakdownCalculator.calculateMonthlyTotal(true);
      expect(total).toBe(DROPLET_MONTHLY_COST + AI_USAGE_MIN);
    });
  });

  describe('estimateAIUsage', () => {
    it('should estimate AI usage for lead campaign', () => {
      const result = CostBreakdownCalculator.estimateAIUsage(100, 3);

      expect(result.estimated_cost).toBeGreaterThan(0);
      expect(result.breakdown).toContain('100 leads');
      expect(result.breakdown).toContain('3 emails');
    });

    it('should scale with lead count', () => {
      const result100 = CostBreakdownCalculator.estimateAIUsage(100, 3);
      const result200 = CostBreakdownCalculator.estimateAIUsage(200, 3);

      expect(result200.estimated_cost).toBeGreaterThan(result100.estimated_cost);
      expect(result200.estimated_cost).toBeCloseTo(result100.estimated_cost * 2, 1);
    });

    it('should scale with emails per lead', () => {
      const result3 = CostBreakdownCalculator.estimateAIUsage(100, 3);
      const result6 = CostBreakdownCalculator.estimateAIUsage(100, 6);

      expect(result6.estimated_cost).toBeGreaterThan(result3.estimated_cost);
    });
  });

  describe('getCostSummary', () => {
    it('should generate formatted cost summary', () => {
      const breakdown = CostBreakdownCalculator.generateBreakdown(50);
      const summary = CostBreakdownCalculator.getCostSummary(breakdown);

      expect(summary).toContain('Monthly Infrastructure');
      expect(summary).toContain('AI API Usage');
      expect(summary).toContain('Platform Fee');
      expect(summary).toContain('Current Balance');
      expect(summary).toContain('Estimated Runway');
    });

    it('should include correct balance', () => {
      const breakdown = CostBreakdownCalculator.generateBreakdown(75.50);
      const summary = CostBreakdownCalculator.getCostSummary(breakdown);

      expect(summary).toContain('$75.50');
    });
  });

  describe('isSufficientForDuration', () => {
    it('should return true if balance covers duration', () => {
      const monthlyBurn = 20;
      const balance = 100;

      expect(CostBreakdownCalculator.isSufficientForDuration(balance, 3, monthlyBurn)).toBe(true);
      expect(CostBreakdownCalculator.isSufficientForDuration(balance, 5, monthlyBurn)).toBe(true);
    });

    it('should return false if balance insufficient', () => {
      const monthlyBurn = 20;
      const balance = 50;

      expect(CostBreakdownCalculator.isSufficientForDuration(balance, 6, monthlyBurn)).toBe(false);
    });

    it('should use default burn rate if not provided', () => {
      const result = CostBreakdownCalculator.isSufficientForDuration(100, 3);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calculateRecommendedTopUp', () => {
    it('should calculate top-up for 3 months', () => {
      const currentBalance = 20;
      const topUp = CostBreakdownCalculator.calculateRecommendedTopUp(currentBalance, 3);

      expect(topUp).toBeGreaterThan(0);
    });

    it('should return 0 if balance already sufficient', () => {
      const currentBalance = 100;
      const topUp = CostBreakdownCalculator.calculateRecommendedTopUp(currentBalance, 3);

      expect(topUp).toBe(0);
    });

    it('should use default 3 months if not specified', () => {
      const topUp = CostBreakdownCalculator.calculateRecommendedTopUp(20);
      expect(topUp).toBeGreaterThan(0);
    });

    it('should round up to nearest dollar', () => {
      const topUp = CostBreakdownCalculator.calculateRecommendedTopUp(20, 2);
      expect(topUp % 1).toBe(0); // Should be whole number
    });
  });

  describe('getCostItem', () => {
    it('should get cost item by name', () => {
      const item = CostBreakdownCalculator.getCostItem('Dedicated Server (DigitalOcean)');

      expect(item).toBeDefined();
      expect(item?.cost).toBe(DROPLET_MONTHLY_COST);
      expect(item?.period).toBe('monthly');
    });

    it('should return undefined for non-existent item', () => {
      const item = CostBreakdownCalculator.getCostItem('Non-existent Item');
      expect(item).toBeUndefined();
    });
  });

  describe('formatCostRange', () => {
    it('should format cost range correctly', () => {
      const formatted = CostBreakdownCalculator.formatCostRange(10, 20);
      expect(formatted).toBe('$10.00-$20.00');
    });

    it('should handle equal min and max', () => {
      const formatted = CostBreakdownCalculator.formatCostRange(15, 15);
      expect(formatted).toBe('$15.00-$15.00');
    });

    it('should handle fractional costs', () => {
      const formatted = CostBreakdownCalculator.formatCostRange(10.5, 20.75);
      expect(formatted).toBe('$10.50-$20.75');
    });
  });

  describe('Integration: Complete Cost Analysis', () => {
    it('should provide comprehensive cost analysis', () => {
      const balance = 100;

      // Generate breakdown
      const breakdown = CostBreakdownCalculator.generateBreakdown(balance);
      expect(breakdown).toBeDefined();

      // Check runway
      const runway = breakdown.estimated_runway_months;
      expect(runway).toBeGreaterThan(0);

      // Format for display
      const formattedRunway = CostBreakdownCalculator.formatRunway(runway);
      expect(formattedRunway).toBeTruthy();

      // Get summary
      const summary = CostBreakdownCalculator.getCostSummary(breakdown);
      expect(summary).toContain(balance.toString());

      // Check if sufficient for target duration
      const sufficient = CostBreakdownCalculator.isSufficientForDuration(
        balance,
        3,
        breakdown.monthly_average
      );
      expect(typeof sufficient).toBe('boolean');
    });

    it('should calculate top-up for low balance scenario', () => {
      const lowBalance = 15;

      // Generate breakdown
      const breakdown = CostBreakdownCalculator.generateBreakdown(lowBalance);

      // Check if sufficient for 3 months
      const sufficient = CostBreakdownCalculator.isSufficientForDuration(
        lowBalance,
        3,
        breakdown.monthly_average
      );

      if (!sufficient) {
        // Calculate recommended top-up
        const topUp = CostBreakdownCalculator.calculateRecommendedTopUp(lowBalance, 3);
        expect(topUp).toBeGreaterThan(0);

        // Verify top-up brings balance to target
        const newBalance = lowBalance + topUp;
        const nowSufficient = CostBreakdownCalculator.isSufficientForDuration(
          newBalance,
          3,
          breakdown.monthly_average
        );
        expect(nowSufficient).toBe(true);
      }
    });
  });

  describe('Cost Item Details', () => {
    it('should have correct droplet cost', () => {
      const item = CostBreakdownCalculator.getCostItem('Dedicated Server (DigitalOcean)');
      expect(item?.cost).toBe(6.0);
    });

    it('should show platform fee as $0 during beta', () => {
      const item = CostBreakdownCalculator.getCostItem('Platform Fee');
      expect(item?.cost).toBe(0);
    });

    it('should mark AI usage as variable', () => {
      const item = CostBreakdownCalculator.getCostItem('AI API Usage (OpenAI/Claude)');
      expect(item?.period).toBe('variable');
    });
  });
});
