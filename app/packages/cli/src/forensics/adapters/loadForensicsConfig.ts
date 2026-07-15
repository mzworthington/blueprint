import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import {
  DEFAULT_FORENSICS_OPTIONS,
  mergeForensicsOptions,
  type ForensicsOptions,
} from '../domain/options.ts';

export type LoadedForensicsConfig = Partial<ForensicsOptions> & {
  configPath?: string;
};

type RawForensics = {
  sinceDays?: number;
  hotspotThreshold?: number;
  complexityThreshold?: number;
  minSharedCommits?: number;
  couplingThreshold?: number;
  minChurnForComplexity?: number;
  glob?: string;
  ignore?: string[];
  include?: string[];
};

type RawConfig = {
  ignore?: string[];
  include?: string[];
  forensics?: RawForensics;
};

const CONFIG_FILENAMES = [
  'blueprint.config.json',
  'blueprint.config.yml',
  'blueprint.config.yaml',
] as const;

function parseRaw(filePath: string, content: string): RawConfig {
  if (filePath.endsWith('.json')) {
    return JSON.parse(content) as RawConfig;
  }
  const loaded = yaml.load(content);
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    return {};
  }
  return loaded as RawConfig;
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Loads forensics options from `blueprint.config.*` (`forensics` section + top-level ignore/include).
 */
export function loadForensicsConfig(cwd: string = process.cwd()): LoadedForensicsConfig {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(cwd, filename);
    if (!fs.existsSync(configPath)) continue;

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const raw = parseRaw(configPath, content);
      const f = raw.forensics ?? {};
      const defaults = DEFAULT_FORENSICS_OPTIONS;
      return {
        sinceDays: pickNumber(f.sinceDays, defaults.sinceDays),
        hotspotThreshold: pickNumber(f.hotspotThreshold, defaults.hotspotThreshold),
        complexityThreshold: pickNumber(f.complexityThreshold, defaults.complexityThreshold),
        minSharedCommits: pickNumber(f.minSharedCommits, defaults.minSharedCommits),
        couplingThreshold: pickNumber(f.couplingThreshold, defaults.couplingThreshold),
        minChurnForComplexity: pickNumber(f.minChurnForComplexity, defaults.minChurnForComplexity),
        glob: typeof f.glob === 'string' ? f.glob : defaults.glob,
        ignore: [
          ...(Array.isArray(raw.ignore) ? raw.ignore.filter(Boolean) : []),
          ...(Array.isArray(f.ignore) ? f.ignore.filter(Boolean) : []),
        ],
        include:
          Array.isArray(f.include) && f.include.length > 0
            ? f.include.filter(Boolean)
            : Array.isArray(raw.include)
              ? raw.include.filter(Boolean)
              : defaults.include,
        configPath,
      };
    } catch (err) {
      throw new Error(`Failed to load ${configPath}: ${err}`);
    }
  }

  return { ...DEFAULT_FORENSICS_OPTIONS };
}

export function resolveForensicsOptions(
  fileConfig: LoadedForensicsConfig,
  cliOverrides: Partial<ForensicsOptions> = {}
): ForensicsOptions {
  const { configPath: _configPath, ...fromFile } = fileConfig;
  return mergeForensicsOptions(
    mergeForensicsOptions(DEFAULT_FORENSICS_OPTIONS, fromFile),
    cliOverrides
  );
}
