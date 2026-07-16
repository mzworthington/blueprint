import { accessSync, constants, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.resolve(cliRoot, '../../..');
const tapePath = path.join(cliRoot, 'tapes/cli-demo.tape');
const gifPath = path.join(repoRoot, 'docs/screenshots/cli.gif');
const demoOutput = path.join(repoRoot, '.vhs-out');

function hasBinary(name: string): boolean {
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    try {
      accessSync(path.join(dir, name), constants.X_OK);
      return true;
    } catch {
      // try next PATH entry
    }
  }
  return false;
}

describe('CLI VHS demo', () => {
  it('records interactive prompts against the real app to docs/screenshots/cli.gif', () => {
    const missing = ['vhs', 'ttyd', 'ffmpeg', 'bun'].filter(name => !hasBinary(name));
    if (missing.length > 0) {
      throw new Error(
        `Missing required binaries for VHS recording: ${missing.join(', ')}. ` +
          'Install with: brew install vhs ffmpeg'
      );
    }

    expect(existsSync(tapePath)).toBe(true);

    mkdirSync(path.dirname(gifPath), { recursive: true });
    rmSync(demoOutput, { recursive: true, force: true });
    rmSync(gifPath, { force: true });

    const env = {
      ...process.env,
      CI: '',
      BLUEPRINT_OUTPUT_DIR: '',
    };

    // ttyd/browser startup can flake once on a cold machine.
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        execFileSync('vhs', [tapePath], {
          cwd: cliRoot,
          stdio: 'inherit',
          env,
          timeout: 300_000,
        });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        rmSync(gifPath, { force: true });
        rmSync(demoOutput, { recursive: true, force: true });
      }
    }
    if (lastError) throw lastError;

    expect(existsSync(gifPath)).toBe(true);
    expect(statSync(gifPath).size).toBeGreaterThan(10_000);
    expect(existsSync(path.join(demoOutput, 'context.yaml'))).toBe(true);
  }, 300_000);
});
