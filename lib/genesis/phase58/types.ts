/**
 * PHASE 58: COMPREHENSIVE FINANCIAL CONTROL SYSTEM - TYPES
 * 
 * Complete type definitions for advanced wallet management, intelligent auto-topup,
 * granular kill-switches, analytics, invoicing, audit trail, and payment management.
 */

// ============================================
// WALLET TYPES
// ============================================

/**
 * Wallet Type Classification
 */
export enum WalletType {
  PRODUCTION = 'production',  // Real money operations
  SANDBOX = 'sandbox',         // Testing environment (no real charges)
  RESERVED = 'reserved',       // Locked funds for pending operations
}

/**
 * Wallet Status
 */
export enum WalletStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',     // Admin suspended
  FROZEN = 'frozen',           // Pending investigation
  CLOSED = 'closed',           // Permanently closed
}

/**
 * Core Wallet Entity
 */
export interface Wallet {
  /** Workspace identifier */
  workspaceId: string;
  
  /** Wallet type */
  type: WalletType;
  
  /** Current wallet status */
  status: WalletStatus;
  
  /** Available balance in cents */
  balanceCents: number;
  
  /** Reserved/held funds in cents */
  reservedCents: number;
  
  /** Lifetime deposits (all-time) */
  lifetimeDepositsCents: number;
  
  /** Lifetime usage (all-time) */
  lifetimeUsageCents: number;
  
  /** Spending limits */
  limits: SpendingLimits;
  
  /** Alert configuration */
  alerts: AlertConfiguration;
  
  /** Auto-topup configuration */
  autoTopup: AutoTopupConfiguration;
  
  /** Last transaction timestamp */
  lastTransactionAt: Date;
  
  /** Wallet created timestamp */
  createdAt: Date;
  
  /** Last updated timestamp */
  updatedAt: Date;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Spending Limits Configuration
 */
export interface SpendingLimits {
  /** Daily spending cap (null = unlimited) */
  dailyCents?: number | null;
  
  /** Weekly spending cap */
  weeklyCents?: number | null;
  
  /** Monthly spending cap */
  monthlyCents?: number | null;
  
  /** Per-service limits */
  perService?: Record<string, number>;
  
  /** Per-campaign limits */
  perCampaign?: Record<string, number>;
  
  /** Action when limit reached */
  limitAction: LimitAction;
}

/**
 * Action taken when spending limit is reached
 */
export enum LimitAction {
  WARN = 'warn',               // Send warning, allow continued spend
  SOFT_LIMIT = 'soft_limit',   // Disable auto-topup, require manual approval
  HARD_LIMIT = 'hard_limit',   // Kill-switch activated, block all operations
}

/**
 * Alert Threshold Configuration
 */
export interface AlertConfiguration {
  /** Alert at 75% balance depletion */
  at75Percent: boolean;
  
  /** Alert at 50% balance depletion */
  at50Percent: boolean;
  
  /** Alert at 25% balance depletion */
  at25Percent: boolean;
  
  /** Alert at 10% balance depletion */
  at10Percent: boolean;
  
  /** Custom threshold percentages */
  customThresholds?: number[];
  
  /** Last alert sent timestamp */
  lastAlertSentAt?: Date;
  
  /** Alert channels */
  channels: AlertChannel[];
}

/**
 * Alert delivery channels
 */
export enum AlertChannel {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app',
}

// ============================================
// AUTO-TOPUP TYPES
// ============================================

/**
 * Auto-Topup Strategy
 */
export enum TopupStrategy {
  FIXED_AMOUNT = 'fixed_amount',         // Always add fixed amount
  PERCENTAGE = 'percentage',              // Add percentage of current balance
  PREDICTIVE = 'predictive',              // ML-based prediction
  SCHEDULED = 'scheduled',                // Time-based schedule
  USAGE_BASED = 'usage_based',            // Based on average daily spend
}

/**
 * Auto-Topup Configuration
 */
export interface AutoTopupConfiguration {
  /** Is auto-topup enabled */
  enabled: boolean;
  
