/**
 * Jest Setup for Phase 68 Tests
 * Global mocks and test environment configuration
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';

// Suppress console.error in tests (expected errors)
global.console.error = jest.fn();

// Mock crypto for Node.js 16+
if (typeof global.crypto === 'undefined') {
  const crypto = require('crypto');
  global.crypto = crypto.webcrypto;
}

// Mock NextRequest/NextResponse
global.Request = class Request {
  constructor(public url: string, public init?: RequestInit) {}
  json() {
    return Promise.resolve(JSON.parse(this.init?.body as string || '{}'));
  }
} as any;

global.Response = class Response {
  constructor(public body: any, public init?: ResponseInit) {}
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
} as any;
