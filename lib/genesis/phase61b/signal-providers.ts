/**
 * GENESIS PART VI - PHASE 60.A: RISK-BASED WARNING SYSTEM
 * Signal Providers for Risk Assessment
 */

import { SignalProviderResult, RISK_SCORES } from './risk-types';

/**
 * Hardcoded list of known disposable email domains (free fallback)
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'maildrop.cc',
  'trashmail.com',
  'getnada.com',
]);

/**
 * Email Domain Signal Provider
 * Detects disposable/temporary email domains
 */
export class EmailDomainProvider {
  /**
   * Check if email domain is disposable
   */
  static async assess(email: string): Promise<SignalProviderResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      return {
        score: 0,
        detected: false,
        reason: 'Invalid email format',
        provider: 'EmailDomainProvider',
      };
    }

    // Check against hardcoded blocklist
    const isDisposable = DISPOSABLE_EMAIL_DOMAINS.has(domain);

    if (isDisposable) {
      return {
        score: RISK_SCORES.DISPOSABLE_EMAIL,
        detected: true,
        reason: `Disposable email domain: ${domain}`,
        provider: 'EmailDomainProvider (blocklist)',
      };
    }

    return {
      score: 0,
      detected: false,
      reason: 'Professional email domain',
      provider: 'EmailDomainProvider',
    };
  }

  /**
   * Add custom domain to blocklist (for testing/admin override)
   */
  static addToBlocklist(domain: string): void {
    DISPOSABLE_EMAIL_DOMAINS.add(domain.toLowerCase());
  }

  /**
   * Check if domain is in blocklist
   */
  static isBlocked(domain: string): boolean {
    return DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase());
  }
}

/**
 * IP Reputation Signal Provider
 * Detects VPN/proxy/datacenter IPs using ASN analysis
 */
export class IPReputationProvider {
  /**
   * Known VPN/hosting provider ASNs (autonomous system numbers)
   * In production, this would query MaxMind or IP Quality Score API
   */
  private static readonly VPN_DATACENTER_PATTERNS = [
    /^(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\./,  // Private IPs
    /^(?:digitalocean|aws|azure|google|cloudflare)/i,    // Cloud providers
  ];

  /**
   * Assess IP reputation
   */
  static async assess(ipAddress: string): Promise<SignalProviderResult> {
    // Basic validation
    if (!ipAddress || ipAddress === 'unknown') {
      return {
        score: 0,
        detected: false,
        reason: 'IP address unavailable',
        provider: 'IPReputationProvider',
      };
    }

    // Check if private/local IP
    if (this.VPN_DATACENTER_PATTERNS[0].test(ipAddress)) {
      return {
        score: 0,
        detected: false,
        reason: 'Private/local IP (development)',
        provider: 'IPReputationProvider',
      };
    }

    // In production: Query IP reputation API
    // For now: Simple pattern matching (mock)
    const suspiciousPatterns = ['vpn', 'proxy', 'tor', 'datacenter'];
    const isSuspicious = suspiciousPatterns.some(pattern => 
      ipAddress.toLowerCase().includes(pattern)
    );

    if (isSuspicious) {
      return {
        score: RISK_SCORES.VPN_PROXY,
        detected: true,
        reason: 'VPN/proxy detected',
        provider: 'IPReputationProvider (ASN)',
      };
    }

    return {
      score: 0,
      detected: false,
      reason: 'Clean IP reputation',
      provider: 'IPReputationProvider',
    };
  }
}

/**
 * Signup Frequency Signal Provider
 * Detects multiple signups from same IP in short timeframe
 */
export class SignupFrequencyProvider {
  // In-memory cache for demo (production: Redis)
  private static signupCache = new Map<string, number[]>();
  private static readonly THRESHOLD_COUNT = 3;
  private static readonly TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Assess signup frequency from IP
   */
  static async assess(ipAddress: string): Promise<SignalProviderResult> {
    const now = Date.now();
    
    // Get or initialize signup timestamps for this IP
    let timestamps = this.signupCache.get(ipAddress) || [];
    
    // Filter out old timestamps (outside time window)
    timestamps = timestamps.filter(ts => now - ts < this.TIME_WINDOW_MS);
    
    // Add current signup
    timestamps.push(now);
    this.signupCache.set(ipAddress, timestamps);

    // Check if exceeds threshold
    if (timestamps.length >= this.THRESHOLD_COUNT) {
      return {
        score: RISK_SCORES.SIGNUP_FREQUENCY_ABUSE,
        detected: true,
        reason: `${timestamps.length} signups from same IP in 24h`,
        provider: 'SignupFrequencyProvider',
      };
    }

    return {
      score: 0,
      detected: false,
      reason: 'Normal signup frequency',
      provider: 'SignupFrequencyProvider',
    };
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.signupCache.clear();
  }

