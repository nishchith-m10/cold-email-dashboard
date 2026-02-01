/**
 * Supabase Browser Client
 * 
 * Client-side Supabase instance for use in React components and hooks.
 * Uses the anon key (not service role) and enables auth persistence.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Typed Supabase client
export type TypedSupabaseClient = SupabaseClient<Database>;

// Browser client (uses anon key with RLS)
function createSupabaseBrowser(): TypedSupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase browser client credentials not configured.');
    return null;
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabaseBrowser = createSupabaseBrowser();
