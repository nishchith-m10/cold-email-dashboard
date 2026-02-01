/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * Type definitions for CSV lead import
 */

/**
 * CSV column names (expected headers)
 */
export interface CsvLeadColumns {
  email_address: string;           // REQUIRED
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  position?: string;
  linkedin_url?: string;
  website_url?: string;
  industry?: string;
  company_size?: string;
}

/**
 * Raw CSV row (parsed from file)
 */
export interface CsvRow {
  [key: string]: string | undefined;
}

/**
 * Validated lead data ready for database insert
 */
export interface ValidatedLead {
  email_address: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  position?: string;
  linkedin_url?: string;
  website_url?: string;
  industry?: string;
  company_size?: string;
}

/**
 * Import validation error
 */
export interface ImportValidationError {
  row_number: number;
  field?: string;
  error: string;
}

/**
 * CSV import request
 */
export interface CsvImportRequest {
  campaign_id: string;
  campaign_name: string;
  workspace_id: string;
  file_content: string;  // CSV file content as string
  max_rows?: number;     // Default: 5000
}

/**
 * CSV import result
 */
export interface CsvImportResult {
  success: boolean;
  imported: number;
  duplicates_skipped: number;
  invalid_rows: number;
  total_rows_processed: number;
  campaign_id: string;
  campaign_name: string;
  errors: ImportValidationError[];
  warnings: string[];
}

/**
 * CSV import statistics
 */
export interface ImportStats {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  rows_imported: number;
}

/**
 * CSV parsing options
 */
export interface CsvParseOptions {
  max_rows?: number;
  skip_empty_lines?: boolean;
  trim_values?: boolean;
}

/**
 * CSV validation result
 */
export interface CsvValidationResult {
  valid: boolean;
  errors: ImportValidationError[];
  warnings: string[];
  valid_leads: ValidatedLead[];
  invalid_count: number;
  duplicate_count: number;
}

/**
 * Required CSV columns
 */
export const REQUIRED_CSV_COLUMNS = ['email_address'] as const;

/**
 * Optional CSV columns
 */
export const OPTIONAL_CSV_COLUMNS = [
  'first_name',
  'last_name',
  'organization_name',
  'position',
  'linkedin_url',
  'website_url',
  'industry',
  'company_size',
] as const;

/**
 * All valid CSV columns
 */
export const ALL_CSV_COLUMNS = [
  ...REQUIRED_CSV_COLUMNS,
  ...OPTIONAL_CSV_COLUMNS,
] as const;

/**
 * Maximum rows per CSV import
 */
export const MAX_CSV_ROWS = 5000;

/**
 * Maximum file size (5MB)
 */
export const MAX_CSV_FILE_SIZE_BYTES = 5 * 1024 * 1024;
