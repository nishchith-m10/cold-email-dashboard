/**
 * PHASE 53: DYNAMIC UUID MAPPER - TYPE DEFINITIONS
 * 
 * Types for credential mapping, variable replacement, and workflow validation.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53
 */

// ============================================
// CREDENTIAL MAPPING TYPES
// ============================================

/**
 * Template credential placeholder definition.
 */
export interface TemplateCredentialPlaceholder {
  placeholder_uuid: string;
  credential_type: string;
  description: string;
  is_required: boolean;
}

/**
 * Workspace-specific credential mapping.
 */
export interface WorkspaceCredential {
  credential_type: string;
  credential_uuid: string;
  credential_name: string;
}

/**
 * Complete credential map for replacement.
 * Maps template placeholder UUIDs to actual tenant UUIDs.
 */
export type CredentialMap = Record<string, string>;

// ============================================
// VARIABLE MAPPING TYPES
// ============================================

/**
 * Variable placeholder definition.
 */
export interface TemplateVariablePlaceholder {
  placeholder_key: string;
  variable_type: 'workspace' | 'user' | 'system' | 'custom';
  source_field: string;
  description: string;
  default_value?: string;
  is_required: boolean;
  validation_regex?: string;
}

/**
 * Variable context for replacement.
 */
export interface VariableContext {
  workspace: {
    id: string;
    slug: string;
    name: string;
    partition_name: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  system: {
    dashboard_url: string;
    supabase_url: string;
  };
  custom?: Record<string, string>;
}

/**
 * Complete variable map for replacement.
 */
export type VariableMap = Record<string, string>;

// ============================================
// N8N WORKFLOW TYPES
// ============================================

/**
 * n8n node structure.
 */
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, {
    id: string;
    name: string;
  }>;
  disabled?: boolean;
}

/**
 * n8n workflow structure.
 */
export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  active?: boolean;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown> | null;
  tags?: Array<{ id: string; name: string }>;
  pinData?: Record<string, unknown>;
  versionId?: string;
}

// ============================================
// TEMPLATE TYPES
// ============================================

/**
 * Golden Template definition.
 */
export interface GoldenTemplate {
  id: string;
  name: string;
  version: string;
  display_name: string;
  description: string;
  category: string;
  workflow_json: N8nWorkflow;
  required_node_types: string[];
  required_credential_types: string[];
  forbidden_node_types: string[];
  is_active: boolean;
  is_premium: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Template requirements for validation.
 */
export interface TemplateRequirements {
  requiredNodes: string[];
  requiredCredentials: string[];
  forbiddenNodes?: string[];
  minNodes?: number;
  maxNodes?: number;
}

// ============================================
// MAPPING RESULT TYPES
// ============================================

/**
 * Result of credential mapping operation.
 */
export interface CredentialMappingResult {
  success: boolean;
  mapped_count: number;
  missing_credentials: string[];
  errors: string[];
}

/**
 * Result of variable mapping operation.
 */
export interface VariableMappingResult {
  success: boolean;
  replaced_count: number;
  missing_variables: string[];
  errors: string[];
}

/**
 * Complete mapping result.
 */
export interface MappingResult {
  success: boolean;
  workflow: N8nWorkflow;
  credential_mapping: CredentialMappingResult;
  variable_mapping: VariableMappingResult;
  validation: ValidationResult;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Validation error.
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string[];
  severity: 'error' | 'warning';
}

/**
 * Validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Node validation result.
 */
export interface NodeValidationResult {
  node_id: string;
  node_name: string;
  valid: boolean;
  errors: ValidationError[];
}

// ============================================
// DEPLOYMENT TYPES
// ============================================

/**
 * Workflow deployment request.
 */
export interface WorkflowDeploymentRequest {
  workspace_id: string;
  droplet_id: string;
  template_name: string;
  template_version?: string;
  credential_overrides?: CredentialMap;
  variable_overrides?: VariableMap;
  activate_after_deploy?: boolean;
  dry_run?: boolean;
}

/**
 * Workflow deployment result.
 */
export interface WorkflowDeploymentResult {
  deployment_id: string;
  workflow_id?: string;
  success: boolean;
  mapping_result: MappingResult;
  deployment_duration_ms?: number;
  error?: string;
}

/**
 * Deployment log entry.
 */
export interface DeploymentLogEntry {
  id: string;
  workspace_id: string;
  droplet_id: string;
  template_name: string;
  template_version: string;
  workflow_id?: string;
  workflow_json: N8nWorkflow;
  credential_map: CredentialMap;
  variable_map: VariableMap;
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  deployed_by: string;
  deployment_duration_ms?: number;
  created_at: string;
  completed_at?: string;
}

// ============================================
// MAPPER OPTIONS
// ============================================

/**
 * Options for UUID mapper.
 */
export interface UUIDMapperOptions {
  strict_mode?: boolean;              // Fail if any credential is missing
  preserve_unknown?: boolean;         // Keep UUIDs that aren't in the map
  validate_uuid_format?: boolean;     // Validate UUID format
  log_replacements?: boolean;         // Log all replacements for debugging
}

/**
 * Options for variable mapper.
 */
export interface VariableMapperOptions {
  strict_mode?: boolean;              // Fail if any required variable is missing
  preserve_unknown?: boolean;         // Keep placeholders that aren't in the map
  case_sensitive?: boolean;           // Case-sensitive replacement
  validate_values?: boolean;          // Validate against regex patterns
  escape_special_chars?: boolean;     // Escape special characters in values
}

/**
 * Options for workflow validator.
 */
export interface ValidatorOptions {
  check_schema?: boolean;             // Validate against n8n schema
  check_requirements?: boolean;       // Check template requirements
  check_connections?: boolean;        // Validate node connections
  check_credentials?: boolean;        // Validate credential references
  allow_warnings?: boolean;           // Allow warnings without failing
}

// ============================================
// TEMPLATE MANAGER TYPES
// ============================================

/**
 * Template search filters.
 */
export interface TemplateSearchFilters {
  category?: string;
  is_active?: boolean;
  is_premium?: boolean;
  name_contains?: string;
  version?: string;
}

/**
 * Template usage statistics.
 */
export interface TemplateUsageStats {
  template_name: string;
  version: string;
  total_deployments: number;
  successful_deployments: number;
  failed_deployments: number;
  avg_deployment_time_ms: number;
  last_deployed_at?: string;
}

/**
 * Credential drift detection result.
 */
export interface CredentialDriftResult {
  has_drift: boolean;
  workspace_id: string;
  droplet_id: string;
  missing_credentials: Array<{
    credential_type: string;
    required_by_templates: string[];
  }>;
  invalid_credentials: Array<{
    credential_type: string;
    credential_uuid: string;
    reason: string;
  }>;
  last_verified_at: string;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Replacement operation metadata.
 */
export interface ReplacementOperation {
  original: string;
  replacement: string;
  location: string; // JSON path where replacement occurred
  type: 'credential' | 'variable';
}

/**
 * Mapping statistics.
 */
export interface MappingStatistics {
  total_replacements: number;
  credential_replacements: number;
  variable_replacements: number;
  nodes_processed: number;
  execution_time_ms: number;
}

/**
 * Template validation cache entry.
 */
export interface ValidationCacheEntry {
  template_name: string;
  template_version: string;
  workflow_hash: string;
  validation_result: ValidationResult;
  cached_at: string;
  expires_at: string;
}
