/**
 * GENESIS PART VI - PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
 * Stage Validators Tests
 */

import {
  BrandStageValidator,
  EmailStageValidator,
  AIKeysStageValidator,
  RegionStageValidator,
  IgniteStageValidator,
} from '@/lib/genesis/phase61b/stage-validators';

describe('Stage Validators', () => {
  describe('BrandStageValidator', () => {
    it('should validate correct brand data', () => {
      const result = BrandStageValidator.validate({
        company_name: 'Acme Corp',
        website_url: 'https://acme.com',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing company name', () => {
      const result = BrandStageValidator.validate({
        company_name: '',
        website_url: 'https://acme.com',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Company name is required');
    });

    it('should reject company name that is too short', () => {
      const result = BrandStageValidator.validate({
        company_name: 'A',
        website_url: 'https://acme.com',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 2 characters'))).toBe(true);
    });

    it('should reject company name that is too long', () => {
      const result = BrandStageValidator.validate({
        company_name: 'A'.repeat(101),
        website_url: 'https://acme.com',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('less than 100 characters'))).toBe(true);
    });

    it('should reject missing website URL', () => {
      const result = BrandStageValidator.validate({
        company_name: 'Acme Corp',
        website_url: '',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Website URL is required');
    });

    it('should reject invalid website URL', () => {
      const result = BrandStageValidator.validate({
        company_name: 'Acme Corp',
        website_url: 'not-a-url',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Website URL is invalid');
    });

    it('should reject non-HTTP(S) protocols', () => {
      const result = BrandStageValidator.validate({
        company_name: 'Acme Corp',
        website_url: 'ftp://acme.com',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HTTP or HTTPS'))).toBe(true);
    });

    it('should warn about localhost URLs', () => {
      const result = BrandStageValidator.validate({
        company_name: 'Acme Corp',
        website_url: 'http://localhost:3000',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('localhost');
    });

    it('should normalize URL without protocol', () => {
      const normalized = BrandStageValidator.normalizeUrl('acme.com');
      expect(normalized).toBe('https://acme.com');
    });

    it('should not modify URL with protocol', () => {
      const normalized = BrandStageValidator.normalizeUrl('https://acme.com');
      expect(normalized).toBe('https://acme.com');
    });

    it('should trim whitespace from URLs', () => {
      const normalized = BrandStageValidator.normalizeUrl('  acme.com  ');
      expect(normalized).toBe('https://acme.com');
    });
  });

  describe('EmailStageValidator', () => {
    it('should validate correct email data', () => {
      const result = EmailStageValidator.validate({
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: 'encrypted_token_data',
        connected_at: new Date(),
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing Gmail email', () => {
      const result = EmailStageValidator.validate({
        gmail_email: '',
        oauth_tokens_encrypted: 'encrypted_token_data',
        connected_at: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Gmail email is required');
    });

    it('should reject invalid email format', () => {
      const result = EmailStageValidator.validate({
        gmail_email: 'not-an-email',
        oauth_tokens_encrypted: 'encrypted_token_data',
        connected_at: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject non-Gmail addresses', () => {
      const result = EmailStageValidator.validate({
        gmail_email: 'user@outlook.com',
        oauth_tokens_encrypted: 'encrypted_token_data',
        connected_at: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('@gmail.com'))).toBe(true);
    });

    it('should reject missing OAuth tokens', () => {
      const result = EmailStageValidator.validate({
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: '',
        connected_at: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OAuth tokens are required');
    });

    it('should reject future connection timestamp', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const result = EmailStageValidator.validate({
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: 'encrypted_token_data',
        connected_at: futureDate,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('future'))).toBe(true);
    });

    it('should accept past connection timestamp', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const result = EmailStageValidator.validate({
        gmail_email: 'user@gmail.com',
        oauth_tokens_encrypted: 'encrypted_token_data',
        connected_at: pastDate,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('AIKeysStageValidator', () => {
    it('should validate OpenAI key only', () => {
      const result = AIKeysStageValidator.validate({
        openai_key_encrypted: 'encrypted_openai_key_data',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Claude');
    });

    it('should validate Claude key only', () => {
      const result = AIKeysStageValidator.validate({
        claude_key_encrypted: 'encrypted_claude_key_data',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('OpenAI');
    });

    it('should validate both keys', () => {
      const result = AIKeysStageValidator.validate({
        openai_key_encrypted: 'encrypted_openai_key_data',
        claude_key_encrypted: 'encrypted_claude_key_data',
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeUndefined();
    });

    it('should reject when no keys provided', () => {
      const result = AIKeysStageValidator.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one AI key (OpenAI or Claude) is required');
    });

    it('should reject too short OpenAI key', () => {
      const result = AIKeysStageValidator.validate({
        openai_key_encrypted: 'short',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('OpenAI') && e.includes('too short'))).toBe(true);
    });

    it('should reject too short Claude key', () => {
      const result = AIKeysStageValidator.validate({
        claude_key_encrypted: 'short',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Claude') && e.includes('too short'))).toBe(true);
    });
  });

  describe('RegionStageValidator', () => {
    it('should validate correct region data', () => {
      const result = RegionStageValidator.validate({
        region: 'nyc',
        tier: 'starter',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing region', () => {
      const result = RegionStageValidator.validate({
        region: '',
        tier: 'starter',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Region is required');
    });

    it('should reject invalid region', () => {
      const result = RegionStageValidator.validate({
        region: 'invalid',
        tier: 'starter',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Region must be one of'))).toBe(true);
    });

    it('should reject missing tier', () => {
      const result = RegionStageValidator.validate({
        region: 'nyc',
        tier: undefined as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tier is required');
    });

    it('should reject invalid tier', () => {
      const result = RegionStageValidator.validate({
        region: 'nyc',
        tier: 'invalid' as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Tier must be one of'))).toBe(true);
    });

    it('should validate all valid regions', () => {
      const validRegions = ['nyc', 'sfo', 'lon', 'ams', 'sgp'];
      
      validRegions.forEach(region => {
        const result = RegionStageValidator.validate({
          region,
          tier: 'starter',
        });
        expect(result.valid).toBe(true);
      });
    });

    it('should validate all valid tiers', () => {
      const validTiers: Array<'starter' | 'professional' | 'scale' | 'enterprise'> = 
        ['starter', 'professional', 'scale', 'enterprise'];
      
      validTiers.forEach(tier => {
        const result = RegionStageValidator.validate({
          region: 'nyc',
          tier,
        });
        expect(result.valid).toBe(true);
      });
    });

    it('should return valid regions list', () => {
      const regions = RegionStageValidator.getValidRegions();
      expect(regions).toContain('nyc');
      expect(regions).toContain('lon');
    });

    it('should return valid tiers list', () => {
      const tiers = RegionStageValidator.getValidTiers();
      expect(tiers).toContain('starter');
      expect(tiers).toContain('enterprise');
    });

    it('should check if region is valid', () => {
      expect(RegionStageValidator.isValidRegion('nyc')).toBe(true);
      expect(RegionStageValidator.isValidRegion('invalid')).toBe(false);
    });

    it('should check if tier is valid', () => {
      expect(RegionStageValidator.isValidTier('starter')).toBe(true);
      expect(RegionStageValidator.isValidTier('invalid')).toBe(false);
    });
  });

  describe('IgniteStageValidator', () => {
    it('should validate correct ignite data', () => {
      const result = IgniteStageValidator.validate({
        user_confirmed: true,
        risk_check_passed: true,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject without user confirmation', () => {
      const result = IgniteStageValidator.validate({
        user_confirmed: false,
        risk_check_passed: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User must confirm to proceed with ignition');
    });

    it('should reject without risk check', () => {
      const result = IgniteStageValidator.validate({
        user_confirmed: true,
        risk_check_passed: undefined as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Risk check must be performed before ignition');
    });

    it('should accept when risk check passed is false', () => {
      const result = IgniteStageValidator.validate({
        user_confirmed: true,
        risk_check_passed: false,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject when risk check is null', () => {
      const result = IgniteStageValidator.validate({
        user_confirmed: true,
        risk_check_passed: null as any,
      });

      expect(result.valid).toBe(false);
    });
  });
});
