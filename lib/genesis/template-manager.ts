/**
 * PHASE 53: TEMPLATE MANAGER
 * 
 * Central service that orchestrates UUID mapping, variable replacement,
 * and workflow validation for template deployments.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53
 */

import {
  N8nWorkflow,
  MappingResult,
  WorkflowDeploymentRequest,
  GoldenTemplate,
  TemplateCredentialPlaceholder,
  WorkspaceCredential,
  TemplateVariablePlaceholder,
  VariableContext,
} from './mapper-types';

import { UUIDMapper } from './uuid-mapper';
import { VariableMapper, buildVariableContext } from './variable-mapper';
import { WorkflowValidator } from './workflow-validator';

// ============================================
// TEMPLATE MANAGER CLASS
// ============================================

/**
 * Orchestrates the complete workflow mapping process:
 * 1. Load template and placeholders
 * 2. Map credential UUIDs
 * 3. Replace variables
 * 4. Validate result
 * 
 * This is the main entry point for deploying templates to tenants.
 */
export class TemplateManager {
  private uuidMapper: UUIDMapper;
  private variableMapper: VariableMapper;
  private validator: WorkflowValidator;

  constructor() {
    this.uuidMapper = new UUIDMapper({
      strict_mode: true,
      validate_uuid_format: true,
      log_replacements: false,
    });

    this.variableMapper = new VariableMapper({
      strict_mode: true,
      case_sensitive: true,
      escape_special_chars: false,
    });

    this.validator = new WorkflowValidator({
      check_schema: true,
      check_requirements: true,
      check_credentials: true,
      check_connections: true,
      allow_warnings: true,
    });
  }

  /**
   * Process a template for deployment.
   * 
   * This is the main method that:
   * 1. Maps credential UUIDs
   * 2. Replaces variables
   * 3. Validates the result
   */
  async processTemplate(
    template: GoldenTemplate,
    credentialPlaceholders: TemplateCredentialPlaceholder[],
    workspaceCredentials: WorkspaceCredential[],
    variablePlaceholders: TemplateVariablePlaceholder[],
    variableContext: VariableContext
  ): Promise<MappingResult> {
    // Step 1: Build credential map
    const credentialMap: Record<string, string> = {};
    const workspaceCredsByType = new Map<string, string>();

    for (const cred of workspaceCredentials) {
      workspaceCredsByType.set(cred.credential_type, cred.credential_uuid);
    }

    const missingCredentials: string[] = [];

    for (const placeholder of credentialPlaceholders) {
      const tenantUuid = workspaceCredsByType.get(placeholder.credential_type);
      if (tenantUuid) {
        credentialMap[placeholder.placeholder_uuid] = tenantUuid;
      } else if (placeholder.is_required) {
        missingCredentials.push(placeholder.credential_type);
      }
    }

    // Step 2: Map credential UUIDs
    const credentialMappingResult = this.uuidMapper.mapWorkflow(
      template.workflow_json,
      credentialMap
    );

    if (!credentialMappingResult.result.success) {
      return {
        success: false,
        workflow: template.workflow_json,
        credential_mapping: credentialMappingResult.result,
        variable_mapping: {
          success: false,
          replaced_count: 0,
          missing_variables: [],
          errors: ['Credential mapping failed'],
        },
        validation: {
          valid: false,
          errors: [{
            code: 'CREDENTIAL_MAPPING_FAILED',
            message: credentialMappingResult.result.errors.join('; '),
            severity: 'error',
          }],
          warnings: [],
        },
      };
    }

    // Step 3: Build variable map
    const variableMapResult = this.variableMapper.buildVariableMap(
      variableContext,
      variablePlaceholders
    );

    if (variableMapResult.missingVariables.length > 0) {
      return {
        success: false,
        workflow: credentialMappingResult.workflow,
        credential_mapping: credentialMappingResult.result,
        variable_mapping: {
          success: false,
          replaced_count: 0,
          missing_variables: variableMapResult.missingVariables,
          errors: [`Missing variables: ${variableMapResult.missingVariables.join(', ')}`],
        },
        validation: {
          valid: false,
          errors: [{
            code: 'VARIABLE_MAPPING_FAILED',
            message: `Missing required variables: ${variableMapResult.missingVariables.join(', ')}`,
            severity: 'error',
          }],
          warnings: [],
        },
      };
    }

    // Step 4: Replace variables
    const variableMappingResult = this.variableMapper.mapWorkflow(
      credentialMappingResult.workflow,
      variableMapResult.variableMap
    );

    if (!variableMappingResult.result.success) {
      return {
        success: false,
        workflow: credentialMappingResult.workflow,
        credential_mapping: credentialMappingResult.result,
        variable_mapping: variableMappingResult.result,
        validation: {
          valid: false,
          errors: [{
            code: 'VARIABLE_REPLACEMENT_FAILED',
            message: variableMappingResult.result.errors.join('; '),
            severity: 'error',
          }],
          warnings: [],
        },
      };
    }

    // Step 5: Validate the final workflow
    const validationResult = this.validator.validateWorkflow(
      variableMappingResult.workflow,
      template.name
    );

    return {
      success: validationResult.valid,
      workflow: variableMappingResult.workflow,
      credential_mapping: credentialMappingResult.result,
      variable_mapping: variableMappingResult.result,
      validation: validationResult,
    };
  }

