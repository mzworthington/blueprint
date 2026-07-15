import type { BlueprintCliPlan } from './parseBlueprintArgv.ts';

export interface InteractiveGitChoice {
  /** none = skip forensics; full = enrich blueprints; skip = leave plan unchanged. */
  mode: 'none' | 'full' | 'skip';
  sinceDays?: number;
}

export function applyInteractiveGitChoice(
  plan: BlueprintCliPlan,
  choice: InteractiveGitChoice
): BlueprintCliPlan {
  if (choice.mode === 'skip') {
    return plan;
  }

  if (choice.mode === 'none') {
    return { ...plan, runGitForensics: false };
  }

  return {
    ...plan,
    runGitForensics: true,
    git: {
      ...plan.git,
      sinceDays: choice.sinceDays ?? plan.git.sinceDays,
    },
  };
}

/** True when interactive flow should ask about git (CLI did not already enable via flags). */
export function shouldPromptForGit(plan: BlueprintCliPlan): boolean {
  return !plan.isHeadless && !plan.runGitForensics;
}
