/**
 * PHASE 57 TESTS: COST ALLOCATION ENGINE
 * 
 * Comprehensive tests for cost tracking, margin calculation, and reporting
 */

import {
  CostAllocationEngine,
  ServiceCostCalculator,
  CostFormatter,
} from '@/lib/genesis/phase57/cost-allocation';
import {
  ServiceUsageEvent,
  CostAllocation,
} from '@/lib/genesis/phase57/types';

describe('Phase 57: Cost Allocation Engine', () => {
  describe('CostAllocationEngine.calculateEventCost', () => {
    test('should calculate cost for Apify scrape', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_1',
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        eventType: 'scrape',
        units: 100,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      const result = CostAllocationEngine.calculateEventCost(event);

      expect(result.genesisCost).toBe(150); // 100 * $0.015
      expect(result.userCost).toBe(200); // 100 * $0.02
      expect(result.margin).toBe(50);
      expect(result.marginPercent).toBe(25);
    });

    test('should calculate cost for Google CSE search', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_2',
        workspaceId: 'ws_1',
        serviceId: 'google_cse',
        eventType: 'search',
        units: 1000,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      const result = CostAllocationEngine.calculateEventCost(event);

      expect(result.genesisCost).toBe(400); // 1000 * $0.004
      expect(result.userCost).toBe(500); // 1000 * $0.005
      expect(result.margin).toBe(100);
      expect(result.marginPercent).toBe(20);
    });

    test('should calculate cost for residential proxies', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_3',
        workspaceId: 'ws_1',
        serviceId: 'residential_proxies',
        eventType: 'request',
        units: 5000,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      const result = CostAllocationEngine.calculateEventCost(event);

      expect(result.genesisCost).toBe(350); // 5000 * $0.0007
      expect(result.userCost).toBe(500); // 5000 * $0.001
      expect(result.margin).toBe(150);
      expect(result.marginPercent).toBe(30);
    });

    test('should return zero for BYO services', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_4',
        workspaceId: 'ws_1',
        serviceId: 'openai_byo',
        eventType: 'api_call',
        units: 100,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      const result = CostAllocationEngine.calculateEventCost(event);

      expect(result.genesisCost).toBe(0);
      expect(result.userCost).toBe(0);
      expect(result.margin).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    test('should return zero for included services', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_5',
        workspaceId: 'ws_1',
        serviceId: 'gmail_oauth',
        eventType: 'send',
        units: 100,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      const result = CostAllocationEngine.calculateEventCost(event);

      expect(result.genesisCost).toBe(0);
      expect(result.userCost).toBe(0);
      expect(result.margin).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    test('should throw error for unknown service', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_6',
        workspaceId: 'ws_1',
        serviceId: 'unknown_service',
        eventType: 'unknown',
        units: 100,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      expect(() => {
        CostAllocationEngine.calculateEventCost(event);
      }).toThrow('Unknown service');
    });

    test('should handle fractional units correctly', () => {
      const event: ServiceUsageEvent = {
        eventId: 'evt_7',
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        eventType: 'scrape',
        units: 7,
        genesisCostCents: 0,
        userCostCents: 0,
        timestamp: new Date(),
      };

      const result = CostAllocationEngine.calculateEventCost(event);

      expect(result.genesisCost).toBe(11); // 7 * 1.5 = 10.5, rounded to 11
      expect(result.userCost).toBe(14); // 7 * 2.0 = 14
    });
  });

  describe('CostAllocationEngine.aggregateUsageEvents', () => {
    test('should aggregate multiple events', () => {
      const events: ServiceUsageEvent[] = [
        {
          eventId: 'evt_1',
          workspaceId: 'ws_1',
          serviceId: 'apify_managed',
          eventType: 'scrape',
          units: 100,
          genesisCostCents: 150,
          userCostCents: 200,
          timestamp: new Date('2026-01-01T10:00:00Z'),
        },
        {
          eventId: 'evt_2',
          workspaceId: 'ws_1',
          serviceId: 'apify_managed',
          eventType: 'scrape',
          units: 50,
          genesisCostCents: 75,
          userCostCents: 100,
          timestamp: new Date('2026-01-02T10:00:00Z'),
        },
      ];

      const result = CostAllocationEngine.aggregateUsageEvents(
        'ws_1',
        'apify_managed',
        '2026-01',
        events
      );

      expect(result.workspaceId).toBe('ws_1');
      expect(result.serviceId).toBe('apify_managed');
      expect(result.month).toBe('2026-01');
      expect(result.unitsConsumed).toBe(150);
      expect(result.genesisCostCents).toBe(225);
      expect(result.userChargeCents).toBe(300);
      expect(result.marginCents).toBe(75);
      expect(result.marginPercent).toBe(25);
      expect(result.transactionCount).toBe(2);
    });

    test('should track first and last transaction timestamps', () => {
      const events: ServiceUsageEvent[] = [
        {
          eventId: 'evt_1',
          workspaceId: 'ws_1',
          serviceId: 'google_cse',
          eventType: 'search',
          units: 10,
          genesisCostCents: 4,
          userCostCents: 5,
          timestamp: new Date('2026-01-05T10:00:00Z'),
        },
        {
          eventId: 'evt_2',
          workspaceId: 'ws_1',
          serviceId: 'google_cse',
          eventType: 'search',
          units: 10,
          genesisCostCents: 4,
          userCostCents: 5,
          timestamp: new Date('2026-01-15T10:00:00Z'),
        },
        {
          eventId: 'evt_3',
          workspaceId: 'ws_1',
          serviceId: 'google_cse',
          eventType: 'search',
          units: 10,
          genesisCostCents: 4,
          userCostCents: 5,
          timestamp: new Date('2026-01-10T10:00:00Z'),
        },
      ];

      const result = CostAllocationEngine.aggregateUsageEvents(
        'ws_1',
        'google_cse',
        '2026-01',
        events
      );

      expect(result.firstTransactionAt).toEqual(new Date('2026-01-05T10:00:00Z'));
      expect(result.lastTransactionAt).toEqual(new Date('2026-01-15T10:00:00Z'));
    });

    test('should throw error for empty events array', () => {
      expect(() => {
        CostAllocationEngine.aggregateUsageEvents(
          'ws_1',
          'service_1',
          '2026-01',
          []
        );
      }).toThrow('Cannot aggregate empty events array');
    });

    test('should handle single event', () => {
      const events: ServiceUsageEvent[] = [
        {
          eventId: 'evt_1',
          workspaceId: 'ws_1',
          serviceId: 'email_verification',
          eventType: 'verify',
          units: 100,
          genesisCostCents: 20,
          userCostCents: 30,
          timestamp: new Date('2026-01-10T10:00:00Z'),
        },
      ];

      const result = CostAllocationEngine.aggregateUsageEvents(
        'ws_1',
        'email_verification',
        '2026-01',
        events
      );

      expect(result.unitsConsumed).toBe(100);
      expect(result.transactionCount).toBe(1);
      expect(result.firstTransactionAt).toEqual(result.lastTransactionAt);
    });
  });

  describe('CostAllocationEngine.calculateMargin', () => {
    test('should calculate margin correctly', () => {
      const result = CostAllocationEngine.calculateMargin(75, 100);

      expect(result.marginCents).toBe(25);
      expect(result.marginPercent).toBe(25);
    });

    test('should handle zero retail cost', () => {
      const result = CostAllocationEngine.calculateMargin(0, 0);

      expect(result.marginCents).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    test('should calculate high margin', () => {
      const result = CostAllocationEngine.calculateMargin(50, 100);

      expect(result.marginCents).toBe(50);
      expect(result.marginPercent).toBe(50);
    });

    test('should calculate low margin', () => {
      const result = CostAllocationEngine.calculateMargin(90, 100);

      expect(result.marginCents).toBe(10);
      expect(result.marginPercent).toBe(10);
    });

    test('should round margin percent to 2 decimals', () => {
      const result = CostAllocationEngine.calculateMargin(67, 100);

      expect(result.marginCents).toBe(33);
      expect(result.marginPercent).toBe(33);
    });
  });

  describe('CostAllocationEngine.calculateRetailPrice', () => {
    test('should calculate retail with default margin (25%)', () => {
      const retail = CostAllocationEngine.calculateRetailPrice(75);

      expect(retail).toBe(100); // 75 / (1 - 0.25) = 100
    });

    test('should calculate retail with custom margin', () => {
      const retail = CostAllocationEngine.calculateRetailPrice(80, 20);

      expect(retail).toBe(100); // 80 / (1 - 0.20) = 100
    });

    test('should enforce minimum margin', () => {
      const retail = CostAllocationEngine.calculateRetailPrice(100, 5);

      // Should use MIN_MARGIN_PERCENT (10%) instead of 5%
      expect(retail).toBe(111); // 100 / (1 - 0.10) = 111.11, rounded to 111
    });

    test('should enforce maximum margin', () => {
      const retail = CostAllocationEngine.calculateRetailPrice(100, 60);

      // Should use MAX_MARGIN_PERCENT (50%) instead of 60%
      expect(retail).toBe(200); // 100 / (1 - 0.50) = 200
    });

    test('should handle small wholesale costs', () => {
      const retail = CostAllocationEngine.calculateRetailPrice(1, 25);

      expect(retail).toBe(1); // 1 / 0.75 = 1.33, rounded to 1
    });
  });

  describe('CostAllocationEngine.validateMargin', () => {
    test('should validate acceptable margin', () => {
      const result = CostAllocationEngine.validateMargin(75, 100);

      expect(result.valid).toBe(true);
      expect(result.marginPercent).toBe(25);
      expect(result.reason).toBeUndefined();
    });

    test('should reject negative wholesale cost', () => {
      const result = CostAllocationEngine.validateMargin(-10, 100);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Costs cannot be negative');
    });

    test('should reject negative retail cost', () => {
      const result = CostAllocationEngine.validateMargin(10, -100);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Costs cannot be negative');
    });

    test('should reject retail less than wholesale', () => {
      const result = CostAllocationEngine.validateMargin(100, 75);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        'Retail cost must be greater than or equal to wholesale cost'
      );
    });

    test('should reject margin below minimum', () => {
      const result = CostAllocationEngine.validateMargin(95, 100);

      expect(result.valid).toBe(false);
      expect(result.marginPercent).toBe(5);
      expect(result.reason).toContain('below minimum');
    });

    test('should reject margin above maximum', () => {
      const result = CostAllocationEngine.validateMargin(40, 100);

      expect(result.valid).toBe(false);
      expect(result.marginPercent).toBe(60);
      expect(result.reason).toContain('exceeds maximum');
    });

    test('should accept margin at minimum threshold', () => {
      const wholesale = 90;
      const retail = 100; // Exactly 10% margin

      const result = CostAllocationEngine.validateMargin(wholesale, retail);

      expect(result.valid).toBe(true);
      expect(result.marginPercent).toBe(10);
    });

    test('should accept margin at maximum threshold', () => {
      const wholesale = 50;
      const retail = 100; // Exactly 50% margin

      const result = CostAllocationEngine.validateMargin(wholesale, retail);

      expect(result.valid).toBe(true);
      expect(result.marginPercent).toBe(50);
    });
  });

  describe('CostAllocationEngine.generateMarginAnalysisReport', () => {
    test('should generate complete margin report', () => {
      const costAllocations: CostAllocation[] = [
        {
          workspaceId: 'ws_1',
          serviceId: 'apify_managed',
          month: '2026-01',
          unitsConsumed: 770,
          genesisCostCents: 1155,
          userChargeCents: 1540,
          marginCents: 385,
          marginPercent: 25,
          transactionCount: 10,
          firstTransactionAt: new Date('2026-01-01'),
          lastTransactionAt: new Date('2026-01-31'),
        },
        {
          workspaceId: 'ws_1',
          serviceId: 'google_cse',
          month: '2026-01',
          unitsConsumed: 900,
          genesisCostCents: 360,
          userChargeCents: 450,
          marginCents: 90,
          marginPercent: 20,
          transactionCount: 5,
          firstTransactionAt: new Date('2026-01-01'),
          lastTransactionAt: new Date('2026-01-31'),
        },
      ];

      const report = CostAllocationEngine.generateMarginAnalysisReport(
        'ws_1',
        '2026-01',
        9900, // $99 subscription
        costAllocations,
        600, // $6 droplet
        5 // $0.05 overhead
      );

      expect(report.workspaceId).toBe('ws_1');
      expect(report.month).toBe('2026-01');

      // Revenue
      expect(report.revenue.subscriptionFeeCents).toBe(9900);
      expect(report.revenue.managedServicesCents).toBe(1990); // 1540 + 450
      expect(report.revenue.totalCents).toBe(11890); // 9900 + 1990

      // Costs
      expect(report.costs.infrastructureCents).toBe(600);
      expect(report.costs.managedServicesCents).toBe(1515); // 1155 + 360
      expect(report.costs.sharedOverheadCents).toBe(5);
      expect(report.costs.totalCents).toBe(2120); // 600 + 1515 + 5

      // Margin
      expect(report.margin.grossProfitCents).toBe(9770); // 11890 - 2120
      expect(report.margin.marginPercent).toBe(82.17);

      // Service breakdown
      expect(report.serviceBreakdown.length).toBe(2);
      expect(report.serviceBreakdown[0].serviceId).toBe('apify_managed');
      expect(report.serviceBreakdown[1].serviceId).toBe('google_cse');
    });

    test('should handle zero managed services', () => {
      const report = CostAllocationEngine.generateMarginAnalysisReport(
        'ws_1',
        '2026-01',
        9900,
        [],
        600,
        5
      );

      expect(report.revenue.managedServicesCents).toBe(0);
      expect(report.costs.managedServicesCents).toBe(0);
      expect(report.serviceBreakdown.length).toBe(0);
    });

    test('should handle zero revenue correctly', () => {
      const report = CostAllocationEngine.generateMarginAnalysisReport(
        'ws_1',
        '2026-01',
        0,
        [],
        600,
        5
      );

      expect(report.margin.grossProfitCents).toBe(-605);
      expect(report.margin.marginPercent).toBe(0); // Avoid division by zero
    });
  });

  describe('ServiceCostCalculator', () => {
    test('should calculate Apify cost', () => {
      const result = ServiceCostCalculator.calculateApifyCost(100);

      expect(result.wholesaleCents).toBe(150); // 100 * 1.5
      expect(result.retailCents).toBe(200); // 100 * 2.0
      expect(result.marginCents).toBe(50);
    });

    test('should calculate CSE cost', () => {
      const result = ServiceCostCalculator.calculateCSECost(1000);

      expect(result.wholesaleCents).toBe(400); // 1000 * 0.4
      expect(result.retailCents).toBe(500); // 1000 * 0.5
      expect(result.marginCents).toBe(100);
    });

    test('should calculate proxy cost', () => {
      const result = ServiceCostCalculator.calculateProxyCost(5000);

      expect(result.wholesaleCents).toBe(350); // 5000 * 0.07
      expect(result.retailCents).toBe(500); // 5000 * 0.1
      expect(result.marginCents).toBe(150);
    });

    test('should calculate email verification cost', () => {
      const result = ServiceCostCalculator.calculateEmailVerificationCost(1000);

      expect(result.wholesaleCents).toBe(200); // 1000 * 0.2
      expect(result.retailCents).toBe(300); // 1000 * 0.3
      expect(result.marginCents).toBe(100);
    });

    test('should get droplet tier cost', () => {
      expect(ServiceCostCalculator.getDropletTierCost('starter')).toBe(600);
      expect(ServiceCostCalculator.getDropletTierCost('professional')).toBe(1200);
      expect(ServiceCostCalculator.getDropletTierCost('scale')).toBe(2400);
      expect(ServiceCostCalculator.getDropletTierCost('enterprise')).toBe(4800);
    });

    test('should default to starter tier for unknown tier', () => {
      expect(ServiceCostCalculator.getDropletTierCost('unknown')).toBe(600);
    });
  });

  describe('CostFormatter', () => {
    test('should format cents as dollars', () => {
      expect(CostFormatter.formatCents(100)).toBe('$1.00');
      expect(CostFormatter.formatCents(1550)).toBe('$15.50');
      expect(CostFormatter.formatCents(0)).toBe('$0.00');
      expect(CostFormatter.formatCents(999)).toBe('$9.99');
    });

    test('should format margin percent', () => {
      expect(CostFormatter.formatMarginPercent(25)).toBe('25.0%');
      expect(CostFormatter.formatMarginPercent(33.33)).toBe('33.3%');
      expect(CostFormatter.formatMarginPercent(0)).toBe('0.0%');
      expect(CostFormatter.formatMarginPercent(100)).toBe('100.0%');
    });

    test('should format cost allocation', () => {
      const allocation: CostAllocation = {
        workspaceId: 'ws_1',
        serviceId: 'apify_managed',
        month: '2026-01',
        unitsConsumed: 100,
        genesisCostCents: 150,
        userChargeCents: 200,
        marginCents: 50,
        marginPercent: 25,
        transactionCount: 5,
        firstTransactionAt: new Date(),
        lastTransactionAt: new Date(),
      };

      const formatted = CostFormatter.formatCostAllocation(allocation);

      expect(formatted).toContain('Service: apify_managed');
      expect(formatted).toContain('Units: 100');
      expect(formatted).toContain('Revenue: $2.00');
      expect(formatted).toContain('Cost: $1.50');
      expect(formatted).toContain('Margin: $0.50 (25.0%)');
    });
  });
});
