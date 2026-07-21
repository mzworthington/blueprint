import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { drillIntoFirstZoomable, expectCanvasReady, zoomableNodes } from './helpers/canvas';
import { blurFocusedElement, loadSandbox, workspaceSlug } from './helpers/workspace';
import { openImportMermaid } from './helpers/toolbar';

const SAMPLE_MERMAID = `flowchart TD
  Gateway["API Gateway"] --> Orders["Order Service"]
  Orders --> Db[("Orders DB")]
`;

test.describe('Blueprint E2E Journeys', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.join(process.cwd(), '../../../docs/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Startup workspace chooser', async ({ page }) => {
    await page.goto('/workspace');

    const dialog = page.getByTestId('startup-workspace-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('startup-load-sandbox')).toBeVisible();
    await expect(page.getByTestId('startup-open-directory')).toBeVisible();
    await expect(page.getByTestId('startup-import-mermaid')).toBeVisible();
    await page.screenshot({ path: '../../../docs/screenshots/6-startup-chooser.png' });
  });

  test('Sandbox loads a diagram on the canvas', async ({ page }) => {
    await loadSandbox(page);
    await expect(page.locator('#workspace-slug-input')).not.toHaveValue('');
    await expect(page.locator('#workspace-name-input')).not.toHaveValue('');
  });

  test('Workspace panel toggles', async ({ page }) => {
    await loadSandbox(page);

    const leftPanelButton = page.locator('button[aria-label="Toggle Left Panel"]');
    const rightPanelButton = page.locator('button[aria-label="Toggle Right Panel"]');
    const leftPanel = page.getByTestId('left-panel');
    const rightPanel = page.getByTestId('right-panel');

    await leftPanelButton.click();
    await expect(leftPanel).not.toHaveClass(/w-0/);
    await rightPanelButton.click();
    await expect(rightPanel).toHaveClass(/w-0/);
    await page.screenshot({ path: '../../../docs/screenshots/1-panels-expanded.png' });

    await leftPanelButton.click();
    await expect(leftPanel).toHaveClass(/w-0/);
    await rightPanelButton.click();
    await expect(rightPanel).not.toHaveClass(/w-0/);
    await page.screenshot({ path: '../../../docs/screenshots/2-panels-collapsed.png' });
  });

  test('Drill-down and zoom-out smoke', async ({ page }) => {
    test.setTimeout(90_000);
    await loadSandbox(page);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    const rootSlug = await workspaceSlug(page);
    expect(rootSlug.length).toBeGreaterThan(0);
    await page.screenshot({ path: '../../../docs/screenshots/3-container-level.png' });

    await drillIntoFirstZoomable(page);
    const childSlug = await workspaceSlug(page);
    expect(childSlug).not.toBe(rootSlug);

    if ((await zoomableNodes(page).count()) > 0) {
      await drillIntoFirstZoomable(page);
      expect(await workspaceSlug(page)).not.toBe(childSlug);
    }
    await page.screenshot({ path: '../../../docs/screenshots/4-zoomed-in-components.png' });

    await blurFocusedElement(page);
    for (let depth = 0; depth < 3 && (await workspaceSlug(page)) !== rootSlug; depth += 1) {
      await page.keyboard.press('Escape');
      await expectCanvasReady(page);
    }
    expect(await workspaceSlug(page)).toBe(rootSlug);
    await page.screenshot({ path: '../../../docs/screenshots/5-zoomed-back-out.png' });
  });

  test('Zoom out button returns to parent diagram', async ({ page }) => {
    await loadSandbox(page);
    const rootSlug = await workspaceSlug(page);
    await drillIntoFirstZoomable(page);

    await page.getByTitle('Zoom out to parent diagram (Esc)').click();
    await expectCanvasReady(page);
    expect(await workspaceSlug(page)).toBe(rootSlug);
  });

  test('Backspace zooms out one level', async ({ page }) => {
    await loadSandbox(page);
    const rootSlug = await workspaceSlug(page);
    await drillIntoFirstZoomable(page);

    await blurFocusedElement(page);
    await page.keyboard.press('Backspace');
    await expectCanvasReady(page);
    expect(await workspaceSlug(page)).toBe(rootSlug);
  });

  test('Import Mermaid merge preview', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('startup-import-mermaid').click();

    const dialog = page.getByTestId('import-mermaid-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.locator('textarea').fill(SAMPLE_MERMAID);
    await expect(dialog.getByText(/Additions/i)).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: '../../../docs/screenshots/7-import-mermaid.png' });
  });

  test('Workspace display controls render', async ({ page }) => {
    await loadSandbox(page);

    const leftPanel = page.getByTestId('left-panel');
    if (await leftPanel.evaluate(el => el.className.includes('w-0'))) {
      await page.locator('button[aria-label="Toggle Left Panel"]').click();
    }

    await expect(page.getByTestId('workspace-display-controls')).toBeVisible();
    await expect(page.getByTestId('toggle-show-externals')).toBeVisible();
    await page.screenshot({ path: '../../../docs/screenshots/8-workspace-display.png' });
  });

  test('Import Mermaid from toolbar menu', async ({ page }) => {
    await page.goto('/workspace');
    await openImportMermaid(page);
    await expect(page.getByTestId('import-mermaid-dialog')).toBeVisible();
  });

  test('Tablet viewport: compact breadcrumbs', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loadSandbox(page);
    await expect(page.getByLabel('Open diagram location menu')).toBeVisible();
  });

  test('Phone viewport: mobile panel toggles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadSandbox(page);

    await expect(page.getByLabel('Open diagram location menu')).toBeVisible();
    await page.getByLabel('Close Properties Panel').click();

    const schemaChip = page.getByRole('button', { name: 'Open Schema Explorer' });
    await expect(schemaChip).toBeVisible();
    await schemaChip.click();
    await expect(page.getByTestId('left-panel')).not.toHaveClass(/w-0/);
  });
});