  /** Strategy to use */
  strategy: TopupStrategy;
  
  /** Trigger threshold in cents */
  thresholdCents: number;
  
  /** Strategy-specific configuration */
  config: TopupStrategyConfig;
  
  /** Maximum topup amount per period */
  maxAmountPerPeriod?: number;
  
  /** Period for max amount (e.g., 'month') */
  maxAmountPeriod?: 'day' | 'week' | 'month';
  
  /** Last topup timestamp */
  lastTopupAt?: Date;
  
  /** Topup count this period */
  topupCountThisPeriod: number;
}

/**
 * Strategy-specific configuration (discriminated union)
 */
export type TopupStrategyConfig =
  | FixedAmountConfig
  | PercentageConfig
  | PredictiveConfig
  | ScheduledConfig
  | UsageBasedConfig;

export interface FixedAmountConfig {
  strategy: TopupStrategy.FIXED_AMOUNT;
  amountCents: number;
}

export interface PercentageConfig {
  strategy: TopupStrategy.PERCENTAGE;
  percentage: number;              // 20 = add 20% of current balance
  minimumCents?: number;           // Minimum topup amount
}

export interface PredictiveConfig {
  strategy: TopupStrategy.PREDICTIVE;
  lookbackDays: number;            // Days to analyze
  bufferHours: number;             // Topup X hours before predicted depletion
  minimumCents?: number;
}

export interface ScheduledConfig {
  strategy: TopupStrategy.SCHEDULED;
  schedule: TopupSchedule[];       // e.g., every Monday at 9am
  amountCents: number;
}

export interface TopupSchedule {
  dayOfWeek?: number;              // 0-6 (Sunday-Saturday)
  dayOfMonth?: number;             // 1-31
  hour: number;                    // 0-23
  minute: number;                  // 0-59
}

export interface UsageBasedConfig {
  strategy: TopupStrategy.USAGE_BASED;
  multiplier: number;              // e.g., 7 = topup 7 days worth of usage
  minimumCents?: number;
}

/**
 * Topup Result
 */
export interface TopupResult {
  success: boolean;
  amountCents: number;
  newBalanceCents: number;
  transactionId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// TRANSACTION TYPES
// ============================================

/**
 * Transaction Type
 */
export enum TransactionType {
  // Funding
  DEPOSIT = 'deposit',
  AUTO_TOPUP_FIXED = 'auto_topup_fixed',
  AUTO_TOPUP_PREDICTIVE = 'auto_topup_predictive',
  AUTO_TOPUP_SCHEDULED = 'auto_topup_scheduled',
  AUTO_TOPUP_USAGE_BASED = 'auto_topup_usage_based',
  
  // Operations
  RESERVE = 'reserve',
  RELEASE_RESERVE = 'release_reserve',
  
  // Service Usage
  APIFY_SCRAPE = 'apify_scrape',
  CSE_SEARCH = 'cse_search',
  PROXY_REQUEST = 'proxy_request',
  EMAIL_VERIFY = 'email_verify',
  
  // Adjustments
  REFUND = 'refund',
  DISPUTE_CREDIT = 'dispute_credit',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
  
  // Transfers
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  
  // Billing
  INVOICE_PAYMENT = 'invoice_payment',
}

/**
 * Transaction Category
 */
export enum TransactionCategory {
  FUNDING = 'funding',
  OPERATIONS = 'operations',
  SERVICE_USAGE = 'service_usage',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  BILLING = 'billing',
}

/**
 * Transaction Status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  SETTLED = 'settled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

/**
 * Transaction Direction
 */
export enum TransactionDirection {
  CREDIT = 'credit',    // Adds to balance
  DEBIT = 'debit',      // Subtracts from balance
  HOLD = 'hold',        // Reserves funds
  RELEASE = 'release',  // Releases reservation
}

/**
 * Transaction Entity
 */
export interface Transaction {
  /** Unique transaction ID */
  id: string;
  
