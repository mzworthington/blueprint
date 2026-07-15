import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Blueprint E2E Journeys', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.join(process.cwd(), '../../../docs/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Workspace Selection & Visual Panel Collapse', async ({ page }) => {
    await page.goto('/workspace');

    const leftPanelButton = page.locator('button[aria-label="Toggle Left Panel"]');
    const rightPanelButton = page.locator('button[aria-label="Toggle Right Panel"]');

    const leftPanel = page.getByTestId('left-panel');
    const rightPanel = page.getByTestId('right-panel');

    await expect(leftPanel).toHaveClass(/w-0/);
    await expect(rightPanel).toHaveClass(/w-0/);

    await leftPanelButton.click();
    await expect(leftPanel).not.toHaveClass(/w-0/);

    await rightPanelButton.click();
    await expect(rightPanel).not.toHaveClass(/w-0/);

    await page.screenshot({ path: '../../../docs/screenshots/1-panels-expanded.png' });

    await leftPanelButton.click();
    await expect(leftPanel).toHaveClass(/w-0/);

    await rightPanelButton.click();
    await expect(rightPanel).toHaveClass(/w-0/);

    await page.screenshot({ path: '../../../docs/screenshots/2-panels-collapsed.png' });
  });

  test('Visual C4 Navigation (Zoom In / Zoom Out / URL Routing)', async ({ page }) => {
    await page.goto('/workspace/blueprint');

    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    await expect(page.locator('#workspace-name-input')).toHaveValue('Blueprint Context');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
    expect(page.url()).toContain('/workspace/blueprint');

    await page.screenshot({ path: '../../../docs/screenshots/3-container-level.png' });

    const appSystem = page.locator('.react-flow__node', { hasText: 'App System' }).first();
    await expect(appSystem).toBeVisible();
    await appSystem.dblclick();

    await expect(page.locator('#workspace-name-input')).toHaveValue('App Containers');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app');
    expect(page.url()).toContain('/workspace/blueprint/app');

    await page.screenshot({ path: '../../../docs/screenshots/4-zoomed-in-components.png' });

    const appService = page.locator('.react-flow__node', { hasText: 'App Service' }).first();
    await expect(appService).toBeVisible();
    await appService.dblclick();

    await expect(page.locator('#workspace-name-input')).toHaveValue('App Service Components');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app/app');
    expect(page.url()).toContain('/workspace/blueprint/app/app');

    await page.keyboard.press('Escape');

    await expect(page.locator('#workspace-name-input')).toHaveValue('App Containers');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app');
    expect(page.url()).toContain('/workspace/blueprint/app');

    await page.keyboard.press('Escape');

    await expect(page.locator('#workspace-name-input')).toHaveValue('Blueprint Context');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
    expect(page.url()).toContain('/workspace/blueprint');

    await page.screenshot({ path: '../../../docs/screenshots/5-zoomed-back-out.png' });
  });
});
