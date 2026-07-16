import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'cli-vhs',
    environment: 'node',
    include: ['tests/vhs/**/*.test.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
