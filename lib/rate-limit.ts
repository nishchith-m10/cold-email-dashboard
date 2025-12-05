/**
 * Simple in-memory rate limiter
 * 
 * For production with multiple server instances, use Redis-based rate limiting
 * (e.g., @upstash/ratelimit with Upstash Redis)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier for the client (IP, user ID, API key)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining count and reset time
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  const key = `${identifier}`;

  let entry = rateLimitStore.get(key);

  // Create new entry if none exists or window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    reset: entry.resetAt,
  };
}

/**
 * Rate limit headers to include in response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
  };
}

/**
 * Get client identifier from request
 * Uses IP address or forwarded headers
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - in development this might be empty
  return 'unknown';
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/** Standard API rate limit: 100 requests per minute */
export const RATE_LIMIT_STANDARD: RateLimitConfig = {
  limit: 100,
  windowSec: 60,
};

/** Strict rate limit for sensitive operations: 10 per minute */
export const RATE_LIMIT_STRICT: RateLimitConfig = {
  limit: 10,
  windowSec: 60,
};

/** Generous rate limit for read-only: 300 per minute */
export const RATE_LIMIT_READ: RateLimitConfig = {
  limit: 300,
  windowSec: 60,
};

/** Webhook rate limit: 1000 per minute (for n8n ingestion) */
export const RATE_LIMIT_WEBHOOK: RateLimitConfig = {
  limit: 1000,
  windowSec: 60,
};

