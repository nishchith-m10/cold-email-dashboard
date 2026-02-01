/**
 * PHASE 53: VARIABLE MAPPER
 * 
 * Replaces template variable placeholders with workspace-specific values.
 * Handles: YOUR_DASHBOARD_URL, YOUR_WORKSPACE_ID, YOUR_NAME, etc.
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Phase 53.1.3
 */

import {
  N8nWorkflow,
  VariableMap,
  VariableContext,
  VariableMappingResult,
  VariableMapperOptions,
  ReplacementOperation,
  TemplateVariablePlaceholder,
} from './mapper-types';

// ============================================
// VARIABLE EXTRACTION
// ============================================

/**
 * Extract value from context using dot notation path.
 * Example: "workspace.partition_name" → context.workspace.partition_name
 */
function extractContextValue(context: VariableContext, path: string): string | undefined {
  const parts = path.split('.');
  let value: any = context;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  return typeof value === 'string' ? value : String(value);
}

// ============================================
// VARIABLE MAPPER CLASS
// ============================================

/**
 * Maps template variable placeholders to workspace-specific values.
 * 
 * ALGORITHM:
 * 1. Serialize workflow to JSON string
 * 2. For each variable mapping, replace all occurrences
 * 3. Deserialize back to workflow object
 * 4. Validate that all required variables were replaced
 * 
 * SAFETY:
 * - Escapes special characters to prevent injection
 * - Validates values against regex patterns
 * - Fails fast on strict mode if any required variable is missing
 */
export class VariableMapper {
  private options: Required<VariableMapperOptions>;
  private replacements: ReplacementOperation[] = [];

  constructor(options: VariableMapperOptions = {}) {
    this.options = {
      strict_mode: options.strict_mode ?? true,
      preserve_unknown: options.preserve_unknown ?? false,
      case_sensitive: options.case_sensitive ?? true,
      validate_values: options.validate_values ?? true,
      escape_special_chars: options.escape_special_chars ?? false,
    };
  }

  /**
   * Map variables in a workflow.
   */
  mapWorkflow(
    workflow: N8nWorkflow,
    variableMap: VariableMap
  ): { workflow: N8nWorkflow; result: VariableMappingResult } {
    // Reset replacements
    this.replacements = [];

    // Validate input
    if (!workflow || !workflow.nodes) {
      return {
        workflow,
        result: {
          success: false,
          replaced_count: 0,
          missing_variables: [],
          errors: ['Invalid workflow: missing nodes array'],
        },
      };
    }

    // Serialize workflow to JSON
    const workflowStr = JSON.stringify(workflow);

    // Perform replacements
    let mappedStr = workflowStr;
    let replacedCount = 0;

    for (const [placeholder, value] of Object.entries(variableMap)) {
      // Escape special characters if needed
      const safeValue = this.options.escape_special_chars
        ? this.escapeSpecialChars(value)
        : value;

      // Create regex based on case sensitivity
      const flags = this.options.case_sensitive ? 'g' : 'gi';
      const regex = new RegExp(this.escapeRegex(placeholder), flags);
      
      const matches = workflowStr.match(regex);

      if (matches && matches.length > 0) {
        mappedStr = mappedStr.replace(regex, safeValue);
        replacedCount += matches.length;

        this.replacements.push({
          original: placeholder,
          replacement: safeValue,
          location: 'workflow.variables',
          type: 'variable',
        });
      }
    }

    // Deserialize back to workflow
    const mappedWorkflow: N8nWorkflow = JSON.parse(mappedStr);

    // Check for missing variables
    const missingVariables = this.findMissingVariables(mappedWorkflow, variableMap);

    // Build result
    const result: VariableMappingResult = {
      success: missingVariables.length === 0 || !this.options.strict_mode,
      replaced_count: replacedCount,
      missing_variables: missingVariables,
      errors: missingVariables.length > 0 && this.options.strict_mode
        ? [`Missing variables: ${missingVariables.join(', ')}`]
        : [],
    };

    return { workflow: mappedWorkflow, result };
  }

  /**
   * Build variable map from context and placeholders.
   */
  buildVariableMap(
    context: VariableContext,
    placeholders: TemplateVariablePlaceholder[]
  ): { variableMap: VariableMap; missingVariables: string[] } {
    const variableMap: VariableMap = {};
    const missingVariables: string[] = [];

    for (const placeholder of placeholders) {
      // Extract value from context
      const value = extractContextValue(context, placeholder.source_field);

      if (value !== undefined) {
        // Validate value if pattern provided
        if (this.options.validate_values && placeholder.validation_regex) {
          const regex = new RegExp(placeholder.validation_regex);
          if (!regex.test(value)) {
            missingVariables.push(
              `${placeholder.placeholder_key} (invalid format: ${value})`
            );
            continue;
          }
        }

        variableMap[placeholder.placeholder_key] = value;
      } else if (placeholder.default_value) {
        // Use default value
        variableMap[placeholder.placeholder_key] = placeholder.default_value;
      } else if (placeholder.is_required) {
        // Required but missing
        missingVariables.push(placeholder.placeholder_key);
      }
    }

    return { variableMap, missingVariables };
  }

