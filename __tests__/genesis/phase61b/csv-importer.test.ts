/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * CSV Importer Tests
 */

import { CsvImporter } from '@/lib/genesis/phase61b/csv-importer';
import type { CsvImportRequest, ValidatedLead } from '@/lib/genesis/phase61b/csv-import-types';

describe('CsvImporter', () => {
  const baseRequest: CsvImportRequest = {
    campaign_id: 'campaign-123',
    campaign_name: 'Tech CTOs',
    workspace_id: 'workspace-456',
    file_content: '',
  };

  describe('processImport', () => {
    it('should successfully process valid CSV', () => {
      const csv = `email_address,first_name,last_name
john@example.com,John,Doe
jane@example.com,Jane,Smith`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.duplicates_skipped).toBe(0);
      expect(result.invalid_rows).toBe(0);
      expect(result.total_rows_processed).toBe(2);
    });

    it('should reject file exceeding size limit', () => {
      // Create a file larger than 5MB (5 * 1024 * 1024 bytes)
      const largeContent = 'email_address\n' + 'test@example.com\n'.repeat(350000); // ~6MB

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: largeContent,
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.error.includes('size'))).toBe(true);
    });

    it('should handle CSV with no data rows', () => {
      const csv = 'email_address,first_name';

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
    });

    it('should reject CSV with missing required headers', () => {
      const csv = `first_name,last_name
John,Doe`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.error.includes('email_address'))).toBe(true);
    });

    it('should skip duplicate emails', () => {
      const csv = `email_address,first_name
john@example.com,John
john@example.com,John Duplicate`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.imported).toBe(1);
      expect(result.duplicates_skipped).toBe(1);
    });

    it('should skip invalid emails', () => {
      const csv = `email_address,first_name
john@example.com,John
invalid-email,Invalid
jane@example.com,Jane`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.imported).toBe(2);
      expect(result.invalid_rows).toBe(1);
    });

    it('should collect warnings for unknown columns', () => {
      const csv = `email_address,first_name,unknown_field
john@example.com,John,Unknown`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('unknown_field'))).toBe(true);
    });

    it('should enforce max rows limit', () => {
      const rows = Array.from({ length: 100 }, (_, i) => `test${i}@example.com,Test${i}`).join('\n');
      const csv = `email_address,first_name\n${rows}`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
        max_rows: 50,
      };

      const result = CsvImporter.processImport(request);

      expect(result.imported).toBe(50);
      expect(result.errors.some(e => e.error.includes('Maximum row limit'))).toBe(true);
    });

    it('should handle empty CSV file', () => {
      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: '',
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(false);
    });

    it('should include campaign info in result', () => {
      const csv = `email_address
john@example.com`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.campaign_id).toBe('campaign-123');
      expect(result.campaign_name).toBe('Tech CTOs');
    });

    it('should collect all errors and warnings', () => {
      const csv = `email_address,unknown_field
invalid-email,Test
john@example.com,Test
john@example.com,Duplicate`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('prepareLeadsForInsert', () => {
    it('should prepare leads with all fields', () => {
      const validLeads: ValidatedLead[] = [
        {
          email_address: 'john@example.com',
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

      const prepared = CsvImporter.prepareLeadsForInsert(
        validLeads,
        'campaign-123',
        'Tech CTOs',
        'workspace-456'
      );

      expect(prepared).toHaveLength(1);
      expect(prepared[0].workspace_id).toBe('workspace-456');
      expect(prepared[0].campaign_name).toBe('Tech CTOs');
      expect(prepared[0].email_address).toBe('john@example.com');
      expect(prepared[0].first_name).toBe('John');
      expect(prepared[0].organization_name).toBe('Acme Corp');
    });

    it('should set default status fields', () => {
      const validLeads: ValidatedLead[] = [
        { email_address: 'john@example.com' },
      ];

      const prepared = CsvImporter.prepareLeadsForInsert(
        validLeads,
        'campaign-123',
        'Tech CTOs',
        'workspace-456'
      );

      expect(prepared[0].email_prep).toBe(false);
      expect(prepared[0].email_1_sent).toBe(false);
      expect(prepared[0].email_2_sent).toBe(false);
      expect(prepared[0].email_3_sent).toBe(false);
      expect(prepared[0].opted_out).toBe(false);
      expect(prepared[0].bounced).toBe(false);
    });

    it('should handle optional fields as null when missing', () => {
      const validLeads: ValidatedLead[] = [
        { email_address: 'john@example.com' },
      ];

      const prepared = CsvImporter.prepareLeadsForInsert(
        validLeads,
        'campaign-123',
        'Tech CTOs',
        'workspace-456'
      );

      expect(prepared[0].first_name).toBeNull();
      expect(prepared[0].last_name).toBeNull();
      expect(prepared[0].organization_name).toBeNull();
      expect(prepared[0].position).toBeNull();
    });

    it('should prepare multiple leads', () => {
      const validLeads: ValidatedLead[] = [
        { email_address: 'john@example.com', first_name: 'John' },
        { email_address: 'jane@example.com', first_name: 'Jane' },
      ];

      const prepared = CsvImporter.prepareLeadsForInsert(
        validLeads,
        'campaign-123',
        'Tech CTOs',
        'workspace-456'
      );

      expect(prepared).toHaveLength(2);
      expect(prepared[0].first_name).toBe('John');
      expect(prepared[1].first_name).toBe('Jane');
    });
  });

  describe('validateRequest', () => {
    it('should validate correct request', () => {
      const request: CsvImportRequest = {
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        workspace_id: 'workspace-456',
        file_content: 'email_address\ntest@example.com',
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing campaign_id', () => {
      const request: CsvImportRequest = {
        campaign_id: '',
        campaign_name: 'Tech CTOs',
        workspace_id: 'workspace-456',
        file_content: 'test',
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Campaign ID'))).toBe(true);
    });

    it('should reject missing campaign_name', () => {
      const request: CsvImportRequest = {
        campaign_id: 'campaign-123',
        campaign_name: '',
        workspace_id: 'workspace-456',
        file_content: 'test',
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Campaign name'))).toBe(true);
    });

    it('should reject missing workspace_id', () => {
      const request: CsvImportRequest = {
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        workspace_id: '',
        file_content: 'test',
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Workspace ID'))).toBe(true);
    });

    it('should reject missing file_content', () => {
      const request: CsvImportRequest = {
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        workspace_id: 'workspace-456',
        file_content: '',
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('file content'))).toBe(true);
    });

    it('should reject invalid max_rows', () => {
      const request: CsvImportRequest = {
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        workspace_id: 'workspace-456',
        file_content: 'test',
        max_rows: 0,
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Max rows'))).toBe(true);
    });

    it('should reject max_rows exceeding limit', () => {
      const request: CsvImportRequest = {
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        workspace_id: 'workspace-456',
        file_content: 'test',
        max_rows: 10000,
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot exceed'))).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const request: CsvImportRequest = {
        campaign_id: '',
        campaign_name: '',
        workspace_id: '',
        file_content: '',
      };

      const result = CsvImporter.validateRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary for successful import', () => {
      const result = {
        success: true,
        imported: 100,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 100,
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        errors: [],
        warnings: [],
      };

      const summary = CsvImporter.generateSummary(result);

      expect(summary).toContain('100 lead(s)');
    });

    it('should include duplicates in summary', () => {
      const result = {
        success: true,
        imported: 90,
        duplicates_skipped: 10,
        invalid_rows: 0,
        total_rows_processed: 100,
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        errors: [],
        warnings: [],
      };

      const summary = CsvImporter.generateSummary(result);

      expect(summary).toContain('10 duplicate(s)');
    });

    it('should include invalid rows in summary', () => {
      const result = {
        success: true,
        imported: 85,
        duplicates_skipped: 5,
        invalid_rows: 10,
        total_rows_processed: 100,
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        errors: [],
        warnings: [],
      };

      const summary = CsvImporter.generateSummary(result);

      expect(summary).toContain('10 invalid row(s)');
    });

    it('should include warnings count in summary', () => {
      const result = {
        success: true,
        imported: 100,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 100,
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        errors: [],
        warnings: ['Warning 1', 'Warning 2'],
      };

      const summary = CsvImporter.generateSummary(result);

      expect(summary).toContain('2 warning(s)');
    });

    it('should generate error summary for failed import', () => {
      const result = {
        success: false,
        imported: 0,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 0,
        campaign_id: 'campaign-123',
        campaign_name: 'Tech CTOs',
        errors: [
          { row_number: 1, error: 'Error 1' },
          { row_number: 2, error: 'Error 2' },
        ],
        warnings: [],
      };

      const summary = CsvImporter.generateSummary(result);

      expect(summary).toContain('failed');
      expect(summary).toContain('2 error(s)');
    });
  });

  describe('Integration: Complete Import Flow', () => {
    it('should process real-world CSV successfully', () => {
      const csv = `email_address,first_name,last_name,organization_name,position,linkedin_url,website_url,industry,company_size
john@acme.com,John,Doe,Acme Corp,CEO,https://linkedin.com/in/johndoe,https://acme.com,Technology,100-500
jane@techco.com,Jane,Smith,TechCo,CTO,https://linkedin.com/in/janesmith,https://techco.com,Software,50-100
bob@startup.com,Bob,Johnson,Startup Inc,Founder,https://linkedin.com/in/bobjohnson,https://startup.com,SaaS,10-50`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(result.duplicates_skipped).toBe(0);
      expect(result.invalid_rows).toBe(0);

      const summary = CsvImporter.generateSummary(result);
      expect(summary).toContain('3 lead(s)');
    });

    it('should handle mixed valid and invalid data', () => {
      const csv = `email_address,first_name,last_name
john@example.com,John,Doe
invalid-email,Invalid,User
jane@example.com,Jane,Smith
john@example.com,John,Duplicate
@nodomain.com,No,Domain`;

      const request: CsvImportRequest = {
        ...baseRequest,
        file_content: csv,
      };

      const result = CsvImporter.processImport(request);

      expect(result.imported).toBe(2);
      expect(result.duplicates_skipped).toBe(1);
      expect(result.invalid_rows).toBe(2);
      expect(result.total_rows_processed).toBe(5);
    });
  });
});
