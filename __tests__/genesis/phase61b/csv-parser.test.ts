/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * CSV Parser Tests
 */

import { CsvParser } from '@/lib/genesis/phase61b/csv-parser';

describe('CsvParser', () => {
  describe('parse', () => {
    it('should parse simple CSV', () => {
      const csv = 'email_address,first_name\ntest@example.com,John';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
      expect(rows[0].email_address).toBe('test@example.com');
      expect(rows[0].first_name).toBe('John');
    });

    it('should parse CSV with quoted values', () => {
      const csv = 'email_address,first_name\n"test@example.com","John, Jr."';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
      expect(rows[0].first_name).toBe('John, Jr.');
    });

    it('should parse CSV with escaped quotes', () => {
      const csv = 'email_address,position\ntest@example.com,"CEO ""Chief""" ';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows[0].position).toBe('CEO "Chief"');
    });

    it('should skip empty lines', () => {
      const csv = 'email_address\ntest1@example.com\n\ntest2@example.com\n\n';
      const { rows, errors } = CsvParser.parse(csv, { skip_empty_lines: true });

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
    });

    it('should trim values when configured', () => {
      const csv = 'email_address,first_name\n  test@example.com  ,  John  ';
      const { rows, errors } = CsvParser.parse(csv, { trim_values: true });

      expect(errors).toHaveLength(0);
      expect(rows[0].email_address).toBe('test@example.com');
      expect(rows[0].first_name).toBe('John');
    });

    it('should enforce max rows limit', () => {
      const csv = 'email_address\ntest1@example.com\ntest2@example.com\ntest3@example.com';
      const { rows, errors } = CsvParser.parse(csv, { max_rows: 2 });

      expect(rows).toHaveLength(2);
      expect(errors.some(e => e.error.includes('Maximum row limit'))).toBe(true);
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const { rows, errors } = CsvParser.parse(csv);

      expect(rows).toHaveLength(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'email_address,first_name';
      const { rows, errors } = CsvParser.parse(csv);

      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it('should detect column count mismatch', () => {
      const csv = 'email_address,first_name\ntest@example.com\ntest2@example.com,John,Extra';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.error.includes('columns'))).toBe(true);
    });

    it('should detect duplicate headers', () => {
      const csv = 'email_address,email_address\ntest@example.com,test2@example.com';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors.some(e => e.error.includes('duplicate'))).toBe(true);
    });

    it('should handle Windows line endings', () => {
      const csv = 'email_address\r\ntest@example.com\r\n';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });

    it('should handle Unix line endings', () => {
      const csv = 'email_address\ntest@example.com\n';
      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });
  });

  describe('parseCsvLine', () => {
    it('should parse simple line', () => {
      const result = CsvParser.parseCsvLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should parse quoted values', () => {
      const result = CsvParser.parseCsvLine('"a","b","c"');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should parse values with commas inside quotes', () => {
      const result = CsvParser.parseCsvLine('"a,b","c"');
      expect(result).toEqual(['a,b', 'c']);
    });

    it('should parse escaped quotes', () => {
      const result = CsvParser.parseCsvLine('"a ""quoted"" value"');
      expect(result).toEqual(['a "quoted" value']);
    });

    it('should handle empty values', () => {
      const result = CsvParser.parseCsvLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });

    it('should trim values when specified', () => {
      const result = CsvParser.parseCsvLine('  a  ,  b  ', true);
      expect(result).toEqual(['a', 'b']);
    });

    it('should not trim when not specified', () => {
      const result = CsvParser.parseCsvLine('  a  ,  b  ', false);
      expect(result).toEqual(['  a  ', '  b  ']);
    });
  });

  describe('detectDelimiter', () => {
    it('should detect comma delimiter', () => {
      const csv = 'email_address,first_name,last_name';
      expect(CsvParser.detectDelimiter(csv)).toBe(',');
    });

    it('should detect semicolon delimiter', () => {
      const csv = 'email_address;first_name;last_name';
      expect(CsvParser.detectDelimiter(csv)).toBe(';');
    });

    it('should default to comma if equal counts', () => {
      const csv = 'email_address';
      expect(CsvParser.detectDelimiter(csv)).toBe(',');
    });
  });

  describe('validateFileSize', () => {
    it('should accept file within size limit', () => {
      const content = 'a'.repeat(1000);
      const result = CsvParser.validateFileSize(content, 10000);

      expect(result.valid).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
      const content = 'a'.repeat(10000);
      const result = CsvParser.validateFileSize(content, 1000);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(CsvParser.formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(CsvParser.formatBytes(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(CsvParser.formatBytes(1572864)).toBe('1.50 MB');
    });
  });

  describe('extractHeaders', () => {
    it('should extract headers from CSV', () => {
      const csv = 'email_address,first_name,last_name\ntest@example.com,John,Doe';
      const headers = CsvParser.extractHeaders(csv);

      expect(headers).toEqual(['email_address', 'first_name', 'last_name']);
    });

    it('should handle empty CSV', () => {
      const headers = CsvParser.extractHeaders('');
      expect(headers).toEqual(['']);
    });
  });

  describe('countRows', () => {
    it('should count rows excluding header', () => {
      const csv = 'email_address\ntest1@example.com\ntest2@example.com';
      const count = CsvParser.countRows(csv);

      expect(count).toBe(2);
    });

    it('should skip empty lines when configured', () => {
      const csv = 'email_address\ntest1@example.com\n\ntest2@example.com\n\n';
      const count = CsvParser.countRows(csv, true);

      expect(count).toBe(2);
    });

    it('should count empty lines when not skipping', () => {
      const csv = 'email_address\ntest1@example.com\n\ntest2@example.com\n\n';
      const count = CsvParser.countRows(csv, false);

      // Expecting 5: test1@example.com, empty, test2@example.com, empty, final empty line
      expect(count).toBe(5);
    });

    it('should return 0 for CSV with only header', () => {
      const csv = 'email_address';
      const count = CsvParser.countRows(csv);

      expect(count).toBe(0);
    });
  });

  describe('Integration: Real-world CSV', () => {
    it('should parse complete lead CSV', () => {
      const csv = `email_address,first_name,last_name,organization_name,position
john@example.com,John,Doe,Acme Corp,CEO
jane@example.com,Jane,Smith,TechCo,CTO`;

      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
      expect(rows[0].email_address).toBe('john@example.com');
      expect(rows[0].organization_name).toBe('Acme Corp');
      expect(rows[1].position).toBe('CTO');
    });

    it('should handle complex quoted values', () => {
      const csv = `email_address,organization_name,position
"john@example.com","Acme, Inc.","CEO, ""Chief"" Executive"`;

      const { rows, errors } = CsvParser.parse(csv);

      expect(errors).toHaveLength(0);
      expect(rows[0].organization_name).toBe('Acme, Inc.');
      expect(rows[0].position).toBe('CEO, "Chief" Executive');
    });
  });
});
