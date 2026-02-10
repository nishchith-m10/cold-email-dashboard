/**
 * GENESIS PHASE 71: DIAGNOSTIC ENGINE
 *
 * Maps health check failures to actionable diagnostic guides.
 * Each service has a set of known error patterns with step-by-step
 * fix instructions, estimated time, and prevention tips.
 */

import {
  DiagnosticGuide,
  DiagnosticStep,
  HealthCheckResult,
  CriticalityLevel,
  ServiceHealth,
} from './types';

// ============================================
// ERROR PATTERN → DIAGNOSTIC MAPPING
// ============================================

interface ErrorPattern {
  /** Substring or regex to match against result.error */
  pattern: string | RegExp;
  /** The diagnostic guide to return */
  guide: Omit<DiagnosticGuide, 'serviceId' | 'serviceName' | 'fixPath'>;
}

const SERVICE_DIAGNOSTICS: Record<string, ErrorPattern[]> = {
  openai: [
    {
      pattern: /invalid api key/i,
      guide: {
        issue: 'Invalid or expired API key',
        severity: 'critical',
        impact: 'All AI-powered email personalisation is disabled',
        diagnosticSteps: [
          { step: 1, action: 'verify_key', description: 'Go to https://platform.openai.com/api-keys', automated: false },
          { step: 2, action: 'create_key', description: 'Create a new API key or copy existing one', automated: false },
          { step: 3, action: 'update_settings', description: 'Update key in Settings > API Keys > OpenAI', automated: false },
          { step: 4, action: 'test_connection', description: 'Click "Test Connection" to verify', automated: true },
        ],
        estimatedFixTime: '5 minutes',
        preventionTips: [
          'Set up API key rotation alerts in OpenAI dashboard',
          'Store keys in a secrets manager, not .env files',
          'Monitor OpenAI billing to prevent auto-revocation',
        ],
      },
    },
    {
      pattern: /rate limit/i,
      guide: {
        issue: 'Rate limit exceeded',
        severity: 'high',
        impact: 'Email generation may be delayed or use fallback models',
        diagnosticSteps: [
          { step: 1, action: 'check_usage', description: 'Check usage at https://platform.openai.com/usage', automated: false },
          { step: 2, action: 'check_tier', description: 'Verify your usage tier allows sufficient RPM', automated: false },
          { step: 3, action: 'wait_or_upgrade', description: 'Wait for reset (usually 1 min) or upgrade plan', automated: false },
        ],
        estimatedFixTime: '1-10 minutes',
        preventionTips: [
          'Implement request queuing with exponential backoff',
          'Upgrade to a higher usage tier for production',
          'Use model fallback (GPT-4 → GPT-3.5) under load',
        ],
      },
    },
    {
      pattern: /not configured/i,
      guide: {
        issue: 'API key not configured',
        severity: 'critical',
        impact: 'No AI features available',
        diagnosticSteps: [
          { step: 1, action: 'get_key', description: 'Sign up at https://platform.openai.com and create an API key', automated: false },
          { step: 2, action: 'add_env', description: 'Add OPENAI_API_KEY to environment variables', automated: false },
          { step: 3, action: 'restart', description: 'Restart the application to pick up the new variable', automated: false },
        ],
        estimatedFixTime: '10 minutes',
        preventionTips: ['Include API key setup in the onboarding checklist'],
      },
    },
  ],

  anthropic: [
    {
      pattern: /invalid api key/i,
      guide: {
        issue: 'Invalid or expired Anthropic API key',
        severity: 'high',
        impact: 'Claude fallback unavailable — OpenAI-only mode',
        diagnosticSteps: [
          { step: 1, action: 'verify_key', description: 'Go to https://console.anthropic.com/settings/keys', automated: false },
          { step: 2, action: 'create_key', description: 'Generate a new API key', automated: false },
          { step: 3, action: 'update_settings', description: 'Update key in Settings > API Keys > Anthropic', automated: false },
        ],
        estimatedFixTime: '5 minutes',
        preventionTips: ['Set up billing alerts to prevent auto-deactivation'],
      },
    },
    {
      pattern: /overloaded/i,
      guide: {
        issue: 'Anthropic API overloaded',
        severity: 'medium',
        impact: 'Claude requests may be slower or fail intermittently',
        diagnosticSteps: [
          { step: 1, action: 'check_status', description: 'Check https://status.anthropic.com for incidents', automated: false },
          { step: 2, action: 'wait', description: 'Wait 5-15 minutes for load to subside', automated: false },
        ],
        estimatedFixTime: '5-30 minutes (depends on Anthropic)',
        preventionTips: ['Ensure OpenAI fallback is configured as primary'],
      },
    },
  ],

  relevance_ai: [
    {
      pattern: /invalid api key/i,
      guide: {
        issue: 'Invalid Relevance AI API key',
        severity: 'high',
        impact: 'Lead enrichment pipeline is broken',
        diagnosticSteps: [
          { step: 1, action: 'verify_key', description: 'Go to https://app.relevanceai.com/settings/api-keys', automated: false },
          { step: 2, action: 'check_format', description: 'Ensure key includes project ID (format: project_id:api_key)', automated: false },
          { step: 3, action: 'regenerate', description: 'Generate a new API key if needed', automated: false },
          { step: 4, action: 'update_settings', description: 'Update in Settings > API Keys > Relevance AI', automated: false },
        ],
        estimatedFixTime: '5 minutes',
        preventionTips: ['Verify key format includes the project ID prefix'],
      },
    },
  ],

  apify: [
    {
      pattern: /invalid api key/i,
      guide: {
        issue: 'Invalid Apify API key',
        severity: 'high',
        impact: 'Web scraping and lead discovery are offline',
        diagnosticSteps: [
          { step: 1, action: 'verify_key', description: 'Go to https://console.apify.com/account/integrations', automated: false },
          { step: 2, action: 'copy_token', description: 'Copy your Personal API Token', automated: false },
          { step: 3, action: 'update_settings', description: 'Update in Settings > API Keys > Apify', automated: false },
        ],
        estimatedFixTime: '5 minutes',
        preventionTips: ['Monitor Apify usage to avoid exceeding plan limits'],
      },
    },
    {
      pattern: /quota/i,
      guide: {
        issue: 'Apify compute quota nearly exhausted',
        severity: 'high',
        impact: 'Scraping jobs may fail once quota is fully used',
        diagnosticSteps: [
          { step: 1, action: 'check_usage', description: 'Review usage at https://console.apify.com/billing', automated: false },
          { step: 2, action: 'upgrade_plan', description: 'Upgrade plan for more compute units', automated: false },
          { step: 3, action: 'optimize', description: 'Reduce scraping frequency or scope until next reset', automated: false },
        ],
        estimatedFixTime: '5-15 minutes',
        preventionTips: ['Set up billing alerts at 75% usage', 'Schedule scrapes during off-peak hours'],
      },
    },
  ],

  gmail: [
    {
      pattern: /token.*invalid|token.*expired/i,
      guide: {
        issue: 'Gmail OAuth token expired or invalid',
        severity: 'critical',
        impact: 'No emails can be sent — all campaigns paused',
        diagnosticSteps: [
          { step: 1, action: 'reconnect', description: 'Go to Settings > Email Configuration', automated: false },
          { step: 2, action: 'oauth', description: 'Click "Reconnect Gmail" and grant permissions', automated: false },
          { step: 3, action: 'verify_scopes', description: 'Ensure gmail.send scope is granted', automated: false },
          { step: 4, action: 'test', description: 'Click "Test Connection" to verify', automated: true },
        ],
        estimatedFixTime: '5 minutes',
        preventionTips: [
          'Monitor token expiry dates in the health dashboard',
          'Implement automatic token refresh via refresh_token',
          'Use a service account for production email sending',
        ],
      },
    },
    {
      pattern: /scope/i,
      guide: {
        issue: 'Gmail OAuth missing required scopes',
        severity: 'high',
        impact: 'Email sending permissions insufficient',
        diagnosticSteps: [
          { step: 1, action: 'check_scopes', description: 'Go to Google Cloud Console > APIs & Services > OAuth consent', automated: false },
          { step: 2, action: 'add_scope', description: 'Ensure gmail.send and gmail.compose scopes are included', automated: false },
          { step: 3, action: 'reconnect', description: 'Reconnect Gmail in Settings to re-authorise', automated: false },
        ],
        estimatedFixTime: '10 minutes',
        preventionTips: ['Define all required scopes during initial OAuth setup'],
      },
    },
  ],

  digitalocean: [
    {
      pattern: /all.*unreachable|0\/\d+ accounts/i,
      guide: {
        issue: 'All DigitalOcean accounts unreachable',
        severity: 'critical',
        impact: 'Cannot provision, manage, or monitor tenant droplets',
        diagnosticSteps: [
          { step: 1, action: 'check_status', description: 'Check https://status.digitalocean.com for outages', automated: false },
          { step: 2, action: 'verify_tokens', description: 'Verify DO API tokens are valid and not rotated', automated: false },
          { step: 3, action: 'test_manually', description: 'Test API token with: curl -H "Authorization: Bearer $TOKEN" https://api.digitalocean.com/v2/account', automated: false },
        ],
        estimatedFixTime: '5-30 minutes',
        preventionTips: ['Rotate tokens on a schedule and update env vars', 'Use multiple accounts for redundancy'],
      },
    },
    {
      pattern: /account.*failed/i,
      guide: {
        issue: 'Some DigitalOcean accounts are failing',
        severity: 'high',
        impact: 'Reduced capacity for tenant provisioning',
        diagnosticSteps: [
          { step: 1, action: 'identify', description: 'Check which accounts failed in the health report', automated: false },
          { step: 2, action: 'verify_token', description: 'Verify the specific account token', automated: false },
          { step: 3, action: 'check_billing', description: 'Ensure the account has no outstanding billing issues', automated: false },
        ],
        estimatedFixTime: '10 minutes',
        preventionTips: ['Monitor each account independently', 'Keep spare accounts in the pool'],
      },
    },
  ],

  supabase: [
    {
      pattern: /authentication failed/i,
      guide: {
        issue: 'Supabase authentication failure',
        severity: 'critical',
        impact: 'TOTAL SYSTEM FAILURE — no database access',
        diagnosticSteps: [
          { step: 1, action: 'verify_url', description: 'Verify NEXT_PUBLIC_SUPABASE_URL matches your project', automated: false },
          { step: 2, action: 'verify_key', description: 'Check SUPABASE_SERVICE_ROLE_KEY in Supabase Dashboard > Settings > API', automated: false },
          { step: 3, action: 'check_project', description: 'Ensure Supabase project is not paused (free tier pauses after inactivity)', automated: false },
          { step: 4, action: 'restart', description: 'Restart the application after updating credentials', automated: false },
        ],
        estimatedFixTime: '5-15 minutes',
        preventionTips: ['Use Pro plan to avoid auto-pause', 'Set up Supabase status alerts'],
      },
    },
    {
      pattern: /timeout|did not respond/i,
      guide: {
        issue: 'Supabase connection timeout',
        severity: 'critical',
        impact: 'Database queries failing — all features affected',
        diagnosticSteps: [
          { step: 1, action: 'check_status', description: 'Check https://status.supabase.com', automated: false },
          { step: 2, action: 'check_network', description: 'Verify network connectivity from the server', automated: false },
          { step: 3, action: 'check_pooler', description: 'If using pgBouncer, check connection pool exhaustion', automated: false },
        ],
        estimatedFixTime: '5-60 minutes (depends on root cause)',
        preventionTips: ['Use connection pooling', 'Set up database connection monitoring'],
      },
    },
  ],

  redis: [
    {
      pattern: /not configured/i,
      guide: {
        issue: 'Redis not configured',
        severity: 'critical',
        impact: 'BullMQ job queue offline — no background processing',
        diagnosticSteps: [
          { step: 1, action: 'get_url', description: 'Get Redis connection URL from your provider', automated: false },
          { step: 2, action: 'add_env', description: 'Add REDIS_URL to environment variables', automated: false },
          { step: 3, action: 'restart', description: 'Restart the application', automated: false },
        ],
        estimatedFixTime: '10 minutes',
        preventionTips: ['Include Redis setup in deployment checklist'],
      },
    },
    {
      pattern: /ping failed|failed to connect/i,
      guide: {
        issue: 'Redis connection failure',
        severity: 'critical',
        impact: 'All background jobs (email sending, fleet ops) are halted',
        diagnosticSteps: [
          { step: 1, action: 'check_url', description: 'Verify REDIS_URL is correct (host, port, password)', automated: false },
          { step: 2, action: 'check_firewall', description: 'Ensure server can reach Redis (check firewall rules)', automated: false },
          { step: 3, action: 'check_provider', description: 'Check your Redis provider dashboard for outages', automated: false },
          { step: 4, action: 'test_cli', description: 'Test with: redis-cli -u $REDIS_URL ping', automated: false },
        ],
        estimatedFixTime: '10-30 minutes',
        preventionTips: ['Use managed Redis with automatic failover', 'Set up Redis monitoring alerts'],
      },
    },
  ],

  google_cse: [
    {
      pattern: /not configured|not enabled/i,
      guide: {
        issue: 'Google CSE not configured',
        severity: 'medium',
        impact: 'Company info enrichment unavailable',
        diagnosticSteps: [
          { step: 1, action: 'get_key', description: 'Get API key from Google Cloud Console > Credentials', automated: false },
          { step: 2, action: 'enable_api', description: 'Enable Custom Search API in Google Cloud Console', automated: false },
          { step: 3, action: 'get_cse_id', description: 'Get CSE ID from https://programmablesearchengine.google.com/', automated: false },
          { step: 4, action: 'add_env', description: 'Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID in environment', automated: false },
        ],
        estimatedFixTime: '15 minutes',
        preventionTips: ['Google CSE has a free tier of 100 queries/day — monitor usage'],
      },
    },
  ],
};

