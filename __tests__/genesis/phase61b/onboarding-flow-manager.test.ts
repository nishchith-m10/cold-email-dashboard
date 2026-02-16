/**
 * GENESIS PART VI - PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
 * Onboarding Flow Manager Tests
 */

import { OnboardingFlowManager } from '@/lib/genesis/phase61b/onboarding-flow-manager';
import { OnboardingData } from '@/lib/genesis/phase61b/onboarding-types';

describe('OnboardingFlowManager', () => {
  const mockWorkspaceId = 'workspace-123';

  describe('completeBrandStage', () => {
    it('should complete valid brand stage', async () => {
      const result = await OnboardingFlowManager.completeBrandStage(mockWorkspaceId, {
        company_name: 'Acme Corp',
        website_url: 'https://acme.com',
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('email');
      expect(result.data_stored).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid data', async () => {
      const result = await OnboardingFlowManager.completeBrandStage(mockWorkspaceId, {
        company_name: '',
        website_url: 'https://acme.com',
      });

      expect(result.success).toBe(false);
      expect(result.next_stage).toBe('brand');
      expect(result.data_stored).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('completeEmailStage', () => {
    it('should complete valid email stage', async () => {
      const result = await OnboardingFlowManager.completeEmailStage(mockWorkspaceId, {
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: 'encrypted_data',
        connected_at: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('ai_keys');
      expect(result.data_stored).toBe(true);
    });

    it('should fail with invalid email', async () => {
      const result = await OnboardingFlowManager.completeEmailStage(mockWorkspaceId, {
        gmail_email: 'user@outlook.com',
        oauth_tokens_encrypted: 'encrypted_data',
        connected_at: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.next_stage).toBe('email');
      expect(result.data_stored).toBe(false);
    });
  });

  describe('completeAIKeysStage', () => {
    it('should complete with OpenAI key only', async () => {
      const result = await OnboardingFlowManager.completeAIKeysStage(mockWorkspaceId, {
        openai_key_encrypted: 'encrypted_openai_key',
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('region');
      expect(result.data_stored).toBe(true);
    });

    it('should complete with Claude key only', async () => {
      const result = await OnboardingFlowManager.completeAIKeysStage(mockWorkspaceId, {
        claude_key_encrypted: 'encrypted_claude_key',
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('region');
    });

    it('should complete with both keys', async () => {
      const result = await OnboardingFlowManager.completeAIKeysStage(mockWorkspaceId, {
        openai_key_encrypted: 'encrypted_openai_key',
        claude_key_encrypted: 'encrypted_claude_key',
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('region');
    });

    it('should fail with no keys', async () => {
      const result = await OnboardingFlowManager.completeAIKeysStage(mockWorkspaceId, {});

      expect(result.success).toBe(false);
      expect(result.next_stage).toBe('ai_keys');
      expect(result.data_stored).toBe(false);
    });
  });

  describe('completeRegionStage', () => {
    it('should complete valid region stage', async () => {
      const result = await OnboardingFlowManager.completeRegionStage(mockWorkspaceId, {
        region: 'nyc',
        tier: 'starter',
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('pending_ignition');
      expect(result.data_stored).toBe(true);
    });

    it('should fail with invalid region', async () => {
      const result = await OnboardingFlowManager.completeRegionStage(mockWorkspaceId, {
        region: 'invalid',
        tier: 'starter',
      });

      expect(result.success).toBe(false);
      expect(result.next_stage).toBe('region');
    });

    it('should fail with invalid tier', async () => {
      const result = await OnboardingFlowManager.completeRegionStage(mockWorkspaceId, {
        region: 'nyc',
        tier: 'invalid' as any,
      });

      expect(result.success).toBe(false);
      expect(result.next_stage).toBe('region');
    });
  });

  describe('completeIgniteStage', () => {
    it('should proceed to igniting when risk check passes', async () => {
      const result = await OnboardingFlowManager.completeIgniteStage(mockWorkspaceId, {
        user_confirmed: true,
        risk_check_passed: true,
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('igniting');
      expect(result.data_stored).toBe(true);
    });

    it('should route to pending_review when risk check fails', async () => {
      const result = await OnboardingFlowManager.completeIgniteStage(mockWorkspaceId, {
        user_confirmed: true,
        risk_check_passed: false,
      });

      expect(result.success).toBe(true);
      expect(result.next_stage).toBe('pending_review');
      expect(result.data_stored).toBe(true);
    });

    it('should fail without user confirmation', async () => {
      const result = await OnboardingFlowManager.completeIgniteStage(mockWorkspaceId, {
        user_confirmed: false,
        risk_check_passed: true,
      });

      expect(result.success).toBe(false);
      expect(result.next_stage).toBe('pending_ignition');
      expect(result.data_stored).toBe(false);
    });
  });

  describe('getProgressSummary', () => {
    const mockOnboardingData: Partial<OnboardingData> = {
      workspace_id: mockWorkspaceId,
      account: {
        user_id: 'user-123',
        email: 'user@example.com',
        created_at: new Date(),
      },
    };

    it('should calculate progress for account stage', () => {
      const summary = OnboardingFlowManager.getProgressSummary(
        mockWorkspaceId,
        'account',
        mockOnboardingData
      );

      expect(summary.workspace_id).toBe(mockWorkspaceId);
      expect(summary.current_stage).toBe('account');
      expect(summary.stages_completed).toHaveLength(0);
      expect(summary.percentage_complete).toBe(0);
      expect(summary.estimated_time_remaining_seconds).toBeGreaterThan(0);
    });

    it('should calculate progress for brand stage', () => {
      const summary = OnboardingFlowManager.getProgressSummary(
        mockWorkspaceId,
        'brand',
        mockOnboardingData
      );

      expect(summary.stages_completed).toEqual(['account']);
      expect(summary.percentage_complete).toBeGreaterThan(0);
      expect(summary.percentage_complete).toBeLessThan(100);
    });

    it('should calculate progress for pending_ignition stage', () => {
      const summary = OnboardingFlowManager.getProgressSummary(
        mockWorkspaceId,
        'pending_ignition',
        mockOnboardingData
      );

      expect(summary.stages_completed).toHaveLength(5);
      expect(summary.stages_completed).toEqual(['account', 'brand', 'email', 'ai_keys', 'region']);
      expect(summary.percentage_complete).toBeGreaterThan(80);
    });

    it('should estimate time remaining decreases with progress', () => {
      const accountSummary = OnboardingFlowManager.getProgressSummary(
        mockWorkspaceId,
        'account',
        mockOnboardingData
      );

      const brandSummary = OnboardingFlowManager.getProgressSummary(
        mockWorkspaceId,
        'brand',
        mockOnboardingData
      );

      expect(brandSummary.estimated_time_remaining_seconds)
        .toBeLessThan(accountSummary.estimated_time_remaining_seconds);
    });

    it('should handle invalid stage gracefully', () => {
      const summary = OnboardingFlowManager.getProgressSummary(
        mockWorkspaceId,
        'invalid',
        mockOnboardingData
      );

      expect(summary.percentage_complete).toBe(0);
      expect(summary.stages_completed).toHaveLength(0);
    });
  });

  describe('isOnboardingComplete', () => {
    it('should return true for complete stage', () => {
      expect(OnboardingFlowManager.isOnboardingComplete('complete')).toBe(true);
    });

    it('should return false for incomplete stages', () => {
      const stages = ['account', 'brand', 'email', 'ai_keys', 'region', 'pending_ignition', 'igniting'];
      
      stages.forEach(stage => {
        expect(OnboardingFlowManager.isOnboardingComplete(stage)).toBe(false);
      });
    });
  });

  describe('validateCompleteOnboardingData', () => {
    const completeData: Partial<OnboardingData> = {
      workspace_id: mockWorkspaceId,
      account: {
        user_id: 'user-123',
        email: 'user@example.com',
        created_at: new Date(),
      },
      brand: {
        company_name: 'Acme Corp',
        website_url: 'https://acme.com',
      },
      email: {
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: 'encrypted',
        connected_at: new Date(),
      },
      ai_keys: {
        openai_key_encrypted: 'encrypted',
      },
      region: {
        region: 'nyc',
        tier: 'starter',
      },
    };

    it('should validate complete onboarding data', () => {
      const result = OnboardingFlowManager.validateCompleteOnboardingData(completeData);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing account data', () => {
      const incompleteData = { ...completeData };
      delete incompleteData.account;

      const result = OnboardingFlowManager.validateCompleteOnboardingData(incompleteData);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('account');
    });

    it('should detect missing brand data', () => {
      const incompleteData = { ...completeData };
      delete incompleteData.brand;

      const result = OnboardingFlowManager.validateCompleteOnboardingData(incompleteData);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('brand');
    });

    it('should detect missing email data', () => {
      const incompleteData = { ...completeData };
      delete incompleteData.email;

      const result = OnboardingFlowManager.validateCompleteOnboardingData(incompleteData);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('email');
    });

    it('should detect multiple missing fields', () => {
      const incompleteData: Partial<OnboardingData> = {
        workspace_id: mockWorkspaceId,
        account: completeData.account,
      };

      const result = OnboardingFlowManager.validateCompleteOnboardingData(incompleteData);

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(1);
      expect(result.missing).toContain('brand');
      expect(result.missing).toContain('email');
    });
  });

  describe('Integration: Complete Flow', () => {
    it('should successfully progress through all stages', async () => {
      // Stage 1: Account (handled by Clerk, skipped)

      // Stage 2: Brand
      const brandResult = await OnboardingFlowManager.completeBrandStage(mockWorkspaceId, {
        company_name: 'Acme Corp',
        website_url: 'https://acme.com',
      });
      expect(brandResult.success).toBe(true);
      expect(brandResult.next_stage).toBe('email');

      // Stage 3: Email
      const emailResult = await OnboardingFlowManager.completeEmailStage(mockWorkspaceId, {
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: 'encrypted',
        connected_at: new Date(),
      });
      expect(emailResult.success).toBe(true);
      expect(emailResult.next_stage).toBe('ai_keys');

      // Stage 4: AI Keys
      const aiKeysResult = await OnboardingFlowManager.completeAIKeysStage(mockWorkspaceId, {
        openai_key_encrypted: 'encrypted_key',
      });
      expect(aiKeysResult.success).toBe(true);
      expect(aiKeysResult.next_stage).toBe('region');

      // Stage 5: Region
      const regionResult = await OnboardingFlowManager.completeRegionStage(mockWorkspaceId, {
        region: 'nyc',
        tier: 'starter',
      });
      expect(regionResult.success).toBe(true);
      expect(regionResult.next_stage).toBe('pending_ignition');

      // Stage 6: Ignite
      const igniteResult = await OnboardingFlowManager.completeIgniteStage(mockWorkspaceId, {
        user_confirmed: true,
        risk_check_passed: true,
      });
      expect(igniteResult.success).toBe(true);
      expect(igniteResult.next_stage).toBe('igniting');
    });
  });
});
