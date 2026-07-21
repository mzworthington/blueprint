import { expect, type Locator, type Page } from '@playwright/test';

const CANVAS_NODE = '.react-flow__node';

/** Wait until the React Flow canvas has at least one node on screen. */
export async function expectCanvasReady(page: Page, timeout = 30_000): Promise<Locator> {
  const nodes = page.locator(CANVAS_NODE);
  await expect(nodes.first()).toBeVisible({ timeout });
  await expect.poll(async () => nodes.count(), { timeout }).toBeGreaterThan(0);
  return nodes;
}

export function zoomableNodes(page: Page): Locator {
  return page.locator(CANVAS_NODE).filter({ hasText: 'Zoom' });
}

export async function drillIntoFirstZoomable(page: Page): Promise<void> {
  const node = zoomableNodes(page).first();
  await expect(node).toBeVisible({ timeout: 30_000 });
  await node.dblclick({ force: true });
  await expectCanvasReady(page);
}
