import { test, expect } from '@playwright/test';
import { continueWithSandbox } from './helpers/toolbar';

test.describe('Hierarchy zoom journeys', () => {
  test('Zoom out button and breadcrumb return to parent', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');

    // Match the proven Visual C4 locator style; App System can sit far on the canvas.
    const appSystem = page.locator('.react-flow__node', { hasText: 'App System' }).first();
    await expect(appSystem).toBeVisible({ timeout: 15000 });
    await appSystem.scrollIntoViewIfNeeded();
    await appSystem.dblclick();

    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app', {
      timeout: 10000,
    });
    await expect(page).toHaveURL(/\/workspace\/blueprint\/app/);

    await expect(page.getByTitle('Zoom out to parent diagram (Esc)')).toBeVisible();
    await page.getByTitle('Zoom out to parent diagram (Esc)').click();

    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
    await expect(page).toHaveURL(/\/workspace\/blueprint$/);

    await appSystem.scrollIntoViewIfNeeded();
    await appSystem.dblclick();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app');

    const contextCrumb = page.getByRole('link', { name: /Blueprint Context/i });
    await expect(contextCrumb).toBeVisible();
    await contextCrumb.click();
    await expect(page).toHaveURL(/\/workspace\/blueprint$/);
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint', {
      timeout: 10000,
    });
  });

  test('Backspace zooms out one level', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    const appSystem = page.locator('.react-flow__node', { hasText: 'App System' }).first();
    await expect(appSystem).toBeVisible({ timeout: 15000 });
    await appSystem.scrollIntoViewIfNeeded();
    await appSystem.dblclick();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app', {
      timeout: 10000,
    });

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Backspace');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
  });
});
