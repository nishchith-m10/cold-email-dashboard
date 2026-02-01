/**
 * PHASE 57: MANAGED VS. BYO SERVICE MATRIX
 * 
 * Type definitions for service categorization, cost allocation,
 * and billing models in the Genesis financial architecture.
 */

/**
 * Service Category Definitions
 * 
 * - Managed (Proxy): Genesis operates OAuth app, zero friction
 * - Managed (Wholesale): Genesis provides API key, charges per-use
 * - BYO (Key): User provides API key, direct billing
 * - BYO (Setup): User configures externally, high friction
 */
export enum ServiceCategory {
  MANAGED_PROXY = 'managed_proxy',
  MANAGED_WHOLESALE = 'managed_wholesale',
  BYO_KEY = 'byo_key',
  BYO_SETUP = 'byo_setup',
}

/**
 * Cost Bearer - Who pays for the service
 */
export enum CostBearer {
  GENESIS = 'genesis',           // Genesis pays wholesale, charges user
  USER_DIRECT = 'user_direct',   // User pays provider directly
  INCLUDED = 'included',         // Included in base subscription
}

/**
 * Billing Model Type
 */
export enum BillingModel {
  INCLUDED_IN_BASE = 'included_in_base',     // No additional charge
  PER_USE = 'per_use',                       // Pay per API call/transaction
  FLAT_FEE_MONTHLY = 'flat_fee_monthly',     // Fixed monthly cost
  TIERED = 'tiered',                         // Price varies by tier
  USER_DIRECT = 'user_direct',               // User pays provider directly
}

/**
 * User Experience Friction Level
 */
export enum FrictionLevel {
  ZERO = 'zero',       // Click button, done
  LOW = 'low',         // Copy/paste one value
  MEDIUM = 'medium',   // Copy/paste multiple values
  HIGH = 'high',       // External configuration required
}

/**
 * Service Definition in the Matrix
 */
export interface ServiceDefinition {
  /** Unique service identifier */
  serviceId: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Service category */
  category: ServiceCategory;
  
  /** Who bears the cost */
  costBearer: CostBearer;
  
  /** Billing model */
  billingModel: BillingModel;
  
  /** User experience friction level */
  frictionLevel: FrictionLevel;
  
  /** What user must do */
  userAction: string;
  
  /** What Genesis is responsible for */
  genesisResponsibility: string;
  
  /** Is this service required for cold email workflows */
  required: boolean;
  
  /** Cost details if applicable */
  costDetails?: ServiceCostDetails;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Cost Details for a Service
 */
export interface ServiceCostDetails {
  /** Wholesale cost Genesis pays (if managed) */
  wholesaleCostCents?: number;
  
  /** Retail cost charged to user (if managed) */
  retailCostCents?: number;
  
  /** Unit of measurement (e.g., 'per_search', 'per_scrape', 'per_month') */
  unit: string;
  
  /** Margin percentage (retail - wholesale) / retail */
  marginPercent?: number;
  
  /** Flat monthly fee (if applicable) */
  flatFeeMonthly?: number;
  
  /** Tier-based pricing (if applicable) */
  tiers?: PricingTier[];
}

/**
 * Pricing Tier Definition
 */
export interface PricingTier {
  /** Tier identifier */
  tierId: string;
  
  /** Display name */
  name: string;
  
  /** Monthly cost in cents */
  monthlyCostCents: number;
  
  /** Included quota */
  includedQuota?: number;
  
  /** Overage cost per unit */
  overageCostCents?: number;
}

/**
 * Cost Allocation Record
 * Tracks how costs are distributed for a workspace
 */
export interface CostAllocation {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Service identifier */
  serviceId: string;
  
  /** Month (YYYY-MM format) */
  month: string;
  
  /** Total units consumed */
  unitsConsumed: number;
  
  /** Total cost to Genesis (wholesale) in cents */
  genesisCostCents: number;
  
  /** Total charged to user (retail) in cents */
  userChargeCents: number;
  
  /** Margin in cents */
  marginCents: number;
  
  /** Margin percentage */
  marginPercent: number;
  
  /** Transaction count */
  transactionCount: number;
  
  /** First transaction timestamp */
  firstTransactionAt: Date;
  
  /** Last transaction timestamp */
  lastTransactionAt: Date;
}

/**
 * Service Matrix Query Filters
 */
export interface ServiceMatrixFilters {
  category?: ServiceCategory;
  costBearer?: CostBearer;
  billingModel?: BillingModel;
  required?: boolean;
  frictionLevel?: FrictionLevel;
}

/**
 * Workspace Service Configuration
 * Tracks which services a workspace is using and their configuration
 */
export interface WorkspaceServiceConfig {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Service identifier */
  serviceId: string;
  
  /** Is this service enabled for this workspace */
  enabled: boolean;
  
  /** Configuration mode (e.g., 'managed', 'byo') */
  mode: 'managed' | 'byo';
  
  /** Credential reference (if BYO) */
  credentialId?: string;
  
  /** Service-specific configuration */
  config?: Record<string, unknown>;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Service Usage Event
 * Individual usage record for cost tracking
 */
export interface ServiceUsageEvent {
  /** Event identifier */
  eventId: string;
  
  /** Workspace identifier */
  workspaceId: string;
  
  /** Service identifier */
  serviceId: string;
  
  /** Event type (e.g., 'api_call', 'scrape', 'search') */
  eventType: string;
  
  /** Units consumed */
  units: number;
  
  /** Cost to Genesis in cents */
  genesisCostCents: number;
  
  /** Cost to user in cents */
  userCostCents: number;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Additional event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Margin Analysis Report
 * Aggregated financial data for a workspace
 */
export interface MarginAnalysisReport {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Analysis period (YYYY-MM) */
  month: string;
  
  /** Revenue breakdown */
  revenue: {
    subscriptionFeeCents: number;
    managedServicesCents: number;
    totalCents: number;
  };
  
  /** Cost breakdown */
  costs: {
    infrastructureCents: number;
    managedServicesCents: number;
    sharedOverheadCents: number;
    totalCents: number;
  };
  
  /** Margin calculation */
  margin: {
    grossProfitCents: number;
    marginPercent: number;
  };
  
  /** Service-level breakdown */
  serviceBreakdown: Array<{
    serviceId: string;
    displayName: string;
    unitsConsumed: number;
    revenueCents: number;
    costCents: number;
    marginCents: number;
  }>;
}

/**
 * Service Matrix Constants
 */
export const SERVICE_MATRIX_VERSION = '1.0.0';
export const DEFAULT_MARGIN_PERCENT = 25; // 25% default margin for managed services
export const MIN_MARGIN_PERCENT = 10;     // Minimum acceptable margin
export const MAX_MARGIN_PERCENT = 50;     // Maximum margin cap
