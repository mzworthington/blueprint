import { expect, type Locator, type Page } from '@playwright/test';

const DIAGRAM_LOADING = '[role="status"][aria-busy="true"]';

export async function waitForDiagramIdle(page: Page) {
  await expect(page.locator(DIAGRAM_LOADING)).toBeHidden({ timeout: 60_000 });
}

export async function expectCanvasReady(page: Page): Promise<Locator> {
  await waitForDiagramIdle(page);
  const nodes = page.locator('.react-flow__node');
  await expect(nodes.first()).toBeVisible({ timeout: 30_000 });
  return nodes;
}

export async function drillIntoFirstZoomable(page: Page, nodeName = 'EShop System') {
  await expectCanvasReady(page);

  const named = page.getByRole('button', { name: `Zoom into ${nodeName}` });
  const button = (await named.count()) > 0 ? named : page.getByTestId('zoom-in-button').first();

  await expect(async () => {
    await button.click();
  }).toPass({ timeout: 30_000 });

  await expectCanvasReady(page);
}
