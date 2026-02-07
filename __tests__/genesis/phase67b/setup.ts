/**
 * Jest setup for Phase 67.B tests
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';

// Set global test timeout
jest.setTimeout(30000);

// Suppress console.error during tests (we test error paths)
global.console.error = jest.fn();