  /**
   * Get signup count for IP
   */
  static getSignupCount(ipAddress: string): number {
    const now = Date.now();
    const timestamps = this.signupCache.get(ipAddress) || [];
    return timestamps.filter(ts => now - ts < this.TIME_WINDOW_MS).length;
  }
}

/**
 * Tier Appropriateness Signal Provider
 * Detects unusual tier selection (e.g., Enterprise on day 1)
 */
export class TierAppropriatenessProvider {
  /**
   * Assess if tier selection is appropriate for new user
   */
  static async assess(
    tier: 'starter' | 'professional' | 'scale' | 'enterprise'
  ): Promise<SignalProviderResult> {
    // Enterprise tier on day 1 is unusual
    if (tier === 'enterprise') {
      return {
        score: RISK_SCORES.ENTERPRISE_DAY_ONE,
        detected: true,
        reason: 'Enterprise tier selected on first signup',
        provider: 'TierAppropriatenessProvider',
      };
    }

    return {
      score: 0,
      detected: false,
      reason: 'Appropriate tier for new user',
      provider: 'TierAppropriatenessProvider',
    };
  }
}

/**
 * Credential Validation Signal Provider
 * Validates API keys work correctly
 */
export class CredentialValidationProvider {
  /**
   * Validate credentials (mock implementation)
   * In production: Make actual API calls to OpenAI/Claude
   */
  static async assess(
    openaiKey?: string,
    claudeKey?: string
  ): Promise<SignalProviderResult> {
    let failureCount = 0;
    const failures: string[] = [];

    // Validate OpenAI key format
    if (openaiKey) {
      const isValidFormat = /^sk-[A-Za-z0-9]{48}$/.test(openaiKey);
      if (!isValidFormat) {
        failureCount++;
        failures.push('Invalid OpenAI key format');
      }
    }

    // Validate Claude key format
    if (claudeKey) {
      const isValidFormat = /^sk-ant-[A-Za-z0-9\-_]{40,}$/.test(claudeKey);
      if (!isValidFormat) {
        failureCount++;
        failures.push('Invalid Claude key format');
      }
    }

    // If both keys provided and both failed validation
    if (failureCount > 0 && (openaiKey || claudeKey)) {
      return {
        score: RISK_SCORES.CREDENTIAL_VALIDATION_FAILURE,
        detected: true,
        reason: failures.join(', '),
        provider: 'CredentialValidationProvider',
      };
    }

    return {
      score: 0,
      detected: false,
      reason: 'Credentials validated successfully',
      provider: 'CredentialValidationProvider',
    };
  }
}

/**
 * Region Mismatch Signal Provider
 * Detects suspicious region/locale combinations with VPN
 */
export class RegionMismatchProvider {
  /**
   * Assess region/locale/VPN combination
   */
  static async assess(
    selectedRegion: string,
    userLocale: string | undefined,
    vpnDetected: boolean
  ): Promise<SignalProviderResult> {
    // No mismatch detection if no locale info
    if (!userLocale) {
      return {
        score: 0,
        detected: false,
        reason: 'No user locale available',
        provider: 'RegionMismatchProvider',
      };
    }

    // Extract region from locale (e.g., "en-US" -> "US")
    const localeRegion = userLocale.split('-')[1]?.toUpperCase();
    
    // Simple mismatch detection (e.g., US user selecting EU region)
    const regionMap: Record<string, string[]> = {
      'nyc': ['US', 'CA'],
      'sfo': ['US', 'CA'],
      'lon': ['GB', 'UK'],
      'ams': ['NL', 'DE', 'FR'],
      'sgp': ['SG', 'MY', 'ID'],
    };

    const expectedRegions = regionMap[selectedRegion.toLowerCase()] || [];
    const isMismatch = localeRegion && !expectedRegions.includes(localeRegion);

    // Only flag if mismatch + VPN
    if (isMismatch && vpnDetected) {
      return {
        score: RISK_SCORES.REGION_MISMATCH,
        detected: true,
        reason: `Region mismatch (${localeRegion} user selected ${selectedRegion}) + VPN`,
        provider: 'RegionMismatchProvider',
      };
    }

    return {
      score: 0,
      detected: false,
      reason: 'Region matches user locale',
      provider: 'RegionMismatchProvider',
    };
  }
}
