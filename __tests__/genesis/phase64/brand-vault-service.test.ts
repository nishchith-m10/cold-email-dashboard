/**
 * PHASE 64: Brand Vault Service Tests
 * 
 * Tests for brand information storage and validation.
 */

import { BrandVaultService } from '@/lib/genesis/phase64/brand-vault-service';
import type { BrandInfo } from '@/lib/genesis/phase64/credential-vault-types';

// ============================================
// MOCKS
// ============================================

const mockSupabase: any = {
  from: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

describe('BrandVaultService', () => {
  let service: BrandVaultService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BrandVaultService({ supabaseClient: mockSupabase });
  });

  describe('storeBrandInfo', () => {
    it('should store complete brand info', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.storeBrandInfo('ws-123', {
        companyName: 'Acme Corp',
        website: 'https://acme.com',
        industry: 'SaaS',
        description: 'Cloud automation platform',
        logoUrl: 'https://acme.com/logo.png',
        tone: 'professional',
        targetAudience: 'B2B SaaS companies',
        products: ['Cold Email', 'Lead Gen'],
        autoScraped: false,
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-123',
          company_name: 'Acme Corp',
          website: 'https://acme.com',
        }),
        { onConflict: 'workspace_id' }
      );
    });

    it('should store minimal brand info', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.storeBrandInfo('ws-123', {
        companyName: 'Minimal Corp',
      });

      expect(result.success).toBe(true);
    });

    it('should default tone to professional', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await service.storeBrandInfo('ws-123', {
        companyName: 'Test Corp',
      });

      const upsertCall = mockSupabase.upsert.mock.calls[0][0];
      expect(upsertCall.tone).toBe('professional');
    });

    it('should mark as auto-scraped if specified', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await service.storeBrandInfo('ws-123', {
        companyName: 'Auto Corp',
        autoScraped: true,
      });

      const upsertCall = mockSupabase.upsert.mock.calls[0][0];
      expect(upsertCall.auto_scraped).toBe(true);
      expect(upsertCall.scraped_at).toBeDefined();
    });

    it('should handle database errors', async () => {
      const upsertMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });
      mockSupabase.upsert = jest.fn(() => upsertMock());

      const result = await service.storeBrandInfo('ws-123', {
        companyName: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('getBrandInfo', () => {
    it('should retrieve brand info', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          company_name: 'Acme Corp',
          website: 'https://acme.com',
          industry: 'SaaS',
          description: 'Cloud platform',
          logo_url: 'https://acme.com/logo.png',
          tone: 'professional',
          target_audience: 'B2B',
          products: ['Product A', 'Product B'],
          auto_scraped: false,
          created_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:00:00Z',
        },
        error: null,
      });

      const result = await service.getBrandInfo('ws-123');

      expect(result.success).toBe(true);
      expect(result.brandInfo).toBeDefined();
      expect(result.brandInfo?.companyName).toBe('Acme Corp');
      expect(result.brandInfo?.products).toHaveLength(2);
    });

    it('should handle not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.getBrandInfo('ws-new');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('hasBrandInfo', () => {
    it('should return true if brand info exists', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { workspace_id: 'ws-123', company_name: 'Test' },
        error: null,
      });

      const result = await service.hasBrandInfo('ws-123');

      expect(result).toBe(true);
    });

    it('should return false if not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.hasBrandInfo('ws-new');

      expect(result).toBe(false);
    });
  });

  describe('autoScrapeBrandInfo', () => {
    it('should extract company name from domain', async () => {
      const result = await service.autoScrapeBrandInfo('https://acmecorp.com');

      expect(result.success).toBe(true);
      expect(result.brandData?.companyName).toBe('Acmecorp');
      expect(result.brandData?.website).toBe('https://acmecorp.com');
      expect(result.brandData?.autoScraped).toBe(true);
    });

    it('should handle www subdomain', async () => {
      const result = await service.autoScrapeBrandInfo('https://www.testcompany.io');

      expect(result.success).toBe(true);
      expect(result.brandData?.companyName).toBe('Testcompany');
    });

    it('should reject invalid URLs', async () => {
      const result = await service.autoScrapeBrandInfo('not-a-url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should handle URLs without protocol', async () => {
      const result = await service.autoScrapeBrandInfo('example.com');

      expect(result.success).toBe(false);
    });
  });

  describe('updateBrandInfo', () => {
    it('should update specific fields', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.updateBrandInfo('ws-123', {
        industry: 'FinTech',
        description: 'Financial automation',
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'FinTech',
          description: 'Financial automation',
        })
      );
    });

    it('should update single field', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await service.updateBrandInfo('ws-123', {
        logoUrl: 'https://new-logo.png',
      });

      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.logo_url).toBe('https://new-logo.png');
    });
  });

  describe('deleteBrandInfo', () => {
    it('should delete brand info', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.deleteBrandInfo('ws-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe('validateBrandInfo', () => {
    it('should validate complete brand info', () => {
      const brandInfo: BrandInfo = {
        workspaceId: 'ws-123',
        companyName: 'Acme Corp',
        website: 'https://acme.com',
        industry: 'SaaS',
        description: 'We provide cloud automation solutions for businesses',
        logoUrl: 'https://acme.com/logo.png',
        tone: 'professional',
        targetAudience: 'B2B SaaS companies',
        products: ['Product A', 'Product B'],
        autoScraped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.validateBrandInfo(brandInfo);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require company name', () => {
      const brandInfo: BrandInfo = {
        workspaceId: 'ws-123',
        companyName: '',
        autoScraped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.validateBrandInfo(brandInfo);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Company name is required');
    });

    it('should warn if website missing', () => {
      const brandInfo: BrandInfo = {
        workspaceId: 'ws-123',
        companyName: 'Test Corp',
        autoScraped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.validateBrandInfo(brandInfo);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.toLowerCase().includes('website'))).toBe(true);
    });

    it('should warn if description too short', () => {
      const brandInfo: BrandInfo = {
        workspaceId: 'ws-123',
        companyName: 'Test Corp',
        description: 'Short',
        autoScraped: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.validateBrandInfo(brandInfo);

      expect(result.warnings.some(w => w.includes('description'))).toBe(true);
    });
  });
});
