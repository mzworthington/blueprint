import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Blueprint E2E Journeys', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Workspace Selection & Visual Panel Collapse', async ({ page }) => {
    await page.goto('/');

    const leftPanelButton = page.locator('button[aria-label="Toggle Left Panel"]');
    const rightPanelButton = page.locator('button[aria-label="Toggle Right Panel"]');

    const leftPanel = page.locator('.glass-panel').first();
    const rightPanel = page.locator('.glass-panel').last();

    // Verify initially collapsed
    await expect(leftPanel).toHaveClass(/w-0/);
    await expect(rightPanel).toHaveClass(/w-0/);

    // Expand Left Panel
    await leftPanelButton.click();
    await expect(leftPanel).not.toHaveClass(/w-0/);

    // Expand Right Panel
    await rightPanelButton.click();
    await expect(rightPanel).not.toHaveClass(/w-0/);

    // Take screenshot of panels expanded
    await page.screenshot({ path: 'screenshots/1-panels-expanded.png' });

    // Collapse Panels again
    await leftPanelButton.click();
    await expect(leftPanel).toHaveClass(/w-0/);

    await rightPanelButton.click();
    await expect(rightPanel).toHaveClass(/w-0/);

    await page.screenshot({ path: 'screenshots/2-panels-collapsed.png' });
  });

  test('Visual C4 Navigation (Zoom In / Zoom Out / URL Routing)', async ({ page }) => {
    await page.goto('/workspace/blueprint-container-level');

    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    await expect(page.locator('#workspace-name-input')).toHaveValue('Blueprint - Container Level');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint-container-level');

    await page.screenshot({ path: 'screenshots/3-container-level.png' });

    const appShellNode = page
      .locator('.react-flow__node', { hasText: 'Application Shell' })
      .first();
    await expect(appShellNode).toBeVisible();

    await appShellNode.dblclick();

    await expect(page.locator('#workspace-name-input')).toHaveValue(
      'Blueprint - Application Shell Components'
    );
    await expect(page.locator('#workspace-slug-input')).toHaveValue(
      'blueprint-application-shell-components'
    );
    expect(page.url()).toContain('/workspace/blueprint-application-shell-components');

    await page.screenshot({ path: 'screenshots/4-zoomed-in-components.png' });

    await page.keyboard.press('Escape');

    await expect(page.locator('#workspace-name-input')).toHaveValue('Blueprint - Container Level');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint-container-level');
    expect(page.url()).toContain('/workspace/blueprint-container-level');

    await page.screenshot({ path: 'screenshots/5-zoomed-back-out.png' });
  });
});
