/**
 * TEST SETUP & UTILITIES
 * 
 * Provides test helpers, database connection setup, and cleanup utilities
 * for Genesis Phase 40 test suite.
 * 
 * This file contains:
 * - Test database connection helpers
 * - Mock data generators
 * - Cleanup utilities
 * - Test environment validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Test configuration from environment variables
 */
export interface TestConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  ohioWorkspaceId: string;
}

/**
 * Validates test environment configuration
 * 
 * @throws {Error} If required environment variables are missing
 */
export function getTestConfig(): TestConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ohioWorkspaceId = process.env.NEXT_PUBLIC_OHIO_WORKSPACE_ID;

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL environment variable is required for tests. ' +
      'Set this to your test Supabase project URL.'
    );
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required for tests. ' +
      'Set this to your test Supabase service role key.'
    );
  }

  if (!ohioWorkspaceId) {
    throw new Error(
      'NEXT_PUBLIC_OHIO_WORKSPACE_ID environment variable is required for tests. ' +
      'Set this to the UUID of the Ohio workspace.'
    );
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    ohioWorkspaceId,
  };
}

/**
 * Creates a Supabase admin client for testing
 * 
 * Uses service role key to bypass RLS for test setup/cleanup.
 * 
 * @returns Supabase client configured for testing
 */
