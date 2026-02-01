/**
 * PHASE 57: COST ALLOCATION ENGINE
 * 
 * Handles cost tracking, margin calculation, and financial reporting
 * for all managed services in the Genesis ecosystem.
 */

import {
  CostAllocation,
  ServiceUsageEvent,
  MarginAnalysisReport,
  BillingModel,
  DEFAULT_MARGIN_PERCENT,
  MIN_MARGIN_PERCENT,
  MAX_MARGIN_PERCENT,
} from './types';
import { getServiceById } from './service-matrix';

/**
 * Cost Allocation Engine
 * Tracks and calculates costs for workspace service usage
 */
export class CostAllocationEngine {
  /**
   * Calculate cost allocation for a usage event
   */
  static calculateEventCost(event: ServiceUsageEvent): {
    genesisCost: number;
    userCost: number;
    margin: number;
    marginPercent: number;
  } {
    const service = getServiceById(event.serviceId);

    if (!service) {
      throw new Error(`Unknown service: ${event.serviceId}`);
    }

    // For non-managed services, costs are zero (user pays directly)
    if (service.billingModel === BillingModel.USER_DIRECT) {
      return {
        genesisCost: 0,
        userCost: 0,
        margin: 0,
        marginPercent: 0,
      };
    }

    // For included services, no charge
    if (service.billingModel === BillingModel.INCLUDED_IN_BASE) {
      return {
        genesisCost: 0,
        userCost: 0,
        margin: 0,
        marginPercent: 0,
      };
    }

    // For per-use services
    if (service.billingModel === BillingModel.PER_USE) {
      const wholesaleCost = service.costDetails?.wholesaleCostCents || 0;
      const retailCost = service.costDetails?.retailCostCents || 0;

      const genesisCost = wholesaleCost * event.units;
      const userCost = retailCost * event.units;
      const margin = userCost - genesisCost;
      const marginPercent = userCost > 0 ? (margin / userCost) * 100 : 0;

      return {
        genesisCost: Math.round(genesisCost),
        userCost: Math.round(userCost),
        margin: Math.round(margin),
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    }

    // For tiered services (handled separately at subscription level)
    if (service.billingModel === BillingModel.TIERED) {
      return {
        genesisCost: 0,
        userCost: 0,
        margin: 0,
        marginPercent: 0,
      };
    }

    return {
      genesisCost: 0,
      userCost: 0,
      margin: 0,
      marginPercent: 0,
    };
  }

  /**
   * Aggregate usage events into cost allocation
   */
  static aggregateUsageEvents(
    workspaceId: string,
    serviceId: string,
    month: string,
    events: ServiceUsageEvent[]
  ): CostAllocation {
    if (events.length === 0) {
      throw new Error('Cannot aggregate empty events array');
    }

    let totalUnits = 0;
    let totalGenesisCost = 0;
    let totalUserCost = 0;
    let transactionCount = 0;
    let firstTimestamp: Date | null = null;
    let lastTimestamp: Date | null = null;

    for (const event of events) {
      totalUnits += event.units;
      totalGenesisCost += event.genesisCostCents;
      totalUserCost += event.userCostCents;
      transactionCount++;

      if (!firstTimestamp || event.timestamp < firstTimestamp) {
        firstTimestamp = event.timestamp;
      }
      if (!lastTimestamp || event.timestamp > lastTimestamp) {
        lastTimestamp = event.timestamp;
      }
    }

    const marginCents = totalUserCost - totalGenesisCost;
    const marginPercent =
      totalUserCost > 0 ? (marginCents / totalUserCost) * 100 : 0;

    return {
      workspaceId,
      serviceId,
      month,
      unitsConsumed: totalUnits,
      genesisCostCents: Math.round(totalGenesisCost),
      userChargeCents: Math.round(totalUserCost),
      marginCents: Math.round(marginCents),
      marginPercent: Math.round(marginPercent * 100) / 100,
      transactionCount,
      firstTransactionAt: firstTimestamp!,
      lastTransactionAt: lastTimestamp!,
    };
  }

  /**
   * Calculate margin for a given wholesale and retail cost
   */
  static calculateMargin(
    wholesaleCostCents: number,
    retailCostCents: number
  ): {
    marginCents: number;
    marginPercent: number;
  } {
    const marginCents = retailCostCents - wholesaleCostCents;
    const marginPercent =
      retailCostCents > 0 ? (marginCents / retailCostCents) * 100 : 0;

    return {
      marginCents,
      marginPercent: Math.round(marginPercent * 100) / 100,
    };
  }

  /**
   * Calculate retail price from wholesale with target margin
   */
  static calculateRetailPrice(
    wholesaleCostCents: number,
    targetMarginPercent: number = DEFAULT_MARGIN_PERCENT
  ): number {
    // Validate margin
    const margin = Math.max(
      MIN_MARGIN_PERCENT,
      Math.min(MAX_MARGIN_PERCENT, targetMarginPercent)
    );

    // Formula: retail = wholesale / (1 - margin/100)
    const retailCostCents = wholesaleCostCents / (1 - margin / 100);

    return Math.round(retailCostCents);
  }

  /**
   * Validate margin meets minimum threshold
   */
  static validateMargin(
    wholesaleCostCents: number,
    retailCostCents: number
  ): {
    valid: boolean;
    marginPercent: number;
    reason?: string;
  } {
    if (wholesaleCostCents < 0 || retailCostCents < 0) {
      return {
        valid: false,
        marginPercent: 0,
        reason: 'Costs cannot be negative',
      };
    }

    if (retailCostCents < wholesaleCostCents) {
      return {
        valid: false,
        marginPercent: 0,
        reason: 'Retail cost must be greater than or equal to wholesale cost',
      };
    }

    const { marginPercent } = this.calculateMargin(
      wholesaleCostCents,
      retailCostCents
    );

    if (marginPercent < MIN_MARGIN_PERCENT) {
      return {
        valid: false,
        marginPercent,
        reason: `Margin ${marginPercent}% is below minimum ${MIN_MARGIN_PERCENT}%`,
      };
    }

    if (marginPercent > MAX_MARGIN_PERCENT) {
      return {
        valid: false,
        marginPercent,
        reason: `Margin ${marginPercent}% exceeds maximum ${MAX_MARGIN_PERCENT}%`,
      };
    }

    return {
      valid: true,
      marginPercent,
    };
  }

  /**
   * Generate margin analysis report for a workspace
   */
  static generateMarginAnalysisReport(
    workspaceId: string,
    month: string,
    subscriptionFeeCents: number,
    costAllocations: CostAllocation[],
    infrastructureCostCents: number,
    sharedOverheadCents: number = 5 // Default $0.05
  ): MarginAnalysisReport {
    // Calculate managed services revenue and costs
    let managedServicesRevenue = 0;
    let managedServicesCosts = 0;

    for (const allocation of costAllocations) {
      managedServicesRevenue += allocation.userChargeCents;
      managedServicesCosts += allocation.genesisCostCents;
    }

    // Total revenue
    const totalRevenue = subscriptionFeeCents + managedServicesRevenue;

    // Total costs
    const totalCosts =
      infrastructureCostCents + managedServicesCosts + sharedOverheadCents;

    // Margin
    const grossProfit = totalRevenue - totalCosts;
    const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Service breakdown
    const serviceBreakdown = costAllocations.map((allocation) => {
      const service = getServiceById(allocation.serviceId);
      return {
        serviceId: allocation.serviceId,
        displayName: service?.displayName || allocation.serviceId,
        unitsConsumed: allocation.unitsConsumed,
        revenueCents: allocation.userChargeCents,
        costCents: allocation.genesisCostCents,
        marginCents: allocation.marginCents,
      };
    });

    return {
      workspaceId,
      month,
      revenue: {
        subscriptionFeeCents,
        managedServicesCents: managedServicesRevenue,
        totalCents: totalRevenue,
      },
      costs: {
        infrastructureCents: infrastructureCostCents,
        managedServicesCents: managedServicesCosts,
        sharedOverheadCents,
        totalCents: totalCosts,
      },
      margin: {
        grossProfitCents: grossProfit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      },
      serviceBreakdown,
    };
  }
}

/**
 * Service Cost Calculator
 * Helper functions for calculating service costs
 */
export class ServiceCostCalculator {
  /**
   * Calculate cost for Apify scraping
   */
  static calculateApifyCost(scrapeCount: number): {
    wholesaleCents: number;
    retailCents: number;
    marginCents: number;
  } {
    const wholesalePerScrape = 1.5; // $0.015
    const retailPerScrape = 2.0; // $0.02

    return {
      wholesaleCents: Math.round(scrapeCount * wholesalePerScrape),
      retailCents: Math.round(scrapeCount * retailPerScrape),
      marginCents: Math.round(scrapeCount * (retailPerScrape - wholesalePerScrape)),
    };
  }

