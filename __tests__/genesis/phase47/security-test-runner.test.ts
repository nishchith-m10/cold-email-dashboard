/**
 * GENESIS PHASE 47: SECURITY TEST RUNNER TESTS
 */

import {
  SecurityTestRunner,
  getDefaultSecurityTests,
  MockTestEnvironment,
  type SecurityTestCase,
} from '../../../lib/genesis/phase47';

describe('Phase 47 Security Test Runner', () => {
  let env: MockTestEnvironment;
  let runner: SecurityTestRunner;

  beforeEach(() => {
    env = new MockTestEnvironment();
    runner = new SecurityTestRunner(env);
  });

  // ============================================
  // DEFAULT TEST SUITE
  // ============================================
  describe('getDefaultSecurityTests', () => {
    it('should return a comprehensive set of tests', () => {
      const tests = getDefaultSecurityTests();
      expect(tests.length).toBeGreaterThanOrEqual(15);
    });

    it('should have unique IDs', () => {
      const tests = getDefaultSecurityTests();
      const ids = tests.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should cover all categories', () => {
      const tests = getDefaultSecurityTests();
      const categories = [...new Set(tests.map(t => t.category))];
      expect(categories).toContain('rls_bypass');
      expect(categories).toContain('sql_injection');
      expect(categories).toContain('cross_workspace');
      expect(categories).toContain('null_context');
      expect(categories).toContain('input_validation');
    });

    it('should have critical severity for RLS tests', () => {
      const tests = getDefaultSecurityTests();
      const rlsTests = tests.filter(t => t.category === 'rls_bypass');
      for (const test of rlsTests) {
        expect(test.severity).toBe('critical');
      }
    });
  });

  // ============================================
  // RLS BYPASS TESTS
  // ============================================
  describe('RLS Bypass Detection', () => {
    it('should block cross-workspace SELECT', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-rls-001')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(true);
    });

    it('should block cross-workspace INSERT', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-rls-002')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });

    it('should block cross-workspace UPDATE', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-rls-003')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });

    it('should block cross-workspace DELETE', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-rls-004')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // NULL CONTEXT TESTS
  // ============================================
  describe('NULL Context Protection', () => {
    it('should block SELECT with NULL context', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-null-001')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(true);
    });

    it('should block INSERT with NULL context', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-null-002')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // SQL INJECTION TESTS
  // ============================================
  describe('SQL Injection Prevention', () => {
    it('should block SQL injection in workspace_id', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-sqli-001')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });

    it('should block UNION SELECT injection', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-sqli-003')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // CROSS-WORKSPACE API TESTS
  // ============================================
  describe('Cross-Workspace API Protection', () => {
    it('should block mismatched workspace headers', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-xws-001')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // INPUT VALIDATION TESTS
  // ============================================
  describe('Input Validation', () => {
    it('should reject empty workspace ID', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-input-001')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });

    it('should reject oversized workspace ID', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-input-002')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });

    it('should reject XSS in workspace ID', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-input-003')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // PRIVILEGE ESCALATION
  // ============================================
  describe('Privilege Escalation Prevention', () => {
    it('should block admin endpoint access', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-priv-001')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });

    it('should block admin migration endpoint', async () => {
      const tests = getDefaultSecurityTests();
      const test = tests.find(t => t.id === 'sec-priv-002')!;
      const result = await runner.runTest(test);
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // FULL SUITE
  // ============================================
  describe('Full Security Suite', () => {
    it('should run all tests and generate report', async () => {
      const tests = getDefaultSecurityTests();
      const report = await runner.runSuite(tests);

      expect(report.totalTests).toBe(tests.length);
      expect(report.passedTests + report.failedTests).toBe(report.totalTests);
      expect(report.startedAt).toBeTruthy();
      expect(report.completedAt).toBeTruthy();
      expect(report.results).toHaveLength(tests.length);
    });

    it('should generate summary with score', async () => {
      const tests = getDefaultSecurityTests();
      const report = await runner.runSuite(tests);

      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);
      expect(Object.keys(report.summary.categoryScores).length).toBeGreaterThan(0);
    });

    it('should generate recommendations when tests fail', async () => {
      // Create a test that we know will fail
      const failingTest: SecurityTestCase = {
        id: 'sec-fail-001',
        name: 'Intentionally failing test',
        category: 'rls_bypass',
        severity: 'critical',
        description: 'This test expects blocking but data is returned',
        attack: {
          type: 'db_query',
          workspaceContext: 'test-workspace-1', // Same workspace = data returned
          params: { table: 'genesis.leads', operation: 'SELECT' },
        },
        expectedOutcome: { shouldBlock: true, expectedEmptyData: true },
      };

      const report = await runner.runSuite([failingTest]);
      expect(report.failedTests).toBe(1);
      expect(report.summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should record duration for each test', async () => {
      const tests = getDefaultSecurityTests().slice(0, 3);
      const report = await runner.runSuite(tests);

      for (const result of report.results) {
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
