import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  expectCanvasNode,
  SANDBOX_COMPONENT_NAME,
  SANDBOX_COMPONENT_SLUG,
  SANDBOX_CONTAINER_NAME,
  SANDBOX_CONTAINER_NODE,
  SANDBOX_CONTAINER_SLUG,
  SANDBOX_CONTEXT_SLUG,
  SANDBOX_CONTEXT_SYSTEM,
} from './helpers/canvas';
import { continueWithSandbox, openImportMermaid } from './helpers/toolbar';

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

    await page.waitForTimeout(500);
    await page.screenshot({ path: '../../../docs/screenshots/6-startup-chooser.png' });
  });

  test('Workspace Selection & Visual Panel Collapse', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/workspace');
    await continueWithSandbox(page);
    await expect(page.getByTestId('startup-workspace-dialog')).toHaveCount(0);

    const leftPanelButton = page.locator('button[aria-label="Toggle Left Panel"]');
    const rightPanelButton = page.locator('button[aria-label="Toggle Right Panel"]');

    const leftPanel = page.getByTestId('left-panel');
    const rightPanel = page.getByTestId('right-panel');

    await expect(leftPanel).toHaveClass(/w-0/);
    await expect(rightPanel).not.toHaveClass(/w-0/);

    await leftPanelButton.click();
    await expect(leftPanel).not.toHaveClass(/w-0/);

    await rightPanelButton.click();
    await expect(rightPanel).toHaveClass(/w-0/);

    await page.waitForTimeout(500);
    await page.screenshot({ path: '../../../docs/screenshots/1-panels-expanded.png' });

    await leftPanelButton.click();
    await expect(leftPanel).toHaveClass(/w-0/);

    await rightPanelButton.click();
    await expect(rightPanel).not.toHaveClass(/w-0/);

    await page.waitForTimeout(500);
    await page.screenshot({ path: '../../../docs/screenshots/2-panels-collapsed.png' });
  });

  test('Visual C4 Navigation (Zoom In / Zoom Out / URL Routing)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    await expect(page.locator('#workspace-name-input')).toHaveValue('Blueprint Context');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
    expect(page.url()).toContain('/workspace/blueprint');

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../../../docs/screenshots/3-container-level.png' });

    const eshopSystem = await expectCanvasNode(page, SANDBOX_CONTEXT_SYSTEM);
    await eshopSystem.dblclick();

    await expect(page.locator('#workspace-name-input')).toHaveValue(SANDBOX_CONTAINER_NAME);
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTAINER_SLUG);
    expect(page.url()).toContain(`/workspace/${SANDBOX_CONTAINER_SLUG}`);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../../../docs/screenshots/4-zoomed-in-components.png' });

    const webappService = await expectCanvasNode(page, SANDBOX_CONTAINER_NODE);
    await webappService.dblclick();

    await expect(page.locator('#workspace-name-input')).toHaveValue(SANDBOX_COMPONENT_NAME);
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_COMPONENT_SLUG);
    expect(page.url()).toContain(`/workspace/${SANDBOX_COMPONENT_SLUG}`);

    // Blur inputs so Escape is handled as zoom-out, not ignored while typing.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');

    await expect(page.locator('#workspace-name-input')).toHaveValue(SANDBOX_CONTAINER_NAME);
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTAINER_SLUG);
    expect(page.url()).toContain(`/workspace/${SANDBOX_CONTAINER_SLUG}`);

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');

    await expect(page.locator('#workspace-name-input')).toHaveValue('Blueprint Context');
    await expect(page.locator('#workspace-slug-input')).toHaveValue(SANDBOX_CONTEXT_SLUG);
    expect(page.url()).toContain(`/workspace/${SANDBOX_CONTEXT_SLUG}`);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../../../docs/screenshots/5-zoomed-back-out.png' });
  });

  test('Import Mermaid merge preview', async ({ page }) => {
    await page.goto('/workspace');
    await page.getByTestId('startup-import-mermaid').click();

    const dialog = page.getByTestId('import-mermaid-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const textarea = dialog.locator('textarea');
    await textarea.fill(SAMPLE_MERMAID);

    await expect(dialog.getByText(/Additions/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/\+ API Gateway/)).toBeVisible();

    await page.waitForTimeout(800);
    await page.screenshot({ path: '../../../docs/screenshots/7-import-mermaid.png' });
  });

  test('Workspace display & external dependencies', async ({ page }) => {
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);

    // Ensure right panel is open (default) and left is expanded for a fuller shot.
    const leftPanel = page.getByTestId('left-panel');
    if (await leftPanel.evaluate(el => el.className.includes('w-0'))) {
      await page.locator('button[aria-label="Toggle Left Panel"]').click();
    }
    await expect(leftPanel).not.toHaveClass(/w-0/);

    const display = page.getByTestId('workspace-display-controls');
    await expect(display).toBeVisible();
    await display.scrollIntoViewIfNeeded();

    await expect(page.getByTestId('toggle-show-externals')).toBeVisible();
    await expect(page.getByTestId('toggle-show-selected-dependencies-only')).toBeVisible();
    await expect(page.getByText(/External Dependencies/i)).toBeVisible();

    await page.waitForTimeout(500);
    await page.screenshot({ path: '../../../docs/screenshots/8-workspace-display.png' });
  });

  test('Import Mermaid from Open menu after sandbox load', async ({ page }) => {
    await page.goto('/workspace');
    await continueWithSandbox(page);
    await openImportMermaid(page);
    await expect(page.getByTestId('import-mermaid-dialog')).toBeVisible();
  });

  test('Tablet viewport: compact breadcrumbs', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);

    await expect(page.getByLabel('Open diagram location menu')).toBeVisible();
    // Below lg (1024px): compact breadcrumbs; desktop edge rails from sm (640px) up.
    await expect(page.locator('button[aria-label="Toggle Left Panel"]')).toBeVisible();

    await page.locator('button[aria-label="Toggle Left Panel"]').click();
    await expect(page.getByTestId('left-panel')).not.toHaveClass(/w-0/);
  });

  test('Phone viewport: mobile panel toggles', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/workspace/blueprint');
    await continueWithSandbox(page);

    await expect(page.getByLabel('Open diagram location menu')).toBeVisible();
    // Edge rails stay in the DOM but are hidden below the sm (640px) breakpoint.
    await expect(page.locator('button[aria-label="Toggle Left Panel"]')).toBeHidden();

    // Mobile chips only render when both panels are collapsed; close the open props sheet first.
    await page.getByLabel('Close Properties Panel').click();
    await expect(page.getByTestId('right-panel')).toHaveClass(/w-0/);

    const schemaChip = page.getByRole('button', { name: 'Open Schema Explorer' });
    const propsChip = page.getByRole('button', { name: 'Open Properties Panel' });
    await expect(schemaChip).toBeVisible();
    await expect(propsChip).toBeVisible();

    await schemaChip.click();
    await expect(page.getByTestId('left-panel')).not.toHaveClass(/w-0/);
    await expect(schemaChip).toBeHidden();

    await page.getByLabel('Close Schema Explorer').click();
    await expect(page.getByTestId('left-panel')).toHaveClass(/w-0/);

    await page.getByRole('button', { name: 'Open Properties Panel' }).click();
    await expect(page.getByTestId('right-panel')).not.toHaveClass(/w-0/);
  });
});
