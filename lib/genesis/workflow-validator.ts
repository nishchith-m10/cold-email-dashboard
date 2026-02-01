/**
 * PHASE 53: WORKFLOW VALIDATOR
 * 
 * Validates n8n workflows against schema and template requirements.
 * Prevents malformed workflows from breaking the fleet.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53.4
 */

import { z } from 'zod';
import {
  N8nWorkflow,
  N8nNode,
  ValidationResult,
  ValidationError,
  TemplateRequirements,
  NodeValidationResult,
  ValidatorOptions,
} from './mapper-types';

// ============================================
// ZOD SCHEMAS (n8n Workflow Structure)
// ============================================

/**
 * n8n credential reference schema.
 */
const N8nCredentialRefSchema = z.object({
  id: z.string().uuid('Credential ID must be valid UUID'),
  name: z.string().min(1, 'Credential name cannot be empty'),
});

/**
 * n8n node schema.
 */
const N8nNodeSchema = z.object({
  id: z.string().min(1, 'Node ID cannot be empty'), // n8n allows any string, not just UUIDs
  name: z.string().min(1, 'Node name cannot be empty'),
  type: z.string().regex(/^n8n-nodes-/, 'Node type must start with n8n-nodes-'),
  typeVersion: z.number().int().positive().optional(),
  position: z.tuple([z.number(), z.number()]),
  parameters: z.any(), // Allow any parameters object
  credentials: z.any().optional(), // Allow any credentials object
  disabled: z.boolean().optional(),
});

/**
 * n8n workflow schema.
 */
const N8nWorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Workflow name required'),
  nodes: z.array(N8nNodeSchema).min(1, 'Workflow must have at least one node'),
  connections: z.any(), // Allow any connections object
  active: z.boolean().optional(),
  settings: z.any().optional(), // Allow any settings object
  staticData: z.any().nullable().optional(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  pinData: z.any().optional(),
  versionId: z.string().optional(),
});

// ============================================
// TEMPLATE REQUIREMENTS
// ============================================

/**
 * Default template requirements for common workflows.
 */
export const DEFAULT_TEMPLATE_REQUIREMENTS: Record<string, TemplateRequirements> = {
  email_1: {
    requiredNodes: ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.postgres'],
    requiredCredentials: ['gmailOAuth2', 'postgres'],
    forbiddenNodes: ['n8n-nodes-base.executeCommand'],
    minNodes: 3,
    maxNodes: 50,
  },
  email_2: {
    requiredNodes: ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.postgres', 'n8n-nodes-base.httpRequest'],
    requiredCredentials: ['gmailOAuth2', 'postgres'],
    forbiddenNodes: ['n8n-nodes-base.executeCommand'],
    minNodes: 4,
    maxNodes: 50,
  },
  email_3: {
    requiredNodes: ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.postgres', 'n8n-nodes-base.gmail'],
    requiredCredentials: ['gmailOAuth2', 'postgres'],
    forbiddenNodes: ['n8n-nodes-base.executeCommand'],
    minNodes: 4,
    maxNodes: 50,
  },
  research_report: {
    requiredNodes: ['n8n-nodes-base.webhook', 'n8n-nodes-base.openAi'],
    requiredCredentials: ['openAiApi', 'postgres'],
    forbiddenNodes: ['n8n-nodes-base.executeCommand'],
    minNodes: 3,
    maxNodes: 50,
  },
};

// ============================================
// WORKFLOW VALIDATOR CLASS
// ============================================

/**
 * Validates n8n workflows for schema compliance and template requirements.
 * 
 * VALIDATION LAYERS:
 * 1. Schema validation (Zod) - structural integrity
 * 2. Node count validation - min/max nodes
 * 3. Required nodes validation - must have specific node types
 * 4. Forbidden nodes validation - must NOT have dangerous node types
 * 5. Credential validation - all credentials properly referenced
 * 6. Connection validation - nodes properly connected
 */
