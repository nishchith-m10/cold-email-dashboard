/**
 * SIDECAR ROUTES TESTS
 *
 * Unit tests for:
 *   - GET /api/sidecar/heartbeat  (app/api/sidecar/heartbeat/route.ts)
 *   - POST /api/sidecar/handshake (app/api/sidecar/handshake/route.ts)
 */

import { NextRequest } from 'next/server';

// ──────────────────────────────────────────────────────────────────────────────
// Module mocks (hoisted before imports)
// ──────────────────────────────────────────────────────────────────────────────

// 1. Workspace-access guard — passes by default
jest.mock('@/lib/api-workspace-guard', () => ({
  validateWorkspaceAccess: jest.fn().mockResolvedValue(null),
}));

// 2. Supabase admin client — fully chainable stub
const mockChain: Record<string, jest.Mock> = {
  select:      jest.fn(),
  eq:          jest.fn(),
  order:       jest.fn(),
  limit:       jest.fn(),
  maybeSingle: jest.fn(),
  upsert:      jest.fn(),
};

// Every method returns `mockChain` so you can chain arbitrarily
(Object.keys(mockChain) as (keyof typeof mockChain)[]).forEach((key) => {
  mockChain[key].mockReturnValue(mockChain);
});

const mockFrom = jest.fn().mockReturnValue(mockChain);
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: mockFrom },
}));

// 3. Cache manager — simple in-memory stub keyed by string
const cacheStore = new Map<string, unknown>();
jest.mock('@/lib/cache', () => ({
  cacheManager: {
    get: jest.fn((key: string) => cacheStore.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => cacheStore.set(key, val)),
  },
}));

// ──────────────────────────────────────────────────────────────────────────────
// Route handlers (imported AFTER mocks are in place)
// ──────────────────────────────────────────────────────────────────────────────

import { GET  } from '../../app/api/sidecar/heartbeat/route';
import { POST } from '../../app/api/sidecar/handshake/route';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';
import { cacheManager } from '@/lib/cache';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const WS_ID = '00000000-0000-0000-0000-000000000001';
const HANDSHAKE_SECRET = 'test-handshake-secret';