// ============================================
// DEFAULT FALLBACK GUIDE
// ============================================

const DEFAULT_GUIDE: Omit<DiagnosticGuide, 'serviceId' | 'serviceName' | 'fixPath'> = {
  issue: 'Unknown error',
  severity: 'medium',
  impact: 'Service may be partially or fully unavailable',
  diagnosticSteps: [
    { step: 1, action: 'check_logs', description: 'Check application logs for detailed error messages', automated: false },
    { step: 2, action: 'verify_config', description: 'Verify all environment variables are correctly set', automated: false },
    { step: 3, action: 'check_provider', description: "Check the service provider's status page", automated: false },
    { step: 4, action: 'restart', description: 'Try restarting the application', automated: false },
  ],
  estimatedFixTime: 'Unknown',
  preventionTips: ['Set up monitoring and alerting for all critical services'],
};

// ============================================
// DIAGNOSTIC ENGINE
// ============================================

export class DiagnosticEngine {
  /**
   * Get diagnostic guide for a service health issue.
   */
  getDiagnostic(service: ServiceHealth): DiagnosticGuide | null {
    if (service.status === 'ok') {
      return null; // No issue, no diagnostic needed
    }

    const patterns = SERVICE_DIAGNOSTICS[service.id] || [];
    const errorText = service.result.error || service.result.message || '';

    // Find the first matching pattern
    for (const entry of patterns) {
      const matches =
        entry.pattern instanceof RegExp
          ? entry.pattern.test(errorText)
          : errorText.toLowerCase().includes(entry.pattern.toLowerCase());

      if (matches) {
        return {
          ...entry.guide,
          serviceId: service.id,
          serviceName: service.name,
          fixPath: service.fixPath,
        };
      }
    }

    // No specific pattern matched — return generic guide
    return {
      ...DEFAULT_GUIDE,
      issue: service.result.error || 'Service issue detected',
      serviceId: service.id,
      serviceName: service.name,
      fixPath: service.fixPath,
    };
  }

  /**
   * Get diagnostics for all failing services in a report.
   */
  getDiagnosticsForReport(
    services: ServiceHealth[],
  ): DiagnosticGuide[] {
    const guides: DiagnosticGuide[] = [];

    for (const service of services) {
      const guide = this.getDiagnostic(service);
      if (guide) {
        guides.push(guide);
      }
    }

    // Sort by severity: critical first, then high, medium, low
    const severityOrder: Record<CriticalityLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    guides.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );

    return guides;
  }

  /**
   * Get the list of all registered service IDs that have diagnostics.
   */
  getRegisteredServices(): string[] {
    return Object.keys(SERVICE_DIAGNOSTICS);
  }

  /**
   * Check if diagnostics exist for a given service id.
   */
  hasDiagnostics(serviceId: string): boolean {
    return serviceId in SERVICE_DIAGNOSTICS;
  }
}