  /** Workspace identifier */
  workspaceId: string;
  
  /** Transaction type */
  type: TransactionType;
  
  /** Transaction category */
  category: TransactionCategory;
  
  /** Transaction direction */
  direction: TransactionDirection;
  
  /** Amount in cents */
  amountCents: number;
  
  /** Transaction status */
  status: TransactionStatus;
  
  /** Balance before transaction */
  balanceBeforeCents: number;
  
  /** Balance after transaction */
  balanceAfterCents: number;
  
  /** Transaction description */
  description: string;
  
  /** Tags for categorization */
  tags: string[];
  
  /** Rich metadata */
  metadata: TransactionMetadata;
  
  /** Related transaction IDs (e.g., refund links to original) */
  relatedTransactions?: string[];
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Settled timestamp */
  settledAt?: Date;
}

/**
 * Transaction Metadata
 */
export interface TransactionMetadata {
  /** Service ID (for service usage) */
  serviceId?: string;
  
  /** Campaign ID */
  campaignId?: string;
  
  /** User ID who initiated */
  userId?: string;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Payment method ID (for deposits) */
  paymentMethodId?: string;
  
  /** Invoice ID (for billing) */
  invoiceId?: string;
  
  /** Units consumed (for service usage) */
  unitsConsumed?: number;
  
  /** Service-specific data */
  serviceData?: Record<string, unknown>;
  
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Batch Transaction Request
 */
export interface BatchTransactionRequest {
  workspaceId: string;
  transactions: Omit<Transaction, 'id' | 'balanceBeforeCents' | 'balanceAfterCents' | 'status' | 'createdAt'>[];
}

/**
 * Transaction Search Filters
 */
export interface TransactionFilters {
  workspaceId?: string;
  type?: TransactionType;
  category?: TransactionCategory;
  direction?: TransactionDirection;
  status?: TransactionStatus;
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  serviceId?: string;
  campaignId?: string;
}

// ============================================
// KILL-SWITCH TYPES
// ============================================

/**
 * Kill-Switch Mode
 */
export enum KillSwitchMode {
  GLOBAL = 'global',           // All services disabled
  SERVICE_LEVEL = 'service',   // Specific services disabled
  PRIORITY_BASED = 'priority', // Low-priority services disabled first
}

/**
 * Kill-Switch Configuration
 */
export interface KillSwitchConfiguration {
  /** Is kill-switch enabled */
  enabled: boolean;
  
  /** Kill-switch mode */
  mode: KillSwitchMode;
  
  /** Global minimum balance (applies to all services) */
  globalMinBalanceCents: number;
  
  /** Service-specific configurations */
  serviceConfigs: ServiceKillSwitchConfig[];
  
  /** Grace period in seconds before killing */
  gracePeriodSeconds: number;
  
  /** Emergency override token */
  overrideToken?: string;
  
  /** Override token expiration */
  overrideTokenExpiresAt?: Date;
}

/**
 * Service-Level Kill-Switch Configuration
 */
export interface ServiceKillSwitchConfig {
  /** Service ID */
  serviceId: string;
  
  /** Is this service subject to kill-switch */
  enabled: boolean;
  
  /** Minimum balance required for this service */
  minBalanceCents: number;
  
  /** Service priority (higher = more critical) */
  priority: number;
  
  /** Grace period for this service */
  gracePeriodSeconds?: number;
}

/**
 * Pre-Flight Check Request
 */
export interface PreFlightCheckRequest {
  workspaceId: string;
  serviceId: string;
  estimatedCostCents: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Pre-Flight Check Result
 */
export interface PreFlightCheckResult {
  approved: boolean;
  currentBalanceCents: number;
  estimatedCostCents: number;
  projectedBalanceCents: number;
  reason?: string;
  gracePeriodEndsAt?: Date;
  workspaceId?: string;
}

// ============================================
// BUDGET TYPES
// ============================================

/**
 * Budget Period
 */
export enum BudgetPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * Budget Configuration
 */
export interface Budget {
  /** Budget ID */
  id: string;
  
