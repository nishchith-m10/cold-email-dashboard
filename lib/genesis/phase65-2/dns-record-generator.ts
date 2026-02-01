/**
 * PHASE 65.2: DNS Record Generator
 * 
 * Generates SPF, DKIM, and DMARC records for email authentication.
 * Supports both Gmail and SMTP configurations.
 */

export interface DKIMKeyPair {
  selector: string;
  privateKey: string;
  publicKey: string;
  dnsRecord: string; // Formatted for DNS TXT record
}

export interface DNSRecords {
  spf: {
    name: string;
    type: 'TXT';
    value: string;
    ttl: number;
  };
  dkim: {
    name: string; // e.g., "genesis._domainkey"
    type: 'TXT';
    value: string;
    ttl: number;
  };
  dmarc: {
    name: string;
    type: 'TXT';
    value: string;
    ttl: number;
  };
}

export interface DNSGeneratorOptions {
  domain: string;
  provider: 'gmail' | 'smtp';
  sendingDomain?: string; // For SMTP, the domain emails are sent from
  reportEmail?: string; // For DMARC reports (optional)
  dmarcPolicy?: 'none' | 'quarantine' | 'reject'; // Default: 'none'
}

/**
 * DNS Record Generator
 * 
 * Generates email authentication DNS records:
 * - SPF: Specifies authorized mail servers
 * - DKIM: Public key for email signature verification
 * - DMARC: Email authentication policy
 */
export class DNSRecordGenerator {
  /**
   * Generate all DNS records for email authentication
   */
  async generateRecords(options: DNSGeneratorOptions): Promise<DNSRecords> {
    const domain = this.normalizeDomain(options.domain);
    
    return {
      spf: this.generateSPF(domain, options),
      dkim: await this.generateDKIM(domain, options),
      dmarc: this.generateDMARC(domain, options),
    };
  }

  /**
   * Generate SPF record
   * 
   * SPF (Sender Policy Framework) specifies which mail servers are authorized
   * to send email on behalf of your domain.
   * 
   * Gmail: Include Google's SPF
   * SMTP: Include sending server's IP
   */
  private generateSPF(domain: string, options: DNSGeneratorOptions): DNSRecords['spf'] {
    let spfValue = 'v=spf1';

    if (options.provider === 'gmail') {
      // Include Google's SPF
      spfValue += ' include:_spf.google.com';
    } else {
      // For SMTP, include sending domain if provided
      if (options.sendingDomain) {
        spfValue += ` include:${options.sendingDomain}`;
      }
      // Generic SMTP servers
      spfValue += ' a mx';
    }

    // Soft fail for emails not matching SPF
    spfValue += ' ~all';

    return {
      name: '@', // Root domain
      type: 'TXT',
      value: spfValue,
      ttl: 3600,
    };
  }

  /**
   * Generate DKIM record
   * 
   * DKIM (DomainKeys Identified Mail) provides email signature verification.
   * 
   * For simplicity, we use a 1024-bit RSA key pair.
   * In production, you'd generate this server-side and store the private key securely.
   */
  private async generateDKIM(domain: string, options: DNSGeneratorOptions): Promise<DNSRecords['dkim']> {
    const selector = 'genesis'; // DKIM selector
    
    // For demo/testing, we'll use a placeholder public key
    // In production, you'd generate a real RSA key pair
    const publicKey = await this.generateDKIMPublicKey();

    // Format DKIM DNS record
    const dkimValue = `v=DKIM1; k=rsa; p=${publicKey}`;

    return {
      name: `${selector}._domainkey`, // e.g., "genesis._domainkey"
      type: 'TXT',
      value: dkimValue,
      ttl: 3600,
    };
  }

  /**
   * Generate DMARC record
   * 
   * DMARC (Domain-based Message Authentication, Reporting & Conformance)
   * specifies email authentication policy and reporting.
   * 
   * Policy levels:
   * - none: Monitor only (recommended for testing)
   * - quarantine: Mark suspicious emails as spam
   * - reject: Reject unauthenticated emails
   */
  private generateDMARC(domain: string, options: DNSGeneratorOptions): DNSRecords['dmarc'] {
    const policy = options.dmarcPolicy || 'none';
    const reportEmail = options.reportEmail || `dmarc@${domain}`;

    let dmarcValue = `v=DMARC1; p=${policy}`;
    
    // Add reporting email
    dmarcValue += `; rua=mailto:${reportEmail}`;
    
    // Alignment mode (relaxed for better compatibility)
    dmarcValue += '; aspf=r; adkim=r';
    
    // Percentage of emails to apply policy to (100%)
    dmarcValue += '; pct=100';

    return {
      name: '_dmarc', // e.g., "_dmarc.example.com"
      type: 'TXT',
      value: dmarcValue,
      ttl: 3600,
    };
  }

  /**
   * Generate DKIM public key
   * 
   * In a real implementation, you would:
   * 1. Generate an RSA key pair (2048-bit)
   * 2. Store private key securely (encrypted in database)
   * 3. Return public key for DNS
   * 
   * For this demo, we return a placeholder that indicates
   * the key should be generated during actual setup.
   */
  private async generateDKIMPublicKey(): Promise<string> {
    // In production, use crypto to generate real RSA keys:
    // const { publicKey, privateKey } = await crypto.subtle.generateKey(...)
    
    // Placeholder - indicates key generation needed
    return 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...PLACEHOLDER_KEY...';
  }

  /**
   * Normalize domain (remove protocol, www, trailing slash)
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
   * Validate domain format
   */
  validateDomain(domain: string): { valid: boolean; error?: string } {
    const normalized = this.normalizeDomain(domain);
    
    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    
    if (!domainRegex.test(normalized)) {
      return {
        valid: false,
        error: 'Invalid domain format',
      };
    }
    
    // Must have at least one dot (TLD)
    if (!normalized.includes('.')) {
      return {
        valid: false,
        error: 'Domain must include a TLD (e.g., .com)',
      };
    }
    
    return { valid: true };
  }

  /**
   * Format DNS record for display (with instructions)
   */
  formatRecordForDisplay(record: DNSRecords[keyof DNSRecords]): string {
    return `
Name: ${record.name}
Type: ${record.type}
Value: ${record.value}
TTL: ${record.ttl}
    `.trim();
  }
}
