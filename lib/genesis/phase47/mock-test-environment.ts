/**
 * GENESIS PHASE 47: MOCK TEST ENVIRONMENT
 *
 * Simulated environment for running stress tests, security tests,
 * and chaos experiments without real infrastructure.
 */

import {
  StressTestEnvironment,
  SimulatedResponse,
  SimulatedQueryResult,
  EnvironmentMetrics,
} from './types';

interface FaultConfig {
  type: 'latency' | 'error';
  targetService: string;
  probability: number;
  delayMs?: number;
  errorCode?: number;
}

/**
 * In-memory mock implementation of StressTestEnvironment.
 * Simulates API responses, DB queries, and fault injection.
 */
export class MockTestEnvironment implements StressTestEnvironment {
  private faults: FaultConfig[] = [];
  private metrics: EnvironmentMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    latencies: [],
    requestsByEndpoint: {},
    errorsByEndpoint: {},
  };

  // Configurable data store
  private dataStore: Map<string, Array<Record<string, unknown>>> = new Map();
  private workspaceData: Map<string, Map<string, Array<Record<string, unknown>>>> = new Map();

  // Route handlers for custom endpoint behavior
  private routeHandlers: Map<string, (req: any) => SimulatedResponse> = new Map();

  constructor() {
    this.setupDefaultData();
    this.setupDefaultRoutes();
  }

  // ============================================
  // StressTestEnvironment INTERFACE
  // ============================================

  async simulateRequest(
    method: string,
    path: string,
    options?: {
      headers?: Record<string, string>;
      body?: unknown;
      workspaceId?: string;
    },
  ): Promise<SimulatedResponse> {
    const startTime = Date.now();
    const endpoint = this.extractEndpoint(path);

    this.metrics.totalRequests++;
    this.metrics.requestsByEndpoint[endpoint] = (this.metrics.requestsByEndpoint[endpoint] || 0) + 1;

    // Check for fault injection — evaluate ALL faults once per request
    // to avoid probabilistic inconsistency from multiple calls
    const apiFaults = this.getActiveFaults('api');
    for (const apiFault of apiFaults) {
      const roll = Math.random(); // Single roll per fault, per request
      if (apiFault.type === 'latency' && apiFault.delayMs && roll < apiFault.probability) {
        await this.delay(apiFault.delayMs);
      }
      if (apiFault.type === 'error' && roll < apiFault.probability) {
        this.metrics.totalErrors++;
        this.metrics.errorsByEndpoint[endpoint] = (this.metrics.errorsByEndpoint[endpoint] || 0) + 1;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return {
          status: apiFault.errorCode || 500,
          body: { error: 'Simulated fault' },
          headers: {},
          latencyMs: latency,
        };
      }
    }

    // Input validation
    const wsId = options?.workspaceId || this.extractQueryParam(path, 'workspaceId');

    // Security checks
    if (endpoint === '/api/contacts' || endpoint === '/api/dashboard' || endpoint === '/api/sequences') {
      if (!wsId || wsId === '') {
        this.metrics.totalErrors++;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return { status: 400, body: { error: 'workspaceId required' }, headers: {}, latencyMs: latency };
      }
      if (wsId.length > 256) {
        this.metrics.totalErrors++;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return { status: 400, body: { error: 'workspaceId too long' }, headers: {}, latencyMs: latency };
      }
      if (this.containsSqlInjection(wsId)) {
        this.metrics.totalErrors++;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return { status: 400, body: { error: 'Invalid workspaceId' }, headers: {}, latencyMs: latency };
      }
      if (this.containsXss(wsId)) {
        this.metrics.totalErrors++;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return { status: 400, body: { error: 'Invalid workspaceId' }, headers: {}, latencyMs: latency };
      }

      // Cross-workspace check: if header workspace differs from query param
      const headerWs = options?.headers?.['X-Workspace-Id'];
      if (headerWs && wsId && headerWs !== wsId) {
        this.metrics.totalErrors++;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return { status: 403, body: { error: 'Workspace mismatch' }, headers: {}, latencyMs: latency };
      }
    }

    // Admin endpoint protection
    if (endpoint.startsWith('/api/admin')) {
      const authHeader = options?.headers?.['Authorization'] || '';
      if (!authHeader || authHeader === 'Bearer fake-token') {
        this.metrics.totalErrors++;
        const latency = Date.now() - startTime;
        this.metrics.latencies.push(latency);
        return { status: 403, body: { error: 'Unauthorized' }, headers: {}, latencyMs: latency };
      }
    }

    // Check custom route handler
    const handler = this.routeHandlers.get(`${method}:${endpoint}`);
    if (handler) {
      const response = handler({ method, path, options });
      const latency = Date.now() - startTime + Math.random() * 50; // simulate processing time
      this.metrics.latencies.push(latency);
      return { ...response, latencyMs: latency };
    }

    // Default response
    const latency = Date.now() - startTime + Math.random() * 100 + 10;
    this.metrics.latencies.push(latency);
    return {
      status: 200,
      body: { data: [], workspace_id: wsId },
      headers: { 'Content-Type': 'application/json' },
      latencyMs: latency,
    };
  }

  async simulateQuery(
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    workspaceContext: string | null,
    params?: Record<string, unknown>,
  ): Promise<SimulatedQueryResult> {
    const startTime = Date.now();

    // NULL context protection
    if (workspaceContext === null) {
      if (operation === 'INSERT') {
        return {
          data: [],
          error: 'Cannot INSERT without workspace context',
          rowCount: 0,
          latencyMs: Date.now() - startTime,
        };
      }
      // SELECT/UPDATE/DELETE return empty with null context (RLS)
      return {
        data: [],
        error: null,
        rowCount: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // Cross-workspace protection
    const targetWorkspace = params?.targetWorkspace as string | undefined;
    if (targetWorkspace && targetWorkspace !== workspaceContext) {
      if (operation === 'INSERT') {
        return {
          data: [],
          error: 'RLS violation: cannot insert into another workspace',
          rowCount: 0,
          latencyMs: Date.now() - startTime,
        };
      }
      // RLS blocks cross-workspace SELECT/UPDATE/DELETE — return empty
      return {
        data: [],
        error: null,
        rowCount: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // DB fault injection
    const dbFault = this.getActiveFault('database');
    if (dbFault && dbFault.type === 'error' && Math.random() < dbFault.probability) {
      return {
        data: [],
        error: 'Simulated database error',
        rowCount: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    // Return workspace-scoped data
    const wsData = this.workspaceData.get(workspaceContext);
    if (!wsData) {
      return { data: [], error: null, rowCount: 0, latencyMs: Date.now() - startTime };
    }

    const tableData = wsData.get(table) || [];
    return {
      data: tableData,
      error: null,
      rowCount: tableData.length,
      latencyMs: Date.now() - startTime,
    };
  }

  injectLatency(targetService: string, delayMs: number, probability: number): void {
    this.faults.push({ type: 'latency', targetService, probability, delayMs });
  }

  injectError(targetService: string, errorRate: number, errorCode: number): void {
    this.faults.push({ type: 'error', targetService, probability: errorRate, errorCode });
  }

  clearFaults(): void {
    this.faults = [];
  }

  getMetrics(): EnvironmentMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      latencies: [],
      requestsByEndpoint: {},
      errorsByEndpoint: {},
    };
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Seed workspace data for testing.
   */
  seedWorkspaceData(
    workspaceId: string,
    table: string,
    data: Array<Record<string, unknown>>,
  ): void {
    if (!this.workspaceData.has(workspaceId)) {
      this.workspaceData.set(workspaceId, new Map());
    }
    this.workspaceData.get(workspaceId)!.set(table, data);
  }

  /**
   * Register a custom route handler.
   */
  registerRoute(
    method: string,
    endpoint: string,
    handler: (req: any) => SimulatedResponse,
  ): void {
    this.routeHandlers.set(`${method}:${endpoint}`, handler);
  }

  /**
   * Reset to clean state.
   */
  reset(): void {
    this.faults = [];
    this.resetMetrics();
    this.dataStore.clear();
    this.workspaceData.clear();
    this.routeHandlers.clear();
    this.setupDefaultData();
    this.setupDefaultRoutes();
  }

  // ============================================
  // INTERNAL
  // ============================================

  private setupDefaultData(): void {
    const testWs = 'test-workspace-1';
    this.seedWorkspaceData(testWs, 'genesis.leads', [
      { id: '1', email_address: 'lead1@example.com', status: 'active', workspace_id: testWs },
      { id: '2', email_address: 'lead2@example.com', status: 'pending', workspace_id: testWs },
    ]);
    this.seedWorkspaceData(testWs, 'genesis.contacts', [
      { id: '1', name: 'Test Contact', email: 'test@example.com', workspace_id: testWs },
    ]);

    const victimWs = 'ws-victim-001';
    this.seedWorkspaceData(victimWs, 'genesis.leads', [
      { id: '100', email_address: 'victim@example.com', status: 'active', workspace_id: victimWs },
    ]);
  }

  private setupDefaultRoutes(): void {
    this.registerRoute('GET', '/api/health', () => ({
      status: 200,
      body: { status: 'ok', timestamp: new Date().toISOString() },
      headers: {},
      latencyMs: 0,
    }));

    this.registerRoute('POST', '/api/events', (req: any) => ({
      status: 200,
      body: { accepted: true },
      headers: {},
      latencyMs: 0,
    }));
  }

  /**
   * Get all active faults for a service.
   * Returns all matching faults — probability is evaluated by the caller
   * with a single random roll per fault to avoid inconsistency.
   */
  private getActiveFaults(service: string): FaultConfig[] {
    return this.faults.filter(f => f.targetService === service);
  }

  /** @deprecated Use getActiveFaults — kept for backward compat in DB query path */
  private getActiveFault(service: string): FaultConfig | undefined {
    const faults = this.getActiveFaults(service);
    for (const f of faults) {
      if (Math.random() < f.probability) return f;
    }
    return undefined;
  }

  private extractEndpoint(path: string): string {
    return path.split('?')[0];
  }

  private extractQueryParam(path: string, param: string): string | undefined {
    const queryString = path.split('?')[1];
    if (!queryString) return undefined;
    const params = new URLSearchParams(queryString);
    return params.get(param) || undefined;
  }

  private containsSqlInjection(input: string): boolean {
    const patterns = [
      /['";]/,
      /\b(DROP|SELECT|INSERT|UPDATE|DELETE|UNION|ALTER|CREATE|EXEC)\b/i,
      /--/,
      /\/\*/,
    ];
    return patterns.some(p => p.test(input));
  }

  private containsXss(input: string): boolean {
    return /<[^>]*script/i.test(input) || /javascript:/i.test(input);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
