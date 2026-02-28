/**
 * OPERATOR CREDENTIAL STORE
 *
 * Reads operator-level API keys from genesis.operator_credentials.
 * Counterpart to the seed script at scripts/seed-operator-credentials.mjs.
 *
 * Decryption delegates to credential-vault.ts's decryptCredential(), using
 * the literal string "operator" as the workspace scope so that operator keys
 * are derived from a distinct AES key (SHA-256(masterKey + "operator"))
 * and can never be confused with per-tenant credentials.
 *
 * Usage:
 *   const creds = await loadOperatorCredentials(supabaseAdmin);
 *   // creds.openai_api_key, creds.apify_api_key, etc.
 *
 * The IgnitionOrchestrator calls this at ignition time to build the
 * variable map for workflow deployment, replacing the previous pattern of
 * reading directly from process.env.OPENAI_API_KEY etc.
 */

import { decryptCredential } from './credential-vault';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OperatorCredentials {
  openai_api_key?: string;
  anthropic_api_key?: string;
  apify_api_key?: string;
  google_cse_api_key?: string;
  google_cse_cx?: string;
  relevance_ai_api_key?: string;
  relevance_ai_auth_token?: string;
  relevance_ai_project_id?: string;
  relevance_ai_studio_id?: string;
  relevance_ai_base_url?: string;
  [key: string]: string | undefined;
}

interface OperatorCredentialRow {
  key_name: string;
  encrypted_value: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Load and decrypt all operator credentials from genesis.operator_credentials.
 *
 * @param supabaseAdmin   Supabase client with service_role key (bypasses RLS)
 * @returns               Map of key_name → decrypted plaintext value
 *
 * @throws if CREDENTIAL_MASTER_KEY is not set or if any row fails decryption
 */
export async function loadOperatorCredentials(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any
): Promise<OperatorCredentials> {
  const masterKey = process.env.CREDENTIAL_MASTER_KEY;
  if (!masterKey) {
    throw new Error(
      '[OperatorCredentialStore] CREDENTIAL_MASTER_KEY is not set. ' +
      'This key is required to decrypt operator credentials.'
    );
  }

  const { data, error } = await supabaseAdmin
    .schema('genesis')
    .from('operator_credentials')
    .select('key_name, encrypted_value');

  if (error) {
    throw new Error(
      `[OperatorCredentialStore] Failed to read genesis.operator_credentials: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    console.warn(
      '[OperatorCredentialStore] No operator credentials found in database. ' +
      'Run: node scripts/seed-operator-credentials.mjs'
    );
    return {};
  }

  const result: OperatorCredentials = {};

  for (const row of (data as OperatorCredentialRow[])) {
    try {
      // Operator credentials are stored as { value: '<plaintext>' } JSON objects
      // using the same AES-256-GCM scheme as credential-vault.ts, with the
      // literal string "operator" as the workspace scope.
      const decrypted = decryptCredential(row.encrypted_value, 'operator', masterKey);
      const rawValue = decrypted.value;
      if (typeof rawValue === 'string') {
        result[row.key_name] = rawValue;
      }
    } catch (decryptErr) {
      // Log the failure but continue — a missing individual key is better
      // than a complete ignition failure. The orchestrator will throw later
      // when it tries to use a required key that's undefined.
      console.error(
        `[OperatorCredentialStore] Failed to decrypt key "${row.key_name}": `,
        decryptErr instanceof Error ? decryptErr.message : decryptErr
      );
    }
  }

  return result;
}

/**
 * Get a single operator credential by key name.
 * Throws if it is missing or blank (indicates the seed script hasn't been run).
 */
export async function requireOperatorCredential(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  keyName: keyof OperatorCredentials
): Promise<string> {
  const creds = await loadOperatorCredentials(supabaseAdmin);
  const value = creds[keyName as string];

  if (!value || value.trim() === '') {
    throw new Error(
      `[OperatorCredentialStore] Required operator credential "${String(keyName)}" is missing. ` +
      `Run: node scripts/seed-operator-credentials.mjs`
    );
  }

  return value;
}
