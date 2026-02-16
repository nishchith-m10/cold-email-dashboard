/**
 * PHASE 64: Droplet Configuration Service Tests
 * 
 * Tests for region/size selection and cost calculation.
 */

import {
  DropletConfigurationService,
  DROPLET_REGIONS,
  DROPLET_SIZES,
  DEFAULT_REGION,
  DEFAULT_SIZE,
} from '@/lib/genesis/phase64/droplet-configuration-service';

// ============================================
// MOCKS
// ============================================

const mockSupabase: any = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

describe('DropletConfigurationService', () => {
  let service: DropletConfigurationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DropletConfigurationService({ supabaseClient: mockSupabase });
  });

  describe('getAvailableRegions', () => {
    it('should return all regions', () => {
      const regions = service.getAvailableRegions();

      expect(regions).toHaveLength(5);
      expect(regions.map(r => r.code)).toEqual([
        'us-east',
        'us-west',
        'eu-west',
        'eu-north',
        'apac',
      ]);
    });

    it('should include all required fields', () => {
      const regions = service.getAvailableRegions();

      regions.forEach(region => {
        expect(region.code).toBeDefined();
        expect(region.name).toBeDefined();
        expect(region.location).toBeDefined();
        expect(region.doSlug).toBeDefined();
        expect(region.suprabaseRegion).toBeDefined();
        expect(typeof region.gdprCompliant).toBe('boolean');
        expect(region.latencyDescription).toBeDefined();
      });
    });
  });

  describe('getRegionInfo', () => {
    it('should return info for valid region', () => {
      const info = service.getRegionInfo('eu-west');

      expect(info).toBeDefined();
      expect(info?.location).toBe('Frankfurt, Germany');
      expect(info?.gdprCompliant).toBe(true);
    });

    it('should return null for invalid region', () => {
      const info = service.getRegionInfo('invalid' as any);

      expect(info).toBeNull();
    });
  });

  describe('getGDPRRegions', () => {
    it('should return only GDPR-compliant regions', () => {
      const gdprRegions = service.getGDPRRegions();

      expect(gdprRegions).toHaveLength(2);
      expect(gdprRegions.every(r => r.gdprCompliant)).toBe(true);
      expect(gdprRegions.map(r => r.code)).toEqual(['eu-west', 'eu-north']);
    });
  });

  describe('getAvailableSizes', () => {
    it('should return all sizes', () => {
      const sizes = service.getAvailableSizes();

      expect(sizes).toHaveLength(4);
      expect(sizes.map(s => s.tier)).toEqual([
        'starter',
        'professional',
        'scale',
        'enterprise',
      ]);
    });

    it('should include pricing for all sizes', () => {
      const sizes = service.getAvailableSizes();

      sizes.forEach(size => {
        expect(size.monthlyPrice).toBeGreaterThan(0);
        expect(size.vcpu).toBeGreaterThan(0);
        expect(size.ram).toBeGreaterThan(0);
        expect(size.ssd).toBeGreaterThan(0);
      });
    });

    it('should have correct pricing progression', () => {
      const sizes = service.getAvailableSizes();

      expect(sizes[0].monthlyPrice).toBe(6);
      expect(sizes[1].monthlyPrice).toBe(12);
      expect(sizes[2].monthlyPrice).toBe(24);
      expect(sizes[3].monthlyPrice).toBe(48);
    });
  });

  describe('getRecommendedSize', () => {
    it('should recommend starter for low volume', () => {
      const size = service.getRecommendedSize({
        sequences: 3,
        leadsPerDay: 200,
      });

      expect(size).toBe('starter');
    });

    it('should recommend professional for medium volume', () => {
      const size = service.getRecommendedSize({
        sequences: 8,
        leadsPerDay: 1000,
      });

      expect(size).toBe('professional');
    });

    it('should recommend scale for high sequence count', () => {
      const size = service.getRecommendedSize({
        sequences: 20,
      });

      expect(size).toBe('scale');
    });

    it('should recommend scale for high lead volume', () => {
      const size = service.getRecommendedSize({
        leadsPerDay: 5000,
      });

      expect(size).toBe('scale');
    });

    it('should default to starter if no requirements', () => {
      const size = service.getRecommendedSize({});

      expect(size).toBe('starter');
    });
  });

  describe('saveConfiguration', () => {
    it('should save configuration successfully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.saveConfiguration('ws-123', 'eu-west', 'professional');

      expect(result.success).toBe(true);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-123',
          region: 'eu-west',
          size: 'professional',
        }),
        { onConflict: 'workspace_id' }
      );
    });

    it('should reject invalid region', async () => {
      const result = await service.saveConfiguration('ws-123', 'invalid' as any, 'starter');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid region');
    });

    it('should reject invalid size', async () => {
      const result = await service.saveConfiguration('ws-123', 'us-east', 'invalid' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid size');
    });

    it('should handle database errors', async () => {
      const upsertMock = (jest.fn() as any).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.upsert = jest.fn(() => upsertMock());

      const result = await service.saveConfiguration('ws-123', 'us-east', 'starter');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getConfiguration', () => {
    it('should retrieve saved configuration', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          region: 'eu-west',
          size: 'professional',
          selected_at: '2026-01-29T12:00:00Z',
          provisioned_at: '2026-01-29T12:05:00Z',
        },
        error: null,
      });

      const result = await service.getConfiguration('ws-123');

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.region).toBe('eu-west');
      expect(result.config?.size).toBe('professional');
    });

    it('should return defaults if not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      const result = await service.getConfiguration('ws-new');

      expect(result.success).toBe(true);
      expect(result.config?.region).toBe(DEFAULT_REGION);
      expect(result.config?.size).toBe(DEFAULT_SIZE);
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      });

      const result = await service.getConfiguration('ws-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateSize', () => {
    it('should upgrade size successfully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.updateSize('ws-123', 'scale');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'scale',
        })
      );
    });

    it('should reject invalid size', async () => {
      const result = await service.updateSize('ws-123', 'invalid' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid size');
    });
  });

  describe('calculateMonthlyCost', () => {
    it('should calculate correct monthly cost', () => {
      expect(service.calculateMonthlyCost('starter')).toBe(6);
      expect(service.calculateMonthlyCost('professional')).toBe(12);
      expect(service.calculateMonthlyCost('scale')).toBe(24);
      expect(service.calculateMonthlyCost('enterprise')).toBe(48);
    });

    it('should return 0 for invalid size', () => {
      const cost = service.calculateMonthlyCost('invalid' as any);

      expect(cost).toBe(0);
    });
  });

  describe('calculateYearlyCost', () => {
    it('should calculate yearly cost without discount', () => {
      const yearly = service.calculateYearlyCost('starter', 0);

      expect(yearly).toBe(6 * 12); // $72
    });

    it('should apply discount correctly', () => {
      const yearly = service.calculateYearlyCost('starter', 20); // 20% discount

      expect(yearly).toBe(6 * 12 * 0.8); // $57.60
    });

    it('should handle 100% discount', () => {
      const yearly = service.calculateYearlyCost('professional', 100);

      expect(yearly).toBe(0);
    });

    it('should calculate enterprise yearly cost', () => {
      const yearly = service.calculateYearlyCost('enterprise', 10);

      expect(yearly).toBe(48 * 12 * 0.9); // $518.40
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct configuration', () => {
      const result = service.validateConfiguration('us-east', 'starter');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid region', () => {
      const result = service.validateConfiguration('invalid' as any, 'starter');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid region: invalid');
    });

    it('should reject invalid size', () => {
      const result = service.validateConfiguration('us-east', 'invalid' as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid size: invalid');
    });

    it('should return multiple errors', () => {
      const result = service.validateConfiguration('bad-region' as any, 'bad-size' as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Constants Validation', () => {
    it('should have valid DO region slugs', () => {
      const regions = service.getAvailableRegions();

      regions.forEach(region => {
        expect(region.doSlug).toMatch(/^[a-z]{3}\d$/);
      });
    });

    it('should have valid DO size slugs', () => {
      const sizes = service.getAvailableSizes();

      sizes.forEach(size => {
        expect(size.doSlug).toMatch(/^s-\d+vcpu-\d+gb$/);
      });
    });

    it('should have consistent DigitalOcean pricing', () => {
      // Verify pricing matches DigitalOcean tiers
      expect(DROPLET_SIZES.starter.monthlyPrice).toBe(6);
      expect(DROPLET_SIZES.professional.monthlyPrice).toBe(12);
      expect(DROPLET_SIZES.scale.monthlyPrice).toBe(24);
      expect(DROPLET_SIZES.enterprise.monthlyPrice).toBe(48);
    });
  });
});
