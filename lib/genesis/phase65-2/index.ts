/**
 * PHASE 65.2 & 65.4: DNS Automation & Tracking Domains
 * 
 * Exports for DNS record generation, verification, tracking domains, and Entri integration.
 * Provides dual-mode: Manual DNS setup (free) or Entri automation (paid).
 */

// DNS Record Generator (Phase 65.2)
export { DNSRecordGenerator } from './dns-record-generator';
export type {
  DNSRecords,
  DNSGeneratorOptions,
  DKIMKeyPair,
} from './dns-record-generator';

// DNS Verifier (Phase 65.2)
export { DNSVerifier } from './dns-verifier';
export type {
  DNSVerificationResult,
  DNSVerificationSummary,
  VerifyOptions,
} from './dns-verifier';

// Tracking Domain Manager (Phase 65.4)
export { TrackingDomainManager } from './tracking-domain-manager';
export type {
  TrackingDomainConfig,
  TrackingDomainRecord,
  TrackingDomainSetup,
} from './tracking-domain-manager';

// Tracking Domain Verifier (Phase 65.4)
export { TrackingDomainVerifier } from './tracking-domain-verifier';
export type {
  TrackingDomainVerificationResult,
} from './tracking-domain-verifier';

// Entri Integration (Optional - Phases 65.2 & 65.4)
export { EntriIntegration } from './entri-integration';
export type {
  EntriConfig,
  EntriDNSRecord,
  EntriSessionResult,
  EntriVerificationResult,
} from './entri-integration';
