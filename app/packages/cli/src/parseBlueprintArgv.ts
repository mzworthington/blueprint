export interface ArchitectureCliFlags {
  parserType: string | undefined;
  glob: string | undefined;
  outputDir: string | undefined;
  context: string | undefined;
  rollupModules: boolean;
  ignore: string[];
  systems: string[] | undefined;
}

export interface GitForensicsCliFlags {
  sinceDays: number | undefined;
  glob: string | undefined;
  ignore: string[];
  targetPath: string;
}

export interface BlueprintCliPlan {
  isHeadless: boolean;
  runArchitecture: boolean;
  runGitForensics: boolean;
  architecture: ArchitectureCliFlags;
  git: GitForensicsCliFlags;
}

function flagValue(argv: string[], name: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = argv.indexOf(name);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1]!.startsWith('-')) {
    return argv[idx + 1];
  }
  return undefined;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseSinceDays(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const days = Number(raw.replace(/d$/i, ''));
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

function hasGitIntent(argv: string[]): boolean {
  return (
    argv.includes('--git') ||
    argv.includes('--git-only') ||
    argv.some(a => a.startsWith('--git-since')) ||
    argv[0] === 'forensics'
  );
}

/**
 * Parse unified blueprint CLI argv (architecture + optional git forensics enrich).
 * Legacy `forensics …` maps to headless architecture + forensics attach.
 */
export function parseBlueprintArgv(argv: string[]): BlueprintCliPlan {
  const legacy = argv[0] === 'forensics';
  const legacyRest = legacy ? argv.slice(1) : argv;

  const gitIntent = hasGitIntent(argv);
  const gitOnly = argv.includes('--git-only') || legacy;

  const sinceFromGit =
    flagValue(argv, '--git-since') ?? (legacy ? flagValue(legacyRest, '--since') : undefined);

  const architecture: ArchitectureCliFlags = {
    parserType: flagValue(argv, '--parser'),
    glob: flagValue(argv, '--glob'),
    outputDir: flagValue(argv, '--output'),
    context: flagValue(argv, '--context'),
    rollupModules: argv.includes('--rollup-modules'),
    ignore: parseCsv(flagValue(argv, '--ignore')),
    systems: (() => {
      const raw = flagValue(argv, '--systems');
      return raw ? parseCsv(raw) : undefined;
    })(),
  };

  const git: GitForensicsCliFlags = {
    sinceDays: parseSinceDays(sinceFromGit),
    glob: flagValue(argv, '--glob') ?? (legacy ? flagValue(legacyRest, '--glob') : undefined),
    ignore: parseCsv(
      flagValue(argv, '--ignore') ?? (legacy ? flagValue(legacyRest, '--ignore') : undefined)
    ),
    targetPath: '.',
  };

  const isHeadless =
    argv.includes('--headless') ||
    gitOnly ||
    !!architecture.parserType ||
    !!architecture.glob ||
    !!architecture.outputDir ||
    !!architecture.context ||
    architecture.rollupModules ||
    architecture.ignore.length > 0 ||
    !!architecture.systems ||
    !process.stdout.isTTY ||
    !!process.env.CI;

  return {
    isHeadless,
    /** Always generate blueprints; git-only still enriches them. */
    runArchitecture: true,
    runGitForensics: gitIntent,
    architecture,
    git,
  };
}
