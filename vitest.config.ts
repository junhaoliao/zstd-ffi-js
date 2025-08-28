import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/**'],
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        functions: 100,
        lines: 85,
        statements: 85,
      }
    },
  },
});
