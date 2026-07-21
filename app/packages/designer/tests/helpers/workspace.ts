import type { Page } from '@playwright/test';
import { continueWithSandbox } from './toolbar';
import { expectCanvasReady } from './canvas';

/** Open the bundled sandbox and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/blueprint') {
  await page.goto(path);
  await continueWithSandbox(page);
  await expectCanvasReady(page);
}

export async function workspaceSlug(page: Page): Promise<string> {
  return page.locator('#workspace-slug-input').inputValue();
}

export async function blurFocusedElement(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}
