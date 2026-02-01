/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * CSV Importer
 * 
 * Main orchestrator for CSV lead import process
 */

import { CsvParser } from './csv-parser';
import { CsvValidator } from './csv-validator';
import type {
  CsvImportRequest,
  CsvImportResult,
  ImportValidationError,
  ValidatedLead,
} from './csv-import-types';
import {
  MAX_CSV_ROWS,
  MAX_CSV_FILE_SIZE_BYTES,
} from './csv-import-types';

/**
 * CSV Importer
 * Orchestrates the entire CSV import process
 */
export class CsvImporter {
  /**
   * Process CSV import request
   */
  static processImport(request: CsvImportRequest): CsvImportResult {
    const errors: ImportValidationError[] = [];
    const warnings: string[] = [];

    // Step 1: Validate file size
    const fileSizeValidation = CsvParser.validateFileSize(
      request.file_content,
      MAX_CSV_FILE_SIZE_BYTES
    );

    if (!fileSizeValidation.valid) {
      return {
        success: false,
        imported: 0,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 0,
        campaign_id: request.campaign_id,
        campaign_name: request.campaign_name,
        errors: [{
          row_number: 0,
          error: fileSizeValidation.error || 'File size validation failed',
        }],
        warnings: [],
      };
    }

    // Step 2: Parse CSV
    const { rows, errors: parseErrors } = CsvParser.parse(
      request.file_content,
      {
        max_rows: request.max_rows || MAX_CSV_ROWS,
        skip_empty_lines: true,
        trim_values: true,
      }
    );

    errors.push(...parseErrors);

    if (rows.length === 0) {
      return {
        success: false,
        imported: 0,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 0,
        campaign_id: request.campaign_id,
        campaign_name: request.campaign_name,
        errors: errors.length > 0 ? errors : [{
          row_number: 0,
          error: 'No data rows found in CSV',
        }],
        warnings,
      };
    }

    // Step 3: Validate headers
    const headers = CsvParser.extractHeaders(request.file_content);
    const headerValidation = CsvValidator.validateHeaders(headers);

    if (!headerValidation.valid) {
      return {
        success: false,
        imported: 0,
        duplicates_skipped: 0,
        invalid_rows: 0,
        total_rows_processed: 0,
        campaign_id: request.campaign_id,
        campaign_name: request.campaign_name,
        errors: headerValidation.errors.map((error, index) => ({
          row_number: 1,
          error,
        })),
        warnings: headerValidation.warnings,
      };
    }

    warnings.push(...headerValidation.warnings);

    // Step 4: Validate rows
    const rowValidation = CsvValidator.validateRows(rows);
    errors.push(...rowValidation.errors);
    warnings.push(...rowValidation.warnings);

    // Step 5: Generate import result
    const result: CsvImportResult = {
      success: rowValidation.valid_leads.length > 0,
      imported: rowValidation.valid_leads.length,
      duplicates_skipped: rowValidation.duplicate_count,
      invalid_rows: rowValidation.invalid_count,
      total_rows_processed: rows.length,
      campaign_id: request.campaign_id,
      campaign_name: request.campaign_name,
      errors,
      warnings,
    };

    return result;
  }

  /**
   * Prepare leads for database insertion
   */
  static prepareLeadsForInsert(
    validLeads: ValidatedLead[],
    campaignId: string,
    campaignName: string,
    workspaceId: string
  ): Array<Record<string, any>> {
    return validLeads.map(lead => ({
      workspace_id: workspaceId,
      campaign_name: campaignName,
      email_address: lead.email_address,
      first_name: lead.first_name || null,
      last_name: lead.last_name || null,
      organization_name: lead.organization_name || null,
      position: lead.position || null,
      linkedin_url: lead.linkedin_url || null,
      website_url: lead.website_url || null,
      industry: lead.industry || null,
      company_size: lead.company_size || null,
      // Default status fields
      email_prep: false,
      email_1_sent: false,
      email_2_sent: false,
      email_3_sent: false,
      opted_out: false,
      bounced: false,
    }));
  }

  /**
   * Validate import request
   */
  static validateRequest(request: CsvImportRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.campaign_id || request.campaign_id.trim().length === 0) {
      errors.push('Campaign ID is required');
    }

    if (!request.campaign_name || request.campaign_name.trim().length === 0) {
      errors.push('Campaign name is required');
    }

    if (!request.workspace_id || request.workspace_id.trim().length === 0) {
      errors.push('Workspace ID is required');
    }

    if (!request.file_content || request.file_content.trim().length === 0) {
      errors.push('CSV file content is required');
    }

    if (request.max_rows !== undefined && request.max_rows < 1) {
      errors.push('Max rows must be at least 1');
    }

    if (request.max_rows !== undefined && request.max_rows > MAX_CSV_ROWS) {
      errors.push(`Max rows cannot exceed ${MAX_CSV_ROWS}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate import summary message
   */
  static generateSummary(result: CsvImportResult): string {
    if (!result.success) {
      return `Import failed: ${result.errors.length} error(s) found`;
    }

    const parts: string[] = [];
    parts.push(`Successfully imported ${result.imported} lead(s)`);

    if (result.duplicates_skipped > 0) {
      parts.push(`${result.duplicates_skipped} duplicate(s) skipped`);
    }

    if (result.invalid_rows > 0) {
      parts.push(`${result.invalid_rows} invalid row(s) skipped`);
    }

    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} warning(s)`);
    }

    return parts.join(', ');
  }
}
