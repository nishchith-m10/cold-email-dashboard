/**
 * PHASE 65.2: Entri Integration
 * 
 * Integrates with Entri API for automated DNS record management.
 * Provides dual-mode: Manual setup (free) or Entri automation (paid).
 */

export interface EntriConfig {
  apiKey: string;
  applicationId: string; // Your Entri application ID
}

export interface EntriDNSRecord {
  type: 'TXT' | 'CNAME' | 'A' | 'MX';
  name: string;
  value: string;
  ttl?: number;
}

export interface EntriSessionResult {
  sessionId: string;
  sessionUrl: string; // Entri modal URL for user authentication
  expiresAt: Date;
}

export interface EntriVerificationResult {
  success: boolean;
  records: {
    name: string;
    type: string;
    verified: boolean;
    error?: string;
  }[];
  error?: string;
}

/**
 * Entri Integration Service
 * 
 * Handles automated DNS setup via Entri API.
 * Entri provides:
 * - Auto-detection of DNS provider
 * - OAuth-style authentication with DNS providers
 * - Automatic DNS record injection
 * - Real-time verification
 * 
 * Note: Entri is a paid service. This integration is OPTIONAL.
 * Users can always use manual DNS setup as a free alternative.
 */
export class EntriIntegration {
  private readonly baseUrl = 'https://api.entri.com/v1';
  private config: EntriConfig | null = null;

  /**
   * Initialize Entri integration
   * 
   * @param config Entri API configuration
   */
  constructor(config?: EntriConfig) {
    if (config) {
      this.config = config;
    }
  }

  /**
   * Check if Entri is configured
   */
  isConfigured(): boolean {
    return this.config !== null && !!this.config.apiKey && !!this.config.applicationId;
  }

  /**
   * Create Entri session for DNS setup
   * 
   * Returns a session URL that the user opens in a modal/popup.
   * User authenticates with their DNS provider and approves changes.
   * 
   * @param domain Domain to configure
   * @param records DNS records to create
   */
  async createSession(
    domain: string,
    records: EntriDNSRecord[]
  ): Promise<EntriSessionResult> {
    if (!this.isConfigured()) {
      throw new Error('Entri is not configured. Set ENTRI_API_KEY and ENTRI_APP_ID.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
        body: JSON.stringify({
          applicationId: this.config!.applicationId,
          domain,
          records: records.map(r => ({
            type: r.type,
            name: r.name,
            value: r.value,
            ttl: r.ttl || 3600,
          })),
          returnUrl: this.getReturnUrl(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' })) as any;
        throw new Error(`Entri API error: ${error.message || response.statusText}`);
      }

      const data = await response.json() as any;

      return {
        sessionId: data.sessionId,
        sessionUrl: data.sessionUrl,
        expiresAt: new Date(data.expiresAt),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? `Failed to create Entri session: ${error.message}` 
          : 'Failed to create Entri session'
      );
    }
  }

  /**
   * Verify Entri session completion
   * 
   * After user completes the Entri flow, call this to verify
   * that DNS records were successfully created.
   * 
   * @param sessionId Session ID from createSession
   */
  async verifySession(sessionId: string): Promise<EntriVerificationResult> {
    if (!this.isConfigured()) {
      throw new Error('Entri is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' })) as any;
        throw new Error(`Entri verification error: ${error.message || response.statusText}`);
      }

      const data = await response.json() as any;

      return {
        success: data.status === 'completed' && data.records.every((r: any) => r.verified),
        records: data.records.map((r: any) => ({
          name: r.name,
          type: r.type,
          verified: r.verified,
          error: r.error,
        })),
      };
    } catch (error) {
      return {
        success: false,
        records: [],
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Get session status
   * 
   * Check if user has completed the Entri flow.
   * 
   * @param sessionId Session ID from createSession
   */
  async getSessionStatus(sessionId: string): Promise<'pending' | 'completed' | 'failed' | 'expired'> {
    if (!this.isConfigured()) {
      throw new Error('Entri is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
      });

      if (!response.ok) {
        return 'failed';
      }

      const data = await response.json() as any;
      return data.status;
    } catch {
      return 'failed';
    }
  }

  /**
   * Cancel Entri session
   * 
   * @param sessionId Session ID to cancel
   */
  async cancelSession(sessionId: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    try {
      await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
      });
    } catch {
      // Ignore cancellation errors
    }
  }

  /**
   * Get return URL for Entri redirect
   * 
   * After user completes DNS setup, Entri redirects to this URL.
   */
  private getReturnUrl(): string {
    // In production, this would be your app's callback URL
    // Default URL for server-side usage
    return 'https://app.genesis.com/onboarding/dns-callback';
  }

  /**
   * Generate Entri modal HTML
   * 
   * Returns HTML/JS to embed Entri modal in your UI.
   * This is an alternative to opening sessionUrl in a popup.
   */
  generateModalEmbed(sessionUrl: string): string {
    return `
      <div id="entri-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 600px; height: 90%; max-height: 700px; position: relative;">
          <button onclick="document.getElementById('entri-modal').remove()" style="position: absolute; top: 12px; right: 12px; background: #f3f4f6; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 20px;">×</button>
          <iframe src="${sessionUrl}" style="width: 100%; height: 100%; border: none; border-radius: 12px;"></iframe>
        </div>
      </div>
    `;
  }

  /**
   * Check if Entri is available for a domain
   * 
   * Some DNS providers are not supported by Entri.
   * This checks if automated setup is possible.
   */
  async checkAvailability(domain: string): Promise<{
    available: boolean;
    provider?: string;
    message?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        available: false,
        message: 'Entri is not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/domains/${domain}/availability`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config!.apiKey}`,
        },
      });

      if (!response.ok) {
        return {
          available: false,
          message: 'Could not check availability',
        };
      }

      const data = await response.json() as any;

      return {
        available: data.available,
        provider: data.provider,
        message: data.message,
      };
    } catch {
      return {
        available: false,
        message: 'Availability check failed',
      };
    }
  }
}
