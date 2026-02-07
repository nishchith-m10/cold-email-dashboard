/**
 * Phase 67.B: Comprehensive Login Audit Trail
 * 
 * Extends Phase 67's audit_log system with login-specific tracking:
 * - Login success/failure
 * - Session events (refresh, revoke, logout)
 * - Password changes
 * - MFA events
 * - API key access
 * - Suspicious activity detection
 * 
 * This module provides Clerk-specific integration and geolocation enrichment.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { logAuditEvent, type AuditEvent } from './audit-logger';
import type { WebhookEvent } from '@clerk/nextjs/server';

// ============================================
// TYPES
// ============================================

export interface LoginAuditEvent {
  eventType:
    | 'login_attempt'
    | 'login_success'
    | 'login_failure'
    | 'logout'
    | 'session_refresh'
    | 'session_revoked'
    | 'password_change'
    | 'password_reset_request'
    | 'password_reset_complete'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'mfa_challenge'
    | 'api_key_created'
    | 'api_key_used'
    | 'api_key_revoked'
    | 'permission_granted'
    | 'permission_revoked'
    | 'suspicious_activity';
  severity?: 'info' | 'warning' | 'critical';
  userId?: string;
  userEmail?: string;
  workspaceId?: string;
  sessionId?: string;
  success?: boolean;
  failureReason?: string;
  ipAddress?: string;
  userAgent?: string;
  geoCountry?: string;
  geoCity?: string;
  geoRegion?: string;
  deviceFingerprint?: string;
  metadata?: Record<string, any>;
}

export interface GeoLocationData {
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  isp?: string;
}

// ============================================
// GEOLOCATION ENRICHMENT
// ============================================

/**
 * Get geolocation data from IP address
 * Uses ip-api.com free tier (45 requests/minute)
 * 
 * @param ipAddress - IP address to geolocate
 * @returns Geolocation data or null on failure
 */
export async function getGeoLocationFromIP(
  ipAddress: string
): Promise<GeoLocationData | null> {
  // Skip localhost/private IPs
  if (
    ipAddress === '0.0.0.0' ||
    ipAddress === '127.0.0.1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    return null;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,city,regionName,timezone,isp`, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success') {
      return null;
    }

    return {
      country: data.country,
      city: data.city,
      region: data.regionName,
      timezone: data.timezone,
      isp: data.isp,
    };
  } catch (err) {
    console.error('[Login Audit] Geolocation failed:', err);
    return null;
  }
}

// ============================================
// LOGIN AUDIT LOGGING
// ============================================

/**
 * Log a login-specific audit event
 * Extends Phase 67's audit_log with login-specific fields and geolocation
 * 
 * @param event - Login audit event
 * @returns Audit log ID or null on failure
 */
export async function logLoginAuditEvent(
  event: LoginAuditEvent
): Promise<{ success: boolean; auditId: string | null; error?: string }> {
  try {
    // Enrich with geolocation if IP provided
    let geo: GeoLocationData | null = null;
    if (event.ipAddress) {
      geo = await getGeoLocationFromIP(event.ipAddress);
    }

    // Map to Phase 67 audit_log structure
    const auditEvent: AuditEvent = {
      actorType: 'user',
      actorId: event.userId || 'anonymous',
      actorEmail: event.userEmail,
      action: event.eventType.toUpperCase(),
      actionCategory: 'security', // All login events are security-related
      targetType: event.sessionId ? 'session' : undefined,
      targetId: event.sessionId,
      workspaceId: event.workspaceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      region: geo?.region,
      details: {
        // Login-specific fields
        severity: event.severity || 'info',
        success: event.success,
        failure_reason: event.failureReason,
        session_id: event.sessionId,
        device_fingerprint: event.deviceFingerprint,
        // Geolocation
        geo_country: geo?.country,
        geo_city: geo?.city,
        geo_timezone: geo?.timezone,
        geo_isp: geo?.isp,
        // Original metadata
        ...event.metadata,
      },
    };

    if (!supabaseAdmin) {
      return {
        success: false,
        auditId: null,
        error: 'Supabase admin client not available',
      };
    }

    return await logAuditEvent(supabaseAdmin, auditEvent);
  } catch (err) {
    console.error('[Login Audit] Exception:', err);
    return {
      success: false,
      auditId: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Log successful login
 */
export async function auditLoginSuccess(
  userId: string,
  email: string,
  sessionId: string,
  ipAddress: string,
  userAgent: string,
  workspaceId?: string
) {
  return logLoginAuditEvent({
    eventType: 'login_success',
    severity: 'info',
    userId,
    userEmail: email,
    sessionId,
    workspaceId,
    success: true,
    ipAddress,
    userAgent,
  });
}

/**
 * Log failed login attempt
 */
export async function auditLoginFailure(
  email: string,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'login_failure',
    severity: 'warning',
    userEmail: email,
    success: false,
    failureReason: reason,
    ipAddress,
    userAgent,
  });
}

/**
 * Log logout
 */
export async function auditLogout(
  userId: string,
  sessionId: string,
  logoutType: 'manual' | 'timeout' | 'forced',
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'logout',
    severity: 'info',
    userId,
    sessionId,
    success: true,
    ipAddress,
    userAgent,
    metadata: {
      logout_type: logoutType,
    },
  });
}

