/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/genesis/**/*.test.ts'],
  moduleNameMapper: {
    '^@/lib/genesis/(.*)$': '<rootDir>/../../lib/genesis/$1',
    '^@/lib/(.*)$': '<rootDir>/../../lib/$1',
  },
  collectCoverageFrom: [
    '../../lib/genesis/**/*.ts',
    '!../../lib/genesis/**/*.d.ts',
    '!../../lib/genesis/index.ts',
  ],
  transform: {
    '^.+\\.(ts|js|mjs)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        moduleResolution: 'node',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  verbose: true,
};
