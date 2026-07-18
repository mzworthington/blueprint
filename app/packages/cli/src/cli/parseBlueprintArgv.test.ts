import { describe, expect, it } from 'vitest';
import { parseBlueprintArgv, type BlueprintCliPlan } from './parseBlueprintArgv.ts';

describe('parseBlueprintArgv (git options)', () => {
  it('defaults to architecture with git forensics enabled', () => {
    const plan = parseBlueprintArgv([]);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.gitDecisionExplicit).toBe(false);
  });

  it('disables git forensics with --no-git', () => {
    const plan = parseBlueprintArgv(['--headless', '--no-git', '--output=blueprints']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(false);
    expect(plan.gitDecisionExplicit).toBe(true);
    expect(plan.isHeadless).toBe(true);
  });

  it('keeps git forensics enabled with --git', () => {
    const plan = parseBlueprintArgv(['--headless', '--git', '--output=blueprints']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.gitDecisionExplicit).toBe(true);
    expect(plan.isHeadless).toBe(true);
  });

  it('treats --git-only as headless architecture plus forensics enrich', () => {
    const plan = parseBlueprintArgv(['--git-only', '--git-since=45']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.isHeadless).toBe(true);
    expect(plan.git.sinceDays).toBe(45);
  });

  it('parses --git-since', () => {
    const plan = parseBlueprintArgv(['--git', '--git-since=30']);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.git.sinceDays).toBe(30);
    expect(plan.gitDecisionExplicit).toBe(true);
  });

  it('maps legacy forensics subcommand to arch + git enrich', () => {
    const plan = parseBlueprintArgv(['forensics', '--since', '60']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.git.sinceDays).toBe(60);
    expect(plan.isHeadless).toBe(true);
  });

  it('keeps architecture interactive when only --git is set', () => {
    const plan = parseBlueprintArgv(['--git']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(parseBlueprintArgv(['--git', '--headless']).isHeadless).toBe(true);
    expect(parseBlueprintArgv(['--git-only']).isHeadless).toBe(true);
  });

  it('exposes architecture flag overrides and keeps git on by default', () => {
    const plan = parseBlueprintArgv([
      '--parser=tree-sitter',
      '--glob=**/*.ts',
      '--ignore=dist,build',
    ]);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.gitDecisionExplicit).toBe(false);
    expect(plan.architecture.parserType).toBe('tree-sitter');
    expect(plan.architecture.glob).toBe('**/*.ts');
    expect(plan.architecture.ignore).toEqual(['dist', 'build']);
    expect(plan.architecture.relayout).toBe(true);
  });

  it('defaults to relayout and disables with --no-relayout', () => {
    expect(parseBlueprintArgv(['--headless', '--output=blueprints']).architecture.relayout).toBe(
      true
    );
    const plan = parseBlueprintArgv(['--headless', '--no-relayout', '--output=blueprints']);
    expect(plan.architecture.relayout).toBe(false);
    expect(plan.isHeadless).toBe(true);
  });
});

describe('parseBlueprintArgv plan shape', () => {
  it('returns a typed plan object', () => {
    const plan: BlueprintCliPlan = parseBlueprintArgv(['--git-only']);
    expect(plan).toMatchObject({
      runArchitecture: true,
      runGitForensics: true,
      gitDecisionExplicit: true,
    });
  });
});