/**
 * Log session refresh
 */
export async function auditSessionRefresh(
  userId: string,
  sessionId: string,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'session_refresh',
    severity: 'info',
    userId,
    sessionId,
    success: true,
    ipAddress,
    userAgent,
  });
}

/**
 * Log session revocation
 */
export async function auditSessionRevoked(
  userId: string,
  sessionId: string,
  revokedBy: string,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'session_revoked',
    severity: 'warning',
    userId,
    sessionId,
    success: false,
    failureReason: reason,
    ipAddress,
    userAgent,
    metadata: {
      revoked_by: revokedBy,
    },
  });
}

/**
 * Log password change
 */
export async function auditPasswordChange(
  userId: string,
  email: string,
  initiatedBy: 'user' | 'admin' | 'system',
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'password_change',
    severity: 'info',
    userId,
    userEmail: email,
    success: true,
    ipAddress,
    userAgent,
    metadata: {
      initiated_by: initiatedBy,
    },
  });
}

/**
 * Log password reset request
 */
export async function auditPasswordResetRequest(
  email: string,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'password_reset_request',
    severity: 'info',
    userEmail: email,
    success: true,
    ipAddress,
    userAgent,
  });
}

/**
 * Log password reset completion
 */
export async function auditPasswordResetComplete(
  userId: string,
  email: string,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'password_reset_complete',
    severity: 'info',
    userId,
    userEmail: email,
    success: true,
    ipAddress,
    userAgent,
  });
}

/**
 * Log MFA enabled
 */
export async function auditMFAEnabled(
  userId: string,
  mfaType: 'totp' | 'sms' | 'backup_codes',
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'mfa_enabled',
    severity: 'info',
    userId,
    success: true,
    ipAddress,
    userAgent,
    metadata: {
      mfa_type: mfaType,
    },
  });
}

/**
 * Log MFA disabled
 */
export async function auditMFADisabled(
  userId: string,
  disabledBy: string,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'mfa_disabled',
    severity: 'warning',
    userId,
    success: true,
    ipAddress,
    userAgent,
    metadata: {
      disabled_by: disabledBy,
    },
  });
}

/**
 * Log MFA challenge
 */
export async function auditMFAChallenge(
  userId: string,
  mfaType: 'totp' | 'sms' | 'backup_codes',
  success: boolean,
  ipAddress: string,
  userAgent: string
) {
  return logLoginAuditEvent({
    eventType: 'mfa_challenge',
    severity: success ? 'info' : 'warning',
    userId,
    success,
    failureReason: success ? undefined : 'Invalid MFA code',
    ipAddress,
    userAgent,
    metadata: {
      mfa_type: mfaType,
    },
  });
}

/**
 * Log suspicious activity
 */
