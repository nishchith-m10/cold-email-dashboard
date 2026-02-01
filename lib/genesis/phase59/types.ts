/**
 * PHASE 59: COST MODEL & RATE LIMIT ORCHESTRATION - TYPES
 * 
 * Complete type definitions for per-tenant cost tracking, margin analysis,
 * and external API rate limit orchestration.
 */

// ============================================
// COST TRACKING TYPES
// ============================================

/**
 * Cost Category Classification
 */
export enum CostCategory {
  INFRASTRUCTURE = 'infrastructure',   // Droplet, bandwidth, snapshots
  MANAGED_SERVICE = 'managed_service', // Apify, CSE, proxies, verification
  SHARED_OVERHEAD = 'shared_overhead', // Redis, Supabase, Dashboard hosting
}

/**
 * Cost Source - Which specific service/component incurred the cost
 */
export enum CostSource {
  // Infrastructure
  DROPLET = 'droplet',
  BANDWIDTH = 'bandwidth',
  SNAPSHOT = 'snapshot',
  VOLUME = 'volume',
  LOAD_BALANCER = 'load_balancer',
  
  // Managed Services (from Phase 57)
  APIFY_SCRAPING = 'apify_scraping',
  GOOGLE_CSE = 'google_cse',
  PROXY_RESIDENTIAL = 'proxy_residential',
  PROXY_DATACENTER = 'proxy_datacenter',
  EMAIL_VERIFICATION = 'email_verification',
  OPENAI_API = 'openai_api',
  ANTHROPIC_API = 'anthropic_api',
  
  // Shared Overhead
  REDIS_CACHE = 'redis_cache',
  SUPABASE_DB = 'supabase_db',
  DASHBOARD_HOSTING = 'dashboard_hosting',
  CDN = 'cdn',
  MONITORING = 'monitoring',
}

/**
 * Cost Entry - Single cost record
 */
export interface CostEntry {
  /** Unique identifier */
  id: string;
  
  /** Workspace identifier */
  workspaceId: string;
  
  /** Cost category */
  category: CostCategory;
  
  /** Specific source of cost */
  source: CostSource;
  
  /** Cost amount in cents */
  amountCents: number;
  
  /** Currency (default USD) */
  currency: string;
  
  /** Units consumed (e.g., requests, GB, hours) */
  unitsConsumed: number;
  
  /** Unit type description */
  unitType: string;
  
  /** Unit cost in cents */
  unitCostCents: number;
  
  /** Billing period start */
  periodStart: Date;
  
  /** Billing period end */
  periodEnd: Date;
  
  /** External invoice/reference ID */
  externalInvoiceId?: string;
  
  /** Metadata (provider details, resource IDs, etc.) */
  metadata: Record<string, unknown>;
  
  /** Timestamp */
  createdAt: Date;
}

/**
 * Revenue Entry - Single revenue record
 */
export interface RevenueEntry {
  /** Unique identifier */
  id: string;
  
  /** Workspace identifier */
  workspaceId: string;
  
  /** Revenue source */
  source: RevenueSource;
  
  /** Revenue amount in cents */
  amountCents: number;
  
  /** Currency */
  currency: string;
  
  /** Billing period start */
  periodStart: Date;
  
  /** Billing period end */
  periodEnd: Date;
  
  /** External transaction ID (Stripe, etc.) */
  externalTransactionId?: string;
  
  /** Metadata */
  metadata: Record<string, unknown>;
  
  /** Timestamp */
  createdAt: Date;
}

/**
 * Revenue Source Classification
 */
export enum RevenueSource {
  SUBSCRIPTION_FEE = 'subscription_fee',     // Monthly/annual subscription
  WALLET_USAGE = 'wallet_usage',             // Pay-per-use from Genesis Wallet
  OVERAGE_CHARGES = 'overage_charges',       // Usage beyond included quota
  SETUP_FEE = 'setup_fee',                   // One-time setup charges
  CUSTOM_SERVICE = 'custom_service',         // Custom/enterprise features
}

// ============================================
// MARGIN ANALYSIS TYPES
// ============================================

/**
 * Margin Report - Comprehensive margin analysis for a tenant/period
 */
export interface MarginReport {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Period start */
  periodStart: Date;
  
  /** Period end */
  periodEnd: Date;
  
  /** Revenue breakdown */
  revenue: MarginRevenueBreakdown;
  
  /** Cost breakdown */
  costs: MarginCostBreakdown;
  
  /** Margin calculations */
  margin: MarginCalculations;
  
  /** Generated timestamp */
  generatedAt: Date;
}

/**
 * Revenue Breakdown for Margin Report
 */
export interface MarginRevenueBreakdown {
  /** Subscription revenue (cents) */
  subscriptionCents: number;
  
