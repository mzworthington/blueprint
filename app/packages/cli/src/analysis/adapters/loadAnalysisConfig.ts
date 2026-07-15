import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions } from '../domain/analysisOptions.ts';

export type LoadedAnalysisConfig = AnalysisOptions & {
  /** Optional glob override from config file. */
  glob?: string;
  /** Optional context name override. */
  context?: string;
  configPath?: string;
};

type RawConfig = {
  ignore?: string[];
  include?: string[];
  systems?: string[];
  rollupModules?: boolean;
  glob?: string;
  context?: string;
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

/**
 * Loads the first `blueprint.config.{json,yml,yaml}` found in `cwd`
 * (does not walk ancestors — keep config next to the scan root).
 */
export function loadAnalysisConfig(cwd: string = process.cwd()): LoadedAnalysisConfig {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(cwd, filename);
    if (!fs.existsSync(configPath)) continue;

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const raw = parseRaw(configPath, content);
      return {
        ignore: Array.isArray(raw.ignore) ? raw.ignore.filter(Boolean) : [],
        include: Array.isArray(raw.include) ? raw.include.filter(Boolean) : [],
        systems: Array.isArray(raw.systems) ? raw.systems.filter(Boolean) : [],
        rollupModules:
          typeof raw.rollupModules === 'boolean'
            ? raw.rollupModules
            : DEFAULT_ANALYSIS_OPTIONS.rollupModules,
        glob: typeof raw.glob === 'string' ? raw.glob : undefined,
        context: typeof raw.context === 'string' ? raw.context : undefined,
        configPath,
      };
    } catch (err) {
      throw new Error(`Failed to load ${configPath}: ${err}`);
    }
  }

  return { ...DEFAULT_ANALYSIS_OPTIONS };
}

export function mergeAnalysisOptions(
  base: AnalysisOptions,
  overrides: Partial<AnalysisOptions> = {}
): AnalysisOptions {
  return {
    ignore: [...(base.ignore || []), ...(overrides.ignore || [])],
    include: overrides.include !== undefined ? overrides.include : base.include,
    systems: overrides.systems !== undefined ? overrides.systems : base.systems,
    rollupModules:
      overrides.rollupModules !== undefined ? overrides.rollupModules : base.rollupModules,
  };
}
