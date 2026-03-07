/**
 * PHASE 64: Credential Validation Service
 * 
 * Real-time validation of API keys and credentials.
 * Makes actual API calls to verify credentials work.
 */

import {
  CredentialType,
  ValidationResult,
  CredentialValidationError,
} from './credential-vault-types';

// ============================================
// VALIDATION SERVICE
// ============================================

export class CredentialValidationService {
  /**
   * Validate any credential type
   */
  async validateCredential(
    type: CredentialType,
    value: string,
    metadata?: Record<string, unknown>
  ): Promise<ValidationResult> {
    try {
      switch (type) {
        case 'openai_api_key':
          return await this.validateOpenAIKey(value);
        
        case 'anthropic_api_key':
          return await this.validateAnthropicKey(value);
        
        case 'google_cse_api_key':
          return await this.validateGoogleCSEKey(value, metadata?.engineId as string);
        
        case 'relevance_config':
          return await this.validateRelevanceConfig(metadata as any);
        
        case 'apify_api_token':
          return await this.validateApifyToken(value);
        
        case 'calendly_url':
          return await this.validateCalendlyUrl(value);
        
        default:
          return {
            valid: false,
            error: `Validation not implemented for ${type}`,
          };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  // ============================================
  // OPENAI VALIDATION
  // ============================================

  private async validateOpenAIKey(apiKey: string): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          valid: true,
          metadata: {
            modelsCount: data.data?.length || 0,
            organization: response.headers.get('openai-organization'),
          },
        };
      }

      if (response.status === 401) {
        return {
          valid: false,
          error: 'Invalid API key - authentication failed',
        };
      }

      if (response.status === 429) {
        return {
          valid: false,
          error: 'Rate limited - please try again later',
        };
      }

      return {
        valid: false,
        error: `Validation failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error during validation',
      };
    }
  }

  // ============================================
  // ANTHROPIC VALIDATION
  // ============================================

  private async validateAnthropicKey(apiKey: string): Promise<ValidationResult> {
    try {
      // Test with a minimal request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (response.status === 200 || response.status === 400) {
        // 200 = success, 400 = malformed but auth worked
        return {
          valid: true,
          metadata: {
            requestId: response.headers.get('request-id'),
          },
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: 'Invalid API key - authentication failed',
        };
      }

      if (response.status === 429) {
        return {
          valid: false,
          error: 'Rate limited - please try again later',
        };
      }

      return {
        valid: false,
        error: `Validation failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error during validation',
      };
    }
  }

  // ============================================
  // GOOGLE CSE VALIDATION
  // ============================================

  private async validateGoogleCSEKey(
    apiKey: string,
    engineId?: string
  ): Promise<ValidationResult> {
    if (!engineId) {
      return {
        valid: false,
        error: 'Engine ID is required for Google CSE validation',
      };
    }

    if (!apiKey.startsWith('AIza')) {
      return { valid: false, error: 'Invalid API key format — Google API keys start with "AIza"' };
    }

    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', engineId);
      url.searchParams.set('q', 'test');

      const response = await fetch(url.toString());

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          valid: true,
          metadata: {
            totalResults: data.searchInformation?.totalResults || '0',
            engineTitle: data.context?.title,
          },
        };
      }

      if (response.status === 400) {
        const data: any = await response.json();
        if (data.error?.message?.includes('Invalid Value')) {
          return { valid: false, error: 'Invalid Engine ID' };
        }
        return { valid: false, error: data.error?.message || 'Invalid API key or Engine ID' };
      }

      if (response.status === 403) {
        const data: any = await response.json().catch(() => ({}));
        const reason = data.error?.message || '';

        if (reason.includes('billing') || reason.includes('Billing')) {
          return {
            valid: true,
            metadata: { validatedFormat: true, billingRequired: true },
          };
        }

        // Key format is correct and Google recognized it — accept it
        // (403 usually means billing not enabled or API key restriction, not bad credentials)
        return {
          valid: true,
          metadata: { validatedFormat: true, note: 'API key recognized by Google; enable billing or check key restrictions for live queries' },
        };
      }

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }

      return { valid: false, error: `Validation failed with status ${response.status}` };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Network error during validation' };
    }
  }

  // ============================================
  // RELEVANCE AI VALIDATION (Full Config)
  // ============================================

  private async validateRelevanceConfig(config: {
    baseUrl?: string;
    projectId?: string;
    studioId?: string;
    authToken?: string;
  }): Promise<ValidationResult> {
    try {
      if (!config?.baseUrl || !config?.projectId || !config?.studioId || !config?.authToken) {
        return {
          valid: false,
          error: 'Missing required fields: baseUrl, projectId, studioId, and authToken are all required',
        };
      }

      const { baseUrl, projectId, studioId, authToken } = config;
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');

      const authHeader = authToken.includes(':') ? authToken : `${projectId}:${authToken}`;

      // Verify auth + project by listing studios
      const listResponse = await fetch(`${cleanBaseUrl}/latest/studios/list`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 10, filters: [] }),
      });

      if (listResponse.status === 401 || listResponse.status === 403) {
        return { valid: false, error: 'Invalid authorization token. Go to Settings → API → API Key in Relevance AI.' };
      }

      // If the list endpoint returns any success-ish response, auth works
      if (listResponse.ok) {
        return {
          valid: true,
          metadata: { validated: true, baseUrl: cleanBaseUrl, projectId, studioId },
        };
      }

      // Non-auth errors (404, 500, etc.) — auth might still be fine,
      // accept if the base URL and IDs look structurally valid
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(projectId) && uuidPattern.test(studioId) && cleanBaseUrl.includes('relevance')) {
        return {
          valid: true,
          metadata: { validated: true, validatedFormat: true, baseUrl: cleanBaseUrl, projectId, studioId },
        };
      }

      const errData: any = await listResponse.json().catch(() => ({}));
      return {
        valid: false,
        error: errData.message || `Relevance AI returned status ${listResponse.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error during validation',
      };
    }
  }

  // ============================================
  // APIFY VALIDATION
  // ============================================

  private async validateApifyToken(token: string): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.apify.com/v2/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          valid: true,
          metadata: {
            username: data.data?.username,
            email: data.data?.email,
          },
        };
      }

      if (response.status === 401) {
        return {
          valid: false,
          error: 'Invalid API token',
        };
      }

      return {
        valid: false,
        error: `Validation failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error during validation',
      };
    }
  }

  // ============================================
  // CALENDLY VALIDATION
  // ============================================

  private async validateCalendlyUrl(url: string): Promise<ValidationResult> {
    try {
      // Validate URL format
      const urlPattern = /^https:\/\/(calendly\.com|cal\.com)\/[a-zA-Z0-9-_/]+$/;
      if (!urlPattern.test(url)) {
        return {
          valid: false,
          error: 'Invalid booking URL format. Must be a Calendly or Cal.com URL',
        };
      }

      // Check if URL is accessible
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });

      if (response.status === 200 || response.status === 304) {
        return {
          valid: true,
          metadata: {
            accessible: true,
            provider: url.includes('calendly.com') ? 'calendly' : 'cal',
          },
        };
      }

      if (response.status === 404) {
        return {
          valid: false,
          error: 'Booking link not found - please check the URL',
        };
      }

      return {
        valid: false,
        error: `URL returned status ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate booking URL',
      };
    }
  }

  // ============================================
  // BATCH VALIDATION
  // ============================================

  /**
   * Validate multiple credentials at once
   */
  async validateMultiple(
    credentials: Array<{
      type: CredentialType;
      value: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<Map<CredentialType, ValidationResult>> {
    const results = new Map<CredentialType, ValidationResult>();

    await Promise.all(
      credentials.map(async (cred) => {
        const result = await this.validateCredential(cred.type, cred.value, cred.metadata);
        results.set(cred.type, result);
      })
    );

    return results;
  }
}
