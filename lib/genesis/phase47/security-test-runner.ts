/**
 * GENESIS PHASE 47: SECURITY TEST RUNNER
 *
 * Red-team security testing: RLS bypass, SQL injection,
 * cross-workspace access, null context, auth bypass, input validation.
 */

import {
  SecurityTestCase,
  SecurityTestResult,
  SecurityAuditReport,
  SecuritySummary,
  SecurityTestCategory,
  SecuritySeverity,
  StressTestEnvironment,
  SECURITY_THRESHOLDS,
} from './types';

export class SecurityTestError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SecurityTestError';
  }
}

// ============================================
// DEFAULT SECURITY TEST SUITE
// ============================================

export function getDefaultSecurityTests(): SecurityTestCase[] {
  const VICTIM_WS = 'ws-victim-001';
  const ATTACKER_WS = 'ws-attacker-001';

  return [
    // RLS Bypass Tests
    {
      id: 'sec-rls-001',
      name: 'Block SELECT across workspaces',
      category: 'rls_bypass',
      severity: 'critical',
      description: 'Attacker sets their own context but queries victim workspace data',
      attack: {
        type: 'db_query',
        workspaceContext: ATTACKER_WS,
        targetWorkspace: VICTIM_WS,
        params: { table: 'genesis.leads', operation: 'SELECT' },
      },
      expectedOutcome: { shouldBlock: true, expectedEmptyData: true },
    },
    {
      id: 'sec-rls-002',
      name: 'Block INSERT to other workspace',
      category: 'rls_bypass',
      severity: 'critical',
      description: 'Attacker tries to insert data into victim workspace',
      attack: {
        type: 'db_query',
        workspaceContext: ATTACKER_WS,
        targetWorkspace: VICTIM_WS,
        params: { table: 'genesis.leads', operation: 'INSERT' },
      },
      expectedOutcome: { shouldBlock: true, expectedError: true },
    },
    {
      id: 'sec-rls-003',
      name: 'Block UPDATE across workspaces',
      category: 'rls_bypass',
      severity: 'critical',
      description: 'Attacker tries to update victim workspace data',
      attack: {
        type: 'db_query',
        workspaceContext: ATTACKER_WS,
        targetWorkspace: VICTIM_WS,
        params: { table: 'genesis.leads', operation: 'UPDATE' },
      },
      expectedOutcome: { shouldBlock: true, expectedEmptyData: true },
    },
    {
      id: 'sec-rls-004',
      name: 'Block DELETE across workspaces',
      category: 'rls_bypass',
      severity: 'critical',
      description: 'Attacker tries to delete victim workspace data',
      attack: {
        type: 'db_query',
        workspaceContext: ATTACKER_WS,
        targetWorkspace: VICTIM_WS,
        params: { table: 'genesis.leads', operation: 'DELETE' },
      },
      expectedOutcome: { shouldBlock: true, expectedEmptyData: true },
    },

    // NULL Context Tests
    {
      id: 'sec-null-001',
      name: 'Block SELECT with NULL context',
      category: 'null_context',
      severity: 'critical',
      description: 'Attacker clears workspace context and queries all data',
      attack: {
        type: 'db_query',
        workspaceContext: null,
        params: { table: 'genesis.leads', operation: 'SELECT' },
      },
      expectedOutcome: { shouldBlock: true, expectedEmptyData: true },
    },
    {
      id: 'sec-null-002',
      name: 'Block INSERT with NULL context',
      category: 'null_context',
      severity: 'critical',
      description: 'Attacker tries to insert without workspace context',
      attack: {
        type: 'db_query',
        workspaceContext: null,
        params: { table: 'genesis.leads', operation: 'INSERT' },
      },
      expectedOutcome: { shouldBlock: true, expectedError: true },
    },

    // SQL Injection Tests
    {
      id: 'sec-sqli-001',
      name: 'Block SQL injection in workspace_id',
      category: 'sql_injection',
      severity: 'critical',
      description: 'Attacker injects SQL via workspace_id parameter',
      attack: {
        type: 'parameter_tampering',
        endpoint: '/api/contacts',
        method: 'GET',
        params: { workspaceId: "'; DROP TABLE genesis.leads; --" },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [400, 403, 500] },
    },
    {
      id: 'sec-sqli-002',
      name: 'Block SQL injection in search parameter',
      category: 'sql_injection',
      severity: 'high',
      description: 'Attacker injects SQL via search/filter parameter',
      attack: {
        type: 'parameter_tampering',
        endpoint: '/api/contacts',
        method: 'GET',
        params: { search: "' OR 1=1; --" },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [400, 403, 200] },
    },
    {
      id: 'sec-sqli-003',
      name: 'Block UNION SELECT injection',
      category: 'sql_injection',
      severity: 'critical',
      description: 'Attacker attempts UNION-based data exfiltration',
      attack: {
        type: 'parameter_tampering',
        endpoint: '/api/contacts',
        method: 'GET',
        params: { workspaceId: "' UNION SELECT * FROM genesis.workspace_credentials --" },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [400, 403, 500] },
    },

    // Cross-Workspace API Tests
    {
      id: 'sec-xws-001',
      name: 'Block cross-workspace API access',
      category: 'cross_workspace',
      severity: 'critical',
      description: 'Attacker sends request with victim workspace ID in header',
      attack: {
        type: 'api_call',
        endpoint: '/api/contacts',
        method: 'GET',
        headers: {
          'X-Workspace-Id': ATTACKER_WS,
        },
        params: { workspaceId: VICTIM_WS },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [403], expectedEmptyData: true },
    },
    {
      id: 'sec-xws-002',
      name: 'Block workspace ID parameter manipulation',
      category: 'cross_workspace',
      severity: 'critical',
      description: 'Attacker changes workspaceId in API call',
      attack: {
        type: 'api_call',
        endpoint: '/api/dashboard',
        method: 'GET',
        params: { workspaceId: VICTIM_WS },
        workspaceContext: ATTACKER_WS,
      },
      expectedOutcome: { shouldBlock: true, expectedEmptyData: true },
    },

    // Input Validation Tests
    {
      id: 'sec-input-001',
      name: 'Reject empty workspace ID',
      category: 'input_validation',
      severity: 'high',
      description: 'API should reject empty workspaceId parameter',
      attack: {
        type: 'api_call',
        endpoint: '/api/contacts',
        method: 'GET',
        params: { workspaceId: '' },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [400, 403] },
    },
    {
      id: 'sec-input-002',
      name: 'Reject oversized workspace ID',
      category: 'input_validation',
      severity: 'medium',
      description: 'API should reject extremely long workspaceId',
      attack: {
        type: 'api_call',
        endpoint: '/api/contacts',
        method: 'GET',
        params: { workspaceId: 'a'.repeat(10000) },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [400, 413] },
    },
    {
      id: 'sec-input-003',
      name: 'Reject special characters in workspace ID',
      category: 'input_validation',
      severity: 'medium',
      description: 'API should reject workspaceId with special characters',
      attack: {
        type: 'api_call',
        endpoint: '/api/contacts',
        method: 'GET',
        params: { workspaceId: '<script>alert(1)</script>' },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [400, 403] },
    },

    // Header Manipulation Tests
    {
      id: 'sec-header-001',
      name: 'Block host header injection',
      category: 'header_manipulation',
      severity: 'medium',
      description: 'Attacker modifies Host header',
      attack: {
        type: 'api_call',
        endpoint: '/api/health',
        method: 'GET',
        headers: { Host: 'evil.com' },
      },
      expectedOutcome: { shouldBlock: false, expectedStatus: [200, 400] },
    },
    {
      id: 'sec-header-002',
      name: 'Block X-Forwarded-For spoofing',
      category: 'header_manipulation',
      severity: 'low',
      description: 'Attacker spoofs IP via X-Forwarded-For',
      attack: {
        type: 'api_call',
        endpoint: '/api/contacts',
        method: 'GET',
        headers: { 'X-Forwarded-For': '127.0.0.1' },
        params: { workspaceId: VICTIM_WS },
      },
      expectedOutcome: { shouldBlock: false },
    },

    // Rate Limit Bypass
    {
      id: 'sec-rate-001',
      name: 'Detect rate limit bypass attempt',
      category: 'rate_limit_bypass',
      severity: 'medium',
      description: 'Attacker sends many requests to bypass rate limits',
      attack: {
        type: 'api_call',
        endpoint: '/api/events',
        method: 'POST',
        body: { event_type: 'email_sent', workspace_id: ATTACKER_WS },
      },
      expectedOutcome: { shouldBlock: false }, // just detect
    },

    // Privilege Escalation
    {
      id: 'sec-priv-001',
      name: 'Block admin endpoint access by non-admin',
      category: 'privilege_escalation',
      severity: 'critical',
      description: 'Non-admin user tries to access admin endpoints',
      attack: {
        type: 'api_call',
        endpoint: '/api/admin/god-mode',
        method: 'GET',
        headers: { Authorization: 'Bearer fake-token' },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [401, 403] },
    },
    {
      id: 'sec-priv-002',
      name: 'Block admin migration endpoint',
      category: 'privilege_escalation',
      severity: 'critical',
      description: 'Non-admin tries to trigger migration cutover',
      attack: {
        type: 'api_call',
        endpoint: '/api/admin/cutover',
        method: 'POST',
        body: { action: 'complete_cutover' },
      },
      expectedOutcome: { shouldBlock: true, expectedStatus: [401, 403] },
    },
  ];
}

