/**
 * Verifies docs/features-unit.md matches current Vitest describe/it titles.
 *
 * Usage:
 *   pnpm generate:features-unit:check
 */
import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const canonicalPath = join(appRoot, '../docs/features-unit.md');

if (!process.argv.includes('--check')) {
  console.error('Usage: checkFeaturesUnitDoc.ts --check');
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'features-unit-check-'));
const tempPath = join(tempDir, 'features-unit.md');

try {
  copyFileSync(canonicalPath, tempPath);

  execSync('pnpm exec vitest run', {
    cwd: appRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      GENERATE_FEATURES_UNIT: '1',
      FEATURES_UNIT_OUTPUT: tempPath,
    },
  });

  let existing: string;
  try {
    existing = readFileSync(canonicalPath, 'utf8');
  } catch {
    console.error(`Missing ${canonicalPath}. Run: cd app && pnpm generate:features-unit`);
    process.exit(1);
  }

  const generated = readFileSync(tempPath, 'utf8');
  if (existing !== generated) {
    console.error('Out of date: docs/features-unit.md\nRun: cd app && pnpm generate:features-unit');
    process.exit(1);
  }

  console.log('OK: features-unit.md matches Vitest describe/it titles');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