function makeHeartbeatReq(workspaceId = WS_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/sidecar/heartbeat?workspace_id=${workspaceId}`,
    { method: 'GET' },
  );
}

function makeHandshakeReq(body: object, token = HANDSHAKE_SECRET): NextRequest {
  return new NextRequest('http://localhost/api/sidecar/handshake', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/sidecar/heartbeat
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/sidecar/heartbeat', () => {
  beforeEach(() => {
    cacheStore.clear();
    jest.clearAllMocks();
    // Restore default: chain resolves
    (Object.keys(mockChain) as (keyof typeof mockChain)[]).forEach((key) => {
      mockChain[key].mockReturnValue(mockChain);
    });
    mockFrom.mockReturnValue(mockChain);
    // Default: guard passes
    (validateWorkspaceAccess as jest.Mock).mockResolvedValue(null);
    // Restore cache implementations cleared by clearAllMocks
    (cacheManager.get as jest.Mock).mockImplementation((key: string) => cacheStore.get(key) ?? null);
    (cacheManager.set as jest.Mock).mockImplementation((key: string, val: unknown) => cacheStore.set(key, val));
  });

  test('401 when workspace-access guard rejects', async () => {
    const { NextResponse } = await import('next/server');
    (validateWorkspaceAccess as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET(makeHeartbeatReq());
    expect(res.status).toBe(401);
  });

  test('400 when workspace_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/sidecar/heartbeat', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test('returns status=unknown when no sidecar is registered', async () => {
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET(makeHeartbeatReq());
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);
    expect(json.status).toBe('unknown');
    expect(json.sidecar_url).toBeNull();
  });

  test('returns status=unknown on DB error (table not ready)', async () => {
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'relation not found' } });
    const res = await GET(makeHeartbeatReq());
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);
    expect(json.status).toBe('unknown');
  });

  test('returns status=online when sidecar /health responds 200', async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: { sidecar_url: 'http://1.2.3.4:3001', version: 'v1.2', last_seen_at: '2024-01-01T00:00:00Z' },
      error: null,
    });
    // global.fetch is mocked in unit/setup.ts → returns ok=true by default
    const res = await GET(makeHeartbeatReq());
    const json = JSON.parse(await res.text());
    expect(res.status).toBe(200);
    expect(json.status).toBe('online');
    expect(json.sidecar_url).toBe('http://1.2.3.4:3001');
    expect(json.sidecar_version).toBe('v1.2');
  });

  test('returns status=offline when sidecar /health fails', async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: { sidecar_url: 'http://1.2.3.4:3001', version: null, last_seen_at: null },
      error: null,
    });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await GET(makeHeartbeatReq());
    const json = JSON.parse(await res.text());
    expect(json.status).toBe('offline');
  });

  test('cache is populated on first call and reused on second (no double DB hit)', async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: { sidecar_url: 'http://1.2.3.4:3001', version: 'v1', last_seen_at: null },
      error: null,
    });

    // First call — populates cache via cacheManager.set
    const res1 = await GET(makeHeartbeatReq());
    expect(res1.status).toBe(200);

    // Second call — served from in-memory cacheStore; DB not hit again
    const res2 = await GET(makeHeartbeatReq());
    expect(res2.status).toBe(200);

    // DB should only have been queried ONCE
    expect(mockChain.maybeSingle).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/sidecar/handshake
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /api/sidecar/handshake', () => {
  const validBody = {
    workspace_id: WS_ID,
    sidecar_url: 'http://10.0.0.1:3001',
    version: 'v1.0.0',
    capabilities: ['gmail', 'deploy'],
  };

  beforeEach(() => {
    cacheStore.clear();
    jest.clearAllMocks();
    process.env.SIDECAR_HANDSHAKE_SECRET = HANDSHAKE_SECRET;
    // Default: chain resolves
    (Object.keys(mockChain) as (keyof typeof mockChain)[]).forEach((key) => {
      mockChain[key].mockReturnValue(mockChain);
    });
    mockFrom.mockReturnValue(mockChain);
    // maybeSingle → workspace exists
    mockChain.maybeSingle.mockResolvedValue({ data: { id: WS_ID }, error: null });
    // upsert → success
    mockChain.upsert.mockResolvedValue({ error: null });
    // Restore cache implementations cleared by clearAllMocks
    (cacheManager.get as jest.Mock).mockImplementation((key: string) => cacheStore.get(key) ?? null);
    (cacheManager.set as jest.Mock).mockImplementation((key: string, val: unknown) => cacheStore.set(key, val));
  });

  afterEach(() => {
    delete process.env.SIDECAR_HANDSHAKE_SECRET;
  });

  test('500 when SIDECAR_HANDSHAKE_SECRET is not configured', async () => {
    delete process.env.SIDECAR_HANDSHAKE_SECRET;
    const res = await POST(makeHandshakeReq(validBody, 'any'));
    expect(res.status).toBe(500);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(false);
  });

  test('401 when bearer token is missing', async () => {
    const req = new NextRequest('http://localhost/api/sidecar/handshake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/unauthorized/i);
  });

  test('401 when bearer token is wrong', async () => {
    const res = await POST(makeHandshakeReq(validBody, 'wrong-token'));
    expect(res.status).toBe(401);
  });

  test('400 when workspace_id is missing', async () => {
    const req = makeHandshakeReq({ sidecar_url: 'http://10.0.0.1:3001' });
    jest.spyOn(req, 'json').mockResolvedValue({ sidecar_url: 'http://10.0.0.1:3001' } as any);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('400 when sidecar_url is missing', async () => {
    const req = makeHandshakeReq({ workspace_id: WS_ID });
    jest.spyOn(req, 'json').mockResolvedValue({ workspace_id: WS_ID } as any);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('404 when workspace does not exist in DB (body spy required in jsdom)', async () => {
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    const req = makeHandshakeReq(validBody);
    jest.spyOn(req, 'json').mockResolvedValue(validBody as any);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = JSON.parse(await res.text());
    expect(json.error).toMatch(/workspace_id not found/i);
  });

  test('200 + success; upserts sidecar_registry (body spy required in jsdom)', async () => {
    const req = makeHandshakeReq(validBody);
    // jsdom can't read POST body via req.json() — spy to inject the expected body
    jest.spyOn(req, 'json').mockResolvedValue(validBody as any);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(true);
    expect(json.workspace_id).toBe(WS_ID);

    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: WS_ID,
        sidecar_url: 'http://10.0.0.1:3001',
        version: 'v1.0.0',
        capabilities: ['gmail', 'deploy'],
      }),
      expect.objectContaining({ onConflict: 'workspace_id' }),
    );
  });

  test('400 when POST body is unparseable (body spy throws)', async () => {
    const req = makeHandshakeReq(validBody);
    // Simulate a body that fails JSON parsing by making req.json() throw
    jest.spyOn(req, 'json').mockRejectedValue(new SyntaxError('Invalid JSON'));
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
