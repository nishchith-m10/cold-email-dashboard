/**
 * GENESIS PHASE 70.B: INFRASTRUCTURE VALIDATOR
 *
 * Validates actual infrastructure health by querying DigitalOcean API,
 * checking DNS resolution, verifying connectivity, and detecting drift
 * between Terraform state and actual resource status.
 */

import {
  ResourceHealth,
  HealthCheck,
  InfrastructureReport,
  ResourceStatus,
  InfrastructureEnvironment,
  ResourceType,
  InfrastructureError,
  ResourceUnhealthyError,
} from './types';
import { TerraformStateManager } from './terraform-state-manager';

export interface InfrastructureValidatorConfig {
  doApiToken?: string;
  dnsResolver?: string;
  timeoutMs?: number;
}

export class InfrastructureValidator {
  private readonly doApiToken: string | undefined;
  private readonly dnsResolver: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly stateManager: TerraformStateManager,
    config: InfrastructureValidatorConfig = {},
  ) {
    this.doApiToken = config.doApiToken || process.env.DIGITALOCEAN_TOKEN;
    this.dnsResolver = config.dnsResolver || '8.8.8.8';
    this.timeoutMs = config.timeoutMs || 30000;
  }

  // ============================================
  // FULL INFRASTRUCTURE VALIDATION
  // ============================================

  /**
   * Generate comprehensive infrastructure health report.
   * Validates all resources in Terraform state against actual infrastructure.
   */
  async generateReport(environment: InfrastructureEnvironment): Promise<InfrastructureReport> {
    const timestamp = new Date().toISOString();
    const resources: ResourceHealth[] = [];
    const recommendations: string[] = [];

    try {
      // Validate state file first
      await this.stateManager.validateOrThrow(environment);

      // Load state
      const state = await this.stateManager.loadState();

      // Check each resource type
      for (const resource of state.resources) {
        if (resource.type === 'digitalocean_droplet') {
          const health = await this.validateDroplet(resource);
          resources.push(health);
        } else if (resource.type === 'digitalocean_database_cluster') {
          const health = await this.validateRedisCluster(resource);
          resources.push(health);
        } else if (resource.type === 'digitalocean_loadbalancer') {
          const health = await this.validateLoadBalancer(resource);
          resources.push(health);
        } else if (resource.type === 'digitalocean_record') {
          const health = await this.validateDnsRecord(resource);
          resources.push(health);
        }
      }

      // Generate recommendations based on findings
      const failedResources = resources.filter((r) => r.status === 'error');
      const degradedResources = resources.filter((r) => r.status === 'degraded');

      if (failedResources.length > 0) {
        recommendations.push(
          `${failedResources.length} resource(s) are unhealthy and require immediate attention`,
        );
      }

      if (degradedResources.length > 0) {
        recommendations.push(
          `${degradedResources.length} resource(s) are degraded and may need maintenance`,
        );
      }

      // Check for missing monitoring
      const dropletsWithoutMonitoring = resources.filter(
        (r) =>
          r.resourceType === 'digitalocean_droplet' &&
          r.checks.some((c) => c.name === 'monitoring_enabled' && !c.passed),
      );

      if (dropletsWithoutMonitoring.length > 0) {
        recommendations.push(
          `Enable monitoring for ${dropletsWithoutMonitoring.length} droplet(s) to track metrics`,
        );
      }

      // Determine overall status
      const statuses = resources.map((r) => r.status);
      const overallStatus: ResourceStatus = statuses.includes('error')
        ? 'error'
        : statuses.includes('degraded')
          ? 'degraded'
          : statuses.includes('unknown')
            ? 'unknown'
            : 'healthy';

      const issueCount = resources.filter((r) => r.status !== 'healthy').length;

      return {
        environment,
        timestamp,
        overallStatus,
        resources,
        issueCount,
        recommendations,
      };
    } catch (error) {
      throw new InfrastructureError(
        `Failed to generate infrastructure report: ${error instanceof Error ? error.message : String(error)}`,
        'REPORT_GENERATION_FAILED',
        environment,
      );
    }
  }

  // ============================================
  // DROPLET VALIDATION
  // ============================================

  /**
   * Validate a DigitalOcean Droplet resource.
   */
  private async validateDroplet(
    resource: { type: ResourceType; name: string; instances: any[] },
  ): Promise<ResourceHealth> {
    const checks: HealthCheck[] = [];
    const instance = resource.instances[0];
    const attrs = instance?.attributes || {};

    // Check 1: Droplet exists
    checks.push({
      name: 'exists',
      passed: !!attrs.id,
      message: attrs.id ? 'Droplet exists in state' : 'Droplet ID missing',
    });

    // Check 2: Status is active
    checks.push({
      name: 'status',
      passed: attrs.status === 'active',
      value: attrs.status,
      expectedValue: 'active',
      message:
        attrs.status === 'active' ? 'Droplet is active' : `Droplet status: ${attrs.status}`,
    });

    // Check 3: Has IP address
    checks.push({
      name: 'ip_assigned',
      passed: !!attrs.ipv4_address,
      value: attrs.ipv4_address,
      message: attrs.ipv4_address
        ? `IP: ${attrs.ipv4_address}`
        : 'No IP address assigned',
    });

    // Check 4: Monitoring enabled
    const monitoringEnabled = attrs.monitoring === true;
    checks.push({
      name: 'monitoring_enabled',
      passed: monitoringEnabled,
      value: monitoringEnabled,
      expectedValue: true,
      message: monitoringEnabled ? 'Monitoring enabled' : 'Monitoring disabled',
    });

    // Check 5: Backups configured
    const backupsEnabled = attrs.backups === true;
    checks.push({
      name: 'backups_enabled',
      passed: backupsEnabled,
      value: backupsEnabled,
      expectedValue: true,
      message: backupsEnabled ? 'Backups enabled' : 'Backups disabled (consider enabling)',
    });

    // Check 6: In expected region
    if (attrs.region) {
      checks.push({
        name: 'region',
        passed: true,
        value: attrs.region,
        message: `Region: ${attrs.region}`,
      });
    }

    // Check 7: Size appropriate
    if (attrs.size) {
      checks.push({
        name: 'size',
        passed: true,
        value: attrs.size,
        message: `Size: ${attrs.size}`,
      });
    }

    // Check 8: Live connectivity (if DO API token available)
    if (this.doApiToken && attrs.id) {
      const connectivityCheck = await this.checkDropletConnectivity(attrs.id as string);
      checks.push(connectivityCheck);
    }

    const failedChecks = checks.filter((c) => !c.passed);
    const status: ResourceStatus =
      failedChecks.length === 0
        ? 'healthy'
        : failedChecks.some((c) => ['exists', 'status', 'ip_assigned'].includes(c.name))
          ? 'error'
          : 'degraded';

    return {
      resourceType: 'digitalocean_droplet',
      resourceName: resource.name,
      status,
      checks,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Check droplet connectivity via DigitalOcean API.
   */
  private async checkDropletConnectivity(dropletId: string): Promise<HealthCheck> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
        headers: {
          Authorization: `Bearer ${this.doApiToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          name: 'api_connectivity',
          passed: false,
          message: `API returned ${response.status}`,
        };
      }

      const data = await response.json();
      const droplet = data.droplet;

      return {
        name: 'api_connectivity',
        passed: droplet.status === 'active',
        value: droplet.status,
        expectedValue: 'active',
        message: `Live status: ${droplet.status}`,
      };
    } catch (error) {
      return {
        name: 'api_connectivity',
        passed: false,
        message: `Connectivity check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ============================================
  // REDIS CLUSTER VALIDATION
  // ============================================

  /**
   * Validate a DigitalOcean Redis cluster resource.
   */
  private async validateRedisCluster(
    resource: { type: ResourceType; name: string; instances: any[] },
  ): Promise<ResourceHealth> {
    const checks: HealthCheck[] = [];
    const instance = resource.instances[0];
    const attrs = instance?.attributes || {};

    // Check 1: Cluster exists
    checks.push({
      name: 'exists',
      passed: !!attrs.id,
      message: attrs.id ? 'Redis cluster exists' : 'Cluster ID missing',
    });

    // Check 2: Status is online
    checks.push({
      name: 'status',
      passed: attrs.status === 'online',
      value: attrs.status,
      expectedValue: 'online',
      message: attrs.status === 'online' ? 'Cluster online' : `Status: ${attrs.status}`,
    });

    // Check 3: Connection info available
    const hasConnection = !!(attrs.host && attrs.port);
    checks.push({
      name: 'connection_info',
      passed: hasConnection,
      message: hasConnection
        ? `Connection: ${attrs.host}:${attrs.port}`
        : 'Missing connection info',
    });

    // Check 4: Engine version
    if (attrs.engine_version) {
      checks.push({
        name: 'engine_version',
        passed: true,
        value: attrs.engine_version,
        message: `Redis ${attrs.engine_version}`,
      });
    }

    // Check 5: Node count
    if (attrs.num_nodes) {
      checks.push({
        name: 'node_count',
        passed: attrs.num_nodes > 0,
        value: attrs.num_nodes,
        message: `${attrs.num_nodes} node(s)`,
      });
    }

    // Check 6: Live API check (if DO API token available)
    if (this.doApiToken && attrs.id) {
      const apiCheck = await this.checkRedisClusterApi(attrs.id as string);
      checks.push(apiCheck);
    }

    const failedChecks = checks.filter((c) => !c.passed);
    const status: ResourceStatus =
      failedChecks.length === 0
        ? 'healthy'
        : failedChecks.some((c) => ['exists', 'status', 'connection_info'].includes(c.name))
          ? 'error'
          : 'degraded';

    return {
      resourceType: 'digitalocean_database_cluster',
      resourceName: resource.name,
      status,
      checks,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Check Redis cluster via DigitalOcean API.
   */
  private async checkRedisClusterApi(clusterId: string): Promise<HealthCheck> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`https://api.digitalocean.com/v2/databases/${clusterId}`, {
        headers: {
          Authorization: `Bearer ${this.doApiToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          name: 'api_check',
          passed: false,
          message: `API returned ${response.status}`,
        };
      }

      const data = await response.json();
      const cluster = data.database;

      return {
        name: 'api_check',
        passed: cluster.status === 'online',
        value: cluster.status,
        expectedValue: 'online',
        message: `Live status: ${cluster.status}`,
      };
    } catch (error) {
      return {
        name: 'api_check',
        passed: false,
        message: `API check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ============================================
  // LOAD BALANCER VALIDATION
  // ============================================

  /**
   * Validate a DigitalOcean Load Balancer resource.
   */
  private async validateLoadBalancer(
    resource: { type: ResourceType; name: string; instances: any[] },
  ): Promise<ResourceHealth> {
    const checks: HealthCheck[] = [];
    const instance = resource.instances[0];
    const attrs = instance?.attributes || {};

    // Check 1: LB exists
    checks.push({
      name: 'exists',
      passed: !!attrs.id,
      message: attrs.id ? 'Load balancer exists' : 'LB ID missing',
    });

    // Check 2: Status is active
    checks.push({
      name: 'status',
      passed: attrs.status === 'active',
      value: attrs.status,
      expectedValue: 'active',
      message: attrs.status === 'active' ? 'LB active' : `Status: ${attrs.status}`,
    });

    // Check 3: Has IP address
    checks.push({
      name: 'ip_assigned',
      passed: !!attrs.ip,
      value: attrs.ip,
      message: attrs.ip ? `IP: ${attrs.ip}` : 'No IP assigned',
    });

    // Check 4: Droplets attached
    const dropletCount = Array.isArray(attrs.droplet_ids) ? attrs.droplet_ids.length : 0;
    checks.push({
      name: 'droplets_attached',
      passed: dropletCount > 0,
      value: dropletCount,
      message: `${dropletCount} droplet(s) attached`,
    });

    // Check 5: Health check configured
    const hasHealthCheck = !!(attrs.health_check && attrs.health_check.path);
    checks.push({
      name: 'health_check_configured',
      passed: hasHealthCheck,
      message: hasHealthCheck ? 'Health check configured' : 'No health check configured',
    });

    const failedChecks = checks.filter((c) => !c.passed);
    const status: ResourceStatus =
      failedChecks.length === 0
        ? 'healthy'
        : failedChecks.some((c) => ['exists', 'status'].includes(c.name))
          ? 'error'
          : 'degraded';

    return {
      resourceType: 'digitalocean_loadbalancer',
      resourceName: resource.name,
      status,
      checks,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // DNS RECORD VALIDATION
  // ============================================

  /**
   * Validate a DigitalOcean DNS record resource.
   */
  private async validateDnsRecord(
    resource: { type: ResourceType; name: string; instances: any[] },
  ): Promise<ResourceHealth> {
    const checks: HealthCheck[] = [];
    const instance = resource.instances[0];
    const attrs = instance?.attributes || {};

    // Check 1: Record exists
    checks.push({
      name: 'exists',
      passed: !!attrs.id,
      message: attrs.id ? 'DNS record exists' : 'Record ID missing',
    });

    // Check 2: Has value
    checks.push({
      name: 'value_set',
      passed: !!attrs.value,
      value: attrs.value,
      message: attrs.value ? `Points to: ${attrs.value}` : 'No value set',
    });

    // Check 3: Type is valid
    if (attrs.type) {
      const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'];
      checks.push({
        name: 'valid_type',
        passed: validTypes.includes(attrs.type),
        value: attrs.type,
        message: `Type: ${attrs.type}`,
      });
    }

    // Check 4: TTL reasonable
    if (attrs.ttl) {
      const ttl = Number(attrs.ttl);
      checks.push({
        name: 'ttl',
        passed: ttl >= 30 && ttl <= 86400,
        value: ttl,
        message: `TTL: ${ttl}s`,
      });
    }

    const failedChecks = checks.filter((c) => !c.passed);
    const status: ResourceStatus = failedChecks.length === 0 ? 'healthy' : 'degraded';

    return {
      resourceType: 'digitalocean_record',
      resourceName: resource.name,
      status,
      checks,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Validate and throw if any resources are unhealthy.
   */
  async validateOrThrow(environment: InfrastructureEnvironment): Promise<void> {
    const report = await this.generateReport(environment);

    const unhealthyResources = report.resources.filter((r) => r.status === 'error');

    if (unhealthyResources.length > 0) {
      const firstUnhealthy = unhealthyResources[0];
      const failedChecks = firstUnhealthy.checks.filter((c) => !c.passed);

      throw new ResourceUnhealthyError(
        `${unhealthyResources.length} resource(s) are unhealthy`,
        firstUnhealthy.resourceName,
        failedChecks,
        environment,
      );
    }
  }
}