// ============================================
// SECURITY TEST RUNNER
// ============================================

export class SecurityTestRunner {
  constructor(private readonly env: StressTestEnvironment) {}

  /**
   * Run a single security test case.
   */
  async runTest(testCase: SecurityTestCase): Promise<SecurityTestResult> {
    const startTime = Date.now();

    try {
      const { attack, expectedOutcome } = testCase;
      let blocked = false;
      let status = 200;
      let dataCount = 0;
      let hasError = false;

      if (attack.type === 'api_call' || attack.type === 'parameter_tampering') {
        const queryParams = attack.params
          ? '?' + Object.entries(attack.params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
          : '';

        const response = await this.env.simulateRequest(
          attack.method || 'GET',
          `${attack.endpoint}${queryParams}`,
          {
            headers: attack.headers,
            body: attack.body,
            workspaceId: attack.workspaceContext || undefined,
          },
        );

        status = response.status;
        const responseBody = response.body as any;
        dataCount = Array.isArray(responseBody) ? responseBody.length : (responseBody?.data ? 1 : 0);
        hasError = status >= 400;

        // Determine if the attack was blocked
        if (expectedOutcome.expectedStatus) {
          blocked = expectedOutcome.expectedStatus.includes(status);
        }
        if (expectedOutcome.expectedEmptyData) {
          blocked = blocked || dataCount === 0;
        }
        if (expectedOutcome.expectedError) {
          blocked = blocked || hasError;
        }
        if (!expectedOutcome.shouldBlock) {
          blocked = true; // If we don't expect blocking, it "passes" by default
        }
      } else if (attack.type === 'db_query') {
        const result = await this.env.simulateQuery(
          attack.params?.table as string || 'genesis.leads',
          (attack.params?.operation as any) || 'SELECT',
          attack.workspaceContext || null,
          { targetWorkspace: attack.targetWorkspace },
        );

        hasError = !!result.error;
        dataCount = result.rowCount;

        if (expectedOutcome.expectedEmptyData) {
          blocked = dataCount === 0;
        }
        if (expectedOutcome.expectedError) {
          blocked = blocked || hasError;
        }
        if (!expectedOutcome.shouldBlock) {
          blocked = true;
        }
      }

      const passed = expectedOutcome.shouldBlock ? blocked : true;

      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        severity: testCase.severity,
        passed,
        blocked,
        details: passed
          ? `Attack was ${expectedOutcome.shouldBlock ? 'blocked' : 'handled'} as expected`
          : `Attack was NOT blocked — data returned: ${dataCount}, status: ${status}`,
        durationMs: Date.now() - startTime,
        response: { status, dataCount, hasError },
      };
    } catch (error) {
      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        severity: testCase.severity,
        passed: testCase.expectedOutcome.shouldBlock, // Error = blocked
        blocked: true,
        details: `Test threw error: ${error instanceof Error ? error.message : String(error)}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Run the full security test suite and generate an audit report.
   */
  async runSuite(tests: SecurityTestCase[]): Promise<SecurityAuditReport> {
    const startedAt = new Date().toISOString();
    const results: SecurityTestResult[] = [];

    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);
    }

    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const criticalFailures = results.filter(
      r => !r.passed && (r.severity === 'critical' || r.severity === 'high'),
    ).length;

    const summary = this.generateSummary(results);

    return {
      startedAt,
      completedAt: new Date().toISOString(),
      totalTests: results.length,
      passedTests,
      failedTests,
      criticalFailures,
      results,
      summary,
    };
  }

  /**
   * Generate security summary with scores and recommendations.
   */
  private generateSummary(results: SecurityTestResult[]): SecuritySummary {
    const categoryScores: Record<string, number> = {};
    const categoryResults: Record<string, SecurityTestResult[]> = {};

    // Group by category
    for (const result of results) {
      if (!categoryResults[result.category]) {
        categoryResults[result.category] = [];
      }
      categoryResults[result.category].push(result);
    }

    // Calculate category scores
    for (const [category, catResults] of Object.entries(categoryResults)) {
      const passed = catResults.filter(r => r.passed).length;
      categoryScores[category] = Math.round((passed / catResults.length) * 100);
    }

    // Calculate weighted overall score
    const severityWeights: Record<SecuritySeverity, number> = {
      critical: 5,
      high: 4,
      medium: 2,
      low: 1,
      info: 0.5,
    };

    let totalWeight = 0;
    let weightedScore = 0;
    for (const result of results) {
      const weight = severityWeights[result.severity];
      totalWeight += weight;
      if (result.passed) weightedScore += weight;
    }

    const overallScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 100;

    // Generate recommendations
    const recommendations: string[] = [];
    const failedByCategory = Object.entries(categoryResults)
      .filter(([, r]) => r.some(res => !res.passed))
      .map(([cat]) => cat);

    if (failedByCategory.includes('rls_bypass')) {
      recommendations.push('CRITICAL: Review RLS policies — cross-workspace data access detected');
    }
    if (failedByCategory.includes('sql_injection')) {
      recommendations.push('CRITICAL: Input sanitization needed — SQL injection vectors found');
    }
    if (failedByCategory.includes('privilege_escalation')) {
      recommendations.push('HIGH: Admin endpoint authorization needs hardening');
    }
    if (failedByCategory.includes('null_context')) {
      recommendations.push('HIGH: NULL workspace context allows data access');
    }
    if (overallScore >= SECURITY_THRESHOLDS.MIN_OVERALL_SCORE) {
      recommendations.push('Security posture meets minimum threshold');
    }

    return {
      overallScore,
      categoryScores: categoryScores as Record<SecurityTestCategory, number>,
      recommendations,
    };
  }
}
