import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadAnalysisConfig, mergeAnalysisOptions } from './loadAnalysisConfig.ts';
import { DEFAULT_ANALYSIS_OPTIONS } from '../domain/analysisOptions.ts';

describe('loadAnalysisConfig', () => {
  it('returns defaults when no config file exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-cfg-'));
    try {
      expect(loadAnalysisConfig(tmp)).toEqual(DEFAULT_ANALYSIS_OPTIONS);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('loads blueprint.config.json ignore and rollupModules', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-cfg-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'blueprint.config.json'),
        JSON.stringify({
          ignore: ['contrib/**'],
          include: ['packages/**'],
          systems: ['packages', 'microsite'],
          rollupModules: true,
          context: 'Acme',
          glob: 'packages/**/*.{ts,tsx}',
        }),
        'utf8'
      );

      const loaded = loadAnalysisConfig(tmp);
      expect(loaded.ignore).toEqual(['contrib/**']);
      expect(loaded.include).toEqual(['packages/**']);
      expect(loaded.systems).toEqual(['packages', 'microsite']);
      expect(loaded.rollupModules).toBe(true);
      expect(loaded.context).toBe('Acme');
      expect(loaded.glob).toBe('packages/**/*.{ts,tsx}');
      expect(loaded.configPath).toContain('blueprint.config.json');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('loads blueprint.config.yml', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-cfg-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'blueprint.config.yml'),
        ['ignore:', '  - site/**', 'rollupModules: false'].join('\n'),
        'utf8'
      );
      const loaded = loadAnalysisConfig(tmp);
      expect(loaded.ignore).toEqual(['site/**']);
      expect(loaded.rollupModules).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('merges CLI ignore overrides onto file config', () => {
    const merged = mergeAnalysisOptions(
      { ignore: ['a/**'], include: ['packages/**'], systems: [], rollupModules: false },
      { ignore: ['b/**'], rollupModules: true }
    );
    expect(merged.ignore).toEqual(['a/**', 'b/**']);
    expect(merged.include).toEqual(['packages/**']);
    expect(merged.rollupModules).toBe(true);
  });
});