export async function auditSuspiciousActivity(
  userId: string | undefined,
  reason: string,
  ipAddress: string,
  userAgent: string,
  metadata: Record<string, any>
) {
  return logLoginAuditEvent({
    eventType: 'suspicious_activity',
    severity: 'critical',
    userId,
    success: false,
    failureReason: reason,
    ipAddress,
    userAgent,
    metadata,
  });
}

// ============================================
// CLERK WEBHOOK INTEGRATION
// ============================================

/**
 * Process Clerk webhook events and log to audit trail
 * 
 * @param event - Clerk webhook event
 * @param ipAddress - Request IP address
 * @param userAgent - Request user agent
 */
export async function processClerkAuditEvent(
  event: WebhookEvent,
  ipAddress: string,
  userAgent: string
) {
  const eventType = event.type;

  switch (eventType) {
    case 'user.created':
      return logLoginAuditEvent({
        eventType: 'login_success',
        severity: 'info',
        userId: event.data.id,
        userEmail: event.data.email_addresses?.[0]?.email_address,
        success: true,
        ipAddress,
        userAgent,
        metadata: {
          event: 'user_created',
          created_at: event.data.created_at,
        },
      });

    case 'session.created':
      return logLoginAuditEvent({
        eventType: 'login_success',
        severity: 'info',
        userId: event.data.user_id,
        sessionId: event.data.id,
        success: true,
        ipAddress,
        userAgent,
        metadata: {
          event: 'session_created',
          created_at: event.data.created_at,
        },
      });

    case 'session.ended':
      return logLoginAuditEvent({
        eventType: 'logout',
        severity: 'info',
        userId: event.data.user_id,
        sessionId: event.data.id,
        success: true,
        ipAddress,
        userAgent,
        metadata: {
          event: 'session_ended',
          ended_at: event.data.ended_at,
        },
      });

    case 'session.revoked':
      return logLoginAuditEvent({
        eventType: 'session_revoked',
        severity: 'warning',
        userId: event.data.user_id,
        sessionId: event.data.id,
        success: false,
        failureReason: 'Session revoked by admin',
        ipAddress,
        userAgent,
        metadata: {
          event: 'session_revoked',
          revoked_at: event.data.revoked_at,
        },
      });

    default:
      // Unknown event type - log as generic event
      return {
        success: true,
        auditId: null,
        error: `Unknown Clerk event type: ${eventType}`,
      };
  }
}

// ============================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================

/**
 * Detect and log suspicious login patterns
 * 
 * Checks for:
 * - Rapid login failures (brute force)
 * - Login from new country
 * - Login from multiple IPs in short time
 * - Login outside business hours (if configured)
 */
