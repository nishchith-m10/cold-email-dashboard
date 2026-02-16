/**
 * GENESIS PHASE 46: SUPABASE MIGRATION DATABASE
 *
 * NOTE: Simplified implementation - uses MockMigrationDB for dry-run mode
 * Production database operations delegated to Supabase Admin in API routes
 * to avoid TypeScript schema complexity with genesis.* tables
 */

export { MockMigrationDB as SupabaseMigrationDB } from './mock-migration-db';