  /**
   * Calculate cost for Google CSE searches
   */
  static calculateCSECost(searchCount: number): {
    wholesaleCents: number;
    retailCents: number;
    marginCents: number;
  } {
    const wholesalePerSearch = 0.4; // $0.004
    const retailPerSearch = 0.5; // $0.005

    return {
      wholesaleCents: Math.round(searchCount * wholesalePerSearch),
      retailCents: Math.round(searchCount * retailPerSearch),
      marginCents: Math.round(searchCount * (retailPerSearch - wholesalePerSearch)),
    };
  }

  /**
   * Calculate cost for residential proxies
   */
  static calculateProxyCost(requestCount: number): {
    wholesaleCents: number;
    retailCents: number;
    marginCents: number;
  } {
    const wholesalePerRequest = 0.07; // $0.0007
    const retailPerRequest = 0.1; // $0.001

    return {
      wholesaleCents: Math.round(requestCount * wholesalePerRequest),
      retailCents: Math.round(requestCount * retailPerRequest),
      marginCents: Math.round(requestCount * (retailPerRequest - wholesalePerRequest)),
    };
  }

  /**
   * Calculate cost for email verification
   */
  static calculateEmailVerificationCost(emailCount: number): {
    wholesaleCents: number;
    retailCents: number;
    marginCents: number;
  } {
    const wholesalePerEmail = 0.2; // $0.002
    const retailPerEmail = 0.3; // $0.003

    return {
      wholesaleCents: Math.round(emailCount * wholesalePerEmail),
      retailCents: Math.round(emailCount * retailPerEmail),
      marginCents: Math.round(emailCount * (retailPerEmail - wholesalePerEmail)),
    };
  }

