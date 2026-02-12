/**
 * GENESIS PHASE 70.B: INFRASTRUCTURE AS CODE
 *
 * Terraform state management and infrastructure validation for
 * Dashboard components. Enables reproducible infrastructure deployment,
 * state validation, and health monitoring for non-tenant resources.
 */

// Core services
export { TerraformStateManager } from './terraform-state-manager';
export { InfrastructureValidator } from './infrastructure-validator';
export { DeploymentTracker } from './deployment-tracker';

// Types and interfaces
export type {
  // Terraform state
  TerraformState,
  TerraformOutput,
  TerraformResource,
  TerraformInstance,
  
  // Infrastructure components
  DashboardDropletConfig,
  RedisClusterConfig,
  LoadBalancerConfig,
  ForwardingRule,
  DnsRecordConfig,
  
  // Validation & health
  ResourceHealth,
  HealthCheck,
  InfrastructureReport,
  ResourceStatus,
  
  // Deployment tracking
  DeploymentPlan,
  DeploymentResult,
  ResourceChange,
  DeploymentAction,
  
  // State management
  StateMetadata,
  StateValidationResult,
  StateValidationError,
  StateValidationWarning,
  
  // Enums
  InfrastructureEnvironment,
  ResourceType,
} from './types';

// Error classes
export {
  InfrastructureError,
  StateValidationFailedError,
  ResourceUnhealthyError,
} from './types';

// Constants
export {
  IaC_DEFAULTS,
  DASHBOARD_DROPLET_SIZES,
  REDIS_CLUSTER_SIZES,
} from './types';
