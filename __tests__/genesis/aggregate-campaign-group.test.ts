/**
 * AGGREGATE ROUTE — campaign_group_id tests
 *
 * Verifies that the `?campaign_group_id=<uuid>` query parameter added in
 * Section 3:
 *   1. Is included in the API cache key (so different groups get separate caches)
 *   2. Is forwarded to the Supabase query via `.eq('campaign_group_id', <value>)`
 *
 * We test (1) directly via `apiCacheKey` — it is a pure function so no mocking
 * is needed.
 * We test (2) by mocking all route dependencies, calling GET, and asserting
 * that the Supabase chain received the expected `.eq('campaign_group_id', …)` call.
 */

import { NextRequest } from 'next/server';

// ──────────────────────────────────────────────────────────────────────────────
// Module mocks
// ──────────────────────────────────────────────────────────────────────────────

// 1. Workspace guard — always passes
jest.mock('@/lib/api-workspace-guard', () => ({
  validateWorkspaceAccess: jest.fn().mockResolvedValue(null),
}));

// 2. Rate limiter — always passes
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit:  jest.fn().mockReturnValue({ success: true, limit: 100, remaining: 99, reset: 0 }),
  getClientId:     jest.fn().mockReturnValue('test-client'),
  rateLimitHeaders: jest.fn().mockReturnValue({}),
  RATE_LIMIT_READ: { windowMs: 60_000, max: 100 },
}));

// 3. Misc lib mocks
jest.mock('@/lib/utils', () => ({
  API_HEADERS: { 'Content-Type': 'application/json' },
}));
jest.mock('@/lib/db-queries', () => ({
  EXCLUDED_CAMPAIGNS: [],
  shouldExcludeCampaign: jest.fn().mockReturnValue(false),
}));
jest.mock('@/lib/workspace-db-config', () => ({
  getLeadsTableName: jest.fn().mockResolvedValue('leads_default'),
}));

// 4. Supabase admin — chainable mock that records eq() calls
const eqCalls: Array<[string, unknown]> = [];

const supabaseChain: any = {
  select:      jest.fn().mockReturnThis(),
  eq:          jest.fn((...args: [string, unknown]) => { eqCalls.push(args); return supabaseChain; }),
  neq:         jest.fn().mockReturnThis(),
  not:         jest.fn().mockReturnThis(),
  is:          jest.fn().mockReturnThis(),
  in:          jest.fn().mockReturnThis(),
  gte:         jest.fn().mockReturnThis(),
  lte:         jest.fn().mockReturnThis(),
  order:       jest.fn().mockReturnThis(),
  limit:       jest.fn().mockReturnThis(),
  range:       jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  single:      jest.fn().mockResolvedValue({ data: null, error: null }),
  // Count queries resolve with count=0
  then:        undefined, // block accidental Promise handling
};
// Make the chain awaitable (Supabase client uses .then on the query builder)
const awaitableChain = Object.assign(supabaseChain, {
  then: (resolve: (v: any) => any) =>
    Promise.resolve({ data: [], count: 0, error: null }).then(resolve),
});

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from:    jest.fn().mockReturnValue(awaitableChain),
    rpc:     jest.fn().mockResolvedValue({ data: [], error: null }),
  },
  DEFAULT_WORKSPACE_ID: '00000000-0000-0000-0000-000000000001',
}));

// 5. Cache — getOrSet actually invokes the factory so DB calls happen
jest.mock('@/lib/cache', () => {
  const { apiCacheKey } = jest.requireActual('@/lib/cache');
  const store = new Map<string, unknown>();
  return {
    apiCacheKey,             // keep the real implementation
    CACHE_TTL:  { SHORT: 30_000 },
    cacheManager: {
      get:      jest.fn((key: string) => store.get(key) ?? null),
      set:      jest.fn((key: string, val: unknown) => store.set(key, val)),
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
    },
  };
});

// ──────────────────────────────────────────────────────────────────────────────
// Import after mocks
// ──────────────────────────────────────────────────────────────────────────────

import { GET }         from '../../app/api/dashboard/aggregate/route';
import { apiCacheKey } from '@/lib/cache';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const WS_ID      = '00000000-0000-0000-0000-000000000001';
const GROUP_ID   = 'aaaa0000-0000-0000-0000-000000000001';
const START_DATE = '2025-01-01';
const END_DATE   = '2025-01-31';

