/**
 * N8N MANAGER - n8n API Client
 * 
 * Wraps the n8n REST API for:
 * - Credential management (CRUD)
 * - Workflow deployment/activation
 * - Health checks
 * - Execution queries
 */

import axios, { AxiosInstance } from 'axios';

export interface N8nCredential {
  id?: string;
  name: string;
  type: string;
  data: Record<string, any>;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: any[];
  connections: any;
  settings?: any;
  active?: boolean;
}

export interface N8nHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  version?: string;
  executions?: {
    waiting: number;
    running: number;
  };
}

export interface N8nMetrics {
  executions_total: number;
  executions_success: number;
  executions_failed: number;
  avg_duration_ms: number;
  since: string;
}

/**
 * N8n Manager Class
 * Manages all interactions with the n8n API
 */
export class N8nManager {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30s timeout
    });
  }

  /**
   * HEALTH OPERATIONS
   */

  async getHealth(): Promise<N8nHealthStatus> {
    try {
      // Try to get workflow list as health check
      const response = await this.client.get('/workflows', {
        params: { limit: 1 },
      });

      // Check if there are any stuck executions
      const execResponse = await this.client.get('/executions', {
        params: { status: 'running', limit: 100 },
      });

      const runningCount = execResponse.data?.data?.length || 0;

      return {
        status: runningCount > 50 ? 'degraded' : 'healthy',
        executions: {
          waiting: 0, // n8n doesn't expose this easily
          running: runningCount,
        },
      };
    } catch (error) {
      console.error('n8n health check failed:', error);
      return {
        status: 'down',
      };
    }
  }

  /**
   * CREDENTIAL OPERATIONS
   */

  async createCredential(credential: N8nCredential): Promise<string> {
    try {
      const response = await this.client.post('/credentials', {
        name: credential.name,
        type: credential.type,
        data: credential.data,
      });

      return response.data.id;
    } catch (error) {
      throw new Error(
        `Failed to create credential: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async updateCredential(credentialId: string, data: Record<string, any>): Promise<void> {
    try {
      await this.client.patch(`/credentials/${credentialId}`, {
        data,
      });
    } catch (error) {
      throw new Error(
        `Failed to update credential: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deleteCredential(credentialId: string): Promise<void> {
    try {
      await this.client.delete(`/credentials/${credentialId}`);
    } catch (error) {
      throw new Error(
        `Failed to delete credential: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listCredentials(): Promise<N8nCredential[]> {
    try {
      const response = await this.client.get('/credentials');
      return response.data.data || [];
    } catch (error) {
      throw new Error(
        `Failed to list credentials: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * WORKFLOW OPERATIONS
   */

  async createWorkflow(workflow: N8nWorkflow): Promise<{ id: string; webhookUrl?: string }> {
    try {
      const response = await this.client.post('/workflows', {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || {},
        active: false, // Always create inactive, then activate explicitly
      });

      const workflowId = response.data.id;

      // Extract webhook URL if present
      const webhookNode = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.webhook');
      const webhookUrl = webhookNode
        ? `${this.baseUrl}/webhook/${webhookNode.webhookId || workflowId}`
        : undefined;

      return { id: workflowId, webhookUrl };
    } catch (error) {
      throw new Error(
        `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<void> {
    try {
      await this.client.patch(`/workflows/${workflowId}`, workflow);
    } catch (error) {
      throw new Error(
        `Failed to update workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.patch(`/workflows/${workflowId}`, {
        active: true,
      });
    } catch (error) {
      throw new Error(
        `Failed to activate workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deactivateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.patch(`/workflows/${workflowId}`, {
        active: false,
      });
    } catch (error) {
      throw new Error(
        `Failed to deactivate workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.delete(`/workflows/${workflowId}`);
    } catch (error) {
      throw new Error(
        `Failed to delete workflow: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * METRICS OPERATIONS
   */

  async getMetrics(since?: Date): Promise<N8nMetrics> {
    try {
      const params: any = {
        limit: 1000,
      };

      if (since) {
        params.startedAfter = since.toISOString();
      }

      const response = await this.client.get('/executions', { params });

      const executions = response.data.data || [];

      const total = executions.length;
      const success = executions.filter((e: any) => e.finished && !e.stoppedAt).length;
      const failed = executions.filter((e: any) => e.stoppedAt).length;

      // Calculate average duration
      const durations = executions
        .filter((e: any) => e.finished && e.startedAt)
        .map((e: any) => {
          const start = new Date(e.startedAt).getTime();
          const end = new Date(e.stoppedAt || e.finished).getTime();
          return end - start;
        });

      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      return {
        executions_total: total,
        executions_success: success,
        executions_failed: failed,
        avg_duration_ms: Math.round(avgDuration),
        since: since?.toISOString() || 'all-time',
      };
    } catch (error) {
      throw new Error(
        `Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * LOG OPERATIONS
   */

  async getExecutionLogs(limit: number = 100): Promise<any[]> {
    try {
      const response = await this.client.get('/executions', {
        params: { limit },
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(
        `Failed to get logs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
