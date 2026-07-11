import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/app/vite.config.ts',
      'packages/cli/vitest.config.ts',
      'packages/core/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura', 'json-summary', 'json'],
      reportsDirectory: './coverage',
    },
  },
});
