/**
 * GENESIS PART VI - PHASE 60.B: GENESIS GATEWAY STREAMLINED ONBOARDING
 * Stage Validators
 * 
 * Validates user input for each onboarding stage
 */

import {
  BrandStageData,
  EmailStageData,
  AIKeysStageData,
  RegionStageData,
  IgniteStageData,
  StageValidationResult,
} from './onboarding-types';

/**
 * Brand Stage Validator
 */
export class BrandStageValidator {
  static validate(data: BrandStageData): StageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate company name
    if (!data.company_name || data.company_name.trim().length === 0) {
      errors.push('Company name is required');
    } else if (data.company_name.trim().length < 2) {
      errors.push('Company name must be at least 2 characters');
    } else if (data.company_name.trim().length > 100) {
      errors.push('Company name must be less than 100 characters');
    }

    // Validate website URL
    if (!data.website_url || data.website_url.trim().length === 0) {
      errors.push('Website URL is required');
    } else {
      try {
        const url = new URL(data.website_url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('Website URL must use HTTP or HTTPS protocol');
        }
      } catch {
        errors.push('Website URL is invalid');
      }
    }

    // Warning for localhost URLs (development)
    if (data.website_url && data.website_url.includes('localhost')) {
      warnings.push('Using localhost URL - this is only for development');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Normalize website URL (add https:// if missing)
   */
  static normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }
}

/**
 * Email Stage Validator
 */
export class EmailStageValidator {
  static validate(data: EmailStageData): StageValidationResult {
    const errors: string[] = [];

    // Validate Gmail email
    if (!data.gmail_email || data.gmail_email.trim().length === 0) {
      errors.push('Gmail email is required');
    } else if (!data.gmail_email.includes('@')) {
      errors.push('Invalid email format');
    } else if (!data.gmail_email.toLowerCase().endsWith('@gmail.com')) {
      errors.push('Email must be a Gmail address (@gmail.com)');
    }

    // Validate OAuth tokens
    if (!data.oauth_tokens_encrypted || data.oauth_tokens_encrypted.trim().length === 0) {
      errors.push('OAuth tokens are required');
    }

    // Validate connection timestamp
    if (!data.connected_at) {
      errors.push('Connection timestamp is required');
    } else if (data.connected_at > new Date()) {
      errors.push('Connection timestamp cannot be in the future');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * AI Keys Stage Validator
 */
export class AIKeysStageValidator {
  static validate(data: AIKeysStageData): StageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // At least one key must be provided
    if (!data.openai_key_encrypted && !data.claude_key_encrypted) {
      errors.push('At least one AI key (OpenAI or Claude) is required');
    }

    // Validate OpenAI key format (if provided)
    if (data.openai_key_encrypted && data.openai_key_encrypted.length < 10) {
      errors.push('OpenAI key appears to be invalid (too short)');
    }

    // Validate Claude key format (if provided)
    if (data.claude_key_encrypted && data.claude_key_encrypted.length < 10) {
      errors.push('Claude key appears to be invalid (too short)');
    }

    // Warning if only one key provided
    if (data.openai_key_encrypted && !data.claude_key_encrypted) {
      warnings.push('Consider adding Claude API key for fallback redundancy');
    } else if (data.claude_key_encrypted && !data.openai_key_encrypted) {
      warnings.push('Consider adding OpenAI API key for fallback redundancy');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/**
 * Region Stage Validator
 */
export class RegionStageValidator {
  private static readonly VALID_REGIONS = ['nyc', 'sfo', 'lon', 'ams', 'sgp'] as const;
  private static readonly VALID_TIERS = ['starter', 'professional', 'scale', 'enterprise'] as const;

  static validate(data: RegionStageData): StageValidationResult {
    const errors: string[] = [];

    // Validate region
    if (!data.region || data.region.trim().length === 0) {
      errors.push('Region is required');
    } else if (!this.VALID_REGIONS.includes(data.region as any)) {
      errors.push(`Region must be one of: ${this.VALID_REGIONS.join(', ')}`);
    }

    // Validate tier
    if (!data.tier) {
      errors.push('Tier is required');
    } else if (!this.VALID_TIERS.includes(data.tier)) {
      errors.push(`Tier must be one of: ${this.VALID_TIERS.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static getValidRegions(): readonly string[] {
    return this.VALID_REGIONS;
  }

  static getValidTiers(): readonly string[] {
    return this.VALID_TIERS;
  }

  static isValidRegion(region: string): boolean {
    return this.VALID_REGIONS.includes(region as any);
  }

  static isValidTier(tier: string): boolean {
    return this.VALID_TIERS.includes(tier as any);
  }
}

/**
 * Ignite Stage Validator
 */
export class IgniteStageValidator {
  static validate(data: IgniteStageData): StageValidationResult {
    const errors: string[] = [];

    // User must confirm
    if (!data.user_confirmed) {
      errors.push('User must confirm to proceed with ignition');
    }

    // Risk check must pass (or at least be performed)
    if (data.risk_check_passed === undefined || data.risk_check_passed === null) {
      errors.push('Risk check must be performed before ignition');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
