/**
 * PHASE 57: SERVICE MATRIX
 * 
 * Complete definition of all services in the Genesis ecosystem,
 * their categorization, billing models, and cost structures.
 */

import {
  ServiceDefinition,
  ServiceCategory,
  CostBearer,
  BillingModel,
  FrictionLevel,
  ServiceMatrixFilters,
} from './types';

/**
 * Complete Service Matrix
 * Source of truth for all external services in Genesis
 */
export const SERVICE_MATRIX: readonly ServiceDefinition[] = [
  // ========================================================================
  // MANAGED (PROXY) SERVICES - Zero Friction OAuth
  // ========================================================================
  {
    serviceId: 'gmail_oauth',
    displayName: 'Gmail (OAuth)',
    category: ServiceCategory.MANAGED_PROXY,
    costBearer: CostBearer.INCLUDED,
    billingModel: BillingModel.INCLUDED_IN_BASE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'Click "Connect Gmail" button',
    genesisResponsibility: 'Operate OAuth app, token refresh, credential injection',
    required: true,
    costDetails: {
      unit: 'included',
    },
    metadata: {
      scope: 'https://mail.google.com/',
      tokenType: 'oauth2',
      refreshable: true,
    },
  },
  {
    serviceId: 'google_sheets',
    displayName: 'Google Sheets',
    category: ServiceCategory.MANAGED_PROXY,
    costBearer: CostBearer.INCLUDED,
    billingModel: BillingModel.INCLUDED_IN_BASE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'Click "Connect Sheets" button',
    genesisResponsibility: 'Operate OAuth app, sheet access management',
    required: false,
    costDetails: {
      unit: 'included',
    },
    metadata: {
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      tokenType: 'oauth2',
    },
  },
  {
    serviceId: 'dns_entri',
    displayName: 'DNS (Entri)',
    category: ServiceCategory.MANAGED_PROXY,
    costBearer: CostBearer.INCLUDED,
    billingModel: BillingModel.INCLUDED_IN_BASE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'Click "Setup DNS" button',
    genesisResponsibility: 'Handle SPF/DKIM/DMARC injection via Entri OAuth',
    required: true,
    costDetails: {
      unit: 'included',
    },
    metadata: {
      provider: 'entri',
      recordTypes: ['SPF', 'DKIM', 'DMARC'],
    },
  },
  {
    serviceId: 'tracking_domains',
    displayName: 'Tracking Domains',
    category: ServiceCategory.MANAGED_PROXY,
    costBearer: CostBearer.INCLUDED,
    billingModel: BillingModel.INCLUDED_IN_BASE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'None (automatic)',
    genesisResponsibility: 'Caddy SSL + reverse proxy setup',
    required: true,
    costDetails: {
      unit: 'included',
    },
    metadata: {
      sslProvider: 'letsencrypt',
      fallback: 'sslip.io',
    },
  },

  // ========================================================================
  // MANAGED (WHOLESALE) SERVICES - Per-Use Billing
  // ========================================================================
  {
    serviceId: 'google_cse',
    displayName: 'Google Custom Search Engine',
    category: ServiceCategory.MANAGED_WHOLESALE,
    costBearer: CostBearer.GENESIS,
    billingModel: BillingModel.PER_USE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'None (automatic)',
    genesisResponsibility: 'Provide API Key + CX, track usage',
    required: true,
    costDetails: {
      wholesaleCostCents: 0.4,  // $0.004 per search
      retailCostCents: 0.5,      // $0.005 per search
      unit: 'per_search',
      marginPercent: 25,
    },
    metadata: {
      quotaDefault: 100,         // 100 searches/day default
      quotaUpgradeable: true,
    },
  },
  {
    serviceId: 'apify_managed',
    displayName: 'Apify (Managed)',
    category: ServiceCategory.MANAGED_WHOLESALE,
    costBearer: CostBearer.GENESIS,
    billingModel: BillingModel.PER_USE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'None (automatic)',
    genesisResponsibility: 'Provide API token, track usage, rate limiting',
    required: false,
    costDetails: {
      wholesaleCostCents: 1.5,  // $0.015 per scrape
      retailCostCents: 2.0,      // $0.02 per scrape
      unit: 'per_scrape',
      marginPercent: 25,
    },
    metadata: {
      poolManaged: true,
      concurrentLimit: 10,
      failover: true,
    },
  },
  {
    serviceId: 'residential_proxies',
    displayName: 'Residential Proxies',
    category: ServiceCategory.MANAGED_WHOLESALE,
    costBearer: CostBearer.GENESIS,
    billingModel: BillingModel.PER_USE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'None (automatic)',
    genesisResponsibility: 'Manage rotation, prevent bans',
    required: false,
    costDetails: {
      wholesaleCostCents: 0.07, // $0.0007 per request
      retailCostCents: 0.1,      // $0.001 per request
      unit: 'per_request',
      marginPercent: 30,
    },
    metadata: {
      rotationStrategy: 'automatic',
      concurrentLimit: 5,
    },
  },
  {
    serviceId: 'email_verification',
    displayName: 'Email Verification',
    category: ServiceCategory.MANAGED_WHOLESALE,
    costBearer: CostBearer.GENESIS,
    billingModel: BillingModel.PER_USE,
    frictionLevel: FrictionLevel.ZERO,
    userAction: 'None (automatic)',
    genesisResponsibility: 'Debounce/NeverBounce integration',
    required: false,
    costDetails: {
      wholesaleCostCents: 0.2,  // $0.002 per email
      retailCostCents: 0.3,      // $0.003 per email
      unit: 'per_email',
      marginPercent: 33,
    },
    metadata: {
      providers: ['debounce', 'neverbounce'],
    },
  },
  {
    serviceId: 'digitalocean_droplet',
    displayName: 'DigitalOcean Droplet',
    category: ServiceCategory.MANAGED_WHOLESALE,
    costBearer: CostBearer.GENESIS,
    billingModel: BillingModel.TIERED,
    frictionLevel: FrictionLevel.LOW,
    userAction: 'Select droplet size during onboarding',
    genesisResponsibility: 'Spin up droplet on Genesis account pool, manage lifecycle',
    required: true,
    costDetails: {
      unit: 'per_month',
      tiers: [
        {
          tierId: 'starter',
          name: 'Starter (1 vCPU, 1 GB RAM)',
          monthlyCostCents: 600,  // $6/month
        },
        {
          tierId: 'professional',
          name: 'Professional (1 vCPU, 2 GB RAM)',
          monthlyCostCents: 1200, // $12/month
        },
        {
          tierId: 'scale',
          name: 'Scale (2 vCPU, 4 GB RAM)',
          monthlyCostCents: 2400, // $24/month
        },
        {
          tierId: 'enterprise',
          name: 'Enterprise (4 vCPU, 8 GB RAM)',
          monthlyCostCents: 4800, // $48/month
        },
      ],
    },
    metadata: {
      poolStrategy: 'multi_account',
      accountsStart: 3,
      accountsScale: 15,
    },
  },

  // ========================================================================
  // BYO (KEY) SERVICES - User Provides API Keys
  // ========================================================================
  {
    serviceId: 'openai_byo',
    displayName: 'OpenAI',
    category: ServiceCategory.BYO_KEY,
    costBearer: CostBearer.USER_DIRECT,
    billingModel: BillingModel.USER_DIRECT,
    frictionLevel: FrictionLevel.LOW,
    userAction: 'Paste OpenAI API key',
    genesisResponsibility: 'Encrypt, inject to Sidecar, token validation',
    required: true,
    costDetails: {
      unit: 'user_direct',
    },
    metadata: {
      provider: 'openai',
      keyPrefix: 'sk-',
      validation: '/v1/models',
    },
  },
  {
    serviceId: 'claude_byo',
    displayName: 'Claude (Anthropic)',
    category: ServiceCategory.BYO_KEY,
    costBearer: CostBearer.USER_DIRECT,
    billingModel: BillingModel.USER_DIRECT,
    frictionLevel: FrictionLevel.LOW,
    userAction: 'Paste Claude API key',
    genesisResponsibility: 'Encrypt, inject to Sidecar, token validation',
    required: true,
    costDetails: {
      unit: 'user_direct',
    },
    metadata: {
      provider: 'anthropic',
      keyPrefix: 'sk-ant-',
      validation: '/v1/messages',
    },
  },
  {
    serviceId: 'relevance_ai_byo',
    displayName: 'Relevance AI',
    category: ServiceCategory.BYO_KEY,
    costBearer: CostBearer.USER_DIRECT,
    billingModel: BillingModel.USER_DIRECT,
    frictionLevel: FrictionLevel.LOW,
    userAction: 'Paste Relevance AI API key',
    genesisResponsibility: 'Encrypt, inject to Sidecar, token validation',
    required: true,
    costDetails: {
      unit: 'user_direct',
    },
    metadata: {
      provider: 'relevance_ai',
      validation: '/v1/validate',
    },
  },
  {
    serviceId: 'apify_byo',
    displayName: 'Apify (BYO)',
    category: ServiceCategory.BYO_KEY,
    costBearer: CostBearer.USER_DIRECT,
    billingModel: BillingModel.USER_DIRECT,
    frictionLevel: FrictionLevel.MEDIUM,
    userAction: 'Paste Apify API token',
    genesisResponsibility: 'Encrypt, inject to Sidecar, token validation',
    required: false,
    costDetails: {
      unit: 'user_direct',
    },
    metadata: {
      provider: 'apify',
      validation: '/v2/user/me',
      alternative: 'apify_managed',
    },
  },

  // ========================================================================
  // BYO (SETUP) SERVICES - External Configuration Required
  // ========================================================================
  {
    serviceId: 'calendly_booking',
    displayName: 'Calendly Booking Link',
    category: ServiceCategory.BYO_SETUP,
    costBearer: CostBearer.USER_DIRECT,
    billingModel: BillingModel.USER_DIRECT,
    frictionLevel: FrictionLevel.MEDIUM,
    userAction: 'Paste Calendly booking URL',
    genesisResponsibility: 'Validate URL format, check availability',
    required: true,
    costDetails: {
      unit: 'user_direct',
    },
    metadata: {
      provider: 'calendly',
      validation: 'url_format',
    },
  },
] as const;

