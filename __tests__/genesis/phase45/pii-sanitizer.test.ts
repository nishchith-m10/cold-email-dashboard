/**
 * PHASE 45: PII SANITIZER TESTS
 */

import { PiiSanitizer, createPiiSanitizer } from '@/lib/genesis/phase45/pii-sanitizer';

describe('PiiSanitizer', () => {
  let sanitizer: PiiSanitizer;

  beforeEach(() => {
    sanitizer = new PiiSanitizer();
  });

  describe('basic sanitization', () => {
    it('redacts email fields', () => {
      const result = sanitizer.sanitize({ email: 'john@acme.com', name: 'John' });
      expect(result.wasSanitized).toBe(true);
      expect(result.fieldsRedacted).toBe(1);
      expect(result.data.email).not.toBe('john@acme.com');
      expect(result.data.name).toBe('John');
    });

    it('redacts email_address fields', () => {
      const result = sanitizer.sanitize({ email_address: 'jane@corp.io' });
      expect(result.wasSanitized).toBe(true);
      expect(result.data.email_address).toContain('***');
    });

    it('redacts phone fields', () => {
      const result = sanitizer.sanitize({ phone: '555-1234' });
      expect(result.wasSanitized).toBe(true);
      expect(result.data.phone).toBe('***REDACTED***');
    });

    it('redacts first_name and last_name', () => {
      const result = sanitizer.sanitize({ first_name: 'John', last_name: 'Doe' });
      expect(result.fieldsRedacted).toBe(2);
      expect(result.data.first_name).toBe('***REDACTED***');
      expect(result.data.last_name).toBe('***REDACTED***');
    });

    it('does NOT redact non-PII fields', () => {
      const result = sanitizer.sanitize({ company: 'Acme Corp', status: 'active' });
      expect(result.wasSanitized).toBe(false);
      expect(result.fieldsRedacted).toBe(0);
      expect(result.data.company).toBe('Acme Corp');
      expect(result.data.status).toBe('active');
    });
  });

  describe('nested sanitization', () => {
    it('redacts PII in nested objects', () => {
      const result = sanitizer.sanitize({
        contact: {
          email: 'deep@nested.com',
          company: 'Acme',
        },
      });
      expect(result.wasSanitized).toBe(true);
      const contact = result.data.contact as Record<string, unknown>;
      expect(contact.email).toContain('***');
      expect(contact.company).toBe('Acme');
    });

    it('redacts PII inside arrays of objects', () => {
      const result = sanitizer.sanitize({
        leads: [
          { email: 'a@b.com', score: 80 },
          { email: 'c@d.com', score: 90 },
        ],
      });
      expect(result.fieldsRedacted).toBe(2);
      const leads = result.data.leads as Array<Record<string, unknown>>;
      expect(leads[0].email).toContain('***');
      expect(leads[0].score).toBe(80);
      expect(leads[1].email).toContain('***');
    });
  });

  describe('email partial redaction', () => {
    it('preserves domain hint for email values', () => {
      const result = sanitizer.sanitize({ email: 'user@example.com' });
      const redacted = result.data.email as string;
      expect(redacted).toContain('@');
      expect(redacted).toContain('exa');
      expect(redacted).toContain('com');
      expect(redacted).not.toContain('user');
    });
  });

  describe('size enforcement', () => {
    it('truncates data exceeding maxDataSizeBytes', () => {
      const largeSanitizer = new PiiSanitizer({ maxDataSizeBytes: 50 });
      const result = largeSanitizer.sanitize({
        description: 'A'.repeat(100),
        notes: 'B'.repeat(100),
      });
      expect(result.data._truncated).toBe(true);
      expect(result.data._originalSizeBytes).toBeGreaterThan(50);
    });

    it('does not truncate small data', () => {
      const result = sanitizer.sanitize({ status: 'ok' });
      expect(result.data._truncated).toBeUndefined();
    });
  });

  describe('null/undefined handling', () => {
    it('handles null input', () => {
      const result = sanitizer.sanitize(null);
      expect(result.data).toEqual({});
      expect(result.wasSanitized).toBe(false);
    });

    it('handles undefined input', () => {
      const result = sanitizer.sanitize(undefined);
      expect(result.data).toEqual({});
      expect(result.wasSanitized).toBe(false);
    });

    it('wraps non-object input', () => {
      const result = sanitizer.sanitize('just a string' as unknown);
      expect(result.data._value).toBe('just a string');
    });
  });

  describe('isPiiField', () => {
    it('matches case-insensitively', () => {
      expect(sanitizer.isPiiField('EMAIL')).toBe(true);
      expect(sanitizer.isPiiField('Email')).toBe(true);
      expect(sanitizer.isPiiField('email')).toBe(true);
    });

    it('returns false for non-PII fields', () => {
      expect(sanitizer.isPiiField('company')).toBe(false);
      expect(sanitizer.isPiiField('status')).toBe(false);
    });
  });

  describe('createPiiSanitizer factory', () => {
    it('creates a sanitizer with defaults', () => {
      const s = createPiiSanitizer();
      expect(s).toBeInstanceOf(PiiSanitizer);
    });

    it('accepts custom config', () => {
      const s = createPiiSanitizer({ placeholder: '[HIDDEN]' });
      const result = s.sanitize({ phone: '555-1234' });
      expect(result.data.phone).toBe('[HIDDEN]');
    });
  });
});
