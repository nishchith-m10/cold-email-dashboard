/**
 * GENESIS PART VI - PHASE 61.A: CAMPAIGN CREATION FLOW
 * Campaign Creation Wizard Tests
 */

import { CampaignCreationWizard } from '../lib/campaign-creation-wizard';
import type {
  CampaignCreationState,
  CampaignNameStepData,
  LeadsStepData,
  PersonalizationStepData,
  ReviewStepData,
} from '../lib/campaign-creation-types';

describe('CampaignCreationWizard', () => {
  describe('initializeWizard', () => {
    it('should initialize empty shell wizard', () => {
      const state = CampaignCreationWizard.initializeWizard('empty_shell');
      
      expect(state.type).toBe('empty_shell');
      expect(state.current_step).toBe('name');
      expect(state.created_at).toBeInstanceOf(Date);
      expect(state.updated_at).toBeInstanceOf(Date);
    });

    it('should initialize production ready wizard', () => {
      const state = CampaignCreationWizard.initializeWizard('production_ready');
      
      expect(state.type).toBe('production_ready');
      expect(state.current_step).toBe('name');
    });
  });

  describe('isValidTransition', () => {
    it('should allow valid forward transitions', () => {
      expect(CampaignCreationWizard.isValidTransition('name', 'leads')).toBe(true);
      expect(CampaignCreationWizard.isValidTransition('leads', 'personalization')).toBe(true);
      expect(CampaignCreationWizard.isValidTransition('personalization', 'review')).toBe(true);
      expect(CampaignCreationWizard.isValidTransition('review', 'complete')).toBe(true);
    });

    it('should allow backward transitions', () => {
      expect(CampaignCreationWizard.isValidTransition('leads', 'name')).toBe(true);
      expect(CampaignCreationWizard.isValidTransition('personalization', 'leads')).toBe(true);
      expect(CampaignCreationWizard.isValidTransition('review', 'personalization')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(CampaignCreationWizard.isValidTransition('name', 'review')).toBe(false);
      expect(CampaignCreationWizard.isValidTransition('leads', 'complete')).toBe(false);
    });

    it('should reject transitions from complete', () => {
      expect(CampaignCreationWizard.isValidTransition('complete', 'name')).toBe(false);
      expect(CampaignCreationWizard.isValidTransition('complete', 'leads')).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
      expect(CampaignCreationWizard.isValidTransition(null as any, 'leads')).toBe(false);
      expect(CampaignCreationWizard.isValidTransition('name', null as any)).toBe(false);
    });
  });

  describe('getNextStep', () => {
    it('should return next step for forward progression', () => {
      expect(CampaignCreationWizard.getNextStep('name')).toBe('leads');
      expect(CampaignCreationWizard.getNextStep('leads')).toBe('personalization');
      expect(CampaignCreationWizard.getNextStep('personalization')).toBe('review');
      expect(CampaignCreationWizard.getNextStep('review')).toBe('complete');
    });

    it('should return null for complete step', () => {
      expect(CampaignCreationWizard.getNextStep('complete')).toBeNull();
    });
  });

  describe('completeNameStep', () => {
    const emptyShellState: CampaignCreationState = {
      type: 'empty_shell',
      current_step: 'name',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const productionReadyState: CampaignCreationState = {
      type: 'production_ready',
      current_step: 'name',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should complete name step for empty shell', () => {
      const data: CampaignNameStepData = { name: 'Tech CTOs' };
      const result = CampaignCreationWizard.completeNameStep(emptyShellState, data);
      
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('complete');
    });

    it('should complete name step for production ready', () => {
      const data: CampaignNameStepData = { name: 'Marketing VPs' };
      const result = CampaignCreationWizard.completeNameStep(productionReadyState, data);
      
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('leads');
    });

    it('should reject empty name', () => {
      const data: CampaignNameStepData = { name: '' };
      const result = CampaignCreationWizard.completeNameStep(emptyShellState, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject name that is too short', () => {
      const data: CampaignNameStepData = { name: 'AB' };
      const result = CampaignCreationWizard.completeNameStep(emptyShellState, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject name with invalid characters', () => {
      const data: CampaignNameStepData = { name: 'Test@Campaign' };
      const result = CampaignCreationWizard.completeNameStep(emptyShellState, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('completeLeadsStep', () => {
    const state: CampaignCreationState = {
      type: 'production_ready',
      current_step: 'leads',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should complete leads step with valid data', () => {
      const data: LeadsStepData = { leads_imported: 100 };
      const result = CampaignCreationWizard.completeLeadsStep(state, data);
      
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('personalization');
    });

    it('should reject zero leads', () => {
      const data: LeadsStepData = { leads_imported: 0 };
      const result = CampaignCreationWizard.completeLeadsStep(state, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one lead');
    });

    it('should reject negative lead count', () => {
      const data: LeadsStepData = { leads_imported: -1 };
      const result = CampaignCreationWizard.completeLeadsStep(state, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid lead count');
    });
  });

  describe('completePersonalizationStep', () => {
    const state: CampaignCreationState = {
      type: 'production_ready',
      current_step: 'personalization',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should complete personalization step with valid data', () => {
      const data: PersonalizationStepData = {
        prompts_customized: true,
        templates_configured: true,
      };
      const result = CampaignCreationWizard.completePersonalizationStep(state, data);
      
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('review');
    });

    it('should reject without prompts customized', () => {
      const data: PersonalizationStepData = {
        prompts_customized: false,
        templates_configured: true,
      };
      const result = CampaignCreationWizard.completePersonalizationStep(state, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('prompts must be customized');
    });

    it('should reject without templates configured', () => {
      const data: PersonalizationStepData = {
        prompts_customized: true,
        templates_configured: false,
      };
      const result = CampaignCreationWizard.completePersonalizationStep(state, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('templates must be configured');
    });
  });

  describe('completeReviewStep', () => {
    const state: CampaignCreationState = {
      type: 'production_ready',
      current_step: 'review',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should complete review step when ready to launch', () => {
      const data: ReviewStepData = { ready_to_launch: true };
      const result = CampaignCreationWizard.completeReviewStep(state, data);
      
      expect(result.success).toBe(true);
      expect(result.next_step).toBe('complete');
    });

    it('should reject when not ready to launch', () => {
      const data: ReviewStepData = { ready_to_launch: false };
      const result = CampaignCreationWizard.completeReviewStep(state, data);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('ready to launch');
    });
  });

  describe('validateNameStep', () => {
    it('should validate correct name', () => {
      const validation = CampaignCreationWizard.validateNameStep({ name: 'Tech CTOs' });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should accept valid special characters', () => {
      const validNames = [
        'Tech CTOs',
        'Marketing-VPs',
        'Sales_Directors',
        'Healthcare & Medical',
        'E-commerce (US)',
      ];

      validNames.forEach(name => {
        const validation = CampaignCreationWizard.validateNameStep({ name });
        expect(validation.valid).toBe(true);
      });
    });

    it('should reject invalid characters', () => {
      const invalidNames = ['Test@Campaign', 'Name#1', 'Test$Campaign'];

      invalidNames.forEach(name => {
        const validation = CampaignCreationWizard.validateNameStep({ name });
        expect(validation.valid).toBe(false);
        expect(validation.errors.some(e => e.includes('invalid characters'))).toBe(true);
      });
    });

    it('should reject name that is too long', () => {
      const longName = 'A'.repeat(101);
      const validation = CampaignCreationWizard.validateNameStep({ name: longName });
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('not exceed 100'))).toBe(true);
    });
  });

  describe('validateLeadsStep', () => {
    it('should validate correct lead count', () => {
      const validation = CampaignCreationWizard.validateLeadsStep({ leads_imported: 100 });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should warn about large lead counts', () => {
      const validation = CampaignCreationWizard.validateLeadsStep({ leads_imported: 6000 });
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.includes('Large lead count'))).toBe(true);
    });
  });

  describe('getProgress', () => {
    it('should calculate progress for empty shell at name step', () => {
      const state: CampaignCreationState = {
        type: 'empty_shell',
        current_step: 'name',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const progress = CampaignCreationWizard.getProgress(state);
      
      expect(progress.current_step).toBe('name');
      expect(progress.progress_percentage).toBe(0);
      expect(progress.steps_completed).toHaveLength(0);
    });

    it('should calculate progress for empty shell at complete step', () => {
      const state: CampaignCreationState = {
        type: 'empty_shell',
        current_step: 'complete',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const progress = CampaignCreationWizard.getProgress(state);
      
      expect(progress.progress_percentage).toBe(100);
    });

    it('should calculate progress for production ready at name step', () => {
      const state: CampaignCreationState = {
        type: 'production_ready',
        current_step: 'name',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const progress = CampaignCreationWizard.getProgress(state);
      
      expect(progress.progress_percentage).toBe(0);
      expect(progress.steps_remaining).toContain('leads');
      expect(progress.steps_remaining).toContain('personalization');
    });

    it('should calculate progress for production ready at complete step', () => {
      const state: CampaignCreationState = {
        type: 'production_ready',
        current_step: 'complete',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const progress = CampaignCreationWizard.getProgress(state);
      
      expect(progress.progress_percentage).toBe(100);
      expect(progress.steps_remaining).toHaveLength(0);
    });

    it('should calculate estimated time remaining', () => {
      const state: CampaignCreationState = {
        type: 'production_ready',
        current_step: 'name',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const progress = CampaignCreationWizard.getProgress(state);
      
      expect(progress.estimated_time_remaining_minutes).toBeGreaterThan(0);
    });
  });

  describe('isComplete', () => {
    it('should return true for complete step', () => {
      const state: CampaignCreationState = {
        type: 'empty_shell',
        current_step: 'complete',
        created_at: new Date(),
        updated_at: new Date(),
      };

      expect(CampaignCreationWizard.isComplete(state)).toBe(true);
    });

    it('should return false for incomplete steps', () => {
      const steps = ['name', 'leads', 'personalization', 'review'];

      steps.forEach(step => {
        const state: CampaignCreationState = {
          type: 'production_ready',
          current_step: step as any,
          created_at: new Date(),
          updated_at: new Date(),
        };

        expect(CampaignCreationWizard.isComplete(state)).toBe(false);
      });
    });
  });

  describe('getStepDescription', () => {
    it('should return descriptions for all steps', () => {
      const steps = ['name', 'leads', 'personalization', 'review', 'complete'];

      steps.forEach(step => {
        const description = CampaignCreationWizard.getStepDescription(step as any);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getStepTitle', () => {
    it('should return titles for all steps', () => {
      const steps = ['name', 'leads', 'personalization', 'review', 'complete'];

      steps.forEach(step => {
        const title = CampaignCreationWizard.getStepTitle(step as any);
        expect(title).toBeDefined();
        expect(title.length).toBeGreaterThan(0);
      });
    });
  });

  describe('isValidStep', () => {
    it('should validate all defined steps', () => {
      const validSteps = ['name', 'leads', 'personalization', 'review', 'complete'];

      validSteps.forEach(step => {
        expect(CampaignCreationWizard.isValidStep(step)).toBe(true);
      });
    });

    it('should reject invalid steps', () => {
      expect(CampaignCreationWizard.isValidStep('invalid')).toBe(false);
      expect(CampaignCreationWizard.isValidStep('start')).toBe(false);
      expect(CampaignCreationWizard.isValidStep('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(CampaignCreationWizard.isValidStep('NAME')).toBe(false);
      expect(CampaignCreationWizard.isValidStep('Complete')).toBe(false);
    });
  });

  describe('Integration: Complete Flow', () => {
    it('should successfully progress through empty shell flow', () => {
      const state = CampaignCreationWizard.initializeWizard('empty_shell');
      
      expect(state.current_step).toBe('name');

      const nameResult = CampaignCreationWizard.completeNameStep(state, { name: 'Quick Campaign' });
      expect(nameResult.success).toBe(true);
      expect(nameResult.next_step).toBe('complete');
    });

    it('should successfully progress through production ready flow', () => {
      const state = CampaignCreationWizard.initializeWizard('production_ready');
      
      expect(state.current_step).toBe('name');

      // Complete name step
      const nameResult = CampaignCreationWizard.completeNameStep(state, { name: 'Full Campaign' });
      expect(nameResult.success).toBe(true);
      expect(nameResult.next_step).toBe('leads');

      // Complete leads step
      const leadsResult = CampaignCreationWizard.completeLeadsStep(
        { ...state, current_step: 'leads' },
        { leads_imported: 500 }
      );
      expect(leadsResult.success).toBe(true);
      expect(leadsResult.next_step).toBe('personalization');

      // Complete personalization step
      const personalizationResult = CampaignCreationWizard.completePersonalizationStep(
        { ...state, current_step: 'personalization' },
        { prompts_customized: true, templates_configured: true }
      );
      expect(personalizationResult.success).toBe(true);
      expect(personalizationResult.next_step).toBe('review');

      // Complete review step
      const reviewResult = CampaignCreationWizard.completeReviewStep(
        { ...state, current_step: 'review' },
        { ready_to_launch: true }
      );
      expect(reviewResult.success).toBe(true);
      expect(reviewResult.next_step).toBe('complete');
    });
  });
});