  /** Workspace ID */
  workspaceId: string;
  
  /** Budget name */
  name: string;
  
  /** Budget period */
  period: BudgetPeriod;
  
  /** Total budget limit */
  totalLimitCents: number;
  
  /** Service-specific limits */
  serviceLimits?: Record<string, number>;
  
  /** Campaign-specific limits */
  campaignLimits?: Record<string, number>;
  
  /** Current period start */
  periodStart: Date;
  
  /** Current period end */
  periodEnd: Date;
  
  /** Amount spent in current period */
  spentCents: number;
  
  /** Alert configuration */
  alerts: BudgetAlertConfig;
  
  /** Action when budget exceeded */
  exceedAction: LimitAction;
  
  /** Created timestamp */
  createdAt: Date;
  
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Budget Alert Configuration
 */
export interface BudgetAlertConfig {
  at50Percent: boolean;
  at75Percent: boolean;
  at90Percent: boolean;
  at100Percent: boolean;
  lastAlertSentAt?: Date;
  channels: AlertChannel[];
}

/**
 * Budget Status
 */
export interface BudgetStatus {
  budgetId: string;
  totalLimitCents: number;
  spentCents: number;
  remainingCents: number;
  percentageUsed: number;
  isExceeded: boolean;
  projectedEndDate?: Date;
}

// ============================================
// ANALYTICS TYPES
// ============================================

/**
 * Spending Forecast
 */
export interface SpendingForecast {
  workspaceId: string;
  projectedBurnRateCents: number;      // Per day
  estimatedDaysRemaining: number;
  projectedDepletionDate?: Date;
  confidence: number;                   // 0-100
  basedOnDays: number;                  // Analysis window
}

/**
 * Anomaly Detection
 */
export interface SpendingAnomaly {
  id: string;
  workspaceId: string;
  detectedAt: Date;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  currentValue: number;
  expectedValue: number;
  deviationPercent: number;
  recommendation?: string;
}

export enum AnomalyType {
  SUDDEN_SPIKE = 'sudden_spike',
  UNUSUAL_PATTERN = 'unusual_pattern',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BUDGET_DEVIATION = 'budget_deviation',
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Burn Rate Analysis
 */
export interface BurnRateAnalysis {
  workspaceId: string;
  period: BudgetPeriod;
  averageDailyCents: number;
  averageWeeklyCents: number;
  averageMonthlyCents: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  peakDay?: Date;
  peakAmountCents?: number;
}

/**
 * Service Spending Breakdown
 */
export interface ServiceSpendingBreakdown {
  workspaceId: string;
  period: { start: Date; end: Date };
  totalSpentCents: number;
  byService: Array<{
    serviceId: string;
    serviceName: string;
    amountCents: number;
    percentage: number;
    transactionCount: number;
  }>;
}

/**
 * ROI Metrics
 */
export interface ROIMetrics {
  workspaceId: string;
  period: { start: Date; end: Date };
  totalCostCents: number;
  revenueGeneratedCents?: number;
  roi?: number;                         // (revenue - cost) / cost
  costPerLead?: number;
  costPerCampaign?: number;
}

// ============================================
// INVOICING TYPES
// ============================================

/**
 * Invoice Status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Invoice Entity
 */
export interface Invoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  billingPeriod: { start: Date; end: Date };
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  pdfUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice Line Item
 */
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  serviceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tax Configuration
 */
export interface TaxConfiguration {
  workspaceId: string;
  region: string;
  taxRate: number;                      // 0.0825 = 8.25%
  taxType: 'sales_tax' | 'vat' | 'gst';
  taxId?: string;                       // Tax registration number
}

/**
 * Dunning Configuration
 */
export interface DunningConfiguration {
  workspaceId: string;
  enabled: boolean;
  reminders: DunningReminder[];
  suspensionDaysAfterDue: number;
  actions: DunningAction[];
}

export interface DunningReminder {
  daysBeforeDue?: number;               // -7 = 7 days before due
  daysAfterDue?: number;                // 7 = 7 days after due
  channel: AlertChannel;
  template: string;
}

export interface DunningAction {
  daysAfterDue: number;
  action: 'warn' | 'suspend' | 'terminate';
}

// ============================================
// AUDIT TYPES
// ============================================

/**
 * Wallet Audit Log Entry
 */
export interface WalletAuditLog {
  id: string;
  timestamp: Date;
  workspaceId: string;
  action: AuditAction;
  actor: AuditActor;
  before: WalletSnapshot;
  after: WalletSnapshot;
  transactionId?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export enum AuditAction {
  TOPUP = 'topup',
  CHARGE = 'charge',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  LIMIT_CHANGE = 'limit_change',
  STATUS_CHANGE = 'status_change',
  CONFIG_CHANGE = 'config_change',
  RESERVE = 'reserve',
  RELEASE = 'release',
}

export interface AuditActor {
  type: 'user' | 'system' | 'admin' | 'auto_topup';
  userId?: string;
  userName?: string;
  source?: string;
}

export interface WalletSnapshot {
  balanceCents: number;
  reservedCents: number;
  status: WalletStatus;
  timestamp: Date;
}

/**
 * Reconciliation Report
 */
export interface ReconciliationReport {
  workspaceId: string;
  period: { start: Date; end: Date };
  openingBalanceCents: number;
  closingBalanceCents: number;
  totalCreditsCents: number;
  totalDebitsCents: number;
  discrepancyCents: number;
  transactionCount: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  status: 'balanced' | 'discrepancy_found';
}

/**
 * Compliance Report
 */
export interface ComplianceReport {
  workspaceId: string;
  reportType: 'soc2' | 'gdpr' | 'tax' | 'financial';
  period: { start: Date; end: Date };
  generatedAt: Date;
  data: Record<string, unknown>;
  pdfUrl?: string;
}

// ============================================
// PAYMENT METHOD TYPES
// ============================================

/**
 * Payment Method Type
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  BANK_ACCOUNT = 'bank_account',
  PAYPAL = 'paypal',
  STRIPE_WALLET = 'stripe_wallet',
}

/**
 * Payment Method Status
 */
export enum PaymentMethodStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  FAILED = 'failed',
  REMOVED = 'removed',
}

/**
 * Payment Method Entity
 */
export interface PaymentMethod {
  id: string;
  workspaceId: string;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
  isDefault: boolean;
  priority: number;                     // Fallback order (1 = try first)
  limits?: PaymentMethodLimits;
  metadata: PaymentMethodMetadata;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethodLimits {
  maxAmountPerChargeCents?: number;
  maxAmountPerMonthCents?: number;
  currentMonthUsageCents: number;
}

export type PaymentMethodMetadata =
  | CreditCardMetadata
  | BankAccountMetadata
  | PayPalMetadata
  | StripeWalletMetadata;

export interface CreditCardMetadata {
  type: PaymentMethodType.CREDIT_CARD;
  last4: string;
  brand?: string;                       // 'visa', 'mastercard', 'amex'
  expiryMonth: number;
  expiryYear: number;
  fingerprint?: string;
  stripePaymentMethodId: string;
  // Simulation/test fields
  simulateTimeout?: boolean;
  simulateDecline?: boolean;
  failFirstAttempt?: boolean;
  alwaysFail?: boolean;
  slowVerification?: boolean;
  simulateVerificationTimeout?: boolean;
  simulateProviderDown?: boolean;
}

export interface BankAccountMetadata {
  type: PaymentMethodType.BANK_ACCOUNT;
  last4: string;
  bankName: string;
  accountType: 'checking' | 'savings';
  stripePaymentMethodId: string;
}

export interface PayPalMetadata {
  type: PaymentMethodType.PAYPAL;
  email: string;
  paypalAccountId: string;
}

export interface StripeWalletMetadata {
  type: PaymentMethodType.STRIPE_WALLET;
  stripeCustomerId: string;
  balanceCents: number;
}

/**
 * Payment Result
 */
export interface PaymentResult {
  success: boolean;
  amountCents: number;
  paymentMethodId: string;
  transactionId?: string;
  stripeChargeId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fallback Chain
 */
export interface FallbackChain {
  workspaceId: string;
  paymentMethods: string[];             // Ordered list of payment method IDs
  lastSuccessfulId?: string;
  lastAttemptedAt?: Date;
}

// ============================================
// CONSTANTS
// ============================================

export const MIN_BALANCE_CENTS = 100;           // $1.00 minimum balance
export const DEFAULT_TOPUP_THRESHOLD_CENTS = 500; // $5.00 default threshold
export const DEFAULT_GRACE_PERIOD_SECONDS = 86400; // 24 hours
export const MAX_TOPUP_PER_MONTH_CENTS = 100000; // $1,000 max auto-topup
export const DEFAULT_TAX_RATE = 0;              // 0% unless configured
export const INVOICE_DUE_DAYS = 15;             // Net 15 payment terms
export const MAX_RESERVED_PERCENTAGE = 50;      // Max 50% of balance can be reserved

// ============================================
// DATABASE INTERFACES
// ============================================

/**
 * Wallet Database Interface
 */
export interface WalletDB {
  getWallet(workspaceId: string): Promise<Wallet | null>;
  createWallet(wallet: Omit<Wallet, 'createdAt' | 'updatedAt'>): Promise<Wallet>;
  updateWallet(workspaceId: string, updates: Partial<Wallet>): Promise<Wallet>;
  deleteWallet(workspaceId: string): Promise<void>;
  
