/**
 * PHASE 50: SOVEREIGN DROPLET FACTORY
 * 
 * Core provisioning engine for the Genesis V35 architecture.
 * Handles the complete droplet lifecycle: creation, configuration, and termination.
 * 
 * State Machine: PENDING → PROVISIONING → BOOTING → INITIALIZING → 
 *                HANDSHAKE_PENDING → ACTIVE_HEALTHY
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import {
  DigitalOceanClient,
  createDOClientFromAccount,
  DropletConfig,
  generateSecurePassword,
  generateEncryptionKey,
  generateProvisioningToken,
  generateSslipDomain,
  generateDropletTags,
} from './do-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProvisioningRequest {
  workspaceId: string;
  workspaceSlug: string;
  region: string;                  // "nyc1", "sfo3", "fra1", etc.
  sizeSlug?: string;               // Default: "s-1vcpu-1gb"
  customDomain?: string;           // Optional: "track.acmecorp.com"
  timezone?: string;               // Default: "America/Los_Angeles"
}

export interface ProvisioningResult {
  success: boolean;
  dropletId?: number;
  ipAddress?: string;
  sslipDomain?: string;
  provisioningToken?: string;
  accountUsed?: string;
  error?: string;
  errorCode?: string;
}

export interface AccountSelection {
  accountId: string;
  apiTokenEncrypted: string;
  availableCapacity: number;
}

// ============================================================================
// DROPLET FACTORY CLASS
// ============================================================================

export class DropletFactory {
  private supabase: ReturnType<typeof createClient<Database>>;
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // ==========================================================================
  // MAIN PROVISIONING FLOW
  // ==========================================================================

  /**
   * Provision a new droplet for a workspace
   * 
   * This is the main entry point for the entire provisioning flow.
   * It handles account selection, droplet creation, state tracking, and rollback.
   */
  async provisionDroplet(request: ProvisioningRequest): Promise<ProvisioningResult> {
    let selectedAccount: AccountSelection | null = null;
    let dropletId: number | null = null;

    try {
      // STEP 1: Select account with available capacity
      selectedAccount = await this.selectAccount(request.region);
      
      if (!selectedAccount) {
        return {
          success: false,
          errorCode: 'NO_CAPACITY',
          error: `No DigitalOcean accounts available in region ${request.region}. Please add more accounts or increase limits.`
        };
      }

      console.log(`[DropletFactory] Selected account: ${selectedAccount.accountId} (${selectedAccount.availableCapacity} slots available)`);

      // STEP 2: Create DigitalOcean API client
      const doClient = await createDOClientFromAccount(selectedAccount.accountId);

      // STEP 3: Generate security credentials
      const credentials = {
        provisioningToken: generateProvisioningToken(),
        postgresPassword: generateSecurePassword(),
        n8nEncryptionKey: generateEncryptionKey(),
      };

      // STEP 4: Build Cloud-Init script
      const cloudInitScript = await this.generateCloudInit({
        workspaceId: request.workspaceId,
        workspaceSlug: request.workspaceSlug,
        customDomain: request.customDomain,
        timezone: request.timezone || 'America/Los_Angeles',
        ...credentials,
      });

      // STEP 5: Build droplet configuration
      const dropletConfig: DropletConfig = {
        name: `genesis-${request.workspaceSlug}`,
        region: request.region,
        size: request.sizeSlug || 's-1vcpu-1gb',
        image: 'ubuntu-22-04-x64',
        tags: generateDropletTags(
          selectedAccount.accountId,
          request.workspaceId,
          request.workspaceSlug,
          request.region
        ),
        user_data: cloudInitScript,
        monitoring: true,
        ipv6: false,
        backups: false, // Manual snapshots instead
      };

      // STEP 6: Create droplet via DigitalOcean API
      console.log(`[DropletFactory] Creating droplet: ${dropletConfig.name}`);
      const { droplet } = await doClient.createDroplet(dropletConfig);
      dropletId = droplet.id;

      console.log(`[DropletFactory] Droplet created: ID=${dropletId}`);

      // STEP 7: Extract IP address
      const ipAddress = droplet.networks.v4.find(net => net.type === 'public')?.ip_address;
      
      if (!ipAddress) {
        throw new Error('No public IP address assigned to droplet');
      }

      const sslipDomain = generateSslipDomain(ipAddress);

      // STEP 8: Record droplet in fleet_status table
      await this.recordDropletCreation({
        dropletId: droplet.id,
        workspaceId: request.workspaceId,
        accountId: selectedAccount.accountId,
        region: request.region,
        sizeSlug: droplet.size.slug,
        ipAddress,
        sslipDomain,
        customDomain: request.customDomain,
        provisioningToken: credentials.provisioningToken,
        n8nEncryptionKey: credentials.n8nEncryptionKey,
        postgresPassword: credentials.postgresPassword,
      });

      // STEP 9: Increment account's droplet counter
      await (this.supabase.schema('genesis') as any).rpc('increment_droplet_count', {
        p_account_id: selectedAccount.accountId
      });

      console.log(`[DropletFactory] Provisioning initiated successfully for workspace ${request.workspaceId}`);

      return {
        success: true,
        dropletId: droplet.id,
        ipAddress,
        sslipDomain,
        provisioningToken: credentials.provisioningToken,
        accountUsed: selectedAccount.accountId,
      };

    } catch (error) {
      console.error('[DropletFactory] Provisioning failed:', error);

      // Rollback: Attempt to delete droplet if created
      if (dropletId && selectedAccount) {
        try {
          console.log(`[DropletFactory] Rolling back: Deleting droplet ${dropletId}`);
          const doClient = await createDOClientFromAccount(selectedAccount.accountId);
          await doClient.deleteDroplet(dropletId);
          
          // Decrement account counter
          await (this.supabase.schema('genesis') as any).rpc('decrement_droplet_count', {
            p_account_id: selectedAccount.accountId
          });
          
          // Mark as ORPHAN in fleet_status
          await (this.supabase.schema('genesis') as any).rpc('transition_droplet_state', {
            p_droplet_id: dropletId,
            p_new_state: 'ORPHAN',
            p_reason: error instanceof Error ? error.message : 'Unknown error',
            p_triggered_by: 'system'
          });
          
        } catch (rollbackError) {
          console.error('[DropletFactory] Rollback failed:', rollbackError);
        }
      }

      return {
        success: false,
        errorCode: 'PROVISIONING_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error during provisioning'
      };
    }
  }

  // ==========================================================================
  // ACCOUNT SELECTION (LOAD BALANCING)
  // ==========================================================================

  /**
   * Select the best DigitalOcean account for provisioning
   * 
   * Uses the load-balancing algorithm from genesis.select_account_for_provisioning()
   * which prefers accounts with the most available capacity.
   */
  async selectAccount(region: string): Promise<AccountSelection | null> {
    // Set encryption key for token decryption
    await (this.supabase as any).rpc('set_config', {
      setting_name: 'app.encryption_key',
      setting_value: process.env.INTERNAL_ENCRYPTION_KEY!
    });

    const { data, error } = await (this.supabase.schema('genesis') as any).rpc('select_account_for_provisioning', {
      p_region: region
    });

    if (error) {
      console.error('[DropletFactory] Account selection failed:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const account = data[0];
    return {
      accountId: account.account_id,
      apiTokenEncrypted: account.api_token_encrypted,
      availableCapacity: account.available_capacity
    };
  }

  // ==========================================================================
  // CLOUD-INIT SCRIPT GENERATION
  // ==========================================================================

  /**
   * Generate Cloud-Init script from template
   * 
   * Injects workspace-specific variables into the template.
   */
  async generateCloudInit(variables: {
    workspaceId: string;
    workspaceSlug: string;
    customDomain?: string;
    timezone: string;
    provisioningToken: string;
    postgresPassword: string;
    n8nEncryptionKey: string;
  }): Promise<string> {
    // TODO: Load template from /genesis-phase40/templates/cloud-init.yaml.template
    // For now, return inline template
    
    const template = `#!/bin/bash
set -e

# === CLOUD-INIT USER-DATA SCRIPT ===
# Genesis Phase 50: Sovereign Droplet Factory
# Workspace: ${variables.workspaceSlug}

echo "[CLOUD-INIT] Starting Genesis droplet initialization..."

# === PHASE 1: SURVIVAL MODE (1GB RAM Hardening) ===

# 1.1 Create 4GB Swap (Prevents OOM crashes)
if [ ! -f /swapfile ]; then
    echo "[CLOUD-INIT] Creating 4GB Swap..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "[CLOUD-INIT] Swap active."
fi

# 1.2 Install Docker
if ! command -v docker &> /dev/null; then
    echo "[CLOUD-INIT] Installing Docker..."
    apt-get update -y
    apt-get install -y docker.io docker-compose-v2 curl
    systemctl enable docker
    systemctl start docker
    echo "[CLOUD-INIT] Docker installed."
fi

# 1.3 Configure Docker Log Limits
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# 1.4 Configure Firewall
echo "[CLOUD-INIT] Setting up firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo "[CLOUD-INIT] Firewall active."

# === PHASE 2: APPLICATION DEPLOYMENT ===

mkdir -p /opt/genesis
cd /opt/genesis

# Detect public IP
export DROPLET_IP=$(curl -s ifconfig.me)
echo "[CLOUD-INIT] Droplet IP: $DROPLET_IP"

# Write environment file
cat > .env <<EOF
WORKSPACE_ID=${variables.workspaceId}
WORKSPACE_SLUG=${variables.workspaceSlug}
N8N_DOMAIN=\${DROPLET_IP}.sslip.io
CUSTOM_DOMAIN=${variables.customDomain || ''}
DROPLET_IP=\${DROPLET_IP}
POSTGRES_USER=n8n
POSTGRES_PASSWORD=${variables.postgresPassword}
POSTGRES_DB=n8n
N8N_ENCRYPTION_KEY=${variables.n8nEncryptionKey}
TIMEZONE=${variables.timezone}
DASHBOARD_URL=${process.env.NEXT_PUBLIC_APP_URL}
PROVISIONING_TOKEN=${variables.provisioningToken}
EOF

# TODO: Write docker-compose.yml from template
# TODO: Write Caddyfile from template

echo "[CLOUD-INIT] Cloud-Init complete."
`;

    return template;
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  /**
   * Record droplet creation in fleet_status table
   */
  private async recordDropletCreation(data: {
    dropletId: number;
    workspaceId: string;
    accountId: string;
    region: string;
    sizeSlug: string;
    ipAddress: string;
    sslipDomain: string;
    customDomain?: string;
    provisioningToken: string;
    n8nEncryptionKey: string;
    postgresPassword: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .schema('genesis')
      .from('fleet_status')
      .insert({
        droplet_id: data.dropletId,
        workspace_id: data.workspaceId,
        account_id: data.accountId,
        region: data.region,
        size_slug: data.sizeSlug,
        ip_address: data.ipAddress,
        status: 'INITIALIZING',
        sslip_domain: data.sslipDomain,
        custom_domain: data.customDomain,
        provisioning_token: data.provisioningToken,
        n8n_encryption_key: data.n8nEncryptionKey,
        postgres_password: data.postgresPassword,
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to record droplet in fleet_status: ${error.message}`);
    }

    // Log state transition
    await this.supabase
      .schema('genesis')
      .from('droplet_lifecycle_log')
      .insert({
        droplet_id: data.dropletId,
        workspace_id: data.workspaceId,
        from_state: null,
        to_state: 'INITIALIZING',
        transition_reason: 'droplet_created',
        triggered_by: 'system',
        metadata: {
          account_id: data.accountId,
          region: data.region,
          size: data.sizeSlug,
        }
      });
  }

  // ==========================================================================
  // DROPLET DESTRUCTION
  // ==========================================================================

  /**
   * Destroy a droplet and clean up resources
   * 
   * This is the complete teardown flow, including:
   * - Deleting the droplet from DigitalOcean
   * - Decrementing the account counter
   * - Updating fleet_status to TERMINATED
   * - Logging the termination
   */
  async destroyDroplet(dropletId: number): Promise<void> {
    // Get droplet info
    const { data: droplet, error } = await this.supabase
      .schema('genesis')
      .from('fleet_status')
      .select('*')
      .eq('droplet_id', dropletId)
      .single();

    if (error || !droplet) {
      throw new Error(`Droplet ${dropletId} not found in fleet_status`);
    }

    try {
      // Create DO client for the account
      const doClient = await createDOClientFromAccount(droplet.account_id);

      // Delete droplet from DigitalOcean
      console.log(`[DropletFactory] Deleting droplet ${dropletId} from DigitalOcean`);
      await doClient.deleteDroplet(dropletId);

      // Decrement account counter
      await (this.supabase.schema('genesis') as any).rpc('decrement_droplet_count', {
        p_account_id: droplet.account_id
      });

      // Update state to TERMINATED
      await (this.supabase.schema('genesis') as any).rpc('transition_droplet_state', {
        p_droplet_id: dropletId,
        p_new_state: 'TERMINATED',
        p_reason: 'workspace_deletion',
        p_triggered_by: 'system'
      });

      // Update terminated_at timestamp
      await this.supabase
        .schema('genesis')
        .from('fleet_status')
        .update({ terminated_at: new Date().toISOString() })
        .eq('droplet_id', dropletId);

      console.log(`[DropletFactory] Droplet ${dropletId} destroyed successfully`);

    } catch (error) {
      console.error(`[DropletFactory] Failed to destroy droplet ${dropletId}:`, error);
      throw error;
    }
  }

  // ==========================================================================
  // DROPLET OPERATIONS
  // ==========================================================================

  /**
   * Power off a droplet (for hibernation)
   */
  async hibernateDroplet(dropletId: number): Promise<void> {
    const { data: droplet } = await this.supabase
      .schema('genesis')
      .from('fleet_status')
      .select('account_id')
      .eq('droplet_id', dropletId)
      .single();

    if (!droplet) {
      throw new Error(`Droplet ${dropletId} not found`);
    }

    const doClient = await createDOClientFromAccount(droplet.account_id);
    await doClient.powerOffDroplet(dropletId);

    await (this.supabase.schema('genesis') as any).rpc('transition_droplet_state', {
      p_droplet_id: dropletId,
      p_new_state: 'HIBERNATING',
      p_reason: 'no_active_campaigns',
      p_triggered_by: 'system'
    });
  }

  /**
   * Power on a droplet (from hibernation)
   */
  async wakeDroplet(dropletId: number): Promise<void> {
    const { data: droplet } = await this.supabase
      .schema('genesis')
      .from('fleet_status')
      .select('account_id')
      .eq('droplet_id', dropletId)
      .single();

    if (!droplet) {
      throw new Error(`Droplet ${dropletId} not found`);
    }

    const doClient = await createDOClientFromAccount(droplet.account_id);
    
    // Transition to WAKING first
    await (this.supabase.schema('genesis') as any).rpc('transition_droplet_state', {
      p_droplet_id: dropletId,
      p_new_state: 'WAKING',
      p_reason: 'campaign_started',
      p_triggered_by: 'system'
    });

    // Power on
    await doClient.powerOnDroplet(dropletId);

    // Wait for boot (will transition to ACTIVE_HEALTHY via heartbeat)
  }

  /**
   * Reboot a droplet (for recovery from ZOMBIE state)
   */
  async rebootDroplet(dropletId: number): Promise<void> {
    const { data: droplet } = await this.supabase
      .schema('genesis')
      .from('fleet_status')
      .select('account_id')
      .eq('droplet_id', dropletId)
      .single();

    if (!droplet) {
      throw new Error(`Droplet ${dropletId} not found`);
    }

    const doClient = await createDOClientFromAccount(droplet.account_id);
    
    await (this.supabase.schema('genesis') as any).rpc('transition_droplet_state', {
      p_droplet_id: dropletId,
      p_new_state: 'REBOOTING',
      p_reason: 'zombie_recovery',
      p_triggered_by: 'watchdog'
    });

    await doClient.rebootDroplet(dropletId);
  }

  // ==========================================================================
  // FLEET MONITORING
  // ==========================================================================

  /**
   * Get account pool health
   */
  async getAccountPoolHealth() {
    const { data, error } = await this.supabase
      .schema('genesis')
      .from('account_pool_health')
      .select('*');

    if (error) {
      throw new Error(`Failed to get account pool health: ${error.message}`);
    }

    return data;
  }

  /**
   * Get fleet health summary
   */
  async getFleetHealthSummary() {
    const { data, error } = await this.supabase
      .schema('genesis')
      .from('fleet_health_summary')
      .select('*');

    if (error) {
      throw new Error(`Failed to get fleet health summary: ${error.message}`);
    }

    return data;
  }

  /**
   * Detect zombie droplets
   */
  async detectZombieDroplets() {
    const { data, error } = await (this.supabase.schema('genesis') as any).rpc('detect_zombie_droplets');

    if (error) {
      throw new Error(`Failed to detect zombie droplets: ${error.message}`);
    }

    return data;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let factoryInstance: DropletFactory | null = null;

export function getDropletFactory(): DropletFactory {
  if (!factoryInstance) {
    factoryInstance = new DropletFactory();
  }
  return factoryInstance;
}
