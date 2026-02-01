/**
 * PHASE 64: Onboarding Progress Service Tests
 * 
 * Tests for tracking user progress through Genesis Gateway.
 */

import {
  OnboardingProgressService,
  ONBOARDING_STAGES,
  STAGE_INFO,
} from '@/lib/genesis/phase64/onboarding-progress-service';

// ============================================
// MOCKS
// ============================================

const mockSupabase: any = {
  from: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
};

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OnboardingProgressService({ supabaseClient: mockSupabase });
  });

  describe('initializeProgress', () => {
    it('should initialize progress with first stage', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.initializeProgress('ws-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-123',
          current_stage: ONBOARDING_STAGES[0],
          completed_stages: [],
        })
      );
    });

    it('should handle initialization errors', async () => {
      const insertMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });
      mockSupabase.insert = jest.fn(() => insertMock());

      const result = await service.initializeProgress('ws-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('getProgress', () => {
    it('should retrieve existing progress', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'gmail_oauth',
          completed_stages: ['region_selection', 'brand_info'],
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:05:00Z',
        },
        error: null,
      });

      const result = await service.getProgress('ws-123');

      expect(result.success).toBe(true);
      expect(result.progress).toBeDefined();
      expect(result.progress?.currentStage).toBe('gmail_oauth');
      expect(result.progress?.completedStages).toHaveLength(2);
    });

    it('should initialize if not found', async () => {
      let callCount = 0;
      mockSupabase.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First getProgress call - not found
          return Promise.resolve({
            data: null,
            error: { code: 'PGRST116' },
          });
        } else {
          // Second getProgress call after init
          return Promise.resolve({
            data: {
              workspace_id: 'ws-new',
              current_stage: 'region_selection',
              completed_stages: [],
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          });
        }
      });

      const insertMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      mockSupabase.insert = jest.fn(() => insertMock());

      const result = await service.getProgress('ws-new');

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      });
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const result = await service.getProgress('ws-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('completeStage', () => {
    it('should complete stage and advance to next', async () => {
      const getSingleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'region_selection',
          completed_stages: [],
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:00:00Z',
        },
        error: null,
      });
      
      const updateEqMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      let isGetCall = true;
      mockSupabase.eq = jest.fn(() => {
        if (isGetCall) {
          isGetCall = false;
          return { single: () => getSingleMock() };
        }
        return updateEqMock();
      });

      const result = await service.completeStage('ws-123', 'region_selection');

      expect(result.success).toBe(true);
      expect(result.nextStage).toBe('brand_info');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed_stages: ['region_selection'],
          current_stage: 'brand_info',
        })
      );
    });

    it('should mark onboarding complete at last stage', async () => {
      const getSingleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'ignition',
          completed_stages: ONBOARDING_STAGES.slice(0, -1),
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:30:00Z',
        },
        error: null,
      });
      
      const updateEqMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      let isGetCall = true;
      mockSupabase.eq = jest.fn(() => {
        if (isGetCall) {
          isGetCall = false;
          return { single: getSingleMock };
        }
        return updateEqMock();
      });

      const result = await service.completeStage('ws-123', 'ignition');

      expect(result.success).toBe(true);
      expect(result.nextStage).toBeUndefined();
      
      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.completed_at).toBeDefined();
    });

    it('should handle duplicate completion', async () => {
      const getSingleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'brand_info',
          completed_stages: ['region_selection'],
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:01:00Z',
        },
        error: null,
      });
      
      const updateEqMock = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      let isGetCall = true;
      mockSupabase.eq = jest.fn(() => {
        if (isGetCall) {
          isGetCall = false;
          return { single: getSingleMock };
        }
        return updateEqMock();
      });

      // Complete region_selection again (already in completed_stages)
      const result = await service.completeStage('ws-123', 'region_selection');

      expect(result.success).toBe(true);
      
      // Set should deduplicate, so still just ['region_selection']
      const updateCall = mockSupabase.update.mock.calls[0][0];
      expect(updateCall.completed_stages).toContain('region_selection');
    });
  });

  describe('goToStage', () => {
    it('should navigate to specific stage', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.goToStage('ws-123', 'openai_key');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_stage: 'openai_key',
        })
      );
    });

    it('should allow going backwards', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.goToStage('ws-123', 'brand_info');

      expect(result.success).toBe(true);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return true if all required stages complete', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'ignition',
          completed_stages: ONBOARDING_STAGES,
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:15:00Z',
          completed_at: '2026-01-29T12:15:00Z',
        },
        error: null,
      });
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const result = await service.isOnboardingComplete('ws-123');

      expect(result.complete).toBe(true);
      expect(result.missingStages).toHaveLength(0);
    });

    it('should return false if stages missing', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'openai_key',
          completed_stages: ['region_selection', 'brand_info'],
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:05:00Z',
        },
        error: null,
      });
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const result = await service.isOnboardingComplete('ws-123');

      expect(result.complete).toBe(false);
      expect(result.missingStages.length).toBeGreaterThan(0);
    });

    it('should ignore optional stages', async () => {
      // Get all required stages
      const requiredStages = ONBOARDING_STAGES.filter(s => STAGE_INFO[s].required);

      const singleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'ignition',
          completed_stages: requiredStages, // Only required, not optional
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:15:00Z',
        },
        error: null,
      });
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const result = await service.isOnboardingComplete('ws-123');

      expect(result.complete).toBe(true);
    });
  });

  describe('getCompletionPercentage', () => {
    it('should calculate 0% at start', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'region_selection',
          completed_stages: [],
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:00:00Z',
        },
        error: null,
      });
      
      // Rebuild complete chain
      mockSupabase.from = jest.fn(() => mockSupabase);
      mockSupabase.select = jest.fn(() => mockSupabase);
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const percentage = await service.getCompletionPercentage('ws-123');

      expect(percentage).toBe(0);
    });

    it('should calculate 50% at halfway', async () => {
      const requiredCount = ONBOARDING_STAGES.filter(s => STAGE_INFO[s].required).length;
      const halfCompleted = ONBOARDING_STAGES.slice(0, Math.floor(requiredCount / 2));

      const singleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: halfCompleted[halfCompleted.length - 1],
          completed_stages: halfCompleted,
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:07:00Z',
        },
        error: null,
      });
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const percentage = await service.getCompletionPercentage('ws-123');

      expect(percentage).toBeGreaterThanOrEqual(40);
      expect(percentage).toBeLessThanOrEqual(60);
    });

    it('should calculate 100% when complete', async () => {
      const requiredStages = ONBOARDING_STAGES.filter(s => STAGE_INFO[s].required);

      const singleMock = jest.fn().mockResolvedValue({
        data: {
          workspace_id: 'ws-123',
          current_stage: 'ignition',
          completed_stages: requiredStages,
          started_at: '2026-01-29T12:00:00Z',
          updated_at: '2026-01-29T12:15:00Z',
          completed_at: '2026-01-29T12:15:00Z',
        },
        error: null,
      });
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const percentage = await service.getCompletionPercentage('ws-123');

      expect(percentage).toBe(100);
    });

    it('should return 0 if progress not found', async () => {
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });
      
      // Rebuild complete chain
      mockSupabase.from = jest.fn(() => mockSupabase);
      mockSupabase.select = jest.fn(() => mockSupabase);
      mockSupabase.eq = jest.fn(() => ({ single: singleMock }));

      const percentage = await service.getCompletionPercentage('ws-123');

      expect(percentage).toBe(0);
    });
  });

  describe('resetProgress', () => {
    it('should reset to initial state', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.resetProgress('ws-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_stage: ONBOARDING_STAGES[0],
          completed_stages: [],
          completed_at: null,
        })
      );
    });

    it('should handle reset errors', async () => {
      const updateMock = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });
      mockSupabase.eq = jest.fn(() => updateMock());

      const result = await service.resetProgress('ws-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('Stage Definitions', () => {
    it('should have 11 stages total', () => {
      expect(ONBOARDING_STAGES).toHaveLength(11);
    });

    it('should have info for all stages', () => {
      ONBOARDING_STAGES.forEach(stage => {
        expect(STAGE_INFO[stage]).toBeDefined();
        expect(STAGE_INFO[stage].title).toBeDefined();
        expect(STAGE_INFO[stage].description).toBeDefined();
        expect(STAGE_INFO[stage].estimatedDuration).toBeGreaterThan(0);
        expect(typeof STAGE_INFO[stage].required).toBe('boolean');
      });
    });

    it('should have correct stage order', () => {
      expect(ONBOARDING_STAGES[0]).toBe('region_selection');
      expect(ONBOARDING_STAGES[ONBOARDING_STAGES.length - 1]).toBe('ignition');
    });

    it('should map credential types correctly', () => {
      expect(STAGE_INFO.gmail_oauth.credentialType).toBe('gmail_oauth');
      expect(STAGE_INFO.openai_key.credentialType).toBe('openai_api_key');
      expect(STAGE_INFO.anthropic_key.credentialType).toBe('anthropic_api_key');
    });
  });
});