  updateBalance(workspaceId: string, deltaCents: number): Promise<Wallet>;
  reserveFunds(workspaceId: string, amountCents: number): Promise<Wallet>;
  releaseFunds(workspaceId: string, amountCents: number): Promise<Wallet>;
}

/**
 * Transaction Database Interface
 */
export interface TransactionDB {
  createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | null>;
  listTransactions(filters: TransactionFilters, limit?: number, offset?: number): Promise<Transaction[]>;
  updateTransactionStatus(id: string, status: TransactionStatus): Promise<Transaction>;
  
  createBatch(request: BatchTransactionRequest): Promise<Transaction[]>;
  searchTransactions(query: string, filters?: TransactionFilters): Promise<Transaction[]>;
}

/**
 * Budget Database Interface
 */
export interface BudgetDB {
  getBudget(id: string): Promise<Budget | null>;
  listBudgets(workspaceId: string): Promise<Budget[]>;
  createBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget>;
  updateBudget(id: string, updates: Partial<Budget>): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;
  
  incrementSpent(id: string, amountCents: number): Promise<Budget>;
}

/**
 * Invoice Database Interface
 */
export interface InvoiceDB {
  getInvoice(id: string): Promise<Invoice | null>;
  listInvoices(workspaceId: string, status?: InvoiceStatus): Promise<Invoice[]>;
  createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice>;
  
  markPaid(id: string, paidAt: Date): Promise<Invoice>;
  generateInvoiceNumber(): Promise<string>;
}

/**
 * Payment Method Database Interface
 */
export interface PaymentMethodDB {
  getPaymentMethod(id: string): Promise<PaymentMethod | null>;
  listPaymentMethods(workspaceId: string): Promise<PaymentMethod[]>;
  createPaymentMethod(method: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;
  
  setDefault(id: string): Promise<PaymentMethod>;
  getDefault(workspaceId: string): Promise<PaymentMethod | null>;
  getFallbackChain(workspaceId: string): Promise<PaymentMethod[]>;
}

/**
 * Audit Log Database Interface
 */
export interface AuditLogDB {
  createLog(log: Omit<WalletAuditLog, 'id'>): Promise<WalletAuditLog>;
  getLogs(workspaceId: string, filters?: { startDate?: Date; endDate?: Date; action?: AuditAction }): Promise<WalletAuditLog[]>;
}
