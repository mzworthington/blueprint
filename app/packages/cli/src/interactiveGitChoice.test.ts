import { describe, expect, it } from 'vitest';
import {
  applyInteractiveGitChoice,
  shouldPromptForGit,
  type InteractiveGitChoice,
} from './interactiveGitChoice.ts';
import { parseBlueprintArgv } from './parseBlueprintArgv.ts';

describe('applyInteractiveGitChoice', () => {
  it('disables git forensics when user selects none', () => {
    const plan = parseBlueprintArgv([]);
    const next = applyInteractiveGitChoice(plan, { mode: 'none' });
    expect(next.runGitForensics).toBe(false);
  });

  it('keeps forensics enrich when user selects full', () => {
    const plan = parseBlueprintArgv([]);
    const next = applyInteractiveGitChoice(plan, { mode: 'full', sinceDays: 60 });
    expect(next.runGitForensics).toBe(true);
    expect(next.git.sinceDays).toBe(60);
  });

  it('does not override an explicit CLI --git plan when choice is skipped', () => {
    const plan = parseBlueprintArgv(['--git', '--git-since=30']);
    const next = applyInteractiveGitChoice(plan, { mode: 'skip' });
    expect(next.runGitForensics).toBe(true);
    expect(next.git.sinceDays).toBe(30);
  });

  it('accepts InteractiveGitChoice mode union', () => {
    const modes: InteractiveGitChoice['mode'][] = ['none', 'full', 'skip'];
    expect(modes).toHaveLength(3);
  });
});

describe('shouldPromptForGit', () => {
  it('prompts in interactive mode when git was not decided via flags', () => {
    const plan = { ...parseBlueprintArgv([]), isHeadless: false };
    expect(shouldPromptForGit(plan)).toBe(true);
  });

  it('does not prompt when headless', () => {
    expect(shouldPromptForGit(parseBlueprintArgv(['--headless']))).toBe(false);
  });

  it('does not prompt when --git already set', () => {
    const plan = { ...parseBlueprintArgv(['--git']), isHeadless: false };
    expect(shouldPromptForGit(plan)).toBe(false);
  });

  it('does not prompt when --no-git already set', () => {
    const plan = { ...parseBlueprintArgv(['--no-git']), isHeadless: false };
    expect(shouldPromptForGit(plan)).toBe(false);
    expect(plan.runGitForensics).toBe(false);
  });
});