  /** Wallet usage revenue by service */
  walletUsageByService: Record<string, number>;
  
  /** Total wallet usage revenue (cents) */
  totalWalletUsageCents: number;
  
  /** Overage charges (cents) */
  overageChargesCents: number;
  
  /** Other revenue (cents) */
  otherRevenueCents: number;
  
  /** Total revenue (cents) */
  totalRevenueCents: number;
}

/**
 * Cost Breakdown for Margin Report
 */
export interface MarginCostBreakdown {
  /** Infrastructure costs by source */
  infrastructureCosts: Record<CostSource, number>;
  
  /** Total infrastructure costs (cents) */
  totalInfrastructureCents: number;
  
  /** Managed service costs by source */
  managedServiceCosts: Record<CostSource, number>;
  
  /** Total managed service costs (cents) */
  totalManagedServiceCents: number;
  
  /** Shared overhead allocation (cents) */
  sharedOverheadCents: number;
  
  /** Total costs (cents) */
  totalCostsCents: number;
}

/**
 * Margin Calculations
 */
export interface MarginCalculations {
  /** Gross profit (cents) */
  grossProfitCents: number;
  
  /** Gross margin percentage */
  grossMarginPercent: number;
  
  /** Contribution margin (revenue - variable costs only, cents) */
  contributionMarginCents: number;
  
  /** Break-even analysis */
  breakEven: BreakEvenAnalysis;
  
  /** Profitability status */
  isProfitable: boolean;
}

/**
 * Break-Even Analysis
 */
export interface BreakEvenAnalysis {
  /** Required monthly revenue to break even (cents) */
  requiredMonthlyCents: number;
  
  /** Current coverage ratio (revenue / costs) */
  coverageRatio: number;
  
  /** Months to profitability (if negative margin) */
  monthsToBreakEven?: number;
}

// ============================================
// RATE LIMIT TYPES
// ============================================

/**
 * Rate Limit Service - External APIs that need rate limiting
 */
export enum RateLimitService {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GMAIL_API = 'gmail_api',
  GOOGLE_CSE = 'google_cse',
  APIFY = 'apify',
  PROXY_RESIDENTIAL = 'proxy_residential',
  PROXY_DATACENTER = 'proxy_datacenter',
  SENDGRID = 'sendgrid',
  TWILIO = 'twilio',
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  /** Service identifier */
  service: RateLimitService;
  
  /** Global account limit */
  globalLimit: RateLimitQuota;
  
  /** Default per-tenant allocation */
  perTenantDefault: RateLimitQuota;
  
  /** Enforcement strategy */
  enforcementStrategy: RateLimitEnforcementStrategy;
  
  /** Burst allowance (if applicable) */
  burstAllowance?: number;
  
  /** Metadata */
  metadata: RateLimitConfigMetadata;
}

/**
 * Rate Limit Quota
 */
export interface RateLimitQuota {
  /** Maximum requests/operations */
  maxRequests: number;
  
  /** Time window (seconds) */
  windowSeconds: number;
  
  /** Window type */
  windowType: RateLimitWindowType;
  
  /** Concurrent operation limit (if applicable) */
  maxConcurrent?: number;
}

/**
 * Rate Limit Window Type
 */
export enum RateLimitWindowType {
  SLIDING = 'sliding',    // Sliding window (e.g., last 60 seconds)
  FIXED = 'fixed',        // Fixed window (e.g., per minute starting at :00)
  TOKEN_BUCKET = 'token_bucket', // Token bucket algorithm
}

/**
 * Rate Limit Enforcement Strategy
 */
export enum RateLimitEnforcementStrategy {
  REJECT = 'reject',       // Immediately reject over-limit requests
  QUEUE = 'queue',         // Queue requests and process when capacity available
  THROTTLE = 'throttle',   // Slow down requests (add delays)
}

/**
 * Rate Limit Config Metadata
 */
export interface RateLimitConfigMetadata {
  /** Provider name */
  provider: string;
  
  /** Plan/tier name */
  plan?: string;
  
  /** Cost per request (cents) */
  costPerRequestCents?: number;
  
  /** Overage pricing (cents per additional request) */
  overagePricingCents?: number;
  
  /** Documentation URL */
  docsUrl?: string;
}

/**
 * Rate Limit State - Current usage for a tenant/service
 */
export interface RateLimitState {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Service */
  service: RateLimitService;
  
  /** Current request count in window */
  currentRequests: number;
  
  /** Maximum allowed in window */
  maxRequests: number;
  
  /** Window start timestamp */
  windowStart: Date;
  
  /** Window end timestamp */
  windowEnd: Date;
  
  /** Remaining requests */
  remainingRequests: number;
  
