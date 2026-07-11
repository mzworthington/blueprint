import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Blueprint E2E Journeys', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.join(process.cwd(), '../../docs/screenshots');
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
    await page.screenshot({ path: '../../docs/screenshots/1-panels-expanded.png' });

    // Collapse Panels again
    await leftPanelButton.click();
    await expect(leftPanel).toHaveClass(/w-0/);

    await rightPanelButton.click();
    await expect(rightPanel).toHaveClass(/w-0/);

    await page.screenshot({ path: '../../docs/screenshots/2-panels-collapsed.png' });
  });

  test('Visual C4 Navigation (Zoom In / Zoom Out / URL Routing)', async ({ page }) => {
    await page.goto('/workspace/testproject-container-level');

    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    await expect(page.locator('#workspace-name-input')).toHaveValue(
      'TestProject - Container Level'
    );
    await expect(page.locator('#workspace-slug-input')).toHaveValue('testproject-container-level');

    await page.screenshot({ path: '../../docs/screenshots/3-container-level.png' });

    const appShellNode = page
      .locator('.react-flow__node', { hasText: 'Application Shell' })
      .first();
    await expect(appShellNode).toBeVisible();

    await appShellNode.dblclick();

    await expect(page.locator('#workspace-name-input')).toHaveValue(
      'TestProject - Application Shell Components'
    );
    await expect(page.locator('#workspace-slug-input')).toHaveValue(
      'testproject-application-shell-components'
    );
    expect(page.url()).toContain('/workspace/testproject-application-shell-components');

    await page.screenshot({ path: '../../docs/screenshots/4-zoomed-in-components.png' });

    await page.keyboard.press('Escape');

    await expect(page.locator('#workspace-name-input')).toHaveValue(
      'TestProject - Container Level'
    );
    await expect(page.locator('#workspace-slug-input')).toHaveValue('testproject-container-level');
    expect(page.url()).toContain('/workspace/testproject-container-level');

    await page.screenshot({ path: '../../docs/screenshots/5-zoomed-back-out.png' });
  });
});