  /**
   * Quick deployment preparation (without database lookups).
   */
  prepareDeployment(
    workflow: N8nWorkflow,
    credentialMap: Record<string, string>,
    variableMap: Record<string, string>,
    templateName?: string
  ): MappingResult {
    // Map credentials
    const credResult = this.uuidMapper.mapWorkflow(workflow, credentialMap);

    if (!credResult.result.success) {
      return {
        success: false,
        workflow,
        credential_mapping: credResult.result,
        variable_mapping: {
          success: false,
          replaced_count: 0,
          missing_variables: [],
          errors: ['Credential mapping failed'],
        },
        validation: {
          valid: false,
          errors: [{
            code: 'CREDENTIAL_MAPPING_FAILED',
            message: credResult.result.errors.join('; '),
            severity: 'error',
          }],
          warnings: [],
        },
      };
    }

    // Map variables
    const varResult = this.variableMapper.mapWorkflow(credResult.workflow, variableMap);

    if (!varResult.result.success) {
      return {
        success: false,
        workflow: credResult.workflow,
        credential_mapping: credResult.result,
        variable_mapping: varResult.result,
        validation: {
          valid: false,
          errors: [{
            code: 'VARIABLE_REPLACEMENT_FAILED',
            message: varResult.result.errors.join('; '),
            severity: 'error',
          }],
          warnings: [],
        },
      };
    }

    // Validate
    const validation = this.validator.validateWorkflow(varResult.workflow, templateName);

    return {
      success: validation.valid,
      workflow: varResult.workflow,
      credential_mapping: credResult.result,
      variable_mapping: varResult.result,
      validation,
    };
  }

  /**
   * Dry run deployment (validation only, no actual deployment).
   */
  dryRun(
    template: GoldenTemplate,
    credentialMap: Record<string, string>,
    variableMap: Record<string, string>
  ): MappingResult {
    return this.prepareDeployment(
      template.workflow_json,
      credentialMap,
      variableMap,
      template.name
    );
  }
}

// ============================================
// SINGLETON
// ============================================

let templateManager: TemplateManager | null = null;

/**
 * Get the singleton template manager.
 */
export function getTemplateManager(): TemplateManager {
  if (!templateManager) {
    templateManager = new TemplateManager();
  }
  return templateManager;
}

/**
 * Reset the singleton (for testing).
 */
export function resetTemplateManager(): void {
  templateManager = null;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick template deployment preparation.
 */
export function prepareTemplateDeployment(
  workflow: N8nWorkflow,
  credentialMap: Record<string, string>,
  variableMap: Record<string, string>,
  templateName?: string
): MappingResult {
  const manager = getTemplateManager();
  return manager.prepareDeployment(workflow, credentialMap, variableMap, templateName);
}

/**
 * Build complete variable context from workspace info.
 */
export function buildDeploymentContext(
  workspace: { id: string; slug: string; name?: string },
  user: { id: string; name?: string; email?: string },
  dashboardUrl: string,
  supabaseUrl: string,
  custom?: Record<string, string>
): VariableContext {
  return buildVariableContext(
    workspace,
    user,
    { dashboard_url: dashboardUrl, supabase_url: supabaseUrl },
    custom
  );
}
