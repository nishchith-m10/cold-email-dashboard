/**
 * PHASE 65.2: DNS Verifier
 * 
 * Verifies DNS records (SPF, DKIM, DMARC) via DNS lookup.
 * Checks if records exist and match expected values.
 */

export interface DNSVerificationResult {
  record: 'spf' | 'dkim' | 'dmarc';
  exists: boolean;
  matches: boolean;
  currentValue?: string;
  expectedValue: string;
  error?: string;
}

export interface DNSVerificationSummary {
  allValid: boolean;
  spf: DNSVerificationResult;
  dkim: DNSVerificationResult;
  dmarc: DNSVerificationResult;
}

export interface VerifyOptions {
  timeout?: number; // Milliseconds, default 5000
}

/**
 * DNS Verifier
 * 
 * Verifies email authentication DNS records via DNS lookup.
 * Uses DNS-over-HTTPS (DoH) for reliability and CORS compatibility.
 */
export class DNSVerifier {
  private readonly defaultTimeout = 5000; // 5 seconds
  private readonly dohProviders = [
    'https://cloudflare-dns.com/dns-query',
    'https://dns.google/resolve',
  ];

  /**
   * Verify all DNS records (SPF, DKIM, DMARC)
   */
  async verifyAll(
    domain: string,
    expectedRecords: {
      spf: string;
      dkim: { selector: string; value: string };
      dmarc: string;
    },
    options: VerifyOptions = {}
  ): Promise<DNSVerificationSummary> {
    const [spf, dkim, dmarc] = await Promise.all([
      this.verifySPF(domain, expectedRecords.spf, options),
      this.verifyDKIM(domain, expectedRecords.dkim.selector, expectedRecords.dkim.value, options),
      this.verifyDMARC(domain, expectedRecords.dmarc, options),
    ]);

    return {
      allValid: spf.matches && dkim.matches && dmarc.matches,
      spf,
      dkim,
      dmarc,
    };
  }

  /**
   * Verify SPF record
   */
  async verifySPF(
    domain: string,
    expectedValue: string,
    options: VerifyOptions = {}
  ): Promise<DNSVerificationResult> {
    try {
      const records = await this.lookupTXT(domain, options);
      
      // Find SPF record (starts with "v=spf1")
      const spfRecord = records.find(r => r.startsWith('v=spf1'));
      
      if (!spfRecord) {
        return {
          record: 'spf',
          exists: false,
          matches: false,
          expectedValue,
          error: 'SPF record not found',
        };
      }

      // Check if matches (normalize whitespace)
      const matches = this.normalizeRecord(spfRecord) === this.normalizeRecord(expectedValue);

      return {
        record: 'spf',
        exists: true,
        matches,
        currentValue: spfRecord,
        expectedValue,
      };
    } catch (error) {
      return {
        record: 'spf',
        exists: false,
        matches: false,
        expectedValue,
        error: error instanceof Error ? error.message : 'DNS lookup failed',
      };
    }
  }

  /**
   * Verify DKIM record
   */
  async verifyDKIM(
    domain: string,
    selector: string,
    expectedValue: string,
    options: VerifyOptions = {}
  ): Promise<DNSVerificationResult> {
    try {
      const dkimDomain = `${selector}._domainkey.${domain}`;
      const records = await this.lookupTXT(dkimDomain, options);
      
      // Find DKIM record (starts with "v=DKIM1")
      const dkimRecord = records.find(r => r.startsWith('v=DKIM1'));
      
      if (!dkimRecord) {
        return {
          record: 'dkim',
          exists: false,
          matches: false,
          expectedValue,
          error: 'DKIM record not found',
        };
      }

      // Check if matches (normalize whitespace)
      const matches = this.normalizeRecord(dkimRecord) === this.normalizeRecord(expectedValue);

      return {
        record: 'dkim',
        exists: true,
        matches,
        currentValue: dkimRecord,
        expectedValue,
      };
    } catch (error) {
      return {
        record: 'dkim',
        exists: false,
        matches: false,
        expectedValue,
        error: error instanceof Error ? error.message : 'DNS lookup failed',
      };
    }
  }