export class WorkflowValidator {
  private options: Required<ValidatorOptions>;

  constructor(options: ValidatorOptions = {}) {
    this.options = {
      check_schema: options.check_schema ?? true,
      check_requirements: options.check_requirements ?? true,
      check_connections: options.check_connections ?? true,
      check_credentials: options.check_credentials ?? true,
      allow_warnings: options.allow_warnings ?? true,
    };
  }

  /**
   * Validate a workflow.
   */
  validateWorkflow(
    workflow: N8nWorkflow,
    templateName?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Layer 1: Schema validation
    if (this.options.check_schema) {
      const schemaErrors = this.validateSchema(workflow);
      errors.push(...schemaErrors);

      // If schema is invalid, stop here
      if (schemaErrors.length > 0) {
        return { valid: false, errors, warnings };
      }
    }

    // Layer 2: Template requirements
    if (this.options.check_requirements && templateName) {
      const requirements = DEFAULT_TEMPLATE_REQUIREMENTS[templateName];
      if (requirements) {
        const reqErrors = this.validateRequirements(workflow, requirements);
        errors.push(...reqErrors);
      } else {
        warnings.push({
          code: 'UNKNOWN_TEMPLATE',
          message: `No validation requirements defined for template "${templateName}"`,
          severity: 'warning',
        });
      }
    }

    // Layer 3: Credential validation
    if (this.options.check_credentials) {
      const credErrors = this.validateCredentials(workflow);
      errors.push(...credErrors);
    }

    // Layer 4: Connection validation
    if (this.options.check_connections) {
      const connErrors = this.validateConnections(workflow);
      warnings.push(...connErrors); // Connection issues are warnings, not errors
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate workflow against Zod schema.
   */
  private validateSchema(workflow: N8nWorkflow): ValidationError[] {
    const result = N8nWorkflowSchema.safeParse(workflow);

    if (result.success) {
      return [];
    }

    return result.error.issues.map((err: any) => ({
      code: 'SCHEMA_ERROR',
      message: `${err.path.join('.')}: ${err.message}`,
      path: err.path.map(String),
      severity: 'error' as const,
    }));
  }

  /**
   * Validate against template requirements.
   */
  private validateRequirements(
    workflow: N8nWorkflow,
    requirements: TemplateRequirements
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Node count validation
    if (requirements.minNodes && workflow.nodes.length < requirements.minNodes) {
      errors.push({
        code: 'TOO_FEW_NODES',
        message: `Workflow has ${workflow.nodes.length} nodes, minimum is ${requirements.minNodes}`,
        severity: 'error',
      });
    }

    if (requirements.maxNodes && workflow.nodes.length > requirements.maxNodes) {
      errors.push({
        code: 'TOO_MANY_NODES',
        message: `Workflow has ${workflow.nodes.length} nodes, maximum is ${requirements.maxNodes}`,
        severity: 'error',
      });
    }

    // Collect node types
    const nodeTypes = new Set(workflow.nodes.map(n => n.type));

    // Required nodes validation
    for (const requiredType of requirements.requiredNodes) {
      if (!nodeTypes.has(requiredType)) {
        errors.push({
          code: 'MISSING_REQUIRED_NODE',
          message: `Missing required node type: ${requiredType}`,
          severity: 'error',
        });
      }
    }

    // Forbidden nodes validation
    if (requirements.forbiddenNodes) {
      for (const forbiddenType of requirements.forbiddenNodes) {
        if (nodeTypes.has(forbiddenType)) {
          errors.push({
            code: 'FORBIDDEN_NODE',
            message: `Forbidden node type detected: ${forbiddenType}`,
            severity: 'error',
          });
        }
      }
    }

    // Collect credential types
    const credentialTypes = new Set<string>();
    for (const node of workflow.nodes) {
      if (node.credentials) {
        for (const credType of Object.keys(node.credentials)) {
          credentialTypes.add(credType);
        }
      }
    }

    // Required credentials validation
    for (const requiredCred of requirements.requiredCredentials) {
      if (!credentialTypes.has(requiredCred)) {
        errors.push({
          code: 'MISSING_REQUIRED_CREDENTIAL',
          message: `Missing required credential type: ${requiredCred}`,
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Validate credential references.
   */
  private validateCredentials(workflow: N8nWorkflow): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const node of workflow.nodes) {
      if (node.credentials) {
        for (const [credType, credRef] of Object.entries(node.credentials)) {
          // Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(credRef.id)) {
            errors.push({
              code: 'INVALID_CREDENTIAL_UUID',
              message: `Node "${node.name}" has invalid credential UUID: ${credRef.id}`,
              path: ['nodes', node.id, 'credentials', credType],
              severity: 'error',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate node connections.
   */
  private validateConnections(workflow: N8nWorkflow): ValidationError[] {
    const warnings: ValidationError[] = [];
    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    // Check if connections reference valid nodes
    for (const [sourceNodeId, connections] of Object.entries(workflow.connections)) {
      if (!nodeIds.has(sourceNodeId)) {
        warnings.push({
          code: 'INVALID_CONNECTION_SOURCE',
          message: `Connection references non-existent source node: ${sourceNodeId}`,
          severity: 'warning',
        });
      }

      // Check target nodes
      if (typeof connections === 'object' && connections !== null) {
        for (const outputs of Object.values(connections)) {
          if (Array.isArray(outputs)) {
            for (const outputArray of outputs) {
              if (Array.isArray(outputArray)) {
                for (const connection of outputArray) {
                  if (typeof connection === 'object' && connection !== null && 'node' in connection) {
                    const targetNodeId = (connection as any).node;
                    if (!nodeIds.has(targetNodeId)) {
                      warnings.push({
                        code: 'INVALID_CONNECTION_TARGET',
                        message: `Connection references non-existent target node: ${targetNodeId}`,
                        severity: 'warning',
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Validate individual nodes.
   */
  validateNodes(workflow: N8nWorkflow): NodeValidationResult[] {
    const results: NodeValidationResult[] = [];

    for (const node of workflow.nodes) {
      const errors: ValidationError[] = [];

      // Basic node validation
      if (!node.name || node.name.trim() === '') {
        errors.push({
          code: 'EMPTY_NODE_NAME',
          message: 'Node name cannot be empty',
          severity: 'error',
        });
      }

      if (!node.type || !node.type.startsWith('n8n-nodes-')) {
        errors.push({
          code: 'INVALID_NODE_TYPE',
          message: `Invalid node type: ${node.type}`,
          severity: 'error',
        });
      }

      results.push({
        node_id: node.id,
        node_name: node.name,
        valid: errors.length === 0,
        errors,
      });
    }

    return results;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Quick helper to validate a workflow.
 */
export function validateWorkflow(
  workflow: N8nWorkflow,
  templateName?: string,
  options?: ValidatorOptions
): ValidationResult {
  const validator = new WorkflowValidator(options);
  return validator.validateWorkflow(workflow, templateName);
}

/**
 * Check if a workflow is safe for fleet deployment.
 */
export function isWorkflowSafeForDeployment(
  workflow: N8nWorkflow,
  templateName?: string
): { safe: boolean; reason?: string } {
  const result = validateWorkflow(workflow, templateName, {
    check_schema: true,
    check_requirements: true,
    check_credentials: true,
    check_connections: true,
    allow_warnings: true,
  });

  if (!result.valid) {
    const criticalErrors = result.errors.filter(e => e.severity === 'error');
    return {
      safe: false,
      reason: criticalErrors.map(e => e.message).join('; '),
    };
  }

  return { safe: true };
}

/**
 * Get validation summary.
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    return result.warnings.length > 0
      ? `Valid with ${result.warnings.length} warning(s)`
      : 'Valid';
  }

  return `Invalid: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`;
}
