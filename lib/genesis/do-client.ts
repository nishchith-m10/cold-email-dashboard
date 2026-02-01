/**
 * PHASE 50: DIGITALOCEAN API CLIENT
 * 
 * Wrapper around DigitalOcean API v2 for droplet provisioning.
 * Handles authentication, rate limiting, and error handling.
 * 
 * API Documentation: https://docs.digitalocean.com/reference/api/api-reference/
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DropletConfig {
  name: string;                    // "genesis-{workspace_id}"
  region: string;                  // "nyc1", "sfo3", "fra1", etc.
  size: string;                    // "s-1vcpu-1gb" ($6/month)
  image: string | number;          // "ubuntu-22-04-x64" or snapshot ID
  ssh_keys?: number[];             // SSH key IDs for root access
  backups?: boolean;               // Enable automatic backups
  ipv6?: boolean;                  // Enable IPv6
  monitoring?: boolean;            // Enable DigitalOcean monitoring agent
  tags?: string[];                 // Tags for organization
  user_data?: string;              // Cloud-Init script
  vpc_uuid?: string;               // VPC network UUID
}

export interface Droplet {
  id: number;                      // DigitalOcean droplet ID
  name: string;
  status: 'new' | 'active' | 'off' | 'archive';
  networks: {
    v4: Array<{
      ip_address: string;
      netmask: string;
      gateway: string;
      type: 'public' | 'private';
    }>;
    v6: Array<{
      ip_address: string;
      netmask: number;
      gateway: string;
      type: 'public';
    }>;
  };
  region: {
    name: string;
    slug: string;
    available: boolean;
  };
  size: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
    transfer: number;
    price_monthly: number;
    price_hourly: number;
  };
  image: {
    id: number;
    name: string;
    distribution: string;
    slug: string;
  };
  created_at: string;
  tags: string[];
}

export interface DropletCreateResponse {
  droplet: Droplet;
  links: {
    actions: Array<{
      id: number;
      rel: string;
      href: string;
    }>;
  };
}

export interface ActionStatus {
  action: {
    id: number;
    status: 'in-progress' | 'completed' | 'errored';
    type: string;
    started_at: string;
    completed_at: string | null;
    resource_id: number;
    resource_type: string;
    region: {
      name: string;
      slug: string;
    };
  };
}

export interface DOClientError extends Error {
  status?: number;
  id?: string;
  message: string;
}

// ============================================================================
// DIGITALOCEAN API CLIENT
// ============================================================================

export class DigitalOceanClient {
  private apiToken: string;
  private baseUrl = 'https://api.digitalocean.com/v2';
  private rateLimit = {
    limit: 5000,              // 5000 requests per hour
    remaining: 5000,
    reset: Date.now() + 3600000
  };

  constructor(apiToken: string) {
    if (!apiToken || !apiToken.startsWith('dop_v1_')) {
      throw new Error('Invalid DigitalOcean API token format. Expected: dop_v1_...');
    }
    this.apiToken = apiToken;
  }

  // ==========================================================================
  // CORE API METHODS
  // ==========================================================================

  /**
   * Make authenticated request to DigitalOcean API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // Update rate limit info from headers
      this.updateRateLimit(response.headers);

      // Handle errors
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const error = new Error(
          errorBody.message || `DigitalOcean API error: ${response.status}`
        ) as DOClientError;
        error.status = response.status;
        error.id = errorBody.id;
        throw error;
      }

      // Parse response
      const data = await response.json();
      return data as T;

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`DigitalOcean API request failed: ${String(error)}`);
    }
  }

  /**
   * Update rate limit tracking from response headers
   */
  private updateRateLimit(headers: Headers): void {
    const limit = headers.get('ratelimit-limit');
    const remaining = headers.get('ratelimit-remaining');
    const reset = headers.get('ratelimit-reset');

    if (limit) this.rateLimit.limit = parseInt(limit);
    if (remaining) this.rateLimit.remaining = parseInt(remaining);
    if (reset) this.rateLimit.reset = parseInt(reset) * 1000; // Convert to ms
  }

  /**
   * Check if we're approaching rate limit
   */
  public getRateLimitStatus() {
    return {
      ...this.rateLimit,
      utilizationPct: ((this.rateLimit.limit - this.rateLimit.remaining) / this.rateLimit.limit) * 100,
      resetsIn: Math.max(0, this.rateLimit.reset - Date.now())
    };
  }

  // ==========================================================================
  // DROPLET OPERATIONS
  // ==========================================================================

  /**
   * Create a new droplet
   */
  async createDroplet(config: DropletConfig): Promise<DropletCreateResponse> {
    return this.request<DropletCreateResponse>('POST', '/droplets', config);
  }

  /**
   * Get droplet details by ID
   */
  async getDroplet(dropletId: number): Promise<{ droplet: Droplet }> {
    return this.request<{ droplet: Droplet }>('GET', `/droplets/${dropletId}`);
  }

  /**
   * List all droplets
   */
  async listDroplets(params?: {
    tag_name?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ droplets: Droplet[]; links: any; meta: any }> {
    const query = new URLSearchParams();
    if (params?.tag_name) query.set('tag_name', params.tag_name);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.per_page) query.set('per_page', params.per_page.toString());

    const endpoint = `/droplets${query.toString() ? '?' + query.toString() : ''}`;
    return this.request('GET', endpoint);
  }

  /**
   * Delete a droplet
   */
  async deleteDroplet(dropletId: number): Promise<void> {
    await this.request('DELETE', `/droplets/${dropletId}`);
  }

  /**
   * Power on a droplet
   */
  async powerOnDroplet(dropletId: number): Promise<{ action: any }> {
    return this.request('POST', `/droplets/${dropletId}/actions`, {
      type: 'power_on'
    });
  }

  /**
   * Power off a droplet
   */
  async powerOffDroplet(dropletId: number): Promise<{ action: any }> {
    return this.request('POST', `/droplets/${dropletId}/actions`, {
      type: 'power_off'
    });
  }

  /**
   * Reboot a droplet
   */
  async rebootDroplet(dropletId: number): Promise<{ action: any }> {
    return this.request('POST', `/droplets/${dropletId}/actions`, {
      type: 'reboot'
    });
  }

  /**
   * Get action status
   */
  async getActionStatus(actionId: number): Promise<ActionStatus> {
    return this.request<ActionStatus>('GET', `/actions/${actionId}`);
  }

  /**
   * Wait for action to complete (with timeout)
   */
  async waitForAction(
    actionId: number, 
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const { action } = await this.getActionStatus(actionId);
      
      if (action.status === 'completed') {
        return;
      }
      
      if (action.status === 'errored') {
        throw new Error(`DigitalOcean action ${actionId} failed`);
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`Timeout waiting for action ${actionId} to complete`);
  }

  // ==========================================================================
  // SNAPSHOTS & IMAGES
  // ==========================================================================

  /**
   * List available images
   */
  async listImages(type?: 'distribution' | 'application'): Promise<any> {
    const query = type ? `?type=${type}` : '';
    return this.request('GET', `/images${query}`);
  }

  /**
   * Get image by slug
   */
  async getImageBySlug(slug: string): Promise<any> {
    return this.request('GET', `/images/${slug}`);
  }

  // ==========================================================================
  // REGIONS & SIZES
  // ==========================================================================

  /**
   * List available regions
   */
  async listRegions(): Promise<any> {
    return this.request('GET', '/regions');
  }

  /**
   * List available sizes
   */
  async listSizes(): Promise<any> {
    return this.request('GET', '/sizes');
  }

  // ==========================================================================
  // TAGS
  // ==========================================================================

  /**
   * Create a tag
   */
  async createTag(name: string): Promise<any> {
    return this.request('POST', '/tags', { name });
  }

  /**
   * Tag a droplet
   */
  async tagDroplet(dropletId: number, tag: string): Promise<void> {
    await this.request('POST', `/tags/${tag}/resources`, {
      resources: [{
        resource_id: dropletId.toString(),
        resource_type: 'droplet'
      }]
    });
  }
}

