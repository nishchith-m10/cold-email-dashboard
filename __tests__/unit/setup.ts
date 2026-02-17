/**
 * Jest Setup File
 *
 * This file runs before all tests and sets up:
 * - Testing Library matchers
 * - Next.js router mocks
 * - Clerk Auth mocks
 * - SWR mocks
 */

// Load test environment variables
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Mock uuid module to avoid ES module issues
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    const id = uuidCounter++;
    return `00000000-0000-0000-0000-${id.toString().padStart(12, '0')}`;
  }),
  v5: jest.fn(() => {
    const id = uuidCounter++;
    return `10000000-0000-0000-0000-${id.toString().padStart(12, '0')}`;
  }),
  validate: (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid),
}));

// Mock global fetch for Supabase and API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Map(),
  })
) as any;

// Minimal Request/Response polyfills for Next.js compatibility in Jest/jsdom
// These allow next/server to load without conflicting with NextRequest
if (typeof global.Request === 'undefined') {
  // @ts-ignore - Minimal Request polyfill with read-only properties (getters)
  global.Request = class Request {
    private _url: string = '';
    private _method: string = 'GET';
    private _headers: Map<string, string> = new Map();
    private _body: any = null;
    
    constructor(input: string | Request, init?: RequestInit) {
      if (typeof input === 'string') {
        this._url = input;
      } else {
        this._url = input.url;
        this._method = input.method;
        this._body = input.body;
      }
      if (init) {
        if (init.method) this._method = init.method;
        if (init.body) this._body = init.body;
        if (init.headers) {
          if (init.headers instanceof Map) {
            this._headers = init.headers;
          } else if (typeof init.headers === 'object') {
            this._headers = new Map(Object.entries(init.headers));
          }
        }
      }
    }
    
    get url() { return this._url; }
    get method() { return this._method; }
    get headers() { return this._headers; }
    get body() { return this._body; }
    
    json() { return Promise.resolve({}); }
    text() { return Promise.resolve(''); }
    formData() { return Promise.resolve(new FormData()); }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    blob() { return Promise.resolve(new Blob()); }
    clone() { return this; }
  };

  // @ts-ignore - Minimal Response polyfill with static json() method
  global.Response = class Response {
    ok = true;
    status = 200;
    statusText = 'OK';
    headers = new Map();
    body = null;
    type = 'default' as ResponseType;
    url = '';
    redirected = false;
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body || null;
      if (init) {
        if (init.status) this.status = init.status;
        if (init.statusText) this.statusText = init.statusText;
      }
    }
    
    // Static method for NextResponse.json()
    static json(data: any, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    }
    
    json() { return Promise.resolve({}); }
    text() { return Promise.resolve(this.body?.toString() || ''); }
    formData() { return Promise.resolve(new FormData()); }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    blob() { return Promise.resolve(new Blob()); }
    clone() { return this; }
  };
}

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
      span: React.forwardRef((props: any, ref: any) => React.createElement('span', { ...props, ref })),
      button: React.forwardRef((props: any, ref: any) => React.createElement('button', { ...props, ref })),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
  useParams() {
    return {};
  },
}));

// Mock Clerk Auth
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isSignedIn: true,
    isLoaded: true,
    user: {
      id: 'test-user-id',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      firstName: 'Test',
      lastName: 'User',
    },
  }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: jest.fn().mockResolvedValue('test-token'),
  }),
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: () => null,
  RedirectToSignIn: () => null,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock SWR to avoid network calls in unit tests
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: jest.fn(),
  })),
}));

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
      span: React.forwardRef((props: any, ref: any) => React.createElement('span', { ...props, ref })),
      button: React.forwardRef((props: any, ref: any) => React.createElement('button', { ...props, ref })),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock Recharts to avoid canvas/SVG rendering issues
jest.mock('recharts', () => ({
  LineChart: () => null,
  Line: () => null,
  AreaChart: () => null,
  Area: () => null,
  BarChart: () => null,
  Bar: () => null,
  PieChart: () => null,
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  Cell: () => null,
}));

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Suppress console errors/warnings during tests (optional)
// Uncomment if you want cleaner test output
// const originalError = console.error;
// beforeAll(() => {
//   console.error = jest.fn();
// });
// afterAll(() => {
//   console.error = originalError;
// });
