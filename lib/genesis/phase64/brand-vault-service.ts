/**
 * PHASE 64: Brand Vault Service
 * 
 * Manages company brand information for cold email personalization.
 * Supports both manual entry and auto-scraping from website.
 */

import { BrandInfo } from './credential-vault-types';

// ============================================
// BRAND VAULT SERVICE
// ============================================

export interface BrandVaultServiceConfig {
  supabaseClient: any;
}

export class BrandVaultService {
  private supabase: any;

  constructor(config: BrandVaultServiceConfig) {
    this.supabase = config.supabaseClient;
  }

  // ============================================
  // CREATE/UPDATE BRAND INFO
  // ============================================

  /**
   * Store brand information
   */
  async storeBrandInfo(
    workspaceId: string,
    brandData: {
      companyName: string;
      website?: string;
      industry?: string;
      description?: string;
      logoUrl?: string;
      tone?: 'professional' | 'casual' | 'friendly' | 'formal';
      targetAudience?: string;
      products?: string[];
      autoScraped?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.supabase
        .schema('genesis').from('brand_vault')
        .upsert({
          workspace_id: workspaceId,
          company_name: brandData.companyName,
          website: brandData.website,
          industry: brandData.industry,
          description: brandData.description,
          logo_url: brandData.logoUrl,
          tone: brandData.tone || 'professional',
          target_audience: brandData.targetAudience,
          products: brandData.products || [],
          auto_scraped: brandData.autoScraped || false,
          scraped_at: brandData.autoScraped ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
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
        error: error instanceof Error ? error.message : 'Failed to store brand info',
      };
    }
  }

  // ============================================
  // RETRIEVE BRAND INFO
  // ============================================

  /**
   * Get brand information for a workspace
   */
  async getBrandInfo(
    workspaceId: string
  ): Promise<{
    success: boolean;
    brandInfo?: BrandInfo;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .schema('genesis').from('brand_vault')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Brand info not found' };
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        brandInfo: {
          workspaceId: data.workspace_id,
          companyName: data.company_name,
          website: data.website,
          industry: data.industry,
          description: data.description,
          logoUrl: data.logo_url,
          tone: data.tone,
          targetAudience: data.target_audience,
          products: data.products || [],
          autoScraped: data.auto_scraped,
          scrapedAt: data.scraped_at ? new Date(data.scraped_at) : undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get brand info',
      };
    }
  }

  /**
   * Check if brand info exists
   */
  async hasBrandInfo(workspaceId: string): Promise<boolean> {
    const result = await this.getBrandInfo(workspaceId);
    return result.success && result.brandInfo !== undefined;
  }

  // ============================================
  // AUTO-SCRAPING (Placeholder for Phase 65)
  // ============================================

  /**
   * Extract brand info from website
   * 
   * This is a placeholder - actual implementation in Phase 65
   */
  async autoScrapeBrandInfo(
    website: string
  ): Promise<{
    success: boolean;
    brandData?: Partial<BrandInfo>;
    error?: string;
  }> {
    try {
      // Validate URL format
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(website)) {
        return {
          success: false,
          error: 'Invalid website URL format',
        };
      }

      // TODO: Implement actual scraping in Phase 65
      // For now, return minimal data
      const domain = new URL(website).hostname.replace('www.', '');
      const companyName = domain.split('.')[0];

      return {
        success: true,
        brandData: {
          companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
          website,
          autoScraped: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape website',
      };
    }
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update specific brand fields
   */
  async updateBrandInfo(
    workspaceId: string,
    updates: Partial<Omit<BrandInfo, 'workspaceId' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
      if (updates.website !== undefined) updateData.website = updates.website;
      if (updates.industry !== undefined) updateData.industry = updates.industry;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;
      if (updates.tone !== undefined) updateData.tone = updates.tone;
      if (updates.targetAudience !== undefined) updateData.target_audience = updates.targetAudience;
      if (updates.products !== undefined) updateData.products = updates.products;

      const result = await this.supabase
        .schema('genesis').from('brand_vault')
        .update(updateData)
        .eq('workspace_id', workspaceId);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update brand info',
      };
    }
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete brand information
   */
  async deleteBrandInfo(
    workspaceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.supabase
        .schema('genesis').from('brand_vault')
        .delete()
        .eq('workspace_id', workspaceId);

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete brand info',
      };
    }
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate brand info completeness
   */
  validateBrandInfo(brandInfo: BrandInfo): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!brandInfo.companyName || brandInfo.companyName.trim().length < 2) {
      errors.push('Company name is required and must be at least 2 characters');
    }

    // Recommended fields
    if (!brandInfo.website) {
      warnings.push('Website URL is recommended for better personalization');
    }

    if (!brandInfo.description || brandInfo.description.length < 20) {
      warnings.push('Company description helps AI generate better emails');
    }

    if (!brandInfo.industry) {
      warnings.push('Industry helps target the right audience');
    }

    if (!brandInfo.products || brandInfo.products.length === 0) {
      warnings.push('Product/service list improves email relevance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