  /**
   * Get droplet tier monthly cost
   */
  static getDropletTierCost(tierId: string): number {
    const tierCosts: Record<string, number> = {
      starter: 600, // $6
      professional: 1200, // $12
      scale: 2400, // $24
      enterprise: 4800, // $48
    };

    return tierCosts[tierId] || 600; // Default to starter
  }
}

/**
 * Format costs for display
 */
export class CostFormatter {
  /**
   * Format cents as dollars
   */
  static formatCents(cents: number): string {
    const dollars = cents / 100;
    return `$${dollars.toFixed(2)}`;
  }

  /**
   * Format margin percent
   */
  static formatMarginPercent(percent: number): string {
    return `${percent.toFixed(1)}%`;
  }

  /**
   * Format cost allocation summary
   */
  static formatCostAllocation(allocation: CostAllocation): string {
    return [
      `Service: ${allocation.serviceId}`,
      `Units: ${allocation.unitsConsumed}`,
      `Revenue: ${this.formatCents(allocation.userChargeCents)}`,
      `Cost: ${this.formatCents(allocation.genesisCostCents)}`,
      `Margin: ${this.formatCents(allocation.marginCents)} (${this.formatMarginPercent(allocation.marginPercent)})`,
    ].join('\n');
  }

  /**
   * Format margin analysis report
   */
  static formatMarginReport(report: MarginAnalysisReport): string {
    const lines = [
      `=== MARGIN REPORT: ${report.workspaceId} (${report.month}) ===`,
      '',
      'REVENUE:',
      `  Subscription: ${this.formatCents(report.revenue.subscriptionFeeCents)}`,
      `  Managed Services: ${this.formatCents(report.revenue.managedServicesCents)}`,
      `  TOTAL: ${this.formatCents(report.revenue.totalCents)}`,
      '',
      'COSTS:',
      `  Infrastructure: ${this.formatCents(report.costs.infrastructureCents)}`,
      `  Managed Services: ${this.formatCents(report.costs.managedServicesCents)}`,
      `  Shared Overhead: ${this.formatCents(report.costs.sharedOverheadCents)}`,
      `  TOTAL: ${this.formatCents(report.costs.totalCents)}`,
      '',
      'MARGIN:',
      `  Gross Profit: ${this.formatCents(report.margin.grossProfitCents)}`,
      `  Margin: ${this.formatMarginPercent(report.margin.marginPercent)}`,
      '',
      'SERVICE BREAKDOWN:',
    ];

    for (const service of report.serviceBreakdown) {
      lines.push(
        `  ${service.displayName}: ${this.formatCents(service.revenueCents)} revenue, ${this.formatCents(service.costCents)} cost (${service.unitsConsumed} units)`
      );
    }

    return lines.join('\n');
  }
}
