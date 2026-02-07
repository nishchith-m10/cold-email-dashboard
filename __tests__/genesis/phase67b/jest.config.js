module.exports = {
  displayName: 'Phase 67.B: Login Audit Trail',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../$1',
  },
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../../../lib/genesis/login-audit.ts',
    '../../../app/api/audit/**/*.ts',
    '../../../app/api/webhooks/clerk/audit/route.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 30000,
};