function makeAggregateReq(extraParams: Record<string, string> = {}): NextRequest {
  const qs = new URLSearchParams({
    workspace_id: WS_ID,
    start:        START_DATE,
    end:          END_DATE,
    ...extraParams,
  });
  return new NextRequest(`http://localhost/api/dashboard/aggregate?${qs}`, { method: 'GET' });
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. Pure-function tests: apiCacheKey correctly includes campaignGroupId
// ──────────────────────────────────────────────────────────────────────────────

describe('apiCacheKey — campaign_group_id', () => {
  test('cache key includes campaignGroupId when provided', () => {
    const key = apiCacheKey('aggregate', {
      start:           START_DATE,
      end:             END_DATE,
      workspace:       WS_ID,
      campaignGroupId: GROUP_ID,
    });
    expect(key).toContain(`campaignGroupId=${GROUP_ID}`);
  });

  test('cache key omits campaignGroupId when undefined', () => {
    const key = apiCacheKey('aggregate', {
      start:           START_DATE,
      end:             END_DATE,
      workspace:       WS_ID,
      campaignGroupId: undefined,
    });
    expect(key).not.toContain('campaignGroupId');
  });

  test('two identical params produce identical keys', () => {
    const a = apiCacheKey('aggregate', { workspace: WS_ID, campaignGroupId: GROUP_ID });
    const b = apiCacheKey('aggregate', { campaignGroupId: GROUP_ID, workspace: WS_ID });
    expect(a).toBe(b);
  });

  test('two different campaignGroupIds produce different keys', () => {
    const k1 = apiCacheKey('aggregate', { workspace: WS_ID, campaignGroupId: 'group-alpha' });
    const k2 = apiCacheKey('aggregate', { workspace: WS_ID, campaignGroupId: 'group-beta' });
    expect(k1).not.toBe(k2);
  });

  test('campaign_group_id absent → key without group differs from key with group', () => {
    const withoutGroup = apiCacheKey('aggregate', { workspace: WS_ID });
    const withGroup    = apiCacheKey('aggregate', { workspace: WS_ID, campaignGroupId: GROUP_ID });
    expect(withoutGroup).not.toBe(withGroup);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Route handler: campaign_group_id → Supabase .eq() call
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/dashboard/aggregate — campaign_group_id filter', () => {
  beforeEach(() => {
    eqCalls.length = 0; // reset recorded calls
    jest.clearAllMocks();

    // Restore chain stubs after clearAllMocks
    awaitableChain.select.mockReturnThis();
    awaitableChain.eq.mockImplementation((...args: [string, unknown]) => {
      eqCalls.push(args);
      return awaitableChain;
    });
    awaitableChain.neq.mockReturnThis();
    awaitableChain.not.mockReturnThis();
    awaitableChain.is.mockReturnThis();
    awaitableChain.in.mockReturnThis();
    awaitableChain.gte.mockReturnThis();
    awaitableChain.lte.mockReturnThis();
    awaitableChain.order.mockReturnThis();
    awaitableChain.limit.mockReturnThis();
    awaitableChain.range.mockReturnThis();
    awaitableChain.maybeSingle.mockResolvedValue({ data: { id: GROUP_ID, name: 'Test Group' }, error: null });
    awaitableChain.single.mockResolvedValue({ data: null, error: null });

    const { supabaseAdmin } = require('@/lib/supabase');
    supabaseAdmin.from.mockReturnValue(awaitableChain);

    const { validateWorkspaceAccess } = require('@/lib/api-workspace-guard');
    validateWorkspaceAccess.mockResolvedValue(null);

    const { checkRateLimit } = require('@/lib/rate-limit');
    checkRateLimit.mockReturnValue({ success: true, limit: 100, remaining: 99, reset: 0 });

    const { cacheManager } = require('@/lib/cache');
    cacheManager.getOrSet.mockImplementation(
      async (_key: string, factory: () => Promise<unknown>) => factory()
    );
  });

  test('applies .eq("campaign_group_id", …) when ?campaign_group_id is provided', async () => {
    const req = makeAggregateReq({ campaign_group_id: GROUP_ID });
    await GET(req);
    const groupFilterCalls = eqCalls.filter(([field]) => field === 'campaign_group_id');
    expect(groupFilterCalls.length).toBeGreaterThan(0);
    groupFilterCalls.forEach(([, value]) => expect(value).toBe(GROUP_ID));
  });

  test('does NOT apply campaign_group_id filter when param is absent', async () => {
    const req = makeAggregateReq(); // no campaign_group_id
    await GET(req);
    const groupFilterCalls = eqCalls.filter(([field]) => field === 'campaign_group_id');
    expect(groupFilterCalls.length).toBe(0);
  });

  test('returns 200 with aggregate shape when campaign_group_id is provided', async () => {
    const req = makeAggregateReq({ campaign_group_id: GROUP_ID });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = JSON.parse(await res.text());
    // Should contain at minimum the summary key
    expect(json).toHaveProperty('summary');
  });
});
