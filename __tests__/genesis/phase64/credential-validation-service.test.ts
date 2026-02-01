/**
 * PHASE 64: Credential Validation Service Tests
 * 
 * Tests for real-time API key and credential validation.
 */

import { CredentialValidationService } from '@/lib/genesis/phase64/credential-validation-service';

// ============================================
// MOCKS
// ============================================

global.fetch = jest.fn();

describe('CredentialValidationService', () => {
  let service: CredentialValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CredentialValidationService();
  });

  // ============================================
  // OPENAI VALIDATION
  // ============================================

  describe('OpenAI Validation', () => {
    it('should validate valid OpenAI key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({
          data: [{ id: 'gpt-4' }, { id: 'gpt-3.5-turbo' }],
        }),
        headers: new Map([['openai-organization', 'org-123']]),
      });

      const result = await service.validateCredential('openai_api_key', 'sk-test-key');

      expect(result.valid).toBe(true);
      expect(result.metadata?.modelsCount).toBe(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: { Authorization: 'Bearer sk-test-key' },
        })
      );
    });

    it('should reject invalid OpenAI key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        json: async () => ({}),
      });

      const result = await service.validateCredential('openai_api_key', 'sk-invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 429,
        json: async () => ({}),
      });

      const result = await service.validateCredential('openai_api_key', 'sk-test');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Rate limited');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const result = await service.validateCredential('openai_api_key', 'sk-test');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  // ============================================
  // ANTHROPIC VALIDATION
  // ============================================

  describe('Anthropic Validation', () => {
    it('should validate valid Anthropic key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ content: [{ text: 'Hi' }] }),
        headers: new Map([['request-id', 'req-abc']]),
      });

      const result = await service.validateCredential('anthropic_api_key', 'sk-ant-test');

      expect(result.valid).toBe(true);
      expect(result.metadata?.requestId).toBe('req-abc');
    });

    it('should accept 400 status (malformed request but auth worked)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 400,
        json: async () => ({ error: { message: 'Invalid model' } }),
        headers: new Map(),
      });

      const result = await service.validateCredential('anthropic_api_key', 'sk-ant-test');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid Anthropic key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        json: async () => ({}),
      });

      const result = await service.validateCredential('anthropic_api_key', 'sk-ant-invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should reject forbidden Anthropic key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 403,
        json: async () => ({}),
      });

      const result = await service.validateCredential('anthropic_api_key', 'sk-ant-forbidden');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('authentication failed');
    });
  });

  // ============================================
  // GOOGLE CSE VALIDATION
  // ============================================

  describe('Google CSE Validation', () => {
    it('should validate valid Google CSE key and engine', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({
          searchInformation: { totalResults: '1234' },
          context: { title: 'My Search Engine' },
        }),
      });

      const result = await service.validateCredential(
        'google_cse_api_key',
        'api-key-123',
        { engineId: 'engine-abc' }
      );

      expect(result.valid).toBe(true);
      expect(result.metadata?.totalResults).toBe('1234');
      expect(result.metadata?.engineTitle).toBe('My Search Engine');
    });

    it('should require engine ID', async () => {
      const result = await service.validateCredential('google_cse_api_key', 'api-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Engine ID is required');
    });

    it('should reject invalid engine ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 400,
        json: async () => ({
          error: { message: 'Invalid Value for cx parameter' },
        }),
      });

      const result = await service.validateCredential(
        'google_cse_api_key',
        'api-key',
        { engineId: 'invalid' }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Engine ID');
    });

    it('should reject unauthorized API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 403,
        json: async () => ({}),
      });

      const result = await service.validateCredential(
        'google_cse_api_key',
        'api-key',
        { engineId: 'engine-123' }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not authorized');
    });
  });

  // ============================================
  // RELEVANCE AI VALIDATION
  // ============================================

  describe('Relevance AI Validation', () => {
    it('should validate valid Relevance AI key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ validated: true }),
      });

      const result = await service.validateCredential('relevance_api_key', 'rel-test-key');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid Relevance AI key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        json: async () => ({}),
      });

      const result = await service.validateCredential('relevance_api_key', 'rel-invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });
  });

  // ============================================
  // APIFY VALIDATION
  // ============================================

  describe('Apify Validation', () => {
    it('should validate valid Apify token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({
          data: {
            username: 'acme-user',
            email: 'user@acme.com',
          },
        }),
      });

      const result = await service.validateCredential('apify_api_token', 'apify-test-token');

      expect(result.valid).toBe(true);
      expect(result.metadata?.username).toBe('acme-user');
      expect(result.metadata?.email).toBe('user@acme.com');
    });

    it('should reject invalid Apify token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        json: async () => ({}),
      });

      const result = await service.validateCredential('apify_api_token', 'apify-invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid API token');
    });
  });

  // ============================================
  // CALENDLY VALIDATION
  // ============================================

  describe('Calendly Validation', () => {
    it('should validate valid Calendly URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await service.validateCredential(
        'calendly_url',
        'https://calendly.com/acme/30min'
      );

      expect(result.valid).toBe(true);
      expect(result.metadata?.provider).toBe('calendly');
    });

    it('should validate Cal.com URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await service.validateCredential(
        'calendly_url',
        'https://cal.com/acme/30min'
      );

      expect(result.valid).toBe(true);
      expect(result.metadata?.provider).toBe('cal');
    });

    it('should reject invalid URL format', async () => {
      const result = await service.validateCredential('calendly_url', 'not-a-url');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid booking URL format');
    });

    it('should reject non-Calendly URLs', async () => {
      const result = await service.validateCredential('calendly_url', 'https://example.com/booking');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid booking URL format');
    });

    it('should detect 404 URLs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 404,
      });

      const result = await service.validateCredential(
        'calendly_url',
        'https://calendly.com/notfound'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle 304 Not Modified as valid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 304,
      });

      const result = await service.validateCredential(
        'calendly_url',
        'https://calendly.com/acme/30min'
      );

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // BATCH VALIDATION
  // ============================================

  describe('Batch Validation', () => {
    it('should validate multiple credentials', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ status: 200, json: async () => ({ data: [] }), headers: new Map() }) // OpenAI
        .mockResolvedValueOnce({ status: 200, json: async () => ({}), headers: new Map() }) // Anthropic
        .mockResolvedValueOnce({ status: 200, headers: new Map() }); // Calendly

      const results = await service.validateMultiple([
        { type: 'openai_api_key', value: 'sk-test1' },
        { type: 'anthropic_api_key', value: 'sk-ant-test2' },
        { type: 'calendly_url', value: 'https://calendly.com/test' },
      ]);

      expect(results.size).toBe(3);
      expect(results.get('openai_api_key')?.valid).toBe(true);
      expect(results.get('anthropic_api_key')?.valid).toBe(true);
      expect(results.get('calendly_url')?.valid).toBe(true);
    });

    it('should handle mixed success and failure', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ status: 200, json: async () => ({ data: [] }), headers: new Map() }) // OpenAI success
        .mockResolvedValueOnce({ status: 401, json: async () => ({}), headers: new Map() }); // Anthropic fail

      const results = await service.validateMultiple([
        { type: 'openai_api_key', value: 'sk-valid' },
        { type: 'anthropic_api_key', value: 'sk-invalid' },
      ]);

      expect(results.get('openai_api_key')?.valid).toBe(true);
      expect(results.get('anthropic_api_key')?.valid).toBe(false);
    });

    it('should validate in parallel', async () => {
      const startTime = Date.now();

      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({ status: 200, json: async () => ({}) }), 100)
        )
      );

      const results = await service.validateMultiple([
        { type: 'openai_api_key', value: 'sk-1' },
        { type: 'anthropic_api_key', value: 'sk-2' },
        { type: 'relevance_api_key', value: 'rel-3' },
      ]);

      const duration = Date.now() - startTime;

      // Should complete in ~100ms (parallel), not ~300ms (sequential)
      expect(duration).toBeLessThan(250);
      expect(results.size).toBe(3);
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should handle fetch rejection', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await service.validateCredential('openai_api_key', 'sk-test');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      const result = await service.validateCredential('openai_api_key', 'sk-test');

      expect(result.valid).toBe(false);
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await service.validateCredential('openai_api_key', 'sk-test');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
      });

      const result = await service.validateCredential('openai_api_key', '');

      expect(result.valid).toBe(false);
    });

    it('should handle API key with spaces', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ data: [] }),
        headers: new Map(),
      });

      const result = await service.validateCredential('openai_api_key', '  sk-test  ');

      expect(result.valid).toBe(true);
      // Should include the key in the request (with spaces preserved)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: expect.any(String) }),
        })
      );
    });

    it('should handle very long API keys', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ data: [] }),
        headers: new Map(),
      });

      const longKey = 'sk-' + 'x'.repeat(500);
      const result = await service.validateCredential('openai_api_key', longKey);

      expect(result.valid).toBe(true);
    });

    it('should handle special characters in API keys', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: async () => ({ data: [] }),
        headers: new Map(),
      });

      const specialKey = 'sk-abc!@#$%^&*()';
      const result = await service.validateCredential('openai_api_key', specialKey);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // RATE LIMITING BEHAVIOR
  // ============================================

  describe('Rate Limiting', () => {
    it('should handle 429 from OpenAI', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      const result = await service.validateCredential('openai_api_key', 'sk-test');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Rate limited');
    });

    it('should handle 429 from Anthropic', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 429,
        headers: new Map(),
      });

      const result = await service.validateCredential('anthropic_api_key', 'sk-ant-test');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Rate limited');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security', () => {
    it('should not leak API keys in errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.validateCredential('openai_api_key', 'sk-secret-key-123');

      expect(result.error).not.toContain('sk-secret-key-123');
    });

    it('should validate URLs for SSRF protection', async () => {
      const result = await service.validateCredential('calendly_url', 'http://localhost:3000');

      expect(result.valid).toBe(false);
    });

    it('should reject file:// URLs', async () => {
      const result = await service.validateCredential('calendly_url', 'file:///etc/passwd');

      expect(result.valid).toBe(false);
    });
  });
});
