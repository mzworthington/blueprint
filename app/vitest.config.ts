import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/designer/vite.config.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura', 'json-summary', 'json'],
      reportsDirectory: './coverage',
    },
  },
});
