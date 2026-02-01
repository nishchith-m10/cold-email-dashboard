/**
 * PHASE 65.4: Tracking Domain Manager
 * 
 * Manages custom tracking domains for email link tracking.
 * Generates CNAME records pointing to tracking infrastructure.
 */

export interface TrackingDomainConfig {
  subdomain: string; // e.g., "track", "click", "links"
  baseDomain: string; // e.g., "example.com"
  trackingTarget: string; // e.g., "track.genesis.com" or custom tracking server
}

export interface TrackingDomainRecord {
  name: string; // e.g., "track.example.com" or just "track"
  type: 'CNAME';
  value: string; // Target CNAME (e.g., "track.genesis.com")
  ttl: number;
  priority?: number;
}

export interface TrackingDomainSetup {
  fullDomain: string; // e.g., "track.example.com"
  cnameRecord: TrackingDomainRecord;
  sslipFallback: string; // e.g., "track--example-com.127.0.0.1.sslip.io"
  instructions: string[];
}

/**
 * Tracking Domain Manager
 * 
 * Manages custom tracking domains for email campaigns.
 * Benefits:
 * - Branded tracking URLs (track.yourcompany.com vs generic-tracker.com)
 * - Improved email deliverability (consistent domain reputation)
 * - Better click-through rates (users trust familiar domains)
 * 
 * Dual-mode architecture:
 * - Manual: Generate CNAME record, user adds to DNS provider
 * - Entri: Automatic CNAME setup via Entri API
 */
export class TrackingDomainManager {
  private readonly defaultTrackingTarget = 'track.genesis.com';
  private readonly recommendedSubdomains = ['track', 'click', 'links', 'go'];

  /**
   * Setup custom tracking domain
   * 
   * @param config Tracking domain configuration
   * @returns Complete setup with CNAME record and instructions
   */
  setupTrackingDomain(config: TrackingDomainConfig): TrackingDomainSetup {
    // Validate inputs
    this.validateConfig(config);

    // Normalize domain and subdomain
    const baseDomain = this.normalizeDomain(config.baseDomain);
    const subdomain = this.normalizeSubdomain(config.subdomain);
    const trackingTarget = config.trackingTarget 
      ? this.normalizeDomain(config.trackingTarget)
      : this.defaultTrackingTarget;

    // Generate full tracking domain
    const fullDomain = `${subdomain}.${baseDomain}`;

    // Generate CNAME record
    const cnameRecord: TrackingDomainRecord = {
      name: subdomain, // Most DNS providers expect just the subdomain
      type: 'CNAME',
      value: trackingTarget,
      ttl: 3600,
    };

    // Generate sslip.io fallback (for testing without DNS setup)
    const sslipFallback = this.generateSslipFallback(subdomain, baseDomain);

    // Generate setup instructions
    const instructions = this.generateInstructions(fullDomain, cnameRecord, trackingTarget);

    return {
      fullDomain,
      cnameRecord,
      sslipFallback,
      instructions,
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: TrackingDomainConfig): void {
    if (!config.baseDomain || !config.baseDomain.trim()) {
      throw new Error('Base domain is required');
    }

    if (!config.subdomain || !config.subdomain.trim()) {
      throw new Error('Subdomain is required');
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    const normalizedDomain = this.normalizeDomain(config.baseDomain);
    
    if (!domainRegex.test(normalizedDomain)) {
      throw new Error('Invalid domain format');
    }

    if (!normalizedDomain.includes('.')) {
      throw new Error('Domain must include a TLD (e.g., .com)');
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
    const normalizedSubdomain = this.normalizeSubdomain(config.subdomain);
    
    if (!subdomainRegex.test(normalizedSubdomain)) {
      throw new Error('Invalid subdomain format (use letters, numbers, and hyphens only)');
    }
  }

  /**
   * Get recommended subdomains
   */
  getRecommendedSubdomains(): string[] {
    return [...this.recommendedSubdomains];
  }

  /**
   * Check if subdomain is recommended
   */
  isRecommendedSubdomain(subdomain: string): boolean {
    return this.recommendedSubdomains.includes(subdomain.toLowerCase().trim());
  }

  /**
   * Generate sslip.io fallback domain
   * 
   * sslip.io allows DNS-less testing by encoding the tracking domain
   * in the hostname (e.g., track--example-com.127.0.0.1.sslip.io)
   */
  private generateSslipFallback(subdomain: string, baseDomain: string): string {
    // Convert dots to dashes for sslip.io encoding
    const encoded = `${subdomain}--${baseDomain.replace(/\./g, '-')}`;
    return `${encoded}.127.0.0.1.sslip.io`;
  }

  /**
   * Generate setup instructions
   */
  private generateInstructions(
    fullDomain: string,
    cnameRecord: TrackingDomainRecord,
    trackingTarget: string
  ): string[] {
    return [
      `Log into your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.)`,
      `Add a CNAME record for "${cnameRecord.name}"`,
      `Set the value to "${trackingTarget}"`,
      `Set TTL to ${cnameRecord.ttl} seconds (or use default)`,
      `Wait 5-10 minutes for DNS propagation`,
      `Test by visiting https://${fullDomain} (should redirect to tracking server)`,
    ];
  }

  /**
   * Normalize domain (remove protocol, www, path)
   */
  private normalizeDomain(input: string): string {
    let domain = input.toLowerCase().trim();
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');
    
    // Remove www
    domain = domain.replace(/^www\./, '');
    
    // Remove path
    domain = domain.split('/')[0];
    
    // Remove port
    domain = domain.split(':')[0];
    
    return domain;
  }

  /**
   * Normalize subdomain (lowercase, trim)
   */
  private normalizeSubdomain(input: string): string {
    return input.toLowerCase().trim();
  }

  /**
   * Format CNAME record for display
   */
  formatRecordForDisplay(record: TrackingDomainRecord): string {
    return `
Name: ${record.name}
Type: ${record.type}
Value: ${record.value}
TTL: ${record.ttl}
    `.trim();
  }

  /**
   * Parse tracking domain from full domain
   * 
   * Extracts subdomain and base domain from a full tracking domain.
   * E.g., "track.example.com" -> { subdomain: "track", baseDomain: "example.com" }
   */
  parseTrackingDomain(fullDomain: string): { subdomain: string; baseDomain: string } | null {
    const normalized = this.normalizeDomain(fullDomain);
    const parts = normalized.split('.');
    
    if (parts.length < 3) {
      // Need at least subdomain.domain.tld
      return null;
    }

    const subdomain = parts[0];
    const baseDomain = parts.slice(1).join('.');

    return { subdomain, baseDomain };
  }

  /**
   * Validate tracking target
   * 
   * Ensures the tracking target is a valid domain.
   */
  validateTrackingTarget(target: string): { valid: boolean; error?: string } {
    const normalized = this.normalizeDomain(target);
    
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    
    if (!domainRegex.test(normalized)) {
      return {
        valid: false,
        error: 'Invalid tracking target format',
      };
    }
    
    if (!normalized.includes('.')) {
      return {
        valid: false,
        error: 'Tracking target must include a TLD',
      };
    }
    
    return { valid: true };
  }
}