  /** Current concurrent operations */
  currentConcurrent?: number;
  
  /** Max concurrent */
  maxConcurrent?: number;
  
  /** Throttle active? */
  isThrottled: boolean;
  
  /** Retry after timestamp (if limit exceeded) */
  retryAfter?: Date;
}

/**
 * Rate Limit Check Result
 */
export interface RateLimitCheckResult {
  /** Is request allowed? */
  allowed: boolean;
  
  /** Reason if not allowed */
  reason?: RateLimitRejectionReason;
  
  /** Current state */
  state: RateLimitState;
  
  /** Retry after timestamp (if rejected) */
  retryAfter?: Date;
  
  /** Estimated queue wait time (if queued, milliseconds) */
  estimatedWaitMs?: number;
  
  /** Queue position (if queued) */
  queuePosition?: number;
}

/**
 * Rate Limit Rejection Reason
 */
export enum RateLimitRejectionReason {
  TENANT_LIMIT_EXCEEDED = 'tenant_limit_exceeded',
  GLOBAL_LIMIT_EXCEEDED = 'global_limit_exceeded',
  CONCURRENT_LIMIT_EXCEEDED = 'concurrent_limit_exceeded',
  SERVICE_UNAVAILABLE = 'service_unavailable',
}

/**
 * Rate Limit Request
 */
export interface RateLimitRequest {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Service */
  service: RateLimitService;
  
  /** Number of requests to reserve */
  requestCount?: number;
  
  /** Priority (higher = more important) */
  priority?: number;
  
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Rate Limit Override Token - Emergency bypass
 */
export interface RateLimitOverrideToken {
  /** Token ID */
  id: string;
  
  /** Workspace identifier */
  workspaceId: string;
  
  /** Service to override */
  service: RateLimitService;
  
  /** Override limit (requests per window) */
  overrideLimit: number;
  
  /** Valid from */
  validFrom: Date;
  
  /** Valid until */
  validUntil: Date;
  
  /** Reason for override */
  reason: string;
  
  /** Issued by (admin user ID) */
  issuedBy: string;
  
  /** Metadata */
  metadata: Record<string, unknown>;
  
  /** Created timestamp */
  createdAt: Date;
}

// ============================================
// DATABASE INTERFACES
// ============================================

/**
 * Cost Ledger Database Interface
 */
export interface CostLedgerDB {
  /** Record cost entry */
  recordCost(entry: Omit<CostEntry, 'id' | 'createdAt'>): Promise<CostEntry>;
  
  /** Record revenue entry */
  recordRevenue(entry: Omit<RevenueEntry, 'id' | 'createdAt'>): Promise<RevenueEntry>;
  
  /** Get costs for workspace in period */
  getCosts(workspaceId: string, start: Date, end: Date): Promise<CostEntry[]>;
  
  /** Get costs by category */
  getCostsByCategory(
    workspaceId: string,
    category: CostCategory,
    start: Date,
    end: Date
  ): Promise<CostEntry[]>;
  
  /** Get revenue for workspace in period */
  getRevenue(workspaceId: string, start: Date, end: Date): Promise<RevenueEntry[]>;
  
  /** Get total costs for period */
  getTotalCosts(workspaceId: string, start: Date, end: Date): Promise<number>;
  
  /** Get total revenue for period */
  getTotalRevenue(workspaceId: string, start: Date, end: Date): Promise<number>;
}

/**
 * Rate Limit Store Interface (Redis-backed)
 */
export interface RateLimitStore {
  /** Get current rate limit state */
  getState(workspaceId: string, service: RateLimitService): Promise<RateLimitState | null>;
  
  /** Increment request count */
  incrementRequests(
    workspaceId: string,
    service: RateLimitService,
    count?: number
  ): Promise<RateLimitState>;
  
  /** Get global rate limit state */
  getGlobalState(service: RateLimitService): Promise<RateLimitState | null>;
  
  /** Increment global request count */
  incrementGlobalRequests(service: RateLimitService, count?: number): Promise<RateLimitState>;
  
  /** Reset window (for testing or manual reset) */
  resetWindow(workspaceId: string, service: RateLimitService): Promise<void>;
  
  /** Apply rate limit override token */
  applyOverride(token: RateLimitOverrideToken): Promise<void>;
  
