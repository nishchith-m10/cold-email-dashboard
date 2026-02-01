/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Setup State Manager Tests
 */

import { SetupStateManager } from '../lib/setup-state-manager';
import { WorkspaceOnboardingState } from '../lib/types';

describe('SetupStateManager', () => {
  const createState = (
    stage: 'account' | 'complete',
    setupComplete: boolean = false,
    campaignsEnabled: boolean = false,
    startedAt: Date | null = new Date()
  ): WorkspaceOnboardingState => ({
    workspace_id: 'test-workspace-123',
    onboarding_stage: stage,
    setup_complete: setupComplete,
    campaigns_enabled: campaignsEnabled,
    onboarding_started_at: startedAt,
    onboarding_completed_at: stage === 'complete' ? new Date() : null,
  });

  describe('markSetupComplete', () => {
    it('should return setup completion event with correct fields', async () => {
      const workspaceId = 'workspace-abc';
      const adminId = 'admin-123';
      const startedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const event = await SetupStateManager.markSetupComplete(
        workspaceId,
        adminId,
        startedAt
      );

      expect(event.workspace_id).toBe(workspaceId);
      expect(event.completed_by).toBe(adminId);
      expect(event.completed_at).toBeInstanceOf(Date);
      expect(event.setup_duration_minutes).toBeGreaterThan(0);
    });

    it('should calculate duration correctly', async () => {
      const startedAt = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
      const event = await SetupStateManager.markSetupComplete(
        'workspace-id',
        'admin-id',
        startedAt
      );

      // Should be approximately 45 minutes (allow 1 minute variance)
      expect(event.setup_duration_minutes).toBeGreaterThanOrEqual(44);
      expect(event.setup_duration_minutes).toBeLessThanOrEqual(46);
    });

    it('should handle null start time', async () => {
      const event = await SetupStateManager.markSetupComplete(
        'workspace-id',
        'admin-id',
        null
      );

      expect(event.setup_duration_minutes).toBe(0);
      expect(event.workspace_id).toBe('workspace-id');
    });

    it('should round duration to nearest minute', async () => {
      const startedAt = new Date(Date.now() - 2.5 * 60 * 1000); // 2.5 minutes
      const event = await SetupStateManager.markSetupComplete(
        'workspace-id',
        'admin-id',
        startedAt
      );

      expect(Number.isInteger(event.setup_duration_minutes)).toBe(true);
    });

    it('should handle very recent start times', async () => {
      const startedAt = new Date(Date.now() - 5000); // 5 seconds ago
      const event = await SetupStateManager.markSetupComplete(
        'workspace-id',
        'admin-id',
        startedAt
      );

      expect(event.setup_duration_minutes).toBe(0);
    });

    it('should handle long durations', async () => {
      const startedAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const event = await SetupStateManager.markSetupComplete(
        'workspace-id',
        'admin-id',
        startedAt
      );

      expect(event.setup_duration_minutes).toBeGreaterThan(1400); // ~24 hours
    });
  });

  describe('enableCampaigns', () => {
    it('should return campaign enablement event', async () => {
      const event = await SetupStateManager.enableCampaigns(
        'workspace-123',
        'user-456',
        'campaign-789'
      );

      expect(event.workspace_id).toBe('workspace-123');
      expect(event.enabled_by).toBe('user-456');
      expect(event.first_campaign_id).toBe('campaign-789');
      expect(event.enabled_at).toBeInstanceOf(Date);
    });

    it('should record current timestamp', async () => {
      const before = Date.now();
      const event = await SetupStateManager.enableCampaigns(
        'workspace-id',
        'user-id',
        'campaign-id'
      );
      const after = Date.now();

      expect(event.enabled_at.getTime()).toBeGreaterThanOrEqual(before);
      expect(event.enabled_at.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('canCreateCampaigns', () => {
    it('should allow campaign creation when fully set up', () => {
      const state = createState('complete', true, false);
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(true);
    });

    it('should prevent creation during onboarding', () => {
      const state = createState('account', false, false);
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(false);
    });

    it('should prevent creation if onboarding incomplete', () => {
      const state = createState('account', true, false);
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(false);
    });

    it('should prevent creation if setup not complete', () => {
      const state = createState('complete', false, false);
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(false);
    });

    it('should allow creation even if campaigns not yet enabled', () => {
      const state = createState('complete', true, false);
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(true);
    });
  });

  describe('isFullyOperational', () => {
    it('should return true when all conditions met', () => {
      const state = createState('complete', true, true);
      expect(SetupStateManager.isFullyOperational(state)).toBe(true);
    });

    it('should return false if onboarding incomplete', () => {
      const state = createState('account', true, true);
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);
    });

    it('should return false if setup not complete', () => {
      const state = createState('complete', false, true);
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);
    });

    it('should return false if campaigns not enabled', () => {
      const state = createState('complete', true, false);
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);
    });

    it('should require all three conditions', () => {
      expect(SetupStateManager.isFullyOperational(createState('account', false, false))).toBe(false);
      expect(SetupStateManager.isFullyOperational(createState('complete', false, false))).toBe(false);
      expect(SetupStateManager.isFullyOperational(createState('complete', true, false))).toBe(false);
      expect(SetupStateManager.isFullyOperational(createState('complete', true, true))).toBe(true);
    });
  });

  describe('getSetupStatus', () => {
    it('should return pending_onboarding during onboarding', () => {
      const state = createState('account');
      const status = SetupStateManager.getSetupStatus(state);

      expect(status.status).toBe('pending_onboarding');
      expect(status.message).toContain('Complete onboarding');
      expect(status.can_create_campaigns).toBe(false);
    });

    it('should return pending_setup after onboarding, before setup', () => {
      const state = createState('complete', false, false);
      const status = SetupStateManager.getSetupStatus(state);

      expect(status.status).toBe('pending_setup');
      expect(status.message).toContain('configuring');
      expect(status.can_create_campaigns).toBe(false);
    });

    it('should return pending_activation when ready for first campaign', () => {
      const state = createState('complete', true, false);
      const status = SetupStateManager.getSetupStatus(state);

      expect(status.status).toBe('pending_activation');
      expect(status.message).toContain('first campaign');
      expect(status.can_create_campaigns).toBe(true);
    });

    it('should return operational when fully set up', () => {
      const state = createState('complete', true, true);
      const status = SetupStateManager.getSetupStatus(state);

      expect(status.status).toBe('operational');
      expect(status.message).toContain('operational');
      expect(status.can_create_campaigns).toBe(true);
    });

    it('should progress through all statuses correctly', () => {
      // Stage 1: Onboarding
      let state = createState('account', false, false);
      expect(SetupStateManager.getSetupStatus(state).status).toBe('pending_onboarding');

      // Stage 2: Awaiting setup
      state = createState('complete', false, false);
      expect(SetupStateManager.getSetupStatus(state).status).toBe('pending_setup');

      // Stage 3: Ready for campaigns
      state = createState('complete', true, false);
      expect(SetupStateManager.getSetupStatus(state).status).toBe('pending_activation');

      // Stage 4: Operational
      state = createState('complete', true, true);
      expect(SetupStateManager.getSetupStatus(state).status).toBe('operational');
    });
  });

  describe('validateSetupCompletion', () => {
    it('should validate successful completion', () => {
      const state = createState('complete', false, false);
      const validation = SetupStateManager.validateSetupCompletion(state);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject if onboarding incomplete', () => {
      const state = createState('account', false, false);
      const validation = SetupStateManager.validateSetupCompletion(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('Onboarding not complete');
    });

    it('should reject if no start time', () => {
      const state = createState('complete', false, false, null);
      const validation = SetupStateManager.validateSetupCompletion(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('start time not recorded');
    });

    it('should accumulate multiple errors', () => {
      const state = createState('account', false, false, null);
      const validation = SetupStateManager.validateSetupCompletion(state);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });

    it('should include current stage in error message', () => {
      const state = createState('account');
      const validation = SetupStateManager.validateSetupCompletion(state);

      expect(validation.errors[0]).toContain('account');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user journey', async () => {
      // 1. User completes onboarding
      let state = createState('complete', false, false);
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(false);
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);

      // 2. Admin marks setup complete
      const setupEvent = await SetupStateManager.markSetupComplete(
        state.workspace_id,
        'admin-123',
        state.onboarding_started_at
      );
      expect(setupEvent.workspace_id).toBe(state.workspace_id);

      // 3. Update state
      state.setup_complete = true;
      expect(SetupStateManager.canCreateCampaigns(state)).toBe(true);
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);

      // 4. User enables first campaign
      const campaignEvent = await SetupStateManager.enableCampaigns(
        state.workspace_id,
        'user-456',
        'campaign-789'
      );
      expect(campaignEvent.first_campaign_id).toBe('campaign-789');

      // 5. Update state
      state.campaigns_enabled = true;
      expect(SetupStateManager.isFullyOperational(state)).toBe(true);
    });

    it('should prevent skipping setup step', () => {
      const state = createState('complete', false, false);
      
      // Cannot enable campaigns without setup
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);
      
      // Even if we try to enable campaigns
      state.campaigns_enabled = true;
      expect(SetupStateManager.isFullyOperational(state)).toBe(false);
    });
  });
});
