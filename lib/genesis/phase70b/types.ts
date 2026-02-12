/**
 * GENESIS PHASE 70.B: INFRASTRUCTURE AS CODE TYPES
 *
 * Type definitions for Terraform state management, infrastructure
 * validation, and deployment tracking for Dashboard components.
 */

// ============================================
// TERRAFORM STATE STRUCTURES
// ============================================

export type InfrastructureEnvironment = 'staging' | 'production' | 'development';

export type ResourceType =
  | 'digitalocean_droplet'
  | 'digitalocean_database_cluster'
  | 'digitalocean_loadbalancer'
  | 'digitalocean_record'
  | 'digitalocean_certificate';

export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: Record<string, TerraformOutput>;
  resources: TerraformResource[];
}

export interface TerraformOutput {
  value: unknown;
  type: string;
  sensitive: boolean;
}

export interface TerraformResource {
  mode: 'managed' | 'data';
  type: ResourceType;
  name: string;
  provider: string;
  instances: TerraformInstance[];
}

export interface TerraformInstance {
  schema_version: number;
  attributes: Record<string, unknown>;
  dependencies: string[];
  create_before_destroy: boolean;
}

// ============================================
// INFRASTRUCTURE COMPONENTS
// ============================================

export interface DashboardDropletConfig {
  name: string;
  region: string;
  size: string;
  image: string;
  tags: string[];
  userData?: string;
  sshKeys?: string[];
  monitoring: boolean;
  backups: boolean;
}

export interface RedisClusterConfig {
  name: string;
  region: string;
  engine: 'redis';
  version: string;
  size: string;
  nodeCount: number;
  maintenanceWindow?: {
    day: string;
    hour: string;
  };
}

export interface LoadBalancerConfig {
  name: string;
  region: string;
  algorithm: 'round_robin' | 'least_connections';
  healthCheck: {
    port: number;
    protocol: 'http' | 'https';
    path: string;
    checkIntervalSeconds: number;
    responseTimeoutSeconds: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
  forwardingRules: ForwardingRule[];
}

export interface ForwardingRule {
  entryPort: number;
  entryProtocol: 'http' | 'https' | 'tcp';
  targetPort: number;
  targetProtocol: 'http' | 'https' | 'tcp';
  certificateName?: string;
  tlsPassthrough?: boolean;
}

export interface DnsRecordConfig {
  domain: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

// ============================================
// VALIDATION & HEALTH
// ============================================

export type ResourceStatus = 'healthy' | 'degraded' | 'error' | 'unknown';

export interface ResourceHealth {
  resourceType: ResourceType;
  resourceName: string;
  status: ResourceStatus;
  checks: HealthCheck[];
  lastCheckedAt: string;
}

export interface HealthCheck {
  name: string;
  passed: boolean;
  message?: string;
  value?: unknown;
  expectedValue?: unknown;
}

export interface InfrastructureReport {
  environment: InfrastructureEnvironment;
  timestamp: string;
  overallStatus: ResourceStatus;
  resources: ResourceHealth[];
  issueCount: number;
  recommendations: string[];
}

// ============================================
// DEPLOYMENT TRACKING
// ============================================

export type DeploymentAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'recreate'
  | 'no_change';

export interface DeploymentPlan {
  environment: InfrastructureEnvironment;
  createdAt: string;
  changes: ResourceChange[];
  totalChanges: number;
  safeToApply: boolean;
  warnings: string[];
}

export interface ResourceChange {
  action: DeploymentAction;
  resourceType: ResourceType;
  resourceName: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  requiresRecreate: boolean;
  affectedDependencies: string[];
}

export interface DeploymentResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  appliedChanges: number;
  failedChanges: number;
  outputs: Record<string, unknown>;
  error?: string;
}

// ============================================
// STATE MANAGEMENT
// ============================================

export interface StateMetadata {
  environment: InfrastructureEnvironment;
  version: number;
  serial: number;
  lineage: string;
  lastModified: string;
  resourceCount: number;
  outputCount: number;
}

export interface StateValidationResult {
  valid: boolean;
  errors: StateValidationError[];
  warnings: StateValidationWarning[];
  metadata: StateMetadata;
}

export interface StateValidationError {
  code: string;
  resource?: string;
  message: string;
  severity: 'critical' | 'error';
}

export interface StateValidationWarning {
  code: string;
  resource?: string;
  message: string;
  recommendation?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const IaC_DEFAULTS = {
  TERRAFORM_VERSION: '1.6.0',
  STATE_FILE_NAME: 'terraform.tfstate',
  LOCK_TIMEOUT_SECONDS: 300,
  MAX_PARALLEL_RESOURCES: 10,
  HEALTH_CHECK_INTERVAL_MS: 60_000, // 1 minute
  STATE_BACKUP_RETENTION_DAYS: 30,
} as const;

export const DASHBOARD_DROPLET_SIZES = {
  small: 's-1vcpu-2gb', // Development
  medium: 's-2vcpu-4gb', // Staging
  large: 's-4vcpu-8gb', // Production
} as const;

export const REDIS_CLUSTER_SIZES = {
  small: 'db-s-1vcpu-1gb', // Development
  medium: 'db-s-2vcpu-2gb', // Staging
  large: 'db-s-4vcpu-8gb', // Production
} as const;

// ============================================
// ERROR CLASSES
// ============================================

export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly environment?: InfrastructureEnvironment,
  ) {
    super(message);
    this.name = 'InfrastructureError';
  }
}

export class StateValidationFailedError extends InfrastructureError {
  constructor(
    message: string,
    public readonly errors: StateValidationError[],
    environment?: InfrastructureEnvironment,
  ) {
    super(message, 'STATE_VALIDATION_FAILED', environment);
    this.name = 'StateValidationFailedError';
  }
}

export class ResourceUnhealthyError extends InfrastructureError {
  constructor(
    message: string,
    public readonly resourceName: string,
    public readonly failedChecks: HealthCheck[],
    environment?: InfrastructureEnvironment,
  ) {
    super(message, 'RESOURCE_UNHEALTHY', environment);
    this.name = 'ResourceUnhealthyError';
  }
}
