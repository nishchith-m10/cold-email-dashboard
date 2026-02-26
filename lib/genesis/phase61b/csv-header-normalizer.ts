/**
 * GENESIS PART VI - PHASE 61.B: CSV LEAD IMPORT SYSTEM
 * CSV Header Normalizer (Objective 2 — Smart Filtering Algorithm)
 *
 * Implements fuzzy/alias-based header matching so CSVs with common
 * alternative column names (e.g. "Email" instead of "email_address")
 * are automatically mapped to canonical column names without any LLM.
 *
 * Stage 1: Alias-based header normalization
 * Stage 2: Content-based type detection for unmapped columns (future)
 */

// ──────────────────────────────────────────────────────────────────────────────
// Column Alias Map
//
// Keys are canonical column names (matching CsvLeadColumns interface).
// Values are arrays of aliases (case-insensitive after normalization).
// Add new aliases here — no other code changes needed.
// ──────────────────────────────────────────────────────────────────────────────

export const COLUMN_ALIASES: Record<string, string[]> = {
  email_address: [
    'email', 'e-mail', 'email_address', 'emailaddress',
    'contact_email', 'mail', 'email address', 'e_mail',
  ],
  first_name: [
    'first_name', 'firstname', 'first', 'given_name', 'fname',
    'first name', 'given name',
  ],
  last_name: [
    'last_name', 'lastname', 'last', 'surname', 'family_name',
    'lname', 'last name', 'family name',
  ],
  organization_name: [
    'company', 'company_name', 'organization', 'organization_name',
    'org', 'employer', 'company name', 'organization name',
    'account_name', 'account name',
  ],
  position: [
    'title', 'job_title', 'position', 'role', 'designation',
    'job title', 'job role', 'occupation',
  ],
  linkedin_url: [
    'linkedin', 'linkedin_url', 'linkedin_profile', 'li_url',
    'linkedin url', 'linkedin profile', 'linkedin_link',
  ],
  website_url: [
    'website', 'website_url', 'url', 'company_website', 'domain',
    'organization_website', 'website url', 'company website',
    'company_url', 'company url', 'web',
  ],
  industry: [
    'industry', 'sector', 'vertical', 'business_type',
    'business type', 'market',
  ],
  company_size: [
    'company_size', 'employees', 'employee_count', 'headcount',
    'size', 'company size', 'employee count', 'num_employees',
    'number_of_employees', 'no_of_employees',
  ],
  phone: [
    'phone', 'phone_number', 'tel', 'telephone', 'mobile', 'cell',
    'phone number', 'mobile number', 'contact_number',
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// Internal utility: normalize a raw header string to a lookup key
// Lowercases and collapses whitespace, hyphens, and dots into underscores.
// ──────────────────────────────────────────────────────────────────────────────

export function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-\.]+/g, '_');
}

// ──────────────────────────────────────────────────────────────────────────────
// Resolve a raw CSV header to its canonical column name.
// Returns null if the header doesn't match any known alias.
// ──────────────────────────────────────────────────────────────────────────────

export function resolveColumn(rawHeader: string): string | null {
  const normalized = normalizeHeader(rawHeader);
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
    // Also try normalized against each normalized alias (handles edge cases)
    if (aliases.map(a => normalizeHeader(a)).includes(normalized)) return canonical;
  }
  return null; // unmapped
}

// ──────────────────────────────────────────────────────────────────────────────
// Build a header mapping from raw CSV headers to canonical names.
//
// Returns:
//   mapping      — { rawHeader: canonicalName } for all resolved headers
//   unmapped     — raw headers that could not be resolved to any canonical name
//   canonicalHeaders — deduplicated list of canonical names in original order
// ──────────────────────────────────────────────────────────────────────────────

export interface HeaderMappingResult {
  /** Maps raw header → canonical column name */
  mapping: Record<string, string>;
  /** Raw headers that had no alias match */
  unmapped: string[];
  /** Canonical column names in CSV column order (deduped) */
  canonicalHeaders: string[];
}

export function buildHeaderMapping(rawHeaders: string[]): HeaderMappingResult {
  const mapping: Record<string, string> = {};
  const unmapped: string[] = [];
  const seen = new Set<string>();
  const canonicalHeaders: string[] = [];

  for (const raw of rawHeaders) {
    const canonical = resolveColumn(raw);
    if (canonical) {
      // First occurrence wins (handles rare duplicate-alias CSVs)
      if (!seen.has(canonical)) {
        mapping[raw] = canonical;
        canonical === raw || seen.add(canonical); // track mapped canonicals
        canonicalHeaders.push(canonical);
        seen.add(canonical);
      }
    } else {
      unmapped.push(raw);
    }
  }

  return { mapping, unmapped, canonicalHeaders };
}

// ──────────────────────────────────────────────────────────────────────────────
// Apply a header mapping to an array of raw CSV data rows.
// Returns new rows with canonical column names as keys.
// Unmapped columns are dropped.
// ──────────────────────────────────────────────────────────────────────────────

export function remapRowHeaders(
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Record<string, string>[] {
  return rows.map(row => {
    const remapped: Record<string, string> = {};
    for (const [rawKey, value] of Object.entries(row)) {
      const canonical = mapping[rawKey];
      if (canonical) {
        remapped[canonical] = value;
      }
    }
    return remapped;
  });
}
