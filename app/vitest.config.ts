import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { VitestFeatureReporter } from './reporters/vitestFeatureReporter.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsUnitFeatures = path.resolve(__dirname, '../docs/features-unit.md');
const generateFeaturesUnit = process.env.GENERATE_FEATURES_UNIT === '1';

export default defineConfig({
  test: {
    projects: [
      'packages/designer/vite.config.ts',
      'packages/cli/vitest.config.ts',
      {
        test: {
          name: 'core',
          root: './packages/core',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'reporters',
          include: ['reporters/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
    reporters: generateFeaturesUnit
      ? ['default', new VitestFeatureReporter({ outputFile: docsUnitFeatures })]
      : ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura', 'json-summary', 'json'],
      reportsDirectory: './coverage',
    },
  },
});
