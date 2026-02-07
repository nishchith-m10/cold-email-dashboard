/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '<rootDir>/../phase66/**/*.test.ts',
    '<rootDir>/../phase67/**/*.test.ts',
    '<rootDir>/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@/lib/genesis/(.*)$': '<rootDir>/../../lib/genesis/$1',
    '^@/lib/(.*)$': '<rootDir>/../../lib/$1',
    '^@/(.*)$': '<rootDir>/../../$1',
  },
  collectCoverageFrom: [
    '../../lib/genesis/gdpr-service.ts',
    '../../lib/genesis/audit-logger.ts',
    '!**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  transform: {
    '^.+\\.(ts|js|mjs)$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
  verbose: true,
  testTimeout: 30000, // 30s for database operations
};
