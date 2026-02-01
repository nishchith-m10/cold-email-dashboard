/**
 * GENESIS PART VI - PHASE 61: CAMPAIGN ARCHITECTURE & OPERATIONS
 * Campaign Manager Tests
 */

import { CampaignManager } from '../lib/campaign-manager';
import type { CreateCampaignRequest, Campaign, CampaignTier } from '../lib/campaign-types';

describe('CampaignManager', () => {
  describe('createCampaign', () => {
    it('should create empty shell campaign', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'Tech CTOs',
        type: 'empty_shell',
      };

      const result = CampaignManager.createCampaign(request, 0, 0, 'professional');

      expect(result.success).toBe(true);
      expect(result.campaign).toBeDefined();
      expect(result.campaign?.name).toBe('Tech CTOs');
      expect(result.campaign?.status).toBe('draft');
      expect(result.campaign?.lead_count).toBe(0);
      expect(result.campaign?.workspace_id).toBe('ws-123');
    });

    it('should create production ready campaign', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'Marketing VPs',
        type: 'production_ready',
      };

      const result = CampaignManager.createCampaign(request, 0, 0, 'professional');

      expect(result.success).toBe(true);
      expect(result.campaign?.status).toBe('pending_leads');
    });

    it('should reject campaign with invalid name', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: '',
        type: 'empty_shell',
      };

      const result = CampaignManager.createCampaign(request, 0, 0, 'professional');

      expect(result.success).toBe(false);
      expect(result.error).toContain('name is required');
    });

    it('should reject when campaign limit reached', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'New Campaign',
        type: 'empty_shell',
      };

      // Starter tier allows 10 campaigns
      const result = CampaignManager.createCampaign(request, 10, 0, 'starter');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Campaign limit reached');
      expect(result.error).toContain('10');
    });

    it('should reject when lead limit reached', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'New Campaign',
        type: 'empty_shell',
      };

      // Starter tier allows 2000 total leads
      const result = CampaignManager.createCampaign(request, 5, 2000, 'starter');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lead limit reached');
    });

    it('should allow unlimited campaigns for enterprise tier', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'Enterprise Campaign',
        type: 'empty_shell',
      };

      const result = CampaignManager.createCampaign(request, 1000, 500000, 'enterprise');

      expect(result.success).toBe(true);
    });

    it('should generate unique campaign IDs', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'Campaign',
        type: 'empty_shell',
      };

      const result1 = CampaignManager.createCampaign(request, 0, 0, 'professional');
      const result2 = CampaignManager.createCampaign(request, 0, 0, 'professional');

      expect(result1.campaign?.id).not.toBe(result2.campaign?.id);
    });

    it('should set created_at and updated_at timestamps', () => {
      const request: CreateCampaignRequest = {
        workspace_id: 'ws-123',
        name: 'Campaign',
        type: 'empty_shell',
      };

      const result = CampaignManager.createCampaign(request, 0, 0, 'professional');

      expect(result.campaign?.created_at).toBeInstanceOf(Date);
      expect(result.campaign?.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('validateCampaignName', () => {
    it('should accept valid campaign names', () => {
      const validNames = [
        'Tech CTOs',
        'Marketing VPs',
        'Sales Directors 2024',
        'Healthcare & Medical',
        'E-commerce (US)',
        'SaaS_Startups',
      ];

      validNames.forEach(name => {
        const result = CampaignManager.validateCampaignName(name);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject empty name', () => {
      const result = CampaignManager.validateCampaignName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only name', () => {
      const result = CampaignManager.validateCampaignName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject name too short', () => {
      const result = CampaignManager.validateCampaignName('AB');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject name too long', () => {
      const longName = 'A'.repeat(101);
      const result = CampaignManager.validateCampaignName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not exceed 100');
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = [
        'Campaign@2024',
        'Test#Campaign',
        'Name$With$Dollar',
        'Invalid!',
        'Test%Campaign',
      ];

      invalidNames.forEach(name => {
        const result = CampaignManager.validateCampaignName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid characters');
      });
    });

    it('should accept name with exactly 3 characters', () => {
      const result = CampaignManager.validateCampaignName('ABC');
      expect(result.valid).toBe(true);
    });

    it('should accept name with exactly 100 characters', () => {
      const result = CampaignManager.validateCampaignName('A'.repeat(100));
      expect(result.valid).toBe(true);
    });
  });

  describe('checkCampaignLimits', () => {
    it('should allow creation within limits', () => {
      const result = CampaignManager.checkCampaignLimits(5, 1000, 'starter');
      expect(result.allowed).toBe(true);
    });

    it('should reject when campaign limit reached (starter)', () => {
      const result = CampaignManager.checkCampaignLimits(10, 0, 'starter');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('10 campaigns');
    });

    it('should reject when lead limit reached (professional)', () => {
      const result = CampaignManager.checkCampaignLimits(10, 20000, 'professional');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('20000 total leads');
    });

    it('should allow unlimited for enterprise', () => {
      const result = CampaignManager.checkCampaignLimits(1000, 1000000, 'enterprise');
      expect(result.allowed).toBe(true);
    });

    it('should check all tier limits correctly', () => {
      const tiers: CampaignTier[] = ['starter', 'professional', 'scale', 'enterprise'];
      
      tiers.forEach(tier => {
        const result = CampaignManager.checkCampaignLimits(0, 0, tier);
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('canAddLeads', () => {
    const baseCampaign: Campaign = {
      id: 'c-123',
      workspace_id: 'ws-123',
      name: 'Test Campaign',
      status: 'pending_leads',
      lead_count: 100,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should allow adding leads within limits', () => {
      const result = CampaignManager.canAddLeads(baseCampaign, 100, 1000, 'professional');
      expect(result.allowed).toBe(true);
    });

    it('should reject adding leads to active campaign', () => {
      const activeCampaign = { ...baseCampaign, status: 'active' as const };
      const result = CampaignManager.canAddLeads(activeCampaign, 100, 1000, 'professional');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('active');
    });

    it('should reject when exceeding campaign lead limit', () => {
      const campaign = { ...baseCampaign, lead_count: 400 };
      // Adding 200 leads would exceed starter's 500 per campaign limit
      const result = CampaignManager.canAddLeads(campaign, 200, 1000, 'starter');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('campaign lead limit');
    });

    it('should reject when exceeding total lead limit', () => {
      const campaign = { ...baseCampaign, lead_count: 100 };
      // Adding 200 leads would exceed starter's 2000 total limit (1900 + 200)
      // but not exceed campaign limit (100 + 200 = 300, which is < 500 per campaign)
      const result = CampaignManager.canAddLeads(campaign, 200, 1900, 'starter');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('workspace lead limit');
    });

    it('should allow adding leads to draft campaign', () => {
      const draftCampaign = { ...baseCampaign, status: 'draft' as const };
      const result = CampaignManager.canAddLeads(draftCampaign, 100, 1000, 'professional');
      expect(result.allowed).toBe(true);
    });

    it('should allow unlimited leads for enterprise', () => {
      const campaign = { ...baseCampaign, lead_count: 10000 };
      const result = CampaignManager.canAddLeads(campaign, 50000, 500000, 'enterprise');
      expect(result.allowed).toBe(true);
    });
  });

  describe('updateCampaignStatus', () => {
    const baseCampaign: Campaign = {
      id: 'c-123',
      workspace_id: 'ws-123',
      name: 'Test Campaign',
      status: 'draft',
      lead_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update status successfully', () => {
      const result = CampaignManager.updateCampaignStatus(baseCampaign, 'pending_leads');
      
      expect(result.success).toBe(true);
      expect(result.campaign?.status).toBe('pending_leads');
      expect(result.campaign?.updated_at).toBeInstanceOf(Date);
    });

    it('should set launched_at when transitioning to active', () => {
      const readyCampaign = { ...baseCampaign, status: 'ready' as const };
      const result = CampaignManager.updateCampaignStatus(readyCampaign, 'active');
      
      expect(result.campaign?.launched_at).toBeInstanceOf(Date);
    });

    it('should not reset launched_at on subsequent active transitions', () => {
      const pausedCampaign: Campaign = {
        ...baseCampaign,
        status: 'paused',
        launched_at: new Date('2024-01-01'),
      };
      
      const result = CampaignManager.updateCampaignStatus(pausedCampaign, 'active');
      
      expect(result.campaign?.launched_at).toEqual(pausedCampaign.launched_at);
    });

    it('should set paused_at when transitioning to paused', () => {
      const activeCampaign = { ...baseCampaign, status: 'active' as const };
      const result = CampaignManager.updateCampaignStatus(activeCampaign, 'paused');
      
      expect(result.campaign?.paused_at).toBeInstanceOf(Date);
    });

    it('should set completed_at when transitioning to completed', () => {
      const activeCampaign = { ...baseCampaign, status: 'active' as const };
      const result = CampaignManager.updateCampaignStatus(activeCampaign, 'completed');
      
      expect(result.campaign?.completed_at).toBeInstanceOf(Date);
    });

    it('should reject invalid status', () => {
      const result = CampaignManager.updateCampaignStatus(baseCampaign, 'invalid_status');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('should reject invalid transition', () => {
      const result = CampaignManager.updateCampaignStatus(baseCampaign, 'completed');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should include reason in transition', () => {
      const result = CampaignManager.updateCampaignStatus(
        baseCampaign,
        'pending_leads',
        'User uploaded CSV'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('getLimits', () => {
    it('should return correct limits for starter tier', () => {
      const limits = CampaignManager.getLimits('starter');
      expect(limits.max_campaigns).toBe(10);
      expect(limits.max_leads_per_campaign).toBe(500);
      expect(limits.max_total_leads).toBe(2000);
    });

    it('should return correct limits for professional tier', () => {
      const limits = CampaignManager.getLimits('professional');
      expect(limits.max_campaigns).toBe(25);
      expect(limits.max_leads_per_campaign).toBe(5000);
      expect(limits.max_total_leads).toBe(20000);
    });

    it('should return correct limits for scale tier', () => {
      const limits = CampaignManager.getLimits('scale');
      expect(limits.max_campaigns).toBe(50);
      expect(limits.max_leads_per_campaign).toBe(20000);
      expect(limits.max_total_leads).toBe(100000);
    });

    it('should return null limits for enterprise tier', () => {
      const limits = CampaignManager.getLimits('enterprise');
      expect(limits.max_campaigns).toBeNull();
      expect(limits.max_leads_per_campaign).toBeNull();
      expect(limits.max_total_leads).toBeNull();
    });
  });

  describe('Unlimited Checks', () => {
    it('hasUnlimitedCampaigns should return true only for enterprise', () => {
      expect(CampaignManager.hasUnlimitedCampaigns('starter')).toBe(false);
      expect(CampaignManager.hasUnlimitedCampaigns('professional')).toBe(false);
      expect(CampaignManager.hasUnlimitedCampaigns('scale')).toBe(false);
      expect(CampaignManager.hasUnlimitedCampaigns('enterprise')).toBe(true);
    });

    it('hasUnlimitedLeads should return true only for enterprise', () => {
      expect(CampaignManager.hasUnlimitedLeads('starter')).toBe(false);
      expect(CampaignManager.hasUnlimitedLeads('professional')).toBe(false);
      expect(CampaignManager.hasUnlimitedLeads('scale')).toBe(false);
      expect(CampaignManager.hasUnlimitedLeads('enterprise')).toBe(true);
    });
  });
});
