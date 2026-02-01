/**
 * SIDECAR CLIENT - Dashboard Integration
 * 
 * Provides high-level interface for Dashboard to communicate with Sidecar agents.
 * Handles:
 * - Command dispatching
 * - Health aggregation
 * - Fleet-wide operations
 * - Response handling
 */

import axios, { AxiosInstance } from 'axios';
import {
  SidecarCommandBuilder,
  SidecarCommand,
  SidecarCommandResponse,
  CommandQueue,
} from './sidecar-commands';

// ============================================
// TYPES
// ============================================

export interface DropletInfo {
  id: string;
  workspace_id: string;
  sidecar_url: string;
  status: 'active' | 'inactive' | 'provisioning';
}

export interface HealthStatus {
  droplet_id: string;
  workspace_id: string;
  timestamp: string;
  n8n_status: 'healthy' | 'degraded' | 'down';
  container_status: string;
  cpu_percent?: number;
  memory_usage_mb?: number;
  uptime_seconds?: number;
}

export interface FleetStatus {
  total_droplets: number;
  healthy_droplets: number;
  degraded_droplets: number;
  down_droplets: number;
  last_updated: Date;
}

// ============================================
// SIDECAR CLIENT
// ============================================

export class SidecarClient {
  private commandBuilder: SidecarCommandBuilder;
  private commandQueue: CommandQueue;
  private httpClient: AxiosInstance;

  constructor(privateKey: string) {
    this.commandBuilder = new SidecarCommandBuilder(privateKey);
    this.commandQueue = new CommandQueue();

    this.httpClient = axios.create({
      timeout: 30000, // 30s timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Start cleanup interval
    setInterval(() => {
      this.commandQueue.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * SINGLE DROPLET OPERATIONS
   */

  /**
   * Send command to specific droplet
   */
  async sendCommand(
    droplet: DropletInfo,
    action: SidecarCommand,
    payload?: any
  ): Promise<SidecarCommandResponse> {
    const { jwt, request } = this.commandBuilder.buildCommand(
      droplet.workspace_id,
      droplet.id,
      action,
      payload
    );

    try {
      const response = await this.httpClient.post(
        `${droplet.sidecar_url}/command`,
        request,
        {
          headers: {
            'X-Genesis-JWT': jwt,
          },
        }
      );

      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        execution_time_ms: 0,
      };
    }
  }

  /**
   * Check health of specific droplet
   */
  async checkHealth(droplet: DropletInfo): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'HEALTH_CHECK');
  }

  /**
   * Deploy workflow to specific droplet
   */
  async deployWorkflow(
    droplet: DropletInfo,
    workflowJson: any,
    credentialMap?: Record<string, string>
  ): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'DEPLOY_WORKFLOW', {
      workflow_json: workflowJson,
      credential_map: credentialMap,
    });
  }

