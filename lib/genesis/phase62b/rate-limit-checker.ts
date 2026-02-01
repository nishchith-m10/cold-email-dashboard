/**
 * GENESIS PART VI - PHASE 62.B: ONBOARDING RATE LIMITING
 * Rate Limit Checker
 * 
 * Checks and enforces rate limits
 */

import type {
  RateLimitType,
  RateLimitCheckRequest,
  RateLimitCheckResult,
  RateLimitCounter,
} from './rate-limit-types';
import { RATE_LIMIT_CONFIGS } from './rate-limit-types';
import { RateLimitKeyGenerator } from './rate-limit-key-generator';

/**
 * Rate Limit Checker
 * Validates operations against configured rate limits
 */
export class RateLimitChecker {
  /**
   * Check if operation is within rate limit
   */
  static checkLimit(request: RateLimitCheckRequest): RateLimitCheckResult {
    const config = RATE_LIMIT_CONFIGS[request.type];
    const currentCount = request.current_count ?? 0;
    const remaining = Math.max(0, config.limit - currentCount);
    
    // For "leads_per_upload", current_count is the size of THIS operation (inclusive check)
    // For other limits, current_count is how many operations already done (exclusive check)
    const allowed = request.type === 'leads_per_upload'
      ? currentCount <= config.limit
      : currentCount < config.limit;
    
    const blocked = !allowed;

    // Calculate reset time based on window
    const resetAt = this.calculateResetTime(config.window);

    const result: RateLimitCheckResult = {
      allowed,
      limit: config.limit,
      current: currentCount,
      remaining,
      reset_at: resetAt,
      blocked,
    };

    if (blocked) {
      result.message = this.generateBlockedMessage(request.type, config.limit, resetAt);
    }

    return result;
  }

  /**
   * Generate blocked message
   */
  private static generateBlockedMessage(
    type: RateLimitType,
    limit: number,
    resetAt: Date
  ): string {
    const config = RATE_LIMIT_CONFIGS[type];
    const timeUntilReset = this.formatTimeUntilReset(resetAt);

    const messages: Record<RateLimitType, string> = {
      signup_per_ip: `Too many signups from this IP address. Limit: ${limit} per hour. Try again ${timeUntilReset}.`,
      signup_per_domain: `Too many signups from this email domain. Limit: ${limit} per day. Try again ${timeUntilReset}.`,
      active_workspaces: `Maximum ${limit} active workspaces allowed. Please delete unused workspaces before creating new ones.`,
      pending_ignitions: `Only ${limit} pending ignition allowed at a time. Complete or cancel existing ignition first.`,
      csv_uploads: `Maximum ${limit} CSV uploads per hour. Try again ${timeUntilReset}.`,
      leads_per_upload: `Maximum ${limit} leads per upload. Please reduce file size and try again.`,
    };

    return messages[type];
  }

  /**
   * Format time until reset
   */
  private static formatTimeUntilReset(resetAt: Date): string {
    const now = new Date();
    const diff = resetAt.getTime() - now.getTime();

    if (diff <= 0) {
      return 'now';
    }

    const minutes = Math.ceil(diff / (60 * 1000));
    const hours = Math.floor(minutes / 60);

    if (hours > 24) {
      const days = Math.ceil(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    }

    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  /**
   * Calculate reset time based on window
   */
  private static calculateResetTime(window: 'hourly' | 'daily' | 'per_operation'): Date {
    const now = new Date();
    const reset = new Date(now);

    switch (window) {
      case 'hourly':
        reset.setHours(reset.getHours() + 1);
        reset.setMinutes(0);
        reset.setSeconds(0);
        reset.setMilliseconds(0);
        break;

      case 'daily':
        reset.setDate(reset.getDate() + 1);
        reset.setHours(0);
        reset.setMinutes(0);
        reset.setSeconds(0);
        reset.setMilliseconds(0);
        break;

      case 'per_operation':
        // No automatic reset
        reset.setFullYear(reset.getFullYear() + 1);
        break;
    }

    return reset;
  }

  /**
   * Check signup rate limit by IP
   */
  static checkSignupByIP(ipAddress: string, currentCount: number): RateLimitCheckResult {
    return this.checkLimit({
      type: 'signup_per_ip',
      identifier: RateLimitKeyGenerator.normalizeIP(ipAddress),
      current_count: currentCount,
    });
  }

  /**
   * Check signup rate limit by email domain
   */
  static checkSignupByDomain(emailDomain: string, currentCount: number): RateLimitCheckResult {
    return this.checkLimit({
      type: 'signup_per_domain',
      identifier: emailDomain.toLowerCase(),
      current_count: currentCount,
    });
  }

  /**
   * Check active workspaces limit
   */
  static checkActiveWorkspaces(userId: string, currentCount: number): RateLimitCheckResult {
    return this.checkLimit({
      type: 'active_workspaces',
      identifier: userId,
      current_count: currentCount,
    });
  }

  /**
   * Check pending ignitions limit
   */
  static checkPendingIgnitions(userId: string, currentCount: number): RateLimitCheckResult {
    return this.checkLimit({
      type: 'pending_ignitions',
      identifier: userId,
      current_count: currentCount,
    });
  }

  /**
   * Check CSV uploads limit
   */
  static checkCsvUploads(workspaceId: string, currentCount: number): RateLimitCheckResult {
    return this.checkLimit({
      type: 'csv_uploads',
      identifier: workspaceId,
      current_count: currentCount,
    });
  }

  /**
   * Check leads per upload limit
   */
  static checkLeadsPerUpload(leadCount: number): RateLimitCheckResult {
    return this.checkLimit({
      type: 'leads_per_upload',
      identifier: 'upload',
      current_count: leadCount,
    });
  }

  /**
   * Get rate limit config
   */
  static getConfig(type: RateLimitType) {
    return RATE_LIMIT_CONFIGS[type];
  }

  /**
   * Get all rate limit configs
   */
  static getAllConfigs() {
    return RATE_LIMIT_CONFIGS;
  }

  /**
   * Check if counter has expired
   */
  static isCounterExpired(counter: RateLimitCounter): boolean {
    return counter.expires_at < new Date();
  }

  /**
   * Increment counter
   */
  static incrementCounter(counter: RateLimitCounter): RateLimitCounter {
    return {
      ...counter,
      count: counter.count + 1,
    };
  }

  /**
   * Create new counter
   */
  static createCounter(
    key: string,
    window: 'hourly' | 'daily' | 'per_operation'
  ): RateLimitCounter {
    const now = new Date();
    const expiresAt = RateLimitKeyGenerator.calculateExpiry(now, window);

    return {
      key,
      count: 1,
      window_start: now,
      expires_at: expiresAt,
    };
  }

  /**
   * Format rate limit info for display
   */
  static formatLimitInfo(type: RateLimitType): string {
    const config = RATE_LIMIT_CONFIGS[type];
    return `${config.description}: ${config.limit}`;
  }
}