/**
 * Service Matrix Map (indexed by serviceId for fast lookup)
 */
export const SERVICE_MATRIX_MAP = new Map<string, ServiceDefinition>(
  SERVICE_MATRIX.map((service) => [service.serviceId, service])
);

/**
 * Get service definition by ID
 */
export function getServiceById(serviceId: string): ServiceDefinition | undefined {
  return SERVICE_MATRIX_MAP.get(serviceId);
}

/**
 * Query service matrix with filters
 */
export function queryServiceMatrix(filters?: ServiceMatrixFilters): ServiceDefinition[] {
  let results = [...SERVICE_MATRIX];

  if (!filters) {
    return results;
  }

  if (filters.category !== undefined) {
    results = results.filter((s) => s.category === filters.category);
  }

  if (filters.costBearer !== undefined) {
    results = results.filter((s) => s.costBearer === filters.costBearer);
  }

  if (filters.billingModel !== undefined) {
    results = results.filter((s) => s.billingModel === filters.billingModel);
  }

  if (filters.required !== undefined) {
    results = results.filter((s) => s.required === filters.required);
  }

  if (filters.frictionLevel !== undefined) {
    results = results.filter((s) => s.frictionLevel === filters.frictionLevel);
  }

  return results;
}

/**
 * Get all required services
 */
