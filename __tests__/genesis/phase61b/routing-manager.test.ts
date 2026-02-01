/**
 * GENESIS PART VI - PHASE 60: APPLICATION LAYER ARCHITECTURE
 * Routing Manager Tests
 */

import { RoutingManager } from '../lib/routing-manager';
import {
  WorkspaceOnboardingState,
  OnboardingStage,
  ApplicationLayer,
} from '../lib/types';

describe('RoutingManager', () => {
  const createState = (
    stage: OnboardingStage,
    setupComplete: boolean = false,
    campaignsEnabled: boolean = false
  ): WorkspaceOnboardingState => ({
    workspace_id: 'test-workspace-123',
    onboarding_stage: stage,
    setup_complete: setupComplete,
    campaigns_enabled: campaignsEnabled,
    onboarding_started_at: new Date(),
    onboarding_completed_at: stage === 'complete' ? new Date() : null,
  });

  describe('determineRoute - No Workspaces', () => {
    it('should route to /join when user has no workspaces', () => {
      const decision = RoutingManager.determineRoute(false, null, false);

      expect(decision.target_route).toBe('/join');
      expect(decision.reason).toContain('No workspaces');
      expect(decision.should_block).toBe(false);
      expect(decision.metadata?.layer).toBe(ApplicationLayer.WorkspaceSelection);
    });

    it('should route to /join regardless of session state when no workspaces', () => {
      const decision = RoutingManager.determineRoute(false, null, true);
      expect(decision.target_route).toBe('/join');
    });
  });

  describe('determineRoute - Incomplete Onboarding', () => {
    it('should route to Genesis Gateway for account stage', () => {
      const state = createState('account');
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toBe('/onboarding/account');
      expect(decision.should_block).toBe(true);
      expect(decision.metadata?.layer).toBe(ApplicationLayer.GenesisGateway);
    });

    it('should route to Genesis Gateway for brand stage', () => {
      const state = createState('brand');
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toBe('/onboarding/brand');
      expect(decision.should_block).toBe(true);
    });

    it('should route to pending-review for high-risk signups', () => {
      const state = createState('pending_review');
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toBe('/onboarding/pending-review');
      expect(decision.should_block).toBe(true);
      expect(decision.metadata?.message).toContain('under review');
    });

    it('should route to ignition page during provisioning', () => {
      const state = createState('igniting');
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toBe('/ignition/test-workspace-123');
      expect(decision.should_block).toBe(true);
      expect(decision.metadata?.layer).toBe(ApplicationLayer.EngineStarting);
      expect(decision.metadata?.show_progress).toBe(true);
    });

    it('should include resumable flag for incomplete onboarding', () => {
      const state = createState('email');
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.metadata?.resumable).toBe(true);
      expect(decision.metadata?.current_stage).toBe('email');
    });
  });

  describe('determineRoute - Complete Onboarding, Pending Setup', () => {
    it('should route to dashboard with campaigns disabled', () => {
      const state = createState('complete', false, false);
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toBe('/dashboard');
      expect(decision.reason).toContain('awaiting admin setup');
      expect(decision.should_block).toBe(false);
      expect(decision.metadata?.campaigns_disabled).toBe(true);
      expect(decision.metadata?.show_setup_banner).toBe(true);
    });

    it('should not show onboarding tips during pending setup', () => {
      const state = createState('complete', false, false);
      const decision = RoutingManager.determineRoute(true, state, true);

      expect(decision.metadata?.show_onboarding_tips).toBeUndefined();
      expect(decision.metadata?.show_setup_banner).toBe(true);
    });
  });

  describe('determineRoute - Setup Complete', () => {
    it('should show onboarding tips on first session', () => {
      const state = createState('complete', true, false);
      const decision = RoutingManager.determineRoute(true, state, true);

      expect(decision.target_route).toBe('/dashboard');
      expect(decision.should_block).toBe(false);
      expect(decision.metadata?.show_onboarding_tips).toBe(true);
    });

    it('should skip tips on non-first session', () => {
      const state = createState('complete', true, false);
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toBe('/dashboard');
      expect(decision.metadata?.show_onboarding_tips).toBeUndefined();
    });

    it('should enable campaigns when fully operational', () => {
      const state = createState('complete', true, true);
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.metadata?.campaigns_enabled).toBe(true);
    });

    it('should not enable campaigns if campaigns_enabled is false', () => {
      const state = createState('complete', true, false);
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.metadata?.campaigns_enabled).toBe(false);
    });
  });

  describe('shouldBlockDashboard', () => {
    it('should block during early onboarding stages', () => {
      expect(RoutingManager.shouldBlockDashboard(createState('account'))).toBe(true);
      expect(RoutingManager.shouldBlockDashboard(createState('brand'))).toBe(true);
      expect(RoutingManager.shouldBlockDashboard(createState('email'))).toBe(true);
      expect(RoutingManager.shouldBlockDashboard(createState('ai_keys'))).toBe(true);
      expect(RoutingManager.shouldBlockDashboard(createState('region'))).toBe(true);
    });

    it('should block during pending stages', () => {
      expect(RoutingManager.shouldBlockDashboard(createState('pending_ignition'))).toBe(true);
      expect(RoutingManager.shouldBlockDashboard(createState('pending_review'))).toBe(true);
    });

    it('should not block during igniting', () => {
      expect(RoutingManager.shouldBlockDashboard(createState('igniting'))).toBe(false);
    });

    it('should not block when complete', () => {
      expect(RoutingManager.shouldBlockDashboard(createState('complete'))).toBe(false);
    });

    it('should not block if setup_complete is true regardless of stage', () => {
      expect(RoutingManager.shouldBlockDashboard(createState('account', true))).toBe(false);
    });
  });

  describe('areCampaignsEnabled', () => {
    it('should enable campaigns only when both flags true', () => {
      expect(RoutingManager.areCampaignsEnabled(createState('complete', true, true))).toBe(true);
    });

    it('should disable if setup not complete', () => {
      expect(RoutingManager.areCampaignsEnabled(createState('complete', false, true))).toBe(false);
    });

    it('should disable if campaigns_enabled is false', () => {
      expect(RoutingManager.areCampaignsEnabled(createState('complete', true, false))).toBe(false);
    });

    it('should disable if both flags are false', () => {
      expect(RoutingManager.areCampaignsEnabled(createState('complete', false, false))).toBe(false);
    });
  });

  describe('getWorkspaceCreationRoute', () => {
    it('should route to onboarding account stage', () => {
      const decision = RoutingManager.getWorkspaceCreationRoute();

      expect(decision.target_route).toBe('/onboarding/account');
      expect(decision.should_block).toBe(true);
      expect(decision.metadata?.layer).toBe(ApplicationLayer.GenesisGateway);
      expect(decision.metadata?.flow_type).toBe('create_new');
    });

    it('should have descriptive reason', () => {
      const decision = RoutingManager.getWorkspaceCreationRoute();
      expect(decision.reason).toContain('Genesis Gateway');
    });
  });

  describe('getWorkspaceJoinRoute', () => {
    it('should route directly to dashboard', () => {
      const decision = RoutingManager.getWorkspaceJoinRoute();

      expect(decision.target_route).toBe('/dashboard');
      expect(decision.should_block).toBe(false);
      expect(decision.metadata?.layer).toBe(ApplicationLayer.MainDashboard);
      expect(decision.metadata?.flow_type).toBe('join_existing');
    });

    it('should not block access', () => {
      const decision = RoutingManager.getWorkspaceJoinRoute();
      expect(decision.should_block).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null workspace state gracefully', () => {
      const decision = RoutingManager.determineRoute(true, null, false);
      expect(decision.target_route).toBe('/join');
      expect(decision.reason).toContain('fallback');
    });

    it('should include workspace ID in ignition route', () => {
      const state = createState('igniting');
      state.workspace_id = 'custom-workspace-xyz';
      const decision = RoutingManager.determineRoute(true, state, false);

      expect(decision.target_route).toContain('custom-workspace-xyz');
    });

    it('should handle all onboarding stages without errors', () => {
      const stages: OnboardingStage[] = [
        'account', 'brand', 'email', 'ai_keys', 'region',
        'pending_ignition', 'pending_review', 'igniting', 'complete'
      ];

      stages.forEach(stage => {
        expect(() => {
          RoutingManager.determineRoute(true, createState(stage), false);
        }).not.toThrow();
      });
    });
  });
});
