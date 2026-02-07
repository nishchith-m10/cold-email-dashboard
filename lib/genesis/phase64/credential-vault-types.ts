/**
 * PHASE 64: Credential Vault Types
 * 
 * Type definitions for the Genesis credential vault system.
 * Handles OAuth tokens, API keys, and credential validation.
 */

// ============================================
// CREDENTIAL TYPES
// ============================================

export type CredentialType = 
  | 'gmail_oauth'
  | 'google_sheets_oauth'
  | 'openai_api_key'
  | 'anthropic_api_key'
  | 'google_cse_api_key'
  | 'relevance_config'  // Full Relevance AI configuration
  | 'apify_api_token'
  | 'calendly_url'
  | 'entri_oauth';

export type CredentialStatus = 'valid' | 'invalid' | 'expired' | 'pending_validation';

// ============================================
// CREDENTIAL INTERFACES
// ============================================

export interface BaseCredential {
  id: string;
  workspaceId: string;
  type: CredentialType;
  status: CredentialStatus;
  createdAt: Date;
  updatedAt: Date;
  validatedAt?: Date;
  expiresAt?: Date;
}

export interface OAuthCredential extends BaseCredential {
  type: 'gmail_oauth' | 'google_sheets_oauth' | 'entri_oauth';
  accessToken: string; // Encrypted
  refreshToken: string; // Encrypted
  tokenType: string;
  scope: string;
  expiresAt: Date;
}

export interface ApiKeyCredential extends BaseCredential {
  type: 'openai_api_key' | 'anthropic_api_key' | 'google_cse_api_key' | 'apify_api_token';
  apiKey: string; // Encrypted
  metadata?: {
    engineId?: string; // For Google CSE
    organization?: string; // For OpenAI/Anthropic
  };
}

// ============================================
// RELEVANCE AI CONFIGURATION
// Full configuration for Relevance AI integration
// ============================================

export interface RelevanceAIConfig {
  baseUrl: string;        // e.g., https://api-bcbe5a.stack.tryrelevance.com
  projectId: string;      // e.g., 1c7dae110947-495a-b439-7578c53dea94
  studioId: string;       // e.g., f9a70da4-2d80-4e17-ad1b-a37716c423c8
  authToken: string;      // API key for Authorization header (encrypted)
  toolImported: boolean;  // Whether the LinkedIn Research Tool has been imported
  toolId?: string;        // The tool ID after import (optional)
}

export interface RelevanceAICredential extends BaseCredential {
  type: 'relevance_config';
  config: RelevanceAIConfig;
}

export interface CalendlyCredential extends BaseCredential {
  type: 'calendly_url';
  bookingUrl: string; // Plain text
  metadata?: {
    validatedStatus?: boolean;
    lastChecked?: Date;
  };
}

export type Credential = OAuthCredential | ApiKeyCredential | CalendlyCredential | RelevanceAICredential;

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface CredentialValidationRequest {
  type: CredentialType;
  value: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// OAUTH TYPES
// ============================================

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface OAuthState {
  workspaceId: string;
  userId: string;
  csrfToken: string;
  returnUrl?: string;
  timestamp: number;
}

// ============================================
// DROPLET CONFIGURATION TYPES
// ============================================

export type DropletRegion = 'us-east' | 'us-west' | 'eu-west' | 'eu-north' | 'apac';
export type DropletSize = 'starter' | 'professional' | 'scale' | 'enterprise';

export interface DropletRegionInfo {
  code: DropletRegion;
  name: string;
  location: string;
  doSlug: string; // DigitalOcean region slug
  suprabaseRegion: string;
  gdprCompliant: boolean;
  latencyDescription: string;
}

export interface DropletSizeInfo {
  tier: DropletSize;
  doSlug: string; // DigitalOcean size slug
  vcpu: number;
  ram: number; // GB
  ssd: number; // GB
  monthlyPrice: number; // USD
  description: string;
  useCase: string;
}

export interface WorkspaceInfrastructureConfig {
  workspaceId: string;
  region: DropletRegion;
  size: DropletSize;
  selectedAt: Date;
  provisionedAt?: Date;
}

// ============================================
// ONBOARDING STAGE TYPES
// ============================================

export type OnboardingStage = 
  | 'region_selection'
  | 'brand_info'
  | 'email_provider_selection'  // Phase 64.B: Choose Gmail or SMTP
  | 'gmail_oauth'               // Conditional: Only if provider = Gmail
  | 'smtp_configuration'        // Conditional: Only if provider = SMTP
  | 'openai_key'
  | 'anthropic_key'
  | 'google_cse_key'
  | 'relevance_key'
  | 'apify_selection'
  | 'calendly_url'
  | 'dns_setup'
  | 'ignition';

// Email provider selection for Phase 64.B
export type EmailProviderChoice = 'gmail' | 'smtp';

export interface OnboardingProgress {
  workspaceId: string;
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ============================================
// BRAND VAULT TYPES
// ============================================

export interface BrandInfo {
  workspaceId: string;
  companyName: string;
  website?: string;
  industry?: string;
  description?: string;
  logoUrl?: string;
  tone?: string;
  targetAudience?: string;
  products?: string[];
  autoScraped: boolean;
  scrapedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SERVICE SELECTION TYPES
// ============================================

export type ApifyMode = 'byo' | 'managed';

export interface ApifySelection {
  workspaceId: string;
  mode: ApifyMode;
  apiToken?: string; // Only for BYO mode
  validated: boolean;
  selectedAt: Date;
}

// ============================================
// VALIDATION ERROR TYPES
// ============================================

export interface CredentialValidationError {
  type: CredentialType;
  error: string;
  code: 'INVALID_KEY' | 'NETWORK_ERROR' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'INVALID_FORMAT';
  details?: Record<string, unknown>;
}