  /**
   * Verify DMARC record
   */
  async verifyDMARC(
    domain: string,
    expectedValue: string,
    options: VerifyOptions = {}
  ): Promise<DNSVerificationResult> {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const records = await this.lookupTXT(dmarcDomain, options);
      
      // Find DMARC record (starts with "v=DMARC1")
      const dmarcRecord = records.find(r => r.startsWith('v=DMARC1'));
      
      if (!dmarcRecord) {
        return {
          record: 'dmarc',
          exists: false,
          matches: false,
          expectedValue,
          error: 'DMARC record not found',
        };
      }

      // Check if matches (normalize whitespace)
      const matches = this.normalizeRecord(dmarcRecord) === this.normalizeRecord(expectedValue);

      return {
        record: 'dmarc',
        exists: true,
        matches,
        currentValue: dmarcRecord,
        expectedValue,
      };
    } catch (error) {
      return {
        record: 'dmarc',
        exists: false,
        matches: false,
        expectedValue,
        error: error instanceof Error ? error.message : 'DNS lookup failed',
      };
    }
  }

  /**
   * Lookup TXT records via DNS-over-HTTPS
   * 
   * Uses Cloudflare and Google DNS-over-HTTPS for reliability.
   * Falls back to secondary provider if primary fails.
   */
  private async lookupTXT(domain: string, options: VerifyOptions): Promise<string[]> {
    const timeout = options.timeout || this.defaultTimeout;

    // Try primary provider (Cloudflare)
    try {
      return await this.queryDoH(this.dohProviders[0], domain, timeout);
    } catch (primaryError) {
      // Fallback to secondary provider (Google)
      try {
        return await this.queryDoH(this.dohProviders[1], domain, timeout);
      } catch (secondaryError) {
        throw new Error('DNS lookup failed for all providers');
      }
    }
  }

  /**
   * Query DNS-over-HTTPS provider
   */
  private async queryDoH(provider: string, domain: string, timeout: number): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${provider}?name=${encodeURIComponent(domain)}&type=TXT`;
      
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

      // Extract TXT records
      if (!data.Answer || data.Answer.length === 0) {
        return [];
      }

      return data.Answer
        .filter((record: any) => record.type === 16) // TXT record type
        .map((record: any) => this.cleanTXTRecord(record.data));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Clean TXT record (remove quotes, unescape)
   */
  private cleanTXTRecord(data: string): string {
    return data
      .replace(/^"/, '')
      .replace(/"$/, '')
      .replace(/\\"/g, '"')
      .trim();
  }

  /**
   * Normalize DNS record for comparison
   * - Remove extra whitespace
   * - Lowercase (except values that should be case-sensitive)
   * - Remove quotes
   */
  private normalizeRecord(record: string): string {
    return record
      .replace(/\s+/g, ' ')
      .replace(/"/g, '')
      .trim();
  }

  /**
   * Check DNS propagation status
   * 
   * DNS changes can take 24-48 hours to propagate globally.
   * This checks multiple DNS servers to estimate propagation.
   */
  async checkPropagation(domain: string): Promise<{
    propagated: boolean;
    percentage: number; // 0-100
    providers: { name: string; success: boolean }[];
  }> {
    const providers = [
      { name: 'Cloudflare', url: this.dohProviders[0] },
      { name: 'Google', url: this.dohProviders[1] },
    ];

    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          await this.queryDoH(provider.url, domain, 3000);
          return { name: provider.name, success: true };
        } catch {
          return { name: provider.name, success: false };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const percentage = Math.round((successCount / providers.length) * 100);

    return {
      propagated: percentage === 100,
      percentage,
      providers: results,
    };
  }
}
