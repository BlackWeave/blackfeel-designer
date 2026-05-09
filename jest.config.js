// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {}, // No transformation needed for native ESM if using Node 20+
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Helps resolve .js imports in tests
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
};
