/**
 * PHASE 53: UUID MAPPER
 * 
 * Replaces template credential placeholder UUIDs with tenant-specific UUIDs.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53.1
 */

import {
  N8nWorkflow,
  N8nNode,
  CredentialMap,
  CredentialMappingResult,
  UUIDMapperOptions,
  ReplacementOperation,
} from './mapper-types';

// ============================================
// UUID VALIDATION
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format.
 */
function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

// ============================================
// UUID MAPPER CLASS
// ============================================

/**
 * Maps template credential UUIDs to tenant-specific UUIDs in n8n workflows.
 * 
 * ALGORITHM:
 * 1. Serialize workflow to JSON string
 * 2. For each credential mapping, replace all occurrences of template UUID
 * 3. Deserialize back to workflow object
 * 4. Validate that all credential references were mapped
 * 
 * SAFETY:
 * - Validates UUID format before and after replacement
 * - Tracks all replacements for audit trail
 * - Fails fast on strict mode if any required credential is missing
 */
export class UUIDMapper {
  private options: Required<UUIDMapperOptions>;
  private replacements: ReplacementOperation[] = [];

  constructor(options: UUIDMapperOptions = {}) {
    this.options = {
      strict_mode: options.strict_mode ?? true,
      preserve_unknown: options.preserve_unknown ?? false,
      validate_uuid_format: options.validate_uuid_format ?? true,
      log_replacements: options.log_replacements ?? false,
    };
  }

  /**
   * Map credentials in a workflow.
   */
  mapWorkflow(
    workflow: N8nWorkflow,
    credentialMap: CredentialMap
  ): { workflow: N8nWorkflow; result: CredentialMappingResult } {
    // Reset replacements
    this.replacements = [];

    // Validate input
    if (!workflow || !workflow.nodes) {
      return {
        workflow,
        result: {
          success: false,
          mapped_count: 0,
          missing_credentials: [],
          errors: ['Invalid workflow: missing nodes array'],
        },
      };
    }

    if (this.options.validate_uuid_format) {
      const validationErrors = this.validateCredentialMap(credentialMap);
      if (validationErrors.length > 0) {
        return {
          workflow,
          result: {
            success: false,
            mapped_count: 0,
            missing_credentials: [],
            errors: validationErrors,
          },
        };
      }
    }

    // Serialize workflow to JSON
    const workflowStr = JSON.stringify(workflow);

    // Perform replacements
    let mappedStr = workflowStr;
    let mappedCount = 0;

    for (const [templateUuid, tenantUuid] of Object.entries(credentialMap)) {
      const regex = new RegExp(templateUuid, 'g');
      const matches = workflowStr.match(regex);

      if (matches && matches.length > 0) {
        mappedStr = mappedStr.replace(regex, tenantUuid);
        mappedCount += matches.length;

        this.replacements.push({
          original: templateUuid,
          replacement: tenantUuid,
          location: 'workflow.credentials',
          type: 'credential',
        });

        if (this.options.log_replacements) {
          console.log(`[UUIDMapper] Replaced ${matches.length} occurrences: ${templateUuid} → ${tenantUuid}`);
        }
      }
    }

    // Deserialize back to workflow
    const mappedWorkflow: N8nWorkflow = JSON.parse(mappedStr);

    // Check for missing credentials
    const missingCredentials = this.findMissingCredentials(mappedWorkflow, credentialMap);

    // Build result
    const result: CredentialMappingResult = {
      success: missingCredentials.length === 0 || !this.options.strict_mode,
      mapped_count: mappedCount,
      missing_credentials: missingCredentials,
      errors: missingCredentials.length > 0 && this.options.strict_mode
        ? [`Missing credentials: ${missingCredentials.join(', ')}`]
        : [],
    };

    return { workflow: mappedWorkflow, result };
  }

  /**
   * Validate credential map format.
   */
  private validateCredentialMap(credentialMap: CredentialMap): string[] {
    const errors: string[] = [];

    for (const [templateUuid, tenantUuid] of Object.entries(credentialMap)) {
      if (!isValidUUID(templateUuid)) {
        errors.push(`Invalid template UUID format: ${templateUuid}`);
      }

      if (!isValidUUID(tenantUuid)) {
        errors.push(`Invalid tenant UUID format: ${tenantUuid}`);
      }
    }

    return errors;
  }

