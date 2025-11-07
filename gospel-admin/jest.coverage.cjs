/**
 * Local coverage-only Jest config used to calculate coverage for a
 * narrowed set of server-side files. This avoids pulling the full
 * Next.js/jest wrapper and gives deterministic collectCoverageFrom
 * behavior for quick verification.
 */
module.exports = {
  roots: ['<rootDir>'],
  // Use the Node environment for server-side route coverage so the V8
  // provider and source maps align with runtime behavior.
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.coverage.setup.cjs'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  // Only run server-side tests when using this coverage config. This
  // prevents executing the broad set of UI/component tests that require
  // the jsdom environment and would fail under `testEnvironment: 'node'`.
  testMatch: [
    '<rootDir>/src/app/api/**/__tests__/**/*.?(spec|test).?(ts|js)',
    '<rootDir>/src/lib/**/__tests__/**/*.?(spec|test).?(ts|js)'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/lib/supabase/server.ts',
    'src/app/api/scripture/route.ts',
    'src/app/api/profiles/[slug]/route.ts',
    'src/app/api/profiles/[slug]/access/route.ts',
    'src/app/favicon.ico/route.ts',
  ],
  coverageProvider: 'v8',
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 54,
      functions: 60,
      lines: 80,
      statements: 80,
    },
  },
}
