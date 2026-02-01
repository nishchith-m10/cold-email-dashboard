/**
 * PHASE 65.4: Tracking Domain Verifier
 * 
 * Verifies custom tracking domain CNAME records via DNS lookup.
 */

export interface TrackingDomainVerificationResult {
  domain: string;
  exists: boolean;
  matches: boolean;
  currentValue?: string;
  expectedValue: string;
  error?: string;
  propagationPercentage?: number;
}

/**
 * Tracking Domain Verifier
 * 
 * Verifies that custom tracking domain CNAME records are properly configured.
 * Uses DNS-over-HTTPS for reliability and browser compatibility.
 */
export class TrackingDomainVerifier {
  private readonly defaultTimeout = 5000; // 5 seconds
  private readonly dohProviders = [
    'https://cloudflare-dns.com/dns-query',
    'https://dns.google/resolve',
  ];

  /**
   * Verify tracking domain CNAME record
   * 
   * @param trackingDomain Full tracking domain (e.g., "track.example.com")
   * @param expectedTarget Expected CNAME target (e.g., "track.genesis.com")
   * @param timeout Optional timeout in milliseconds
   */
  async verifyTrackingDomain(
    trackingDomain: string,
    expectedTarget: string,
    timeout?: number
  ): Promise<TrackingDomainVerificationResult> {
    const timeoutMs = timeout || this.defaultTimeout;

    try {
      // Lookup CNAME record
      const records = await this.lookupCNAME(trackingDomain, timeoutMs);

      if (records.length === 0) {
        return {
          domain: trackingDomain,
          exists: false,
          matches: false,
          expectedValue: expectedTarget,
          error: 'CNAME record not found',
        };
      }

      // Get first CNAME record (there should only be one)
      const currentValue = records[0];

      // Normalize both values for comparison
      const normalizedCurrent = this.normalizeDomain(currentValue);
      const normalizedExpected = this.normalizeDomain(expectedTarget);

      const matches = normalizedCurrent === normalizedExpected;

      return {
        domain: trackingDomain,
        exists: true,
        matches,
        currentValue,
        expectedValue: expectedTarget,
      };
    } catch (error) {
      return {
        domain: trackingDomain,
        exists: false,
        matches: false,
        expectedValue: expectedTarget,
        error: error instanceof Error ? error.message : 'DNS lookup failed',
      };
    }
  }

  /**
   * Check propagation status across multiple DNS providers
   * 
   * Estimates how widely the CNAME record has propagated.
   */
  async checkPropagation(
    trackingDomain: string,
    expectedTarget: string
  ): Promise<TrackingDomainVerificationResult> {
    const providers = [
      { name: 'Cloudflare', url: this.dohProviders[0] },
      { name: 'Google', url: this.dohProviders[1] },
    ];

    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          const records = await this.queryDoH(provider.url, trackingDomain, 'CNAME', 3000);
          if (records.length === 0) return { name: provider.name, success: false };
          
          const normalized = this.normalizeDomain(records[0]);
          const expectedNormalized = this.normalizeDomain(expectedTarget);
          
          return { name: provider.name, success: normalized === expectedNormalized };
        } catch {
          return { name: provider.name, success: false };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const percentage = Math.round((successCount / providers.length) * 100);

    const anySuccess = successCount > 0;
    const currentValue = anySuccess ? expectedTarget : undefined;

    return {
      domain: trackingDomain,
      exists: anySuccess,
      matches: percentage === 100,
      currentValue,
      expectedValue: expectedTarget,
      propagationPercentage: percentage,
      error: percentage === 0 ? 'CNAME record not found on any DNS server' : undefined,
    };
  }

  /**
   * Lookup CNAME records via DNS-over-HTTPS
   */
  private async lookupCNAME(domain: string, timeout: number): Promise<string[]> {
    // Try primary provider (Cloudflare)
    try {
      return await this.queryDoH(this.dohProviders[0], domain, 'CNAME', timeout);
    } catch (primaryError) {
      // Fallback to secondary provider (Google)
      try {
        return await this.queryDoH(this.dohProviders[1], domain, 'CNAME', timeout);
      } catch (secondaryError) {
        throw new Error('DNS lookup failed for all providers');
      }
    }
  }

  /**
   * Query DNS-over-HTTPS provider
   */
  private async queryDoH(
    provider: string,
    domain: string,
    recordType: string,
    timeout: number
  ): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${provider}?name=${encodeURIComponent(domain)}&type=${recordType}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/dns-json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DNS query failed: ${response.status}`);
      }

      const data = await response.json() as any;

      // Extract CNAME records
      if (!data.Answer || data.Answer.length === 0) {
        return [];
      }

      // CNAME record type is 5
      return data.Answer
        .filter((record: any) => record.type === 5)
        .map((record: any) => this.cleanCNAMERecord(record.data));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Clean CNAME record (remove trailing dot)
   */
  private cleanCNAMERecord(data: string): string {
    return data.replace(/\.$/, '').trim();
  }

  /**
   * Normalize domain for comparison
   */
  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.$/, '') // Remove trailing dot
      .split('/')[0]
      .split(':')[0];
  }

  /**
   * Test tracking domain accessibility
   * 
   * Attempts to reach the tracking domain via HTTP(S).
   * This verifies that the CNAME is working end-to-end.
   */
  async testAccessibility(
    trackingDomain: string,
    timeout?: number
  ): Promise<{
    accessible: boolean;
    statusCode?: number;
    error?: string;
  }> {
    const timeoutMs = timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Try HTTPS first
      const url = `https://${trackingDomain}`;
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        // Redirect: 'manual' to detect redirects
        redirect: 'manual',
      });

      clearTimeout(timeoutId);

      // 200 OK or 3xx redirect is good (tracking servers often redirect)
      const accessible = response.status >= 200 && response.status < 400;

      return {
        accessible,
        statusCode: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      return {
        accessible: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Comprehensive verification
   * 
   * Checks both DNS records and HTTP accessibility.
   */
  async verifyComplete(
    trackingDomain: string,
    expectedTarget: string
  ): Promise<{
    dnsVerification: TrackingDomainVerificationResult;
    accessibility: {
      accessible: boolean;
      statusCode?: number;
      error?: string;
    };
    overallStatus: 'verified' | 'dns_only' | 'failed';
  }> {
    // Check DNS first
    const dnsVerification = await this.verifyTrackingDomain(trackingDomain, expectedTarget);

    // If DNS fails, don't bother checking accessibility
    if (!dnsVerification.matches) {
      return {
        dnsVerification,
        accessibility: { accessible: false, error: 'DNS not configured' },
        overallStatus: 'failed',
      };
    }

    // Check accessibility
    const accessibility = await this.testAccessibility(trackingDomain);

    const overallStatus = accessibility.accessible ? 'verified' : 'dns_only';

    return {
      dnsVerification,
      accessibility,
      overallStatus,
    };
  }
}
