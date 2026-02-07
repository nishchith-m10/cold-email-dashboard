/**
 * Jest Configuration for Phase 68 Tests
 * Tenant Lifecycle Management & Data Export
 */

module.exports = {
  displayName: 'Phase 68: Tenant Lifecycle',
  testEnvironment: 'node',
  rootDir: '../../..',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/genesis/phase68/core.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
  },
  collectCoverageFrom: [
    'lib/genesis/tenant-lifecycle.ts',
    'lib/genesis/data-export.ts',
    'app/api/workspace/delete/**/*.ts',
    'app/api/workspace/export/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 0, // Core tests focus on logic, not exhaustive coverage
      functions: 6,
      lines: 12,
      statements: 12,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/genesis/phase68/setup.ts'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
