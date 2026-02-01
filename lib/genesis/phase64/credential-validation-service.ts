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
          return {
            valid: false,
            error: 'Invalid Engine ID',
          };
        }
        return {
          valid: false,
          error: data.error?.message || 'Invalid API key or Engine ID',
        };
      }

      if (response.status === 403) {
        return {
          valid: false,
          error: 'API key not authorized for Custom Search API',
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
  // RELEVANCE AI VALIDATION (Full Config)
  // ============================================

  private async validateRelevanceConfig(config: {
    baseUrl?: string;
    projectId?: string;
    studioId?: string;
    authToken?: string;
  }): Promise<ValidationResult> {
    try {
      // Validate all required fields are present
      if (!config?.baseUrl || !config?.projectId || !config?.studioId || !config?.authToken) {
        return {
          valid: false,
          error: 'Missing required fields: baseUrl, projectId, studioId, and authToken are all required',
        };
      }

      const { baseUrl, projectId, studioId, authToken } = config;

      // Clean up base URL (remove trailing slash)
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');

      // Validate by checking the run history endpoint (this confirms all credentials work together)
      const response = await fetch(
        `${cleanBaseUrl}/latest/studios/run_history/list?page_size=1&filters=${encodeURIComponent(
          JSON.stringify([
            { filter_type: 'exact_match', field: 'project', condition: '==', condition_value: projectId },
            { filter_type: 'exact_match', field: 'studio_id', condition: '==', condition_value: studioId },
          ])
        )}`,
        {
          method: 'GET',
          headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        const data: any = await response.json();
        return {
          valid: true,
          metadata: {
            validated: true,
            baseUrl: cleanBaseUrl,
            projectId,
            studioId,
            runsFound: data.results?.length || 0,
          },
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          error: 'Invalid authorization token',
        };
      }

      if (response.status === 404) {
        return {
          valid: false,
          error: 'Studio or project not found. Please verify your Project ID and Studio ID.',
        };
      }

      const errorData: any = await response.json().catch(() => ({}));
      return {
        valid: false,
        error: errorData.message || `Validation failed with status ${response.status}`,
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
