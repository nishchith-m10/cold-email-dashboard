/**
 * PHASE 64: Droplet Configuration Service
 * 
 * Manages droplet region and size selection during onboarding.
 * Stores infrastructure preferences for provisioning.
 */

import {
  DropletRegion,
  DropletSize,
  DropletRegionInfo,
  DropletSizeInfo,
  WorkspaceInfrastructureConfig,
} from './credential-vault-types';

// ============================================
// REGION DEFINITIONS
// ============================================

export const DROPLET_REGIONS: Record<DropletRegion, DropletRegionInfo> = {
  'us-east': {
    code: 'us-east',
    name: 'United States - East',
    location: 'Virginia, USA',
    doSlug: 'nyc3',
    suprabaseRegion: 'us-east-1',
    gdprCompliant: false,
    latencyDescription: 'Fastest for US East Coast',
  },
  'us-west': {
    code: 'us-west',
    name: 'United States - West',
    location: 'San Francisco, USA',
    doSlug: 'sfo3',
    suprabaseRegion: 'us-west-1',
    gdprCompliant: false,
    latencyDescription: 'Fastest for US West Coast',
  },
  'eu-west': {
    code: 'eu-west',
    name: 'Europe - West',
    location: 'Frankfurt, Germany',
    doSlug: 'fra1',
    suprabaseRegion: 'eu-central-1',
    gdprCompliant: true,
    latencyDescription: 'GDPR compliant, fastest for EU',
  },
  'eu-north': {
    code: 'eu-north',
    name: 'Europe - North',
    location: 'London, UK',
    doSlug: 'lon1',
    suprabaseRegion: 'eu-west-2',
    gdprCompliant: true,
    latencyDescription: 'GDPR compliant, fastest for UK',
  },
  'apac': {
    code: 'apac',
    name: 'Asia Pacific',
    location: 'Singapore',
    doSlug: 'sgp1',
    suprabaseRegion: 'ap-southeast-1',
    gdprCompliant: false,
    latencyDescription: 'Fastest for Asia Pacific',
  },
};

// ============================================
// SIZE DEFINITIONS
// ============================================

export const DROPLET_SIZES: Record<DropletSize, DropletSizeInfo> = {
  'starter': {
    tier: 'starter',
    doSlug: 's-1vcpu-1gb',
    vcpu: 1,
    ram: 1,
    ssd: 25,
    monthlyPrice: 6.00,
    description: '1 vCPU, 1 GB RAM, 25 GB SSD',
    useCase: 'Perfect for: 1-5 sequences, ~500 leads/day',
  },
  'professional': {
    tier: 'professional',
    doSlug: 's-1vcpu-2gb',
    vcpu: 1,
    ram: 2,
    ssd: 50,
    monthlyPrice: 12.00,
    description: '1 vCPU, 2 GB RAM, 50 GB SSD',
    useCase: 'Perfect for: 5-15 sequences, ~2,000 leads/day',
  },
  'scale': {
    tier: 'scale',
    doSlug: 's-2vcpu-4gb',
    vcpu: 2,
    ram: 4,
    ssd: 80,
    monthlyPrice: 24.00,
    description: '2 vCPU, 4 GB RAM, 80 GB SSD',
    useCase: 'Perfect for: 15+ sequences, ~10,000 leads/day',
  },
  'enterprise': {
    tier: 'enterprise',
    doSlug: 's-4vcpu-8gb',
    vcpu: 4,
    ram: 8,
    ssd: 160,
    monthlyPrice: 48.00,
    description: '4 vCPU, 8 GB RAM, 160 GB SSD',
    useCase: 'Perfect for: Agencies, 20+ sequences, unlimited leads',
  },
};

// ============================================
// DEFAULT SELECTIONS
// ============================================

export const DEFAULT_REGION: DropletRegion = 'us-east';
export const DEFAULT_SIZE: DropletSize = 'starter';

// ============================================
// DROPLET CONFIGURATION SERVICE
// ============================================

export interface DropletConfigServiceConfig {
  supabaseClient: any;
}

export class DropletConfigurationService {
  private supabase: any;

  constructor(config: DropletConfigServiceConfig) {
    this.supabase = config.supabaseClient;
  }

  // ============================================
  // REGION OPERATIONS
  // ============================================

