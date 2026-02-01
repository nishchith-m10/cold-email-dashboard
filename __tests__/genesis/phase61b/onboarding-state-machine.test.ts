/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Onboarding State Machine Tests
 */

import { OnboardingStateMachine } from '../lib/onboarding-state-machine';
import {
  OnboardingStage,
  ONBOARDING_STAGES,
  WorkspaceOnboardingState,
} from '../lib/types';

describe('OnboardingStateMachine', () => {
  describe('isValidTransition', () => {
    it('should allow valid forward transitions', () => {
      expect(OnboardingStateMachine.isValidTransition('account', 'brand')).toBe(true);
      expect(OnboardingStateMachine.isValidTransition('brand', 'email')).toBe(true);
      expect(OnboardingStateMachine.isValidTransition('email', 'ai_keys')).toBe(true);
      expect(OnboardingStateMachine.isValidTransition('ai_keys', 'region')).toBe(true);
      expect(OnboardingStateMachine.isValidTransition('region', 'pending_ignition')).toBe(true);
    });

    it('should allow branching from pending_ignition', () => {
      expect(OnboardingStateMachine.isValidTransition('pending_ignition', 'pending_review')).toBe(true);
      expect(OnboardingStateMachine.isValidTransition('pending_ignition', 'igniting')).toBe(true);
    });

    it('should allow pending_review to igniting', () => {
      expect(OnboardingStateMachine.isValidTransition('pending_review', 'igniting')).toBe(true);
    });

    it('should allow igniting to complete', () => {
      expect(OnboardingStateMachine.isValidTransition('igniting', 'complete')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(OnboardingStateMachine.isValidTransition('account', 'email')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('brand', 'ai_keys')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('complete', 'account')).toBe(false);
    });

    it('should reject backward transitions', () => {
      expect(OnboardingStateMachine.isValidTransition('email', 'brand')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('ai_keys', 'email')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('igniting', 'pending_ignition')).toBe(false);
    });

    it('should reject skipping stages', () => {
      expect(OnboardingStateMachine.isValidTransition('account', 'ai_keys')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('brand', 'region')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('email', 'pending_ignition')).toBe(false);
    });

    it('should reject transitions from complete stage', () => {
      expect(OnboardingStateMachine.isValidTransition('complete', 'account')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('complete', 'brand')).toBe(false);
      expect(OnboardingStateMachine.isValidTransition('complete', 'igniting')).toBe(false);
    });
  });

  describe('getNextStages', () => {
    it('should return valid next stages', () => {
      expect(OnboardingStateMachine.getNextStages('account')).toEqual(['brand']);
      expect(OnboardingStateMachine.getNextStages('brand')).toEqual(['email']);
      expect(OnboardingStateMachine.getNextStages('email')).toEqual(['ai_keys']);
    });

    it('should return multiple options for pending_ignition', () => {
      const next = OnboardingStateMachine.getNextStages('pending_ignition');
      expect(next).toHaveLength(2);
      expect(next).toContain('pending_review');
      expect(next).toContain('igniting');
    });

    it('should return empty array for terminal stage', () => {
      expect(OnboardingStateMachine.getNextStages('complete')).toEqual([]);
    });

    it('should return single option for most stages', () => {
      expect(OnboardingStateMachine.getNextStages('brand')).toHaveLength(1);
      expect(OnboardingStateMachine.getNextStages('email')).toHaveLength(1);
      expect(OnboardingStateMachine.getNextStages('ai_keys')).toHaveLength(1);
    });
  });

  describe('isTerminalStage', () => {
    it('should identify complete as terminal', () => {
      expect(OnboardingStateMachine.isTerminalStage('complete')).toBe(true);
    });

    it('should identify non-terminal stages', () => {
      expect(OnboardingStateMachine.isTerminalStage('account')).toBe(false);
      expect(OnboardingStateMachine.isTerminalStage('brand')).toBe(false);
      expect(OnboardingStateMachine.isTerminalStage('igniting')).toBe(false);
    });

    it('should correctly identify all non-complete stages as non-terminal', () => {
      const nonTerminalStages = ONBOARDING_STAGES.filter(s => s !== 'complete');
      nonTerminalStages.forEach(stage => {
        expect(OnboardingStateMachine.isTerminalStage(stage)).toBe(false);
      });
    });
  });

  describe('transition', () => {
    const createMockState = (stage: OnboardingStage): WorkspaceOnboardingState => ({
      workspace_id: 'test-workspace-id',
      onboarding_stage: stage,
      setup_complete: false,
      campaigns_enabled: false,
      onboarding_started_at: new Date(),
      onboarding_completed_at: null,
    });

    it('should succeed for valid transitions', async () => {
      const state = createMockState('account');
      const result = await OnboardingStateMachine.transition(state, 'brand');

      expect(result.success).toBe(true);
      expect(result.from_stage).toBe('account');
      expect(result.to_stage).toBe('brand');
      expect(result.error).toBeUndefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should fail for invalid transitions', async () => {
      const state = createMockState('account');
      const result = await OnboardingStateMachine.transition(state, 'email');

      expect(result.success).toBe(false);
      expect(result.from_stage).toBe('account');
      expect(result.to_stage).toBe('email');
      expect(result.error).toContain('Invalid transition');
      expect(result.error).toContain('account');
      expect(result.error).toContain('email');
    });

    it('should include allowed transitions in error message', async () => {
      const state = createMockState('account');
      const result = await OnboardingStateMachine.transition(state, 'complete');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Allowed: brand');
    });

    it('should handle branching transitions', async () => {
      const state = createMockState('pending_ignition');
      
      // Should allow both branches
      const reviewResult = await OnboardingStateMachine.transition(state, 'pending_review');
      expect(reviewResult.success).toBe(true);

      const ignitingResult = await OnboardingStateMachine.transition(state, 'igniting');
      expect(ignitingResult.success).toBe(true);
    });

    it('should prevent transitions from terminal stage', async () => {
      const state = createMockState('complete');
      const result = await OnboardingStateMachine.transition(state, 'account');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should include timestamp in all results', async () => {
      const state = createMockState('brand');
      const result = await OnboardingStateMachine.transition(state, 'email');

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getStageSequence', () => {
    it('should return sequence from start to target', () => {
      const sequence = OnboardingStateMachine.getStageSequence('ai_keys');
      expect(sequence).toEqual(['account', 'brand', 'email', 'ai_keys']);
    });

    it('should include only first stage for account', () => {
      const sequence = OnboardingStateMachine.getStageSequence('account');
      expect(sequence).toEqual(['account']);
    });

    it('should return full sequence for complete', () => {
      const sequence = OnboardingStateMachine.getStageSequence('complete');
      expect(sequence).toHaveLength(ONBOARDING_STAGES.length);
      expect(sequence).toEqual(ONBOARDING_STAGES);
    });

    it('should return empty array for invalid stage', () => {
      const sequence = OnboardingStateMachine.getStageSequence('invalid' as OnboardingStage);
      expect(sequence).toEqual([]);
    });

    it('should preserve order for all valid stages', () => {
      ONBOARDING_STAGES.forEach(stage => {
        const sequence = OnboardingStateMachine.getStageSequence(stage);
        const index = ONBOARDING_STAGES.indexOf(stage);
        expect(sequence).toHaveLength(index + 1);
      });
    });
  });

  describe('calculateProgress', () => {
    it('should calculate 0% for account stage', () => {
      expect(OnboardingStateMachine.calculateProgress('account')).toBe(0);
    });

    it('should calculate 100% for complete stage', () => {
      expect(OnboardingStateMachine.calculateProgress('complete')).toBe(100);
    });

    it('should calculate intermediate percentages', () => {
      const brandProgress = OnboardingStateMachine.calculateProgress('brand');
      expect(brandProgress).toBeGreaterThan(0);
      expect(brandProgress).toBeLessThan(100);

      const emailProgress = OnboardingStateMachine.calculateProgress('email');
      expect(emailProgress).toBeGreaterThan(brandProgress);
    });

    it('should be monotonically increasing', () => {
      let lastProgress = -1;
      ONBOARDING_STAGES.forEach(stage => {
        const progress = OnboardingStateMachine.calculateProgress(stage);
        expect(progress).toBeGreaterThanOrEqual(lastProgress);
        lastProgress = progress;
      });
    });

    it('should return values between 0 and 100', () => {
      ONBOARDING_STAGES.forEach(stage => {
        const progress = OnboardingStateMachine.calculateProgress(stage);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('canAccessDashboard', () => {
    const createState = (
      stage: OnboardingStage,
      setupComplete: boolean = false
    ): WorkspaceOnboardingState => ({
      workspace_id: 'test-id',
      onboarding_stage: stage,
      setup_complete: setupComplete,
      campaigns_enabled: false,
      onboarding_started_at: new Date(),
      onboarding_completed_at: null,
    });

    it('should allow access during igniting', () => {
      const state = createState('igniting');
      expect(OnboardingStateMachine.canAccessDashboard(state)).toBe(true);
    });

    it('should allow access when complete', () => {
      const state = createState('complete');
      expect(OnboardingStateMachine.canAccessDashboard(state)).toBe(true);
    });

    it('should allow access if setup_complete is true', () => {
      const state = createState('brand', true);
      expect(OnboardingStateMachine.canAccessDashboard(state)).toBe(true);
    });

    it('should block access during early stages', () => {
      expect(OnboardingStateMachine.canAccessDashboard(createState('account'))).toBe(false);
      expect(OnboardingStateMachine.canAccessDashboard(createState('brand'))).toBe(false);
      expect(OnboardingStateMachine.canAccessDashboard(createState('email'))).toBe(false);
      expect(OnboardingStateMachine.canAccessDashboard(createState('ai_keys'))).toBe(false);
    });

    it('should block access during pending stages', () => {
      expect(OnboardingStateMachine.canAccessDashboard(createState('pending_ignition'))).toBe(false);
      expect(OnboardingStateMachine.canAccessDashboard(createState('pending_review'))).toBe(false);
    });
  });

  describe('shouldEnableCampaigns', () => {
    const createState = (
      setupComplete: boolean,
      campaignsEnabled: boolean
    ): WorkspaceOnboardingState => ({
      workspace_id: 'test-id',
      onboarding_stage: 'complete',
      setup_complete: setupComplete,
      campaigns_enabled: campaignsEnabled,
      onboarding_started_at: new Date(),
      onboarding_completed_at: new Date(),
    });

    it('should enable campaigns when both flags are true', () => {
      const state = createState(true, true);
      expect(OnboardingStateMachine.shouldEnableCampaigns(state)).toBe(true);
    });

    it('should disable campaigns if setup not complete', () => {
      const state = createState(false, true);
      expect(OnboardingStateMachine.shouldEnableCampaigns(state)).toBe(false);
    });

    it('should disable campaigns if not enabled', () => {
      const state = createState(true, false);
      expect(OnboardingStateMachine.shouldEnableCampaigns(state)).toBe(false);
    });

    it('should disable campaigns if neither flag is true', () => {
      const state = createState(false, false);
      expect(OnboardingStateMachine.shouldEnableCampaigns(state)).toBe(false);
    });
  });

  describe('isValidStage', () => {
    it('should validate all defined stages', () => {
      ONBOARDING_STAGES.forEach(stage => {
        expect(OnboardingStateMachine.isValidStage(stage)).toBe(true);
      });
    });

    it('should reject invalid stage strings', () => {
      expect(OnboardingStateMachine.isValidStage('invalid')).toBe(false);
      expect(OnboardingStateMachine.isValidStage('onboarding')).toBe(false);
      expect(OnboardingStateMachine.isValidStage('')).toBe(false);
      expect(OnboardingStateMachine.isValidStage('ACCOUNT')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(OnboardingStateMachine.isValidStage('Account')).toBe(false);
      expect(OnboardingStateMachine.isValidStage('BRAND')).toBe(false);
      expect(OnboardingStateMachine.isValidStage('Email')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined stage gracefully', () => {
      const stages = OnboardingStateMachine.getNextStages(undefined as any);
      expect(stages).toEqual([]);
    });

    it('should handle null transitions', () => {
      const result = OnboardingStateMachine.isValidTransition(null as any, 'brand');
      expect(result).toBe(false);
    });

    it('should calculate progress for all stages without errors', () => {
      ONBOARDING_STAGES.forEach(stage => {
        expect(() => OnboardingStateMachine.calculateProgress(stage)).not.toThrow();
      });
    });
  });
});
