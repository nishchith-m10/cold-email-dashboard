/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * CSV Validator Tests
 */

import { CsvValidator } from '@/lib/genesis/phase61b/csv-validator';
import type { CsvRow } from '@/lib/genesis/phase61b/csv-import-types';

describe('CsvValidator', () => {
  describe('validateHeaders', () => {
    it('should accept valid headers', () => {
      const headers = ['email_address', 'first_name', 'last_name'];
      const result = CsvValidator.validateHeaders(headers);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required column', () => {
      const headers = ['first_name', 'last_name'];
      const result = CsvValidator.validateHeaders(headers);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('email_address'))).toBe(true);
    });

    it('should warn about unknown columns', () => {
      const headers = ['email_address', 'unknown_field'];
      const result = CsvValidator.validateHeaders(headers);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('unknown_field'))).toBe(true);
    });

    it('should reject empty headers', () => {
      const headers = ['email_address', '', 'first_name'];
      const result = CsvValidator.validateHeaders(headers);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should accept all valid optional columns', () => {
      const headers = [
        'email_address',
        'first_name',
        'last_name',
        'organization_name',
        'position',
        'linkedin_url',
        'website_url',
        'industry',
        'company_size',
      ];
      const result = CsvValidator.validateHeaders(headers);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateRows', () => {
    it('should validate rows with valid data', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.valid_leads).toHaveLength(1);
      expect(result.valid_leads[0].email_address).toBe('test@example.com');
    });

    it('should reject rows with missing email', () => {
      const rows: CsvRow[] = [
        {
          first_name: 'John',
          last_name: 'Doe',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.error.includes('required'))).toBe(true);
    });

    it('should reject rows with invalid email format', () => {
      const rows: CsvRow[] = [
        { email_address: 'invalid-email' },
        { email_address: '@example.com' },
        { email_address: 'test@' },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should detect duplicate emails', () => {
      const rows: CsvRow[] = [
        { email_address: 'test@example.com' },
        { email_address: 'test@example.com' },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.duplicate_count).toBe(1);
      expect(result.errors.some(e => e.error.includes('Duplicate'))).toBe(true);
    });

    it('should detect duplicate emails case-insensitively', () => {
      const rows: CsvRow[] = [
        { email_address: 'test@example.com' },
        { email_address: 'TEST@EXAMPLE.COM' },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.duplicate_count).toBe(1);
    });

    it('should truncate long first names', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'test@example.com',
          first_name: 'A'.repeat(150),
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.valid_leads[0].first_name?.length).toBe(100);
      expect(result.warnings.some(w => w.includes('First name truncated'))).toBe(true);
    });

    it('should validate LinkedIn URLs', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'test@example.com',
          linkedin_url: 'https://linkedin.com/in/johndoe',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.valid_leads[0].linkedin_url).toBeDefined();
    });

    it('should warn about invalid URLs', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'test@example.com',
          linkedin_url: 'not-a-url',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Invalid LinkedIn URL'))).toBe(true);
      expect(result.valid_leads[0].linkedin_url).toBeUndefined();
    });

    it('should handle all optional fields', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          organization_name: 'Acme Corp',
          position: 'CEO',
          linkedin_url: 'https://linkedin.com/in/johndoe',
          website_url: 'https://acme.com',
          industry: 'Technology',
          company_size: '100-500',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      const lead = result.valid_leads[0];
      expect(lead.first_name).toBe('John');
      expect(lead.organization_name).toBe('Acme Corp');
      expect(lead.position).toBe('CEO');
      expect(lead.industry).toBe('Technology');
    });

    it('should trim whitespace from all fields', () => {
      const rows: CsvRow[] = [
        {
          email_address: '  test@example.com  ',
          first_name: '  John  ',
          last_name: '  Doe  ',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.valid_leads[0].email_address).toBe('test@example.com');
      expect(result.valid_leads[0].first_name).toBe('John');
    });

    it('should handle empty optional fields', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'test@example.com',
          first_name: '',
          last_name: '   ',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.valid_leads[0].first_name).toBeUndefined();
      expect(result.valid_leads[0].last_name).toBeUndefined();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test_123@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        const result = CsvValidator.validateEmail(email);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
      ];

      invalidEmails.forEach(email => {
        const result = CsvValidator.validateEmail(email);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = CsvValidator.validateEmail(longEmail);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should reject empty email', () => {
      const result = CsvValidator.validateEmail('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://subdomain.example.com/path',
      ];

      validUrls.forEach(url => {
        const result = CsvValidator.validateUrl(url);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept URLs without protocol', () => {
      const result = CsvValidator.validateUrl('example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not a url',
        'ht tp://example.com',
      ];

      invalidUrls.forEach(url => {
        const result = CsvValidator.validateUrl(url);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject empty URL', () => {
      const result = CsvValidator.validateUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('isValidEmailDomain', () => {
    it('should validate correct email domains', () => {
      expect(CsvValidator.isValidEmailDomain('test@example.com')).toBe(true);
      expect(CsvValidator.isValidEmailDomain('test@subdomain.example.com')).toBe(true);
      expect(CsvValidator.isValidEmailDomain('test@example.co.uk')).toBe(true);
    });

    it('should reject invalid email domains', () => {
      expect(CsvValidator.isValidEmailDomain('test@')).toBe(false);
      expect(CsvValidator.isValidEmailDomain('test@-example.com')).toBe(false);
      expect(CsvValidator.isValidEmailDomain('test@example')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(CsvValidator.isValidEmailDomain('test')).toBe(false);
    });
  });

  describe('Integration: Complete Validation', () => {
    it('should validate complete dataset', () => {
      const rows: CsvRow[] = [
        {
          email_address: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          organization_name: 'Acme Corp',
          position: 'CEO',
        },
        {
          email_address: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          organization_name: 'TechCo',
          position: 'CTO',
        },
        {
          email_address: 'invalid-email',
          first_name: 'Invalid',
        },
        {
          email_address: 'john@example.com', // Duplicate
          first_name: 'John',
        },
      ];

      const result = CsvValidator.validateRows(rows);

      expect(result.valid_leads).toHaveLength(2);
      expect(result.invalid_count).toBe(1); // Invalid email only (duplicates counted separately)
      expect(result.duplicate_count).toBe(1);
    });
  });
});