  /**
   * Activate workflow on specific droplet
   */
  async activateWorkflow(
    droplet: DropletInfo,
    workflowId: string
  ): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'ACTIVATE_WORKFLOW', {
      workflow_id: workflowId,
    });
  }

  /**
   * Inject credential to specific droplet
   */
  async injectCredential(
    droplet: DropletInfo,
    credentialType: string,
    credentialName: string,
    encryptedData: any
  ): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'INJECT_CREDENTIAL', {
      credential_type: credentialType,
      credential_name: credentialName,
      encrypted_data: encryptedData,
    });
  }

  /**
   * Restart n8n on specific droplet
   */
  async restartN8n(droplet: DropletInfo): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'RESTART_N8N');
  }

  /**
   * Get logs from specific droplet
   */
  async getLogs(
    droplet: DropletInfo,
    lines?: number,
    since?: string
  ): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'GET_LOGS', {
      lines,
      since,
    });
  }

  /**
   * Collect metrics from specific droplet
   */
  async collectMetrics(
    droplet: DropletInfo,
    since?: string
  ): Promise<SidecarCommandResponse> {
    return this.sendCommand(droplet, 'COLLECT_METRICS', {
      since,
    });
  }

  /**
   * FLEET-WIDE OPERATIONS
   */

  /**
   * Deploy workflow to multiple droplets (with concurrency control)
   */
  async deployWorkflowToFleet(
    droplets: DropletInfo[],
    workflowJson: any,
    credentialMapProvider: (workspaceId: string) => Record<string, string>,
    concurrency: number = 10
  ): Promise<Map<string, SidecarCommandResponse>> {
    const results = new Map<string, SidecarCommandResponse>();

    // Process in batches
    for (let i = 0; i < droplets.length; i += concurrency) {
      const batch = droplets.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (droplet) => {
          const credentialMap = credentialMapProvider(droplet.workspace_id);
          const response = await this.deployWorkflow(droplet, workflowJson, credentialMap);
          return { dropletId: droplet.id, response };
        })
      );

      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.dropletId, result.value.response);
        } else {
          results.set('unknown', {
            success: false,
            error: result.reason,
            execution_time_ms: 0,
          });
        }
      }

      // Small delay between batches to avoid overwhelming network
      if (i + concurrency < droplets.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Check health of entire fleet
   */
  async checkFleetHealth(droplets: DropletInfo[]): Promise<FleetStatus> {
    const results = await Promise.allSettled(
      droplets.map((droplet) => this.checkHealth(droplet))
    );

    let healthy = 0;
    let degraded = 0;
    let down = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        const status = result.value.result?.n8n_status;
        if (status === 'healthy') healthy++;
        else if (status === 'degraded') degraded++;
        else down++;
      } else {
        down++;
      }
    }

    return {
      total_droplets: droplets.length,
      healthy_droplets: healthy,
      degraded_droplets: degraded,
      down_droplets: down,
      last_updated: new Date(),
    };
  }

  /**
   * Restart n8n on all droplets with degraded health
   */
  async restartDegradedDroplets(
    droplets: DropletInfo[],
    healthStatuses: Map<string, HealthStatus>
  ): Promise<Map<string, SidecarCommandResponse>> {
    const degradedDroplets = droplets.filter((droplet) => {
      const health = healthStatuses.get(droplet.id);
      return health?.n8n_status === 'degraded';
    });

    const results = new Map<string, SidecarCommandResponse>();

    for (const droplet of degradedDroplets) {
      const response = await this.restartN8n(droplet);
      results.set(droplet.id, response);

      // Wait 5 seconds between restarts to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return results;
  }

  /**
   * Pull new image on all droplets (Blue-Green prep)
   */
  async pullImageFleet(
    droplets: DropletInfo[],
    imageName: string,
    tag: string,
    concurrency: number = 5
  ): Promise<Map<string, SidecarCommandResponse>> {
    const results = new Map<string, SidecarCommandResponse>();

    // Process in batches (image pulls are slow and network-intensive)
    for (let i = 0; i < droplets.length; i += concurrency) {
      const batch = droplets.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (droplet) => {
          const response = await this.sendCommand(droplet, 'PULL_IMAGE', {
            image_name: imageName,
            tag,
          });
          return { dropletId: droplet.id, response };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.dropletId, result.value.response);
        }
      }

      console.log(`Pulled image on batch ${i / concurrency + 1}/${Math.ceil(droplets.length / concurrency)}`);
    }

    return results;
  }

  /**
   * Swap containers on all droplets (Blue-Green deployment)
   */
  async swapContainersFleet(
    droplets: DropletInfo[],
    newImageTag: string,
    concurrency: number = 5
  ): Promise<Map<string, SidecarCommandResponse>> {
    const results = new Map<string, SidecarCommandResponse>();

    // Process in batches
    for (let i = 0; i < droplets.length; i += concurrency) {
      const batch = droplets.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (droplet) => {
          const response = await this.sendCommand(droplet, 'SWAP_CONTAINER', {
            new_image_tag: newImageTag,
          });
          return { dropletId: droplet.id, response };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.dropletId, result.value.response);
        }
      }

      console.log(`Swapped containers on batch ${i / concurrency + 1}/${Math.ceil(droplets.length / concurrency)}`);

      // Wait 10 seconds between batches to ensure stability
      if (i + concurrency < droplets.length) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    return results;
  }

  /**
   * CREDENTIAL ROTATION
   */

  /**
   * Rotate credential across fleet
   */
  async rotateCredentialFleet(
    droplets: DropletInfo[],
    credentialId: string,
    encryptedDataProvider: (workspaceId: string) => any,
    concurrency: number = 10
  ): Promise<Map<string, SidecarCommandResponse>> {
    const results = new Map<string, SidecarCommandResponse>();

    for (let i = 0; i < droplets.length; i += concurrency) {
      const batch = droplets.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (droplet) => {
          const encryptedData = encryptedDataProvider(droplet.workspace_id);
          const response = await this.sendCommand(droplet, 'ROTATE_CREDENTIAL', {
            credential_id: credentialId,
            encrypted_data: encryptedData,
          });
          return { dropletId: droplet.id, response };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.set(result.value.dropletId, result.value.response);
        }
      }
    }

    return results;
  }

  /**
   * METRICS AGGREGATION
   */

  /**
   * Collect metrics from entire fleet
   */
  async collectFleetMetrics(
    droplets: DropletInfo[],
    since?: string
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const metricResults = await Promise.allSettled(
      droplets.map(async (droplet) => {
        const response = await this.collectMetrics(droplet, since);
        return { dropletId: droplet.id, metrics: response.result };
      })
    );

    for (const result of metricResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.dropletId, result.value.metrics);
      }
    }

    return results;
  }

  /**
   * Aggregate metrics across fleet
   */
  aggregateMetrics(metricsMap: Map<string, any>): {
    total_executions: number;
    total_success: number;
    total_failed: number;
    avg_success_rate: number;
    avg_duration_ms: number;
  } {
    let totalExecutions = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    let count = 0;

    for (const metrics of metricsMap.values()) {
      if (metrics) {
        totalExecutions += metrics.executions_total || 0;
        totalSuccess += metrics.executions_success || 0;
        totalFailed += metrics.executions_failed || 0;
        totalDuration += metrics.avg_duration_ms || 0;
        count++;
      }
    }

    return {
      total_executions: totalExecutions,
      total_success: totalSuccess,
      total_failed: totalFailed,
      avg_success_rate: totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0,
      avg_duration_ms: count > 0 ? totalDuration / count : 0,
    };
  }
}
