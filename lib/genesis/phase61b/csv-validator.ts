/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * CSV Validator
 * 
 * Validates CSV lead data
 */

import type {
  CsvRow,
  ValidatedLead,
  ImportValidationError,
  CsvValidationResult,
} from './csv-import-types';
import {
  REQUIRED_CSV_COLUMNS,
  ALL_CSV_COLUMNS,
} from './csv-import-types';

/**
 * CSV Validator
 * Validates CSV structure and lead data
 */
export class CsvValidator {
  /**
   * Validate CSV headers
   */
  static validateHeaders(headers: string[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required columns
    const missingRequired = REQUIRED_CSV_COLUMNS.filter(
      col => !headers.includes(col)
    );

    if (missingRequired.length > 0) {
      errors.push(
        `Missing required column(s): ${missingRequired.join(', ')}`
      );
    }

    // Check for unknown columns
    const validColumns = new Set(ALL_CSV_COLUMNS);
    const unknownColumns = headers.filter(
      header => !validColumns.has(header as any)
    );

    if (unknownColumns.length > 0) {
      warnings.push(
        `Unknown column(s) will be ignored: ${unknownColumns.join(', ')}`
      );
    }

    // Check for empty headers
    if (headers.some(h => h.trim().length === 0)) {
      errors.push('CSV contains empty column headers');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate and transform CSV rows into leads
   */
  static validateRows(
    rows: CsvRow[]
  ): CsvValidationResult {
    const errors: ImportValidationError[] = [];
    const warnings: string[] = [];
    const validLeads: ValidatedLead[] = [];
    const seenEmails = new Set<string>();
    let duplicateCount = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because: 0-indexed + header row

      // Validate required field: email_address
      const email = row.email_address?.trim();

      if (!email) {
        errors.push({
          row_number: rowNumber,
          field: 'email_address',
          error: 'Email address is required',
        });
        return;
      }

      // Validate email format
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.valid) {
        errors.push({
          row_number: rowNumber,
          field: 'email_address',
          error: emailValidation.error || 'Invalid email format',
        });
        return;
      }

      // Check for duplicates within this import
      const emailLower = email.toLowerCase();
      if (seenEmails.has(emailLower)) {
        duplicateCount++;
        errors.push({
          row_number: rowNumber,
          field: 'email_address',
          error: `Duplicate email address: ${email}`,
        });
        return;
      }

      seenEmails.add(emailLower);

      // Validate optional fields
      const lead: ValidatedLead = {
        email_address: email,
      };

      // First name
      if (row.first_name && row.first_name.trim().length > 0) {
        lead.first_name = row.first_name.trim();
        if (lead.first_name.length > 100) {
          warnings.push(`Row ${rowNumber}: First name truncated to 100 characters`);
          lead.first_name = lead.first_name.substring(0, 100);
        }
      }

      // Last name
      if (row.last_name && row.last_name.trim().length > 0) {
        lead.last_name = row.last_name.trim();
        if (lead.last_name.length > 100) {
          warnings.push(`Row ${rowNumber}: Last name truncated to 100 characters`);
          lead.last_name = lead.last_name.substring(0, 100);
        }
      }

      // Organization name
      if (row.organization_name && row.organization_name.trim().length > 0) {
        lead.organization_name = row.organization_name.trim();
        if (lead.organization_name.length > 200) {
          warnings.push(`Row ${rowNumber}: Organization name truncated to 200 characters`);
          lead.organization_name = lead.organization_name.substring(0, 200);
        }
      }

      // Position
      if (row.position && row.position.trim().length > 0) {
        lead.position = row.position.trim();
        if (lead.position.length > 150) {
          warnings.push(`Row ${rowNumber}: Position truncated to 150 characters`);
          lead.position = lead.position.substring(0, 150);
        }
      }

      // LinkedIn URL
      if (row.linkedin_url && row.linkedin_url.trim().length > 0) {
        const linkedinUrl = row.linkedin_url.trim();
        const urlValidation = this.validateUrl(linkedinUrl);
        if (!urlValidation.valid) {
          warnings.push(`Row ${rowNumber}: Invalid LinkedIn URL, will be ignored`);
        } else {
          lead.linkedin_url = linkedinUrl;
        }
      }

      // Website URL
      if (row.website_url && row.website_url.trim().length > 0) {
        const websiteUrl = row.website_url.trim();
        const urlValidation = this.validateUrl(websiteUrl);
        if (!urlValidation.valid) {
          warnings.push(`Row ${rowNumber}: Invalid website URL, will be ignored`);
        } else {
          lead.website_url = websiteUrl;
        }
      }

      // Industry
      if (row.industry && row.industry.trim().length > 0) {
        lead.industry = row.industry.trim();
        if (lead.industry.length > 100) {
          warnings.push(`Row ${rowNumber}: Industry truncated to 100 characters`);
          lead.industry = lead.industry.substring(0, 100);
        }
      }

      // Company size
      if (row.company_size && row.company_size.trim().length > 0) {
        lead.company_size = row.company_size.trim();
        if (lead.company_size.length > 50) {
          warnings.push(`Row ${rowNumber}: Company size truncated to 50 characters`);
          lead.company_size = lead.company_size.substring(0, 50);
        }
      }

      validLeads.push(lead);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      valid_leads: validLeads,
      invalid_count: errors.length - duplicateCount, // Exclude duplicates from invalid count
      duplicate_count: duplicateCount,
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || email.trim().length === 0) {
      return { valid: false, error: 'Email is empty' };
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email exceeds maximum length (254 characters)' };
    }

    return { valid: true };
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): { valid: boolean; error?: string } {
    if (!url || url.trim().length === 0) {
      return { valid: false, error: 'URL is empty' };
    }

    let urlToValidate: URL;

    try {
      urlToValidate = new URL(url);
    } catch {
      // Try with https:// prefix
      try {
        urlToValidate = new URL(`https://${url}`);
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
    }

    // Additional validation: must have valid protocol and host
    if (!urlToValidate.protocol || !urlToValidate.host) {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Host must contain at least one dot (e.g., example.com)
    if (!urlToValidate.host.includes('.')) {
      return { valid: false, error: 'Invalid URL format' };
    }

    return { valid: true };
  }

  /**
   * Check if email domain is valid
   */
  static isValidEmailDomain(email: string): boolean {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  }
}