  /**
   * Get all available regions
   */
  getAvailableRegions(): DropletRegionInfo[] {
    return Object.values(DROPLET_REGIONS);
  }

  /**
   * Get region info
   */
  getRegionInfo(region: DropletRegion): DropletRegionInfo | null {
    return DROPLET_REGIONS[region] || null;
  }

  /**
   * Get GDPR-compliant regions
   */
  getGDPRRegions(): DropletRegionInfo[] {
    return Object.values(DROPLET_REGIONS).filter(r => r.gdprCompliant);
  }

  // ============================================
  // SIZE OPERATIONS
  // ============================================

  /**
   * Get all available sizes
   */
  getAvailableSizes(): DropletSizeInfo[] {
    return Object.values(DROPLET_SIZES);
  }

  /**
   * Get size info
   */
  getSizeInfo(size: DropletSize): DropletSizeInfo | null {
    return DROPLET_SIZES[size] || null;
  }

  /**
   * Get recommended size based on requirements
   */
  getRecommendedSize(requirements: {
    sequences?: number;
    leadsPerDay?: number;
  }): DropletSize {
    if (requirements.sequences && requirements.sequences > 15) {
      return 'scale';
    }
    if (requirements.sequences && requirements.sequences > 5) {
      return 'professional';
    }
    if (requirements.leadsPerDay && requirements.leadsPerDay > 2000) {
      return 'scale';
    }
    if (requirements.leadsPerDay && requirements.leadsPerDay > 500) {
      return 'professional';
    }
    return 'starter';
  }

  // ============================================
  // CONFIGURATION STORAGE
  // ============================================

  /**
   * Save workspace infrastructure configuration
   */
  async saveConfiguration(
    workspaceId: string,
    region: DropletRegion,
    size: DropletSize
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate region and size
      if (!DROPLET_REGIONS[region]) {
        return { success: false, error: 'Invalid region' };
      }
      if (!DROPLET_SIZES[size]) {
        return { success: false, error: 'Invalid size' };
      }

      const result = await this.supabase
        .from('genesis.workspace_infrastructure')
        .upsert({
          workspace_id: workspaceId,
          region,
          size,
          selected_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id',
        });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      };
    }
  }

  /**
   * Get workspace infrastructure configuration
   */
  async getConfiguration(
    workspaceId: string
  ): Promise<{
    success: boolean;
    config?: WorkspaceInfrastructureConfig;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('genesis.workspace_infrastructure')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        // Not found is okay, return defaults
        if (error.code === 'PGRST116') {
          return {
            success: true,
            config: {
              workspaceId,
              region: DEFAULT_REGION,
              size: DEFAULT_SIZE,
              selectedAt: new Date(),
            },
          };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        config: {
          workspaceId: data.workspace_id,
          region: data.region,
          size: data.size,
          selectedAt: new Date(data.selected_at),
          provisionedAt: data.provisioned_at ? new Date(data.provisioned_at) : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration',
      };
    }
  }

  /**
   * Update workspace size (upgrade/downgrade)
   */
  async updateSize(
    workspaceId: string,
    newSize: DropletSize
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!DROPLET_SIZES[newSize]) {
        return { success: false, error: 'Invalid size' };
      }

      const result = await this.supabase
        .from('genesis.workspace_infrastructure')
        .update({
          size: newSize,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update size',
      };
    }
  }

  // ============================================
  // COST CALCULATION
  // ============================================

  /**
   * Calculate monthly cost for configuration
   */
  calculateMonthlyCost(size: DropletSize): number {
    const sizeInfo = DROPLET_SIZES[size];
    return sizeInfo ? sizeInfo.monthlyPrice : 0;
  }

  /**
   * Calculate yearly cost with discount
   */
  calculateYearlyCost(size: DropletSize, discountPercent: number = 0): number {
    const monthly = this.calculateMonthlyCost(size);
    const yearly = monthly * 12;
    return yearly * (1 - discountPercent / 100);
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate configuration before provisioning
   */
  validateConfiguration(
    region: DropletRegion,
    size: DropletSize
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!DROPLET_REGIONS[region]) {
      errors.push(`Invalid region: ${region}`);
    }

    if (!DROPLET_SIZES[size]) {
      errors.push(`Invalid size: ${size}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
