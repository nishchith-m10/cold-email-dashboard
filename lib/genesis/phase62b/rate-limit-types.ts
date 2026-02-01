/**
 * GENESIS PART VI - PHASE 62.B: ONBOARDING RATE LIMITING
 * Type definitions for rate limiting
 */

/**
 * Rate limit scope type
 */
export type RateLimitScope =
  | 'ip'              // Per IP address
  | 'email_domain'    // Per email domain
  | 'user'            // Per Clerk user
  | 'workspace';      // Per workspace

/**
 * Rate limit window
 */
export type RateLimitWindow = 'hourly' | 'daily' | 'per_operation';

/**
 * Rate limit type
 */
export type RateLimitType =
  | 'signup_per_ip'
  | 'signup_per_domain'
  | 'active_workspaces'
  | 'pending_ignitions'
  | 'csv_uploads'
  | 'leads_per_upload';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  type: RateLimitType;
  scope: RateLimitScope;
  window: RateLimitWindow;
  limit: number;
  description: string;
}

/**
 * Rate limit check request
 */
export interface RateLimitCheckRequest {
  type: RateLimitType;
  identifier: string;  // IP address, email domain, user ID, or workspace ID
  current_count?: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  reset_at: Date;
  blocked: boolean;
  message?: string;
}

/**
 * Rate limit counter
 */
export interface RateLimitCounter {
  key: string;
  count: number;
  window_start: Date;
  expires_at: Date;
}

/**
 * Rate limit enforcement result
 */
export interface RateLimitEnforcementResult {
  success: boolean;
  allowed: boolean;
  limit_type: RateLimitType;
  error?: string;
  check_result?: RateLimitCheckResult;
}

/**
 * Standard rate limit configurations
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  signup_per_ip: {
    type: 'signup_per_ip',
    scope: 'ip',
    window: 'hourly',
    limit: 3,
    description: 'Signups per IP address per hour',
  },
  signup_per_domain: {
    type: 'signup_per_domain',
    scope: 'email_domain',
    window: 'daily',
    limit: 10,
    description: 'Signups per email domain per day',
  },
  active_workspaces: {
    type: 'active_workspaces',
    scope: 'user',
    window: 'per_operation',
    limit: 5,
    description: 'Active workspaces per user',
  },
  pending_ignitions: {
    type: 'pending_ignitions',
    scope: 'user',
    window: 'per_operation',
    limit: 1,
    description: 'Pending ignitions per user',
  },
  csv_uploads: {
    type: 'csv_uploads',
    scope: 'workspace',
    window: 'hourly',
    limit: 5,
    description: 'CSV uploads per workspace per hour',
  },
  leads_per_upload: {
    type: 'leads_per_upload',
    scope: 'workspace',
    window: 'per_operation',
    limit: 5000,
    description: 'Leads per CSV upload',
  },
};