export function getRequiredServices(): ServiceDefinition[] {
  return queryServiceMatrix({ required: true });
}

/**
 * Get all managed services (both proxy and wholesale)
 */
export function getManagedServices(): ServiceDefinition[] {
  return SERVICE_MATRIX.filter(
    (s) =>
      s.category === ServiceCategory.MANAGED_PROXY ||
      s.category === ServiceCategory.MANAGED_WHOLESALE
  );
}

/**
 * Get all BYO services
 */
export function getBYOServices(): ServiceDefinition[] {
  return SERVICE_MATRIX.filter(
    (s) =>
      s.category === ServiceCategory.BYO_KEY ||
      s.category === ServiceCategory.BYO_SETUP
  );
}

/**
 * Get services that incur per-use costs
 */
export function getPerUseServices(): ServiceDefinition[] {
  return queryServiceMatrix({ billingModel: BillingModel.PER_USE });
}

/**
 * Validate service exists
 */
export function validateServiceId(serviceId: string): boolean {
  return SERVICE_MATRIX_MAP.has(serviceId);
}

/**
 * Get service display names for UI
 */
export function getServiceDisplayNames(): Record<string, string> {
  return Object.fromEntries(
    SERVICE_MATRIX.map((s) => [s.serviceId, s.displayName])
  );
}
