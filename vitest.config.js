import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./backend/__tests__/setup.js'],
    include: ['backend/__tests__/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'backend/__tests__/']
    },
    testTimeout: 10000
  }
});