/**
 * Test setup for Phase 66 & 67
 */

// Mock environment variables if not set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
}

// Extend Jest timeout for database operations
jest.setTimeout(30000);
