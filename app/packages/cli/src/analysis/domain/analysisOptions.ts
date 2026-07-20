/**
 * Shared analysis options used by parsers, grouping, and the CLI.
 * Product-specific noise belongs in `blueprint.config.*` or CLI flags — not hardcoded.
 */
export type AnalysisOptions = {
  /** Extra ignore globs (gitignore syntax), merged with structural defaults. */
  ignore: string[];
  /**
   * If non-empty, a path must match at least one include glob to be scanned.
   * Empty means "no include filter".
   */
  include: string[];
  /**
   * Collapse `*-module-*` package/container names to the prefix before `-module-`
   * (common monorepo convention for plugin modules). Off by default.
   */
  rollupModules: boolean;
  /**
   * Explicit software-system roots (repo-relative dirs). When set, skips autodetection
   * from workspaces / standalone packages.
   */
  systems: string[];
};

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  ignore: [],
  include: [],
  rollupModules: false,
  systems: [],
};

/**
 * Structural (product-agnostic) path noise: docs, tooling, generated output.
 * Applied in addition to `.gitignore`.
 */
export const DEFAULT_STRUCTURAL_IGNORE_GLOBS: readonly string[] = [
  'docs/**',
  'documentation/**',
  'scripts/**',
  'e2e/**',
  'cypress/**',
  'playwright/**',
  '**/storybook/**',
  '**/stories/**',
  'dist/**',
  'build/**',
  'out/**',
  'coverage/**',
  '.github/**',
  '.husky/**',
  '.vscode/**',
  '.idea/**',
  '**/generated/**',
  '**/__snapshots__/**',
  // IaC is handled by TerraformAnalyzer / PulumiAnalyzer — keep out of AST parsers
  '**/*.tf',
  '**/*.tf.json',
  '**/Pulumi.yaml',
  '**/Pulumi.yml',
  '**/Pulumi.*.yaml',
  '**/Pulumi.*.yml',
];

/** Path/folder names that must not become a container identity on their own. */
export const LAYOUT_IDENTITY_DENYLIST = new Set([
  'src',
  'lib',
  'source',
  'sources',
  'types',
  'utils',
  'util',
  'helpers',
  'helper',
  'common',
  'shared',
  'internal',
  'test',
  'tests',
  '__tests__',
  'fixtures',
  'mocks',
  'model',
  'models',
  'api',
  'apis',
  'alpha',
  'next',
]);