// ============================================================================
// FACTORY FUNCTION WITH SUPABASE INTEGRATION
// ============================================================================

/**
 * Create a DigitalOcean client using encrypted token from database
 */
export async function createDOClientFromAccount(
  accountId: string
): Promise<DigitalOceanClient> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Set encryption key in session (required for decryption function)
  await supabase.rpc('set_config', {
    setting_name: 'app.encryption_key',
    setting_value: process.env.INTERNAL_ENCRYPTION_KEY!
  });

  // Decrypt token
  const { data: token, error } = await supabase.rpc('decrypt_do_token', {
    p_account_id: accountId
  });

  if (error || !token) {
    throw new Error(`Failed to decrypt DO token for account ${accountId}: ${error?.message}`);
  }

  return new DigitalOceanClient(token);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate Cloud-Init user-data from template
 */
export function generateCloudInitScript(variables: Record<string, string>): string {
  // This will be implemented in cloud-init.yaml.template
  // For now, return a placeholder
  return `#!/bin/bash
# Cloud-Init script generated by Genesis
# Variables: ${JSON.stringify(variables)}
`;
}

/**
 * Generate secure passwords and tokens
 */
export function generateSecurePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  
  return password;
}

export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateProvisioningToken(): string {
  return `prov_${generateEncryptionKey()}`;
}

/**
 * Parse sslip.io domain from IP
 */
export function generateSslipDomain(ipAddress: string): string {
  return `${ipAddress}.sslip.io`;
}

/**
 * Generate droplet tags for organization
 */
export function generateDropletTags(
  accountId: string,
  workspaceId: string,
  workspaceSlug: string,
  region: string
): string[] {
  return [
    `genesis:account:${accountId}`,
    `genesis:workspace_id:${workspaceId}`,
    `genesis:workspace_slug:${workspaceSlug}`,
    `genesis:region:${region}`,
    `genesis:provisioned_at:${new Date().toISOString()}`,
  ];
}
