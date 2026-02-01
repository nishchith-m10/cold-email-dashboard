/**
 * PHASE 64: Genesis Gateway OAuth Proxy
 * 
 * Main export file for Phase 64 services.
 */

// Types
export * from './credential-vault-types';

// Services
export { EncryptionService, CredentialVaultService } from './credential-vault-service';
export { CredentialValidationService } from './credential-validation-service';
export { 
  GmailOAuthService, 
  OAuthStateManager,
  GMAIL_OAUTH_CONFIG,
} from './gmail-oauth-service';
export {
  DropletConfigurationService,
  DROPLET_REGIONS,
  DROPLET_SIZES,
  DEFAULT_REGION,
  DEFAULT_SIZE,
} from './droplet-configuration-service';
export {
  OnboardingProgressService,
  ONBOARDING_STAGES,
  STAGE_INFO,
} from './onboarding-progress-service';
export { BrandVaultService } from './brand-vault-service';
