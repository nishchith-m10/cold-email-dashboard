/**
 * PHASE 45: PII SANITIZATION SERVICE
 * 
 * Recursively scans and redacts Personally Identifiable Information (PII)
 * from execution data before storage. Enforces size limits.
 * 
 * Default redaction fields: email_address, email, phone, first_name, last_name, etc.
 * Config: SANDBOX_PII_REDACT_FIELDS env var (comma-separated) overrides defaults.
 */

import {
  type SanitizationResult,
  type PiiSanitizationConfig,
  DEFAULT_PII_CONFIG,
} from './types';

// ============================================
// PII SANITIZER
// ============================================

export class PiiSanitizer {
  private readonly config: PiiSanitizationConfig;
  private readonly fieldSet: Set<string>;

  constructor(config?: Partial<PiiSanitizationConfig>) {
    this.config = { ...DEFAULT_PII_CONFIG, ...config };

    // Parse env override if present
    const envFields = typeof process !== 'undefined'
      ? process.env?.SANDBOX_PII_REDACT_FIELDS
      : undefined;

    if (envFields) {
      const customFields = envFields.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      this.fieldSet = new Set(customFields);
    } else {
      this.fieldSet = new Set(this.config.fields.map(f => f.toLowerCase()));
    }
  }

  /**
   * Sanitize a data object by redacting PII fields and enforcing size limits.
   */
  sanitize(data: unknown): SanitizationResult {
    if (data === null || data === undefined) {
      return { data: {}, fieldsRedacted: 0, wasSanitized: false };
    }

    // If it's not an object, wrap it
    const obj = typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { _value: data };

    let fieldsRedacted = 0;
    const sanitized = this.deepSanitize(obj, (count) => { fieldsRedacted += count; });

    // Enforce size limit
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > this.config.maxDataSizeBytes) {
      return {
        data: { _truncated: true, _originalSizeBytes: serialized.length },
        fieldsRedacted,
        wasSanitized: true,
      };
    }

    return {
      data: sanitized,
      fieldsRedacted,
      wasSanitized: fieldsRedacted > 0,
    };
  }

  /**
   * Check if a field name matches a PII field.
   */
  isPiiField(fieldName: string): boolean {
    return this.fieldSet.has(fieldName.toLowerCase());
  }

  /**
   * Recursively sanitize an object.
   */
  private deepSanitize(
    obj: Record<string, unknown>,
    onRedact: (count: number) => void,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isPiiField(key)) {
        result[key] = this.redactValue(value);
        onRedact(1);
      } else if (Array.isArray(value)) {
        result[key] = value.map(item => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return this.deepSanitize(item as Record<string, unknown>, onRedact);
          }
          return item;
        });
      } else if (value !== null && typeof value === 'object') {
        result[key] = this.deepSanitize(value as Record<string, unknown>, onRedact);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Redact a value based on its type.
   */
  private redactValue(value: unknown): string {
    if (typeof value === 'string' && value.includes('@')) {
      // Partial email redaction: keep domain hint
      const parts = value.split('@');
      const domain = parts[1] || 'example.com';
      return `***@${domain.substring(0, 3)}***.${domain.split('.').pop() || 'com'}`;
    }
    return this.config.placeholder;
  }
}

/**
 * Convenience: create a default PII sanitizer instance.
 */
export function createPiiSanitizer(config?: Partial<PiiSanitizationConfig>): PiiSanitizer {
  return new PiiSanitizer(config);
}
