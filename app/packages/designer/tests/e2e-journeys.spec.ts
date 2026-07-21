import { test, expect } from '@playwright/test';
import {
  expectCanvasNode,
  SANDBOX_CONTAINER_SLUG,
  SANDBOX_CONTEXT_SLUG,
  SANDBOX_CONTEXT_SYSTEM,
} from './helpers/canvas';
import { continueWithSandbox } from './helpers/toolbar';

test.describe('Hierarchy zoom journeys', () => {
  test('Zoom out button and breadcrumb return to parent', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTEXT_SLUG);

    const eshopSystem = await expectCanvasNode(page, SANDBOX_CONTEXT_SYSTEM);
    await eshopSystem.scrollIntoViewIfNeeded();
    await eshopSystem.dblclick();

    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTAINER_SLUG, {
      timeout: 10000,
    });
    await expect(page).toHaveURL(
      new RegExp(`/workspace/${SANDBOX_CONTAINER_SLUG.replace('/', '\\/')}$`)
    );

    await expect(page.getByTitle('Zoom out to parent diagram (Esc)')).toBeVisible();
    await page.getByTitle('Zoom out to parent diagram (Esc)').click();

    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTEXT_SLUG);
    await expect(page).toHaveURL(new RegExp(`/workspace/${SANDBOX_CONTEXT_SLUG}$`));

    await eshopSystem.scrollIntoViewIfNeeded();
    await eshopSystem.dblclick();
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTAINER_SLUG);

    const contextCrumb = page.getByRole('link', { name: /Blueprint Context/i });
    await expect(contextCrumb).toBeVisible();
    await contextCrumb.click();
    await expect(page).toHaveURL(new RegExp(`/workspace/${SANDBOX_CONTEXT_SLUG}$`));
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTEXT_SLUG, {
      timeout: 10000,
    });
  });

  test('Backspace zooms out one level', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    const eshopSystem = await expectCanvasNode(page, SANDBOX_CONTEXT_SYSTEM);
    await eshopSystem.scrollIntoViewIfNeeded();
    await eshopSystem.dblclick();
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTAINER_SLUG, {
      timeout: 10000,
    });

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Backspace');
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTEXT_SLUG);
  });
});