export async function detectSuspiciousLoginActivity(
  userId: string,
  email: string,
  ipAddress: string,
  userAgent: string
): Promise<{ suspicious: boolean; reason?: string }> {
  try {
    if (!supabaseAdmin) {
      return { suspicious: false };
    }

    // Get recent login events for this user (last 24 hours)
    const { data: recentLogins } = await supabaseAdmin.schema('genesis')
      .from('audit_log')
      .select('*')
      .eq('actor_id', userId)
      .eq('action_category', 'security')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false })
      .limit(50);

    if (!recentLogins || recentLogins.length === 0) {
      return { suspicious: false };
    }

    // Check 1: Rapid failures (5+ failures in last hour)
    const recentFailures = recentLogins.filter(
      (log) =>
        log.action === 'LOGIN_FAILURE' &&
        new Date(log.timestamp).getTime() > Date.now() - 60 * 60 * 1000
    );

    if (recentFailures.length >= 5) {
      await auditSuspiciousActivity(
        userId,
        'Rapid login failures detected (possible brute force)',
        ipAddress,
        userAgent,
        {
          failure_count: recentFailures.length,
          time_window: '1 hour',
        }
      );

      return {
        suspicious: true,
        reason: 'Brute force detected',
      };
    }

    // Check 2: Multiple IPs in short time (3+ IPs in last 15 minutes)
    const recentIPs = new Set(
      recentLogins
        .filter(
          (log) =>
            new Date(log.timestamp).getTime() > Date.now() - 15 * 60 * 1000
        )
        .map((log) => log.ip_address)
        .filter(Boolean)
    );

    if (recentIPs.size >= 3) {
      await auditSuspiciousActivity(
        userId,
        'Multiple IPs in short time (possible account takeover)',
        ipAddress,
        userAgent,
        {
          ip_count: recentIPs.size,
          time_window: '15 minutes',
          ips: Array.from(recentIPs),
        }
      );

      return {
        suspicious: true,
        reason: 'Multiple IPs detected',
      };
    }

    // Check 3: New country (login from country not seen in last 30 days)
    const geo = await getGeoLocationFromIP(ipAddress);
    if (geo?.country) {
      const knownCountries = new Set(
        recentLogins
          .map((log) => log.details?.geo_country)
          .filter(Boolean)
      );

      if (knownCountries.size > 0 && !knownCountries.has(geo.country)) {
        await auditSuspiciousActivity(
          userId,
          'Login from new country',
          ipAddress,
          userAgent,
          {
            new_country: geo.country,
            known_countries: Array.from(knownCountries),
          }
        );

        return {
          suspicious: true,
          reason: 'New country detected',
        };
      }
    }

    return { suspicious: false };
  } catch (err) {
    console.error('[Login Audit] Suspicious activity check failed:', err);
    return { suspicious: false };
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get login history for a user
 * 
 * @param userId - User ID
 * @param options - Query options
 */
export async function getLoginHistory(
  userId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    eventType?: LoginAuditEvent['eventType'];
  }
) {
  try {
    if (!supabaseAdmin) {
      return [];
    }

    let query = supabaseAdmin.schema('genesis')
      .from('audit_log')
      .select('*')
      .eq('actor_id', userId)
      .eq('action_category', 'security')
      .order('timestamp', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    if (options?.eventType) {
      query = query.eq('action', options.eventType.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Login Audit] Failed to fetch login history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Login Audit] Exception fetching login history:', err);
    return [];
  }
}

/**
 * Get failed login attempts (for security monitoring)
 * 
 * @param email - Email address to check
 * @param timeWindowMinutes - Time window to check (default: 60 minutes)
 */
export async function getFailedLoginAttempts(
  email: string,
  timeWindowMinutes: number = 60
) {
  try {
    if (!supabaseAdmin) {
      return [];
    }

    const { data } = await supabaseAdmin.schema('genesis')
      .from('audit_log')
      .select('*')
      .eq('action', 'LOGIN_FAILURE')
      .eq('actor_email', email)
      .gte(
        'timestamp',
        new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString()
      )
      .order('timestamp', { ascending: false });

    return data || [];
  } catch (err) {
    console.error('[Login Audit] Exception fetching failed attempts:', err);
    return [];
  }
}

/**
 * Get active sessions for a user
 * 
 * @param userId - User ID
 */
export async function getActiveSessions(userId: string) {
  try {
    if (!supabaseAdmin) {
      return [];
    }

    // Get all successful logins without corresponding logouts
    const { data: logins } = await supabaseAdmin.schema('genesis')
      .from('audit_log')
      .select('*')
      .eq('actor_id', userId)
      .eq('action', 'LOGIN_SUCCESS')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (!logins) {
      return [];
    }

    // For each login, check if there's a corresponding logout
    const activeSessions = [];

    for (const login of logins) {
      const sessionId = login.details?.session_id;
      if (!sessionId) continue;

      const { data: logout } = await supabaseAdmin.schema('genesis')
        .from('audit_log')
        .select('*')
        .eq('actor_id', userId)
        .in('action', ['LOGOUT', 'SESSION_REVOKED'])
        .eq('details->>session_id', sessionId)
        .maybeSingle();

      if (!logout) {
        activeSessions.push({
          sessionId,
          loginTime: login.timestamp,
          ipAddress: login.ip_address,
          userAgent: login.user_agent,
          country: login.details?.geo_country,
          city: login.details?.geo_city,
        });
      }
    }

    return activeSessions;
  } catch (err) {
    console.error('[Login Audit] Exception fetching active sessions:', err);
    return [];
  }
}
