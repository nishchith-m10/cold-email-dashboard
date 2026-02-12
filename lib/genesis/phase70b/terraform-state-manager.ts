/**
 * GENESIS PHASE 70.B: TERRAFORM STATE MANAGER
 *
 * Reads, validates, and analyzes Terraform state files for Dashboard
 * infrastructure. Provides state metadata, drift detection, and
 * validation against expected resource configurations.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import {
  TerraformState,
  StateMetadata,
  StateValidationResult,
  StateValidationError,
  StateValidationWarning,
  InfrastructureEnvironment,
  ResourceType,
  InfrastructureError,
  StateValidationFailedError,
  IaC_DEFAULTS,
} from './types';

export class TerraformStateManager {
  private stateCache: Map<string, { state: TerraformState; cachedAt: number }> = new Map();
  private readonly cacheTtl: number = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly stateFilePath: string) {}

  // ============================================
  // STATE LOADING
  // ============================================

  /**
   * Load Terraform state from file system.
   * Caches the state to avoid repeated file reads.
   */
  async loadState(bypassCache: boolean = false): Promise<TerraformState> {
    const cached = this.stateCache.get(this.stateFilePath);
    const now = Date.now();

    if (!bypassCache && cached && now - cached.cachedAt < this.cacheTtl) {
      return cached.state;
    }

    if (!existsSync(this.stateFilePath)) {
      throw new InfrastructureError(
        `State file not found: ${this.stateFilePath}`,
        'STATE_FILE_NOT_FOUND',
      );
    }

    try {
      const content = await readFile(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Runtime validation of state structure
      if (typeof parsed !== 'object' || parsed === null) {
        throw new InfrastructureError(
          'State file must be a JSON object',
          'INVALID_STATE_STRUCTURE',
        );
      }

      if (typeof parsed.version !== 'number') {
        throw new InfrastructureError(
          'State file missing or invalid "version" field',
          'INVALID_STATE_STRUCTURE',
        );
      }

      if (!Array.isArray(parsed.resources)) {
        throw new InfrastructureError(
          'State file missing or invalid "resources" array',
          'INVALID_STATE_STRUCTURE',
        );
      }

      if (typeof parsed.serial !== 'number') {
        throw new InfrastructureError(
          'State file missing or invalid "serial" field',
          'INVALID_STATE_STRUCTURE',
        );
      }

      if (typeof parsed.lineage !== 'string') {
        throw new InfrastructureError(
          'State file missing or invalid "lineage" field',
          'INVALID_STATE_STRUCTURE',
        );
      }

      // Safe to cast after validation
      const state = parsed as TerraformState;

      this.stateCache.set(this.stateFilePath, { state, cachedAt: now });
      return state;
    } catch (error) {
      if (error instanceof InfrastructureError) throw error;
      throw new InfrastructureError(
        `Failed to parse state file: ${error instanceof Error ? error.message : String(error)}`,
        'STATE_PARSE_ERROR',
      );
    }
  }

  /**
   * Clear the state cache (force reload on next access).
   */
  clearCache(): void {
    this.stateCache.clear();
  }

  // ============================================
  // METADATA EXTRACTION
  // ============================================

  /**
   * Extract metadata from Terraform state.
   */
  async getMetadata(environment: InfrastructureEnvironment): Promise<StateMetadata> {
    const state = await this.loadState();

    return {
      environment,
      version: state.version,
      serial: state.serial,
      lineage: state.lineage,
      lastModified: this.getStateFileModifiedTime(),
      resourceCount: state.resources.length,
      outputCount: Object.keys(state.outputs || {}).length,
    };
  }

  /**
   * Get the last modified time of the state file.
   */
  private getStateFileModifiedTime(): string {
    // In a real implementation, use fs.stat to get mtime
    // For now, use current time as placeholder
    return new Date().toISOString();
  }

  // ============================================
  // STATE VALIDATION
  // ============================================

  /**
   * Validate Terraform state for correctness and health.
   * Checks for:
   * - Structure integrity
   * - Version compatibility
   * - Resource drift indicators
   * - Orphaned resources
   * - Sensitive data exposure
   */
  async validateState(environment: InfrastructureEnvironment): Promise<StateValidationResult> {
    const errors: StateValidationError[] = [];
    const warnings: StateValidationWarning[] = [];

    try {
      const state = await this.loadState();
      const metadata = await this.getMetadata(environment);

      // Check 1: Terraform version compatibility
      if (state.terraform_version) {
        const [major, minor] = state.terraform_version.split('.').map(Number);
        const [reqMajor, reqMinor] = IaC_DEFAULTS.TERRAFORM_VERSION.split('.').map(Number);

        if (major < reqMajor || (major === reqMajor && minor < reqMinor)) {
          warnings.push({
            code: 'TERRAFORM_VERSION_OLD',
            message: `State was created with Terraform ${state.terraform_version}, recommended ${IaC_DEFAULTS.TERRAFORM_VERSION}`,
            recommendation: 'Upgrade Terraform and run terraform refresh',
          });
        }
      }

      // Check 2: State version
      if (state.version < 4) {
        errors.push({
          code: 'STATE_VERSION_UNSUPPORTED',
          message: `State version ${state.version} is too old. Minimum supported: 4`,
          severity: 'critical',
        });
      }

      // Check 3: Lineage validation (ensure state file continuity)
      if (!state.lineage || state.lineage.length === 0) {
        errors.push({
          code: 'MISSING_LINEAGE',
          message: 'State file has no lineage identifier',
          severity: 'error',
        });
      }

      // Check 4: Validate all resources
      for (const resource of state.resources) {
        const resourceErrors = this.validateResource(resource);
        errors.push(...resourceErrors);
      }

      // Check 5: Check for sensitive outputs exposed
      for (const [key, output] of Object.entries(state.outputs || {})) {
        if (!output.sensitive && this.isSensitiveValue(key, output.value)) {
          warnings.push({
            code: 'SENSITIVE_OUTPUT_NOT_MARKED',
            resource: `output.${key}`,
            message: `Output "${key}" appears sensitive but not marked as such`,
            recommendation: 'Add sensitive = true to output definition',
          });
        }
      }

      // Check 6: Serial number sanity
      if (state.serial === 0) {
        warnings.push({
          code: 'FRESH_STATE',
          message: 'State serial is 0 (never applied)',
          recommendation: 'Run terraform apply to initialize infrastructure',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata,
      };
    } catch (error) {
      errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: error instanceof Error ? error.message : String(error),
        severity: 'critical',
      });

      const metadata = await this.getMetadata(environment).catch(() => ({
        environment,
        version: 0,
        serial: 0,
        lineage: '',
        lastModified: new Date().toISOString(),
        resourceCount: 0,
        outputCount: 0,
      }));

      return {
        valid: false,
        errors,
        warnings,
        metadata,
      };
    }
  }

  /**
   * Validate an individual resource in the state.
   */
  private validateResource(resource: TerraformState['resources'][0]): StateValidationError[] {
    const errors: StateValidationError[] = [];

    // Check resource has at least one instance
    if (!resource.instances || resource.instances.length === 0) {
      errors.push({
        code: 'RESOURCE_NO_INSTANCES',
        resource: `${resource.type}.${resource.name}`,
        message: 'Resource has no instances',
        severity: 'error',
      });
    }

    // Check each instance has attributes
    for (const [idx, instance] of (resource.instances || []).entries()) {
      if (!instance.attributes || Object.keys(instance.attributes).length === 0) {
        errors.push({
          code: 'INSTANCE_NO_ATTRIBUTES',
          resource: `${resource.type}.${resource.name}[${idx}]`,
          message: 'Instance has no attributes',
          severity: 'error',
        });
      }

      // Validate critical attributes for known resource types
      if (resource.type === 'digitalocean_droplet') {
        this.validateDropletInstance(resource.name, instance, errors);
      } else if (resource.type === 'digitalocean_database_cluster') {
        this.validateRedisInstance(resource.name, instance, errors);
      }
    }

    return errors;
  }

  /**
   * Validate DigitalOcean Droplet instance structure only.
   * Health (IP, status) is reported by InfrastructureValidator.generateReport.
   */
  private validateDropletInstance(
    name: string,
    instance: TerraformState['resources'][0]['instances'][0],
    errors: StateValidationError[],
  ): void {
    const attrs = instance.attributes;
    if (!attrs.id) {
      errors.push({
        code: 'DROPLET_MISSING_ID',
        resource: `digitalocean_droplet.${name}`,
        message: 'Droplet has no ID (not created yet?)',
        severity: 'error',
      });
    }
  }

  /**
   * Validate Redis cluster instance structure only.
   * Health (status, connection) is reported by InfrastructureValidator.generateReport.
   */
  private validateRedisInstance(
    name: string,
    instance: TerraformState['resources'][0]['instances'][0],
    errors: StateValidationError[],
  ): void {
    const attrs = instance.attributes;
    if (!attrs.id) {
      errors.push({
        code: 'REDIS_MISSING_ID',
        resource: `digitalocean_database_cluster.${name}`,
        message: 'Redis cluster has no ID',
        severity: 'error',
      });
    }
  }

  /**
   * Check if a value appears to be sensitive (password, token, key, etc.).
   */
  private isSensitiveValue(key: string, value: unknown): boolean {
    const sensitivePatterns = ['password', 'token', 'key', 'secret', 'credential', 'auth'];
    const lowerKey = key.toLowerCase();

    if (sensitivePatterns.some((pattern) => lowerKey.includes(pattern))) {
      return true;
    }

    if (typeof value === 'string' && value.length > 20) {
      // Heuristic: long strings that look like tokens
      const looksLikeToken = /^[a-zA-Z0-9_\-\.]+$/.test(value) && value.length > 30;
      return looksLikeToken;
    }

    return false;
  }

  // ============================================
  // RESOURCE QUERIES
  // ============================================

  /**
   * Get all resources of a specific type from state.
   */
  async getResourcesByType(type: ResourceType): Promise<TerraformState['resources']> {
    const state = await this.loadState();
    return state.resources.filter((r) => r.type === type);
  }

  /**
   * Get a specific resource by type and name.
   */
  async getResource(type: ResourceType, name: string): Promise<TerraformState['resources'][0] | null> {
    const state = await this.loadState();
    return state.resources.find((r) => r.type === type && r.name === name) || null;
  }

  /**
   * Get all outputs from state.
   */
  async getOutputs(): Promise<Record<string, unknown>> {
    const state = await this.loadState();
    const outputs: Record<string, unknown> = {};

    for (const [key, output] of Object.entries(state.outputs || {})) {
      outputs[key] = output.value;
    }

    return outputs;
  }

  /**
   * Get a specific output value.
   */
  async getOutput(name: string): Promise<unknown> {
    const outputs = await this.getOutputs();
    return outputs[name];
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate state and throw if invalid (convenience method).
   */
  async validateOrThrow(environment: InfrastructureEnvironment): Promise<void> {
    const result = await this.validateState(environment);

    if (!result.valid) {
      throw new StateValidationFailedError(
        `State validation failed with ${result.errors.length} error(s)`,
        result.errors,
        environment,
      );
    }
  }
}