export function createTestSupabaseClient(): SupabaseClient {
  const config = getTestConfig();
  
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Generates a random UUID for testing
 * 
 * @returns A valid UUID string
 */
export function generateTestUUID(): string {
  // Generate a random UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a test workspace ID
 * 
 * @returns A valid UUID prefixed with 'test-' for easy identification
 */
export function generateTestWorkspaceId(): string {
  return generateTestUUID();
}

/**
 * Generates a test workspace slug
 * 
 * @param prefix - Optional prefix for the slug
 * @returns A sanitized workspace slug
 */
export function generateTestWorkspaceSlug(prefix: string = 'test'): string {
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${random}`;
}

/**
 * Cleans up test partitions created during tests
 * 
 * This function drops partitions created for testing to keep the test database clean.
 * 
 * @param supabaseClient - Supabase admin client
 * @param workspaceIds - Array of workspace IDs whose partitions should be dropped
 */
export async function cleanupTestPartitions(
  supabaseClient: SupabaseClient,
  workspaceIds: string[]
): Promise<void> {
  for (const workspaceId of workspaceIds) {
    try {
      const { data, error } = await supabaseClient.rpc(
        'fn_drop_workspace_partition',
        {
          p_workspace_id: workspaceId,
          p_force: true, // Force drop even if partition has data
        }
      );

      if (error && !error.message.includes('not found')) {
        console.warn(`Failed to drop partition for workspace ${workspaceId}:`, error.message);
      }
    } catch (err) {
      // Ignore errors during cleanup
      console.warn(`Error cleaning up partition for workspace ${workspaceId}:`, err);
    }
  }
}

/**
 * Verifies that the Genesis schema exists in the database
 * 
 * This is a prerequisite check before running tests.
 * 
 * @param supabaseClient - Supabase admin client
 * @returns True if schema exists, false otherwise
 */
export async function verifyGenesisSchemaExists(
  supabaseClient: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.rpc('pg_get_schema', {
      schema_name: 'genesis',
    });

    if (error) {
      // Try alternative method: query information_schema
      const { data: schemaData, error: schemaError } = await supabaseClient
        .from('information_schema.schemata')
        .select('schema_name')
        .eq('schema_name', 'genesis')
        .maybeSingle();

      return !schemaError && schemaData !== null;
    }

    return data !== null;
  } catch (err) {
    // If RPC doesn't exist, try direct query
    try {
      const { data, error } = await supabaseClient
        .from('information_schema.schemata')
        .select('schema_name')
        .eq('schema_name', 'genesis')
        .maybeSingle();

      return !error && data !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Verifies that required Genesis functions exist
 * 
 * @param supabaseClient - Supabase admin client
 * @returns Object with verification results for each function
 */
export async function verifyGenesisFunctionsExist(
  supabaseClient: SupabaseClient
): Promise<{
  fn_ignite_workspace_partition: boolean;
  fn_drop_workspace_partition: boolean;
  set_workspace_context: boolean;
  get_workspace_context: boolean;
}> {
  // Try calling each function to verify it exists
  const results = {
    fn_ignite_workspace_partition: false,
    fn_drop_workspace_partition: false,
    set_workspace_context: false,
    get_workspace_context: false,
  };

  // Test fn_ignite_workspace_partition (will fail on validation, but that's OK)
  try {
    await supabaseClient.rpc('fn_ignite_workspace_partition', {
      p_workspace_id: null, // Will fail validation, but proves function exists
    });
  } catch {
    // Expected to fail, but function exists
    results.fn_ignite_workspace_partition = true;
  }

  // Test fn_drop_workspace_partition
  try {
    await supabaseClient.rpc('fn_drop_workspace_partition', {
      p_workspace_id: '00000000-0000-0000-0000-000000000000',
      p_force: false,
    });
    results.fn_drop_workspace_partition = true;
  } catch {
    // Function might not exist
  }

  // Test set_workspace_context
  try {
    await supabaseClient.rpc('set_workspace_context', {
      p_workspace_id: '00000000-0000-0000-0000-000000000000',
    });
    results.set_workspace_context = true;
  } catch {
    // Function might not exist
  }

  // Test get_workspace_context
  try {
    await supabaseClient.rpc('get_workspace_context');
    results.get_workspace_context = true;
  } catch {
    // Function might not exist
  }

  return results;
}

/**
 * Test suite setup hook
 * 
 * Validates test environment before running tests.
 * Should be called in a beforeAll hook.
 */
export async function setupTestEnvironment(): Promise<{
  supabaseClient: SupabaseClient;
  config: TestConfig;
}> {
  const config = getTestConfig();
  const supabaseClient = createTestSupabaseClient();

  // Skip schema validation in CI or if explicitly disabled
  if (process.env.SKIP_GENESIS_SCHEMA_CHECK === 'true' || process.env.CI) {
    return { supabaseClient, config };
  }

  // Verify Genesis schema exists
  const schemaExists = await verifyGenesisSchemaExists(supabaseClient);
  if (!schemaExists) {
    throw new Error(
      'Genesis schema does not exist. ' +
      'Please run migrations in genesis-phase40/migrations/ before running tests.'
    );
  }

  // Verify required functions exist
  const functions = await verifyGenesisFunctionsExist(supabaseClient);
  const missingFunctions = Object.entries(functions)
    .filter(([, exists]) => !exists)
    .map(([name]) => name);

  if (missingFunctions.length > 0) {
    throw new Error(
      `Missing required Genesis functions: ${missingFunctions.join(', ')}. ` +
      'Please run migrations in genesis-phase40/migrations/ before running tests.'
    );
  }

  return { supabaseClient, config };
}

/**
 * Waits for a specified number of milliseconds
 * 
 * Useful for testing race conditions and timing-dependent behavior.
 * 
 * @param ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test suite for setup utilities
 */
describe('Test Setup Utilities', () => {
  describe('getTestConfig', () => {
    it('should throw error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => getTestConfig()).toThrow('NEXT_PUBLIC_SUPABASE_URL');

      process.env.NEXT_PUBLIC_SUPABASE_URL = original;
    });

    it('should throw error if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => getTestConfig()).toThrow('SUPABASE_SERVICE_ROLE_KEY');

      process.env.SUPABASE_SERVICE_ROLE_KEY = original;
    });

    it('should throw error if NEXT_PUBLIC_OHIO_WORKSPACE_ID is missing', () => {
      const original = process.env.NEXT_PUBLIC_OHIO_WORKSPACE_ID;
      delete process.env.NEXT_PUBLIC_OHIO_WORKSPACE_ID;

      expect(() => getTestConfig()).toThrow('NEXT_PUBLIC_OHIO_WORKSPACE_ID');

      process.env.NEXT_PUBLIC_OHIO_WORKSPACE_ID = original;
    });
  });

  describe('generateTestUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateTestUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate different UUIDs on each call', () => {
      const uuid1 = generateTestUUID();
      const uuid2 = generateTestUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('generateTestWorkspaceSlug', () => {
    it('should generate valid workspace slug', () => {
      const slug = generateTestWorkspaceSlug();
      expect(slug).toMatch(/^test-[a-z0-9]+$/);
    });

    it('should use custom prefix', () => {
      const slug = generateTestWorkspaceSlug('custom');
      expect(slug).toMatch(/^custom-[a-z0-9]+$/);
    });
  });
});
