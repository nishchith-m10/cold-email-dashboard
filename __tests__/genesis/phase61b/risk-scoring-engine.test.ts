/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Risk Scoring Engine Tests
 */

import { RiskScoringEngine } from '@/lib/genesis/phase61b/risk-scoring-engine';
import { RiskAssessmentContext } from '@/lib/genesis/phase61b/risk-types';
import { SignupFrequencyProvider } from '@/lib/genesis/phase61b/signal-providers';

describe('RiskScoringEngine', () => {
  beforeEach(() => {
    // Clear signup frequency cache before each test
    SignupFrequencyProvider.clearCache();
  });

  const createMockContext = (overrides?: Partial<RiskAssessmentContext>): RiskAssessmentContext => ({
    workspace_id: 'workspace-123',
    email: 'user@company.com',
    ip_address: '203.45.67.89',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    tier: 'starter',
    region: 'nyc',
    user_locale: 'en-US',
    ...overrides,
  });

  describe('assess', () => {
    it('should assess clean signup with low risk', async () => {
      const context = createMockContext();
      const result = await RiskScoringEngine.assess(context);

      expect(result.workspace_id).toBe(context.workspace_id);
      expect(result.total_score).toBe(0);
      expect(result.risk_level).toBe('low');
      expect(result.should_notify_admin).toBe(false);
    });

    it('should detect disposable email', async () => {
      const context = createMockContext({
        email: 'user@tempmail.com',
      });
      
      const result = await RiskScoringEngine.assess(context);

      expect(result.signals.email_domain_score).toBe(50);
      expect(result.total_score).toBe(50);
      expect(result.risk_level).toBe('medium'); // 50 is at medium_max threshold
      expect(result.should_notify_admin).toBe(false); // Only high (51+) notifies
    });

    it('should detect VPN usage', async () => {
      const context = createMockContext({
        ip_address: 'vpn-server-123',
      });
      
      const result = await RiskScoringEngine.assess(context);

      expect(result.signals.ip_reputation_score).toBe(20);
      expect(result.total_score).toBe(20);
      expect(result.risk_level).toBe('low'); // 20 is at low_max threshold
    });

    it('should detect signup frequency abuse', async () => {
      const context = createMockContext();
      
      // Simulate 3 signups
      await RiskScoringEngine.assess(context);
      await RiskScoringEngine.assess(context);
      const result = await RiskScoringEngine.assess(context);

      expect(result.signals.signup_frequency_score).toBe(30);
      expect(result.risk_level).toBe('medium');
    });

    it('should detect enterprise tier selection', async () => {
      const context = createMockContext({
        tier: 'enterprise',
      });
      
      const result = await RiskScoringEngine.assess(context);

      expect(result.signals.tier_appropriateness_score).toBe(25);
      expect(result.risk_level).toBe('medium');
    });

    it('should detect credential validation failures', async () => {
      const context = createMockContext({
        openai_key: 'invalid-key',
      });
      
      const result = await RiskScoringEngine.assess(context);

      expect(result.signals.credential_validation_score).toBe(40);
      expect(result.risk_level).toBe('medium');
    });

    it('should detect region mismatch with VPN', async () => {
      const context = createMockContext({
        ip_address: 'vpn-server-123',
        region: 'lon',
        user_locale: 'en-US',
      });
      
      const result = await RiskScoringEngine.assess(context);

      expect(result.signals.ip_reputation_score).toBe(20);
      expect(result.signals.region_mismatch_score).toBe(15);
    });

    it('should accumulate multiple risk signals', async () => {
      const context = createMockContext({
        email: 'user@tempmail.com',    // +50
        ip_address: 'vpn-server-123',  // +20
        tier: 'enterprise',             // +25
      });
      
      const result = await RiskScoringEngine.assess(context);

      expect(result.total_score).toBe(95);
      expect(result.risk_level).toBe('high');
      expect(result.should_notify_admin).toBe(true);
    });

    it('should include metadata in result', async () => {
      const context = createMockContext();
      const result = await RiskScoringEngine.assess(context);

      expect(result.metadata.ip_address).toBe(context.ip_address);
      expect(result.metadata.user_agent).toBe(context.user_agent);
      expect(result.metadata.assessed_at).toBeInstanceOf(Date);
    });

    it('should handle all tier values', async () => {
      const tiers: Array<'starter' | 'professional' | 'scale' | 'enterprise'> = [
        'starter',
        'professional',
        'scale',
        'enterprise',
      ];

      for (const tier of tiers) {
        const context = createMockContext({ tier });
        const result = await RiskScoringEngine.assess(context);
        
        expect(result).toBeDefined();
        expect(typeof result.total_score).toBe('number');
      }
    });

    it('should assess different risk levels correctly', async () => {
      // Low risk
      const lowContext = createMockContext();
      const lowResult = await RiskScoringEngine.assess(lowContext);
      expect(lowResult.risk_level).toBe('low');

      // Medium risk
      const mediumContext = createMockContext({ tier: 'enterprise' }); // +25
      const mediumResult = await RiskScoringEngine.assess(mediumContext);
      expect(mediumResult.risk_level).toBe('medium');

      // High risk
      const highContext = createMockContext({ email: 'user@tempmail.com' }); // +50
      const highResult = await RiskScoringEngine.assess(highContext);
      expect(highResult.risk_level).toBe('high');
    });
  });

  describe('getAssessmentBreakdown', () => {
    it('should provide detailed breakdown', async () => {
      const context = createMockContext({
        email: 'user@tempmail.com',
      });
      
      const { result, details } = await RiskScoringEngine.getAssessmentBreakdown(context);

      expect(result).toBeDefined();
      expect(details).toHaveLength(6);
      
      // Check structure of detail items
      details.forEach(detail => {
        expect(detail).toHaveProperty('signal');
        expect(detail).toHaveProperty('score');
        expect(detail).toHaveProperty('detected');
        expect(detail).toHaveProperty('reason');
        expect(detail).toHaveProperty('provider');
      });
    });

    it('should include all signal names', async () => {
      const context = createMockContext();
      const { details } = await RiskScoringEngine.getAssessmentBreakdown(context);

      const signals = details.map(d => d.signal);
      expect(signals).toContain('email_domain');
      expect(signals).toContain('ip_reputation');
      expect(signals).toContain('signup_frequency');
      expect(signals).toContain('tier_appropriateness');
      expect(signals).toContain('credential_validation');
      expect(signals).toContain('region_mismatch');
    });

    it('should match result from assess method', async () => {
      const context = createMockContext();
      
      const directResult = await RiskScoringEngine.assess(context);
      const { result: breakdownResult } = await RiskScoringEngine.getAssessmentBreakdown(context);

      expect(breakdownResult.total_score).toBe(directResult.total_score);
      expect(breakdownResult.risk_level).toBe(directResult.risk_level);
      expect(breakdownResult.should_notify_admin).toBe(directResult.should_notify_admin);
    });

    it('should show detected signals in details', async () => {
      const context = createMockContext({
        email: 'user@tempmail.com',
      });
      
      const { details } = await RiskScoringEngine.getAssessmentBreakdown(context);
      const emailDetail = details.find(d => d.signal === 'email_domain');

      expect(emailDetail).toBeDefined();
      expect(emailDetail!.detected).toBe(true);
      expect(emailDetail!.score).toBeGreaterThan(0);
      expect(emailDetail!.reason).toBeTruthy();
    });
  });

  describe('validateContext', () => {
    it('should validate correct context', () => {
      const context = createMockContext();
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject missing workspace_id', () => {
      const context = createMockContext({ workspace_id: '' });
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('workspace_id is required');
    });

    it('should reject invalid email', () => {
      const context = createMockContext({ email: 'not-an-email' });
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('email'))).toBe(true);
    });

    it('should reject missing ip_address', () => {
      const context = createMockContext({ ip_address: '' });
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('ip_address is required');
    });

    it('should reject missing user_agent', () => {
      const context = createMockContext({ user_agent: '' });
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('user_agent is required');
    });

    it('should reject invalid tier', () => {
      const context = createMockContext({ tier: 'invalid' as any });
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('tier'))).toBe(true);
    });

    it('should reject missing region', () => {
      const context = createMockContext({ region: '' });
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('region is required');
    });

    it('should accumulate multiple errors', () => {
      const context = createMockContext({
        workspace_id: '',
        email: 'bad',
        ip_address: '',
      });
      
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });

    it('should accept context with optional fields missing', () => {
      const context = createMockContext({
        user_locale: undefined,
        openai_key: undefined,
        claude_key: undefined,
      });
      
      const validation = RiskScoringEngine.validateContext(context);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum risk score correctly', async () => {
      // Trigger all possible risk signals
      const context = createMockContext({
        email: 'user@tempmail.com',    // +50
        ip_address: 'vpn-server-123',  // +20
        tier: 'enterprise',             // +25
        openai_key: 'invalid',          // +40
        region: 'lon',
        user_locale: 'en-US',           // +15 (with VPN)
      });

      // Add signup frequency
      await RiskScoringEngine.assess(context);
      await RiskScoringEngine.assess(context);
      const result = await RiskScoringEngine.assess(context); // +30

      // Total: 50 + 20 + 30 + 25 + 40 + 15 = 180
      expect(result.total_score).toBeGreaterThan(100);
      expect(result.risk_level).toBe('high');
      expect(result.should_notify_admin).toBe(true);
    });

    it('should handle concurrent assessments', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) =>
        createMockContext({ workspace_id: `workspace-${i}` })
      );

      const results = await Promise.all(
        contexts.map(ctx => RiskScoringEngine.assess(ctx))
      );

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.workspace_id).toBe(`workspace-${i}`);
      });
    });

    it('should produce consistent results for same input', async () => {
      const context = createMockContext();
      
      const result1 = await RiskScoringEngine.assess(context);
      
      // Reset signup frequency to get same result
      SignupFrequencyProvider.clearCache();
      
      const result2 = await RiskScoringEngine.assess(context);

      expect(result1.total_score).toBe(result2.total_score);
      expect(result1.risk_level).toBe(result2.risk_level);
    });
  });
});