  /**
   * Find credentials that were not mapped.
   */
  private findMissingCredentials(
    workflow: N8nWorkflow,
    credentialMap: CredentialMap
  ): string[] {
    const missing: Set<string> = new Set();
    const mappedUuids = new Set(Object.keys(credentialMap));

    // Check all nodes for credential references
    for (const node of workflow.nodes) {
      if (node.credentials) {
        for (const [credType, credRef] of Object.entries(node.credentials)) {
          const credId = credRef.id;

          // If this looks like a template UUID and wasn't mapped
          if (isValidUUID(credId) && !Object.values(credentialMap).includes(credId)) {
            // Check if it's a known template UUID
            if (mappedUuids.has(credId)) {
              // This is a template UUID that wasn't replaced (shouldn't happen)
              missing.add(credId);
            } else if (!this.options.preserve_unknown) {
              // Unknown UUID that might need mapping
              missing.add(credId);
            }
          }
        }
      }
    }

    return Array.from(missing);
  }

  /**
   * Get all replacement operations performed.
   */
  getReplacements(): ReplacementOperation[] {
    return [...this.replacements];
  }

  /**
   * Get credential references from a workflow.
   */
  static extractCredentialReferences(workflow: N8nWorkflow): Map<string, Set<string>> {
    const references = new Map<string, Set<string>>();

    for (const node of workflow.nodes) {
      if (node.credentials) {
        for (const [credType, credRef] of Object.entries(node.credentials)) {
          if (!references.has(credType)) {
            references.set(credType, new Set());
          }
          references.get(credType)!.add(credRef.id);
        }
      }
    }

    return references;
  }

  /**
   * Check if a workflow contains any template placeholders.
   */
  static hasTemplatePlaceholders(workflow: N8nWorkflow, placeholders: string[]): boolean {
    const workflowStr = JSON.stringify(workflow);

    for (const placeholder of placeholders) {
      if (workflowStr.includes(placeholder)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a credential map from template and workspace mappings.
   */
  static buildCredentialMap(
    templatePlaceholders: Array<{ placeholder_uuid: string; credential_type: string }>,
    workspaceCredentials: Array<{ credential_type: string; credential_uuid: string }>
  ): { credentialMap: CredentialMap; missingTypes: string[] } {
    const credentialMap: CredentialMap = {};
    const missingTypes: string[] = [];

    // Create lookup map for workspace credentials by type
    const workspaceCredsByType = new Map<string, string>();
    for (const cred of workspaceCredentials) {
      workspaceCredsByType.set(cred.credential_type, cred.credential_uuid);
    }

    // Build mapping
    for (const placeholder of templatePlaceholders) {
      const tenantUuid = workspaceCredsByType.get(placeholder.credential_type);

      if (tenantUuid) {
        credentialMap[placeholder.placeholder_uuid] = tenantUuid;
      } else {
        missingTypes.push(placeholder.credential_type);
      }
    }

    return { credentialMap, missingTypes };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Quick helper to map workflow credentials.
 */
export function mapWorkflowCredentials(
  workflow: N8nWorkflow,
  credentialMap: CredentialMap,
  options?: UUIDMapperOptions
): { workflow: N8nWorkflow; result: CredentialMappingResult } {
  const mapper = new UUIDMapper(options);
  return mapper.mapWorkflow(workflow, credentialMap);
}

/**
 * Validate that all credentials in a workflow are properly mapped.
 */
export function validateCredentialMapping(
  workflow: N8nWorkflow,
  templatePlaceholders: string[]
): { valid: boolean; unmappedPlaceholders: string[] } {
  const workflowStr = JSON.stringify(workflow);
  const unmapped: string[] = [];

  for (const placeholder of templatePlaceholders) {
    if (workflowStr.includes(placeholder)) {
      unmapped.push(placeholder);
    }
  }

  return {
    valid: unmapped.length === 0,
    unmappedPlaceholders: unmapped,
  };
}