  /**
   * Escape special characters for JSON safety.
   */
  private escapeSpecialChars(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Escape regex special characters.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Find variables that were not replaced.
   */
  private findMissingVariables(
    workflow: N8nWorkflow,
    variableMap: VariableMap
  ): string[] {
    const missing: Set<string> = new Set();
    const workflowStr = JSON.stringify(workflow);

    // Common placeholder patterns
    const placeholderPatterns = [
      /YOUR_[A-Z_]+/g,
      /\{\{[A-Z_]+\}\}/g,
    ];

    for (const pattern of placeholderPatterns) {
      const matches = workflowStr.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (!Object.keys(variableMap).includes(match) && !this.options.preserve_unknown) {
            missing.add(match);
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
   * Extract all placeholder variables from a workflow.
   */
  static extractPlaceholders(workflow: N8nWorkflow): string[] {
    const workflowStr = JSON.stringify(workflow);
    const placeholders: Set<string> = new Set();

    // Match YOUR_* pattern
    const matches1 = workflowStr.match(/YOUR_[A-Z_]+/g);
    if (matches1) {
      matches1.forEach(m => placeholders.add(m));
    }

    // Match {{VAR}} pattern
    const matches2 = workflowStr.match(/\{\{[A-Z_]+\}\}/g);
    if (matches2) {
      matches2.forEach(m => placeholders.add(m));
    }

    return Array.from(placeholders);
  }
}

// ============================================
// STANDARD VARIABLE BUILDERS
// ============================================

/**
 * Build standard workspace variables.
 */
export function buildWorkspaceVariables(workspace: {
  id: string;
  slug: string;
  name?: string;
}): VariableMap {
  return {
    YOUR_WORKSPACE_ID: workspace.id,
    YOUR_WORKSPACE_SLUG: workspace.slug,
    YOUR_WORKSPACE_NAME: workspace.name || workspace.slug,
    YOUR_LEADS_TABLE: `genesis.leads_p_${workspace.slug}`,
  };
}

/**
 * Build standard user variables.
 */
export function buildUserVariables(user: {
  id: string;
  name?: string;
  email?: string;
}): VariableMap {
  return {
    YOUR_USER_ID: user.id,
    YOUR_NAME: user.name || 'User',
    YOUR_SENDER_EMAIL: user.email || '',
  };
}

/**
 * Build standard system variables.
 */
export function buildSystemVariables(config: {
  dashboard_url: string;
  supabase_url: string;
}): VariableMap {
  return {
    YOUR_DASHBOARD_URL: config.dashboard_url,
    YOUR_SUPABASE_URL: config.supabase_url,
  };
}

/**
 * Build complete variable context.
 */
export function buildVariableContext(
  workspace: { id: string; slug: string; name?: string },
  user: { id: string; name?: string; email?: string },
  system: { dashboard_url: string; supabase_url: string },
  custom?: Record<string, string>
): VariableContext {
  return {
    workspace: {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name || workspace.slug,
      partition_name: `genesis.leads_p_${workspace.slug}`,
    },
    user: {
      id: user.id,
      name: user.name || 'User',
      email: user.email || '',
    },
    system: {
      dashboard_url: system.dashboard_url,
      supabase_url: system.supabase_url,
    },
    custom,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Quick helper to map workflow variables.
 */
export function mapWorkflowVariables(
  workflow: N8nWorkflow,
  variableMap: VariableMap,
  options?: VariableMapperOptions
): { workflow: N8nWorkflow; result: VariableMappingResult } {
  const mapper = new VariableMapper(options);
  return mapper.mapWorkflow(workflow, variableMap);
}

/**
 * Validate that all variables in a workflow are properly mapped.
 */
export function validateVariableMapping(
  workflow: N8nWorkflow,
  expectedPlaceholders: string[]
): { valid: boolean; unmappedPlaceholders: string[] } {
  const workflowStr = JSON.stringify(workflow);
  const unmapped: string[] = [];

  for (const placeholder of expectedPlaceholders) {
    if (workflowStr.includes(placeholder)) {
      unmapped.push(placeholder);
    }
  }

  return {
    valid: unmapped.length === 0,
    unmappedPlaceholders: unmapped,
  };
}
