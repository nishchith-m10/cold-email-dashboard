import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Typed Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Server-side admin client (uses service role key)
// Returns null if env vars are not set (e.g., during build)
function createSupabaseAdmin(): TypedSupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return null;
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseAdmin = createSupabaseAdmin();

/**
 * Get typed Supabase admin client
 * Throws if client is not initialized
 */
export function getTypedSupabaseAdmin(): TypedSupabaseClient {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }
  return supabaseAdmin;
}

/**
 * Default workspace ID for single-tenant mode
 * 
 * This UUID matches the default workspace created in migration:
 * supabase/migrations/20251206_create_workspace_tables.sql
 * 
 * All users are automatically assigned to this workspace on first login.
 */
export const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Validates if a string looks like a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get workspace ID for queries
 * Returns the provided ID or falls back to default
 * 
 * @param providedId - Optional workspace ID from request
 * @returns Workspace ID to use in queries
 */
export function getWorkspaceId(providedId?: string | null): string {
  if (providedId && providedId.trim()) {
    return providedId.trim();
  }
  return DEFAULT_WORKSPACE_ID;
}

// Type definitions for database tables
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  linkedin_url: string | null;
  created_at: string;
}

export interface EmailEvent {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  // DB currently stores campaign_name; campaign_id is not present in schema. Keep optional for forward compatibility.
  campaign_id?: string | null;
  contact_email: string;
  campaign_name: string | null;
  // DB column is email_number; step kept as alias for legacy code.
  email_number: number | null;
  step?: number | null;
  event_type: 'sent' | 'delivered' | 'bounced' | 'replied' | 'opt_out' | 'opened' | 'clicked';
  event_ts: string;
  provider: string | null;
  provider_message_id: string | null;
  metadata: Record<string, unknown>;
  event_key: string | null;
  created_at: string;
}

export interface DailyStats {
  id: string;
  workspace_id: string;
  // DB uses campaign_name; campaign_id is not present in the schema. Keep optional for future use.
  campaign_id?: string | null;
  campaign_name: string | null;
  day: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens: number;
  clicks: number;
}

export interface LlmUsage {
  id: string;
  workspace_id: string;
  // DB currently stores campaign_name; campaign_id is not present in the schema. Keep optional for future use.
  campaign_id?: string | null;
  campaign_name: string | null;
  contact_email: string | null;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  purpose: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProviderCostConfig {
  id: string;
  provider: string;
  model: string;
  price_per_1k_input: number;
  price_per_1k_output: number;
  effective_date: string;
  created_at: string;
}
