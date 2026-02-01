/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Signal Providers Tests
 */

import {
  EmailDomainProvider,
  IPReputationProvider,
  SignupFrequencyProvider,
  TierAppropriatenessProvider,
  CredentialValidationProvider,
  RegionMismatchProvider,
} from '@/lib/genesis/phase60a/signal-providers';

import { RISK_SCORES } from '@/lib/genesis/phase60a/risk-types';

describe('Signal Providers', () => {
  describe('EmailDomainProvider', () => {
    it('should detect disposable email domains', async () => {
      const result = await EmailDomainProvider.assess('user@tempmail.com');
      
      expect(result.score).toBe(RISK_SCORES.DISPOSABLE_EMAIL);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('tempmail.com');
    });

    it('should accept professional email domains', async () => {
      const result = await EmailDomainProvider.assess('user@company.com');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Professional');
    });

    it('should accept common free email providers', async () => {
      const gmailResult = await EmailDomainProvider.assess('user@gmail.com');
      expect(gmailResult.score).toBe(0);

      const outlookResult = await EmailDomainProvider.assess('user@outlook.com');
      expect(outlookResult.score).toBe(0);
    });

    it('should handle invalid email formats', async () => {
      const result = await EmailDomainProvider.assess('not-an-email');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Invalid');
    });

    it('should be case-insensitive', async () => {
      const result = await EmailDomainProvider.assess('USER@TEMPMAIL.COM');
      
      expect(result.score).toBe(RISK_SCORES.DISPOSABLE_EMAIL);
      expect(result.detected).toBe(true);
    });

    it('should detect multiple disposable domains', async () => {
      const domains = ['tempmail.com', 'guerrillamail.com', 'mailinator.com'];
      
      for (const domain of domains) {
        const result = await EmailDomainProvider.assess(`test@${domain}`);
        expect(result.detected).toBe(true);
        expect(result.score).toBe(RISK_SCORES.DISPOSABLE_EMAIL);
      }
    });

    it('should allow adding custom domains to blocklist', () => {
      EmailDomainProvider.addToBlocklist('custom-bad-domain.com');
      expect(EmailDomainProvider.isBlocked('custom-bad-domain.com')).toBe(true);
    });

    it('should check if domain is blocked', () => {
      expect(EmailDomainProvider.isBlocked('tempmail.com')).toBe(true);
      expect(EmailDomainProvider.isBlocked('gmail.com')).toBe(false);
    });
  });

  describe('IPReputationProvider', () => {
    it('should detect VPN/proxy IPs', async () => {
      const result = await IPReputationProvider.assess('vpn-server-123');
      
      expect(result.score).toBe(RISK_SCORES.VPN_PROXY);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('VPN');
    });

    it('should accept clean IPs', async () => {
      const result = await IPReputationProvider.assess('203.45.67.89');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Clean');
    });

    it('should handle private/local IPs', async () => {
      const privateIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
      
      for (const ip of privateIPs) {
        const result = await IPReputationProvider.assess(ip);
        expect(result.score).toBe(0);
        expect(result.reason).toContain('Private');
      }
    });

    it('should handle unknown IP addresses', async () => {
      const result = await IPReputationProvider.assess('unknown');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('unavailable');
    });

    it('should handle empty IP addresses', async () => {
      const result = await IPReputationProvider.assess('');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });
  });

  describe('SignupFrequencyProvider', () => {
    beforeEach(() => {
      SignupFrequencyProvider.clearCache();
    });

    it('should allow first signup from IP', async () => {
      const result = await SignupFrequencyProvider.assess('1.2.3.4');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Normal');
    });

    it('should allow second signup from same IP', async () => {
      await SignupFrequencyProvider.assess('1.2.3.4');
      const result = await SignupFrequencyProvider.assess('1.2.3.4');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should detect abuse after 3 signups', async () => {
      await SignupFrequencyProvider.assess('1.2.3.4');
      await SignupFrequencyProvider.assess('1.2.3.4');
      const result = await SignupFrequencyProvider.assess('1.2.3.4');
      
      expect(result.score).toBe(RISK_SCORES.SIGNUP_FREQUENCY_ABUSE);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('3 signups');
    });

    it('should track count accurately', async () => {
      await SignupFrequencyProvider.assess('1.2.3.4');
      expect(SignupFrequencyProvider.getSignupCount('1.2.3.4')).toBe(1);

      await SignupFrequencyProvider.assess('1.2.3.4');
      expect(SignupFrequencyProvider.getSignupCount('1.2.3.4')).toBe(2);

      await SignupFrequencyProvider.assess('1.2.3.4');
      expect(SignupFrequencyProvider.getSignupCount('1.2.3.4')).toBe(3);
    });

    it('should track different IPs separately', async () => {
      await SignupFrequencyProvider.assess('1.2.3.4');
      await SignupFrequencyProvider.assess('5.6.7.8');
      
      expect(SignupFrequencyProvider.getSignupCount('1.2.3.4')).toBe(1);
      expect(SignupFrequencyProvider.getSignupCount('5.6.7.8')).toBe(1);
    });

    it('should clear cache correctly', () => {
      SignupFrequencyProvider.assess('1.2.3.4');
      SignupFrequencyProvider.clearCache();
      
      expect(SignupFrequencyProvider.getSignupCount('1.2.3.4')).toBe(0);
    });
  });

  describe('TierAppropriatenessProvider', () => {
    it('should flag enterprise tier selection', async () => {
      const result = await TierAppropriatenessProvider.assess('enterprise');
      
      expect(result.score).toBe(RISK_SCORES.ENTERPRISE_DAY_ONE);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('Enterprise');
    });

    it('should accept starter tier', async () => {
      const result = await TierAppropriatenessProvider.assess('starter');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('Appropriate');
    });

    it('should accept professional tier', async () => {
      const result = await TierAppropriatenessProvider.assess('professional');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should accept scale tier', async () => {
      const result = await TierAppropriatenessProvider.assess('scale');
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });
  });

  describe('CredentialValidationProvider', () => {
    it('should accept valid OpenAI key format', async () => {
      const validKey = 'sk-' + 'a'.repeat(48);
      const result = await CredentialValidationProvider.assess(validKey, undefined);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('successfully');
    });

    it('should reject invalid OpenAI key format', async () => {
      const result = await CredentialValidationProvider.assess('invalid-key', undefined);
      
      expect(result.score).toBe(RISK_SCORES.CREDENTIAL_VALIDATION_FAILURE);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('OpenAI');
    });

    it('should accept valid Claude key format', async () => {
      const validKey = 'sk-ant-' + 'a'.repeat(40);
      const result = await CredentialValidationProvider.assess(undefined, validKey);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should reject invalid Claude key format', async () => {
      const result = await CredentialValidationProvider.assess(undefined, 'invalid-key');
      
      expect(result.score).toBe(RISK_SCORES.CREDENTIAL_VALIDATION_FAILURE);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('Claude');
    });

    it('should accept both valid keys', async () => {
      const validOpenAI = 'sk-' + 'a'.repeat(48);
      const validClaude = 'sk-ant-' + 'b'.repeat(40);
      
      const result = await CredentialValidationProvider.assess(validOpenAI, validClaude);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should fail if both keys are invalid', async () => {
      const result = await CredentialValidationProvider.assess('bad-key-1', 'bad-key-2');
      
      expect(result.score).toBe(RISK_SCORES.CREDENTIAL_VALIDATION_FAILURE);
      expect(result.detected).toBe(true);
    });

    it('should accept when no keys provided', async () => {
      const result = await CredentialValidationProvider.assess(undefined, undefined);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should handle only one key being invalid', async () => {
      const validOpenAI = 'sk-' + 'a'.repeat(48);
      const result = await CredentialValidationProvider.assess(validOpenAI, 'invalid');
      
      expect(result.score).toBe(RISK_SCORES.CREDENTIAL_VALIDATION_FAILURE);
      expect(result.detected).toBe(true);
    });
  });

  describe('RegionMismatchProvider', () => {
    it('should detect mismatch with VPN', async () => {
      const result = await RegionMismatchProvider.assess('nyc', 'en-GB', true);
      
      expect(result.score).toBe(RISK_SCORES.REGION_MISMATCH);
      expect(result.detected).toBe(true);
      expect(result.reason).toContain('mismatch');
      expect(result.reason).toContain('VPN');
    });

    it('should not flag mismatch without VPN', async () => {
      const result = await RegionMismatchProvider.assess('nyc', 'en-GB', false);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should accept matching region/locale', async () => {
      const result = await RegionMismatchProvider.assess('nyc', 'en-US', true);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('matches');
    });

    it('should handle missing user locale', async () => {
      const result = await RegionMismatchProvider.assess('nyc', undefined, true);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
      expect(result.reason).toContain('No user locale');
    });

    it('should accept US users in NYC', async () => {
      const result = await RegionMismatchProvider.assess('nyc', 'en-US', false);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should accept GB users in London', async () => {
      const result = await RegionMismatchProvider.assess('lon', 'en-GB', false);
      
      expect(result.score).toBe(0);
      expect(result.detected).toBe(false);
    });

    it('should require both mismatch AND VPN to flag', async () => {
      // Mismatch but no VPN
      const noVpnResult = await RegionMismatchProvider.assess('lon', 'en-US', false);
      expect(noVpnResult.score).toBe(0);

      // VPN but no mismatch
      const noMismatchResult = await RegionMismatchProvider.assess('lon', 'en-GB', true);
      expect(noMismatchResult.score).toBe(0);

      // Both mismatch and VPN
      const bothResult = await RegionMismatchProvider.assess('lon', 'en-US', true);
      expect(bothResult.score).toBe(RISK_SCORES.REGION_MISMATCH);
    });
  });

  describe('Provider metadata', () => {
    it('should include provider name in all results', async () => {
      const results = await Promise.all([
        EmailDomainProvider.assess('user@gmail.com'),
        IPReputationProvider.assess('1.2.3.4'),
        SignupFrequencyProvider.assess('1.2.3.4'),
        TierAppropriatenessProvider.assess('starter'),
        CredentialValidationProvider.assess(undefined, undefined),
        RegionMismatchProvider.assess('nyc', 'en-US', false),
      ]);

      results.forEach(result => {
        expect(result.provider).toBeDefined();
        expect(typeof result.provider).toBe('string');
        expect(result.provider.length).toBeGreaterThan(0);
      });
    });

    it('should include reason in all results', async () => {
      const results = await Promise.all([
        EmailDomainProvider.assess('user@gmail.com'),
        IPReputationProvider.assess('1.2.3.4'),
        SignupFrequencyProvider.assess('1.2.3.4'),
        TierAppropriatenessProvider.assess('starter'),
        CredentialValidationProvider.assess(undefined, undefined),
        RegionMismatchProvider.assess('nyc', 'en-US', false),
      ]);

      results.forEach(result => {
        expect(result.reason).toBeDefined();
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      });
    });
  });
});