  /** Get active overrides for workspace */
  getActiveOverrides(workspaceId: string): Promise<RateLimitOverrideToken[]>;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default rate limit configurations for common services
 */
export const DEFAULT_RATE_LIMITS: Record<RateLimitService, RateLimitConfig> = {
  [RateLimitService.OPENAI]: {
    service: RateLimitService.OPENAI,
    globalLimit: {
      maxRequests: 10000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
    },
    perTenantDefault: {
      maxRequests: 100,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.QUEUE,
    metadata: {
      provider: 'OpenAI',
      docsUrl: 'https://platform.openai.com/docs/guides/rate-limits',
    },
  },
  [RateLimitService.ANTHROPIC]: {
    service: RateLimitService.ANTHROPIC,
    globalLimit: {
      maxRequests: 5000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
    },
    perTenantDefault: {
      maxRequests: 50,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.QUEUE,
    metadata: {
      provider: 'Anthropic',
      docsUrl: 'https://docs.anthropic.com/claude/reference/rate-limits',
    },
  },
  [RateLimitService.GMAIL_API]: {
    service: RateLimitService.GMAIL_API,
    globalLimit: {
      maxRequests: 250, // Per account per day
      windowSeconds: 86400,
      windowType: RateLimitWindowType.FIXED,
    },
    perTenantDefault: {
      maxRequests: 250, // Per tenant OAuth (no global limit)
      windowSeconds: 86400,
      windowType: RateLimitWindowType.FIXED,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.REJECT,
    metadata: {
      provider: 'Google',
      docsUrl: 'https://developers.google.com/gmail/api/reference/quota',
    },
  },
  [RateLimitService.GOOGLE_CSE]: {
    service: RateLimitService.GOOGLE_CSE,
    globalLimit: {
      maxRequests: 10000,
      windowSeconds: 86400,
      windowType: RateLimitWindowType.FIXED,
    },
    perTenantDefault: {
      maxRequests: 100,
      windowSeconds: 86400,
      windowType: RateLimitWindowType.FIXED,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.REJECT,
    metadata: {
      provider: 'Google',
      plan: 'API Key',
      costPerRequestCents: 5, // $0.05 per request
      docsUrl: 'https://developers.google.com/custom-search/v1/overview',
    },
  },
  [RateLimitService.APIFY]: {
    service: RateLimitService.APIFY,
    globalLimit: {
      maxRequests: 1000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
      maxConcurrent: 1000,
    },
    perTenantDefault: {
      maxRequests: 100,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
      maxConcurrent: 10,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.QUEUE,
    metadata: {
      provider: 'Apify',
      docsUrl: 'https://docs.apify.com/platform/limits',
    },
  },
  [RateLimitService.PROXY_RESIDENTIAL]: {
    service: RateLimitService.PROXY_RESIDENTIAL,
    globalLimit: {
      maxRequests: 10000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
      maxConcurrent: 100,
    },
    perTenantDefault: {
      maxRequests: 1000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
      maxConcurrent: 5,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.THROTTLE,
    metadata: {
      provider: 'Residential Proxy Pool',
    },
  },
  [RateLimitService.PROXY_DATACENTER]: {
    service: RateLimitService.PROXY_DATACENTER,
    globalLimit: {
      maxRequests: 50000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
      maxConcurrent: 500,
    },
    perTenantDefault: {
      maxRequests: 5000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
      maxConcurrent: 50,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.THROTTLE,
    metadata: {
      provider: 'Datacenter Proxy Pool',
    },
  },
  [RateLimitService.SENDGRID]: {
    service: RateLimitService.SENDGRID,
    globalLimit: {
      maxRequests: 100000,
      windowSeconds: 86400,
      windowType: RateLimitWindowType.FIXED,
    },
    perTenantDefault: {
      maxRequests: 1000,
      windowSeconds: 86400,
      windowType: RateLimitWindowType.FIXED,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.REJECT,
    metadata: {
      provider: 'SendGrid',
      docsUrl: 'https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/errors.html',
    },
  },
  [RateLimitService.TWILIO]: {
    service: RateLimitService.TWILIO,
    globalLimit: {
      maxRequests: 10000,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
    },
    perTenantDefault: {
      maxRequests: 100,
      windowSeconds: 60,
      windowType: RateLimitWindowType.SLIDING,
    },
    enforcementStrategy: RateLimitEnforcementStrategy.QUEUE,
    metadata: {
      provider: 'Twilio',
      docsUrl: 'https://www.twilio.com/docs/usage/api/limits',
    },
  },
};

/**
 * Cost allocation percentages for shared overhead
 */
export const SHARED_OVERHEAD_ALLOCATION = {
  /** Redis cache cost allocation method */
  redisAllocation: 'per_tenant_equal', // Divide equally among active tenants
  
  /** Supabase database allocation method */
  supabaseAllocation: 'per_request', // Allocate based on query count
  
  /** Dashboard hosting allocation method */
  dashboardAllocation: 'per_tenant_equal',
  
  /** CDN allocation method */
  cdnAllocation: 'per_bandwidth', // Allocate based on bandwidth used
};
