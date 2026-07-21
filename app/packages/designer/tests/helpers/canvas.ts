import { expect, type Locator, type Page } from '@playwright/test';

const CANVAS_NODE = '.react-flow__node';
const DIAGRAM_LOADING_OVERLAY = '[role="status"][aria-busy="true"]';

/** Wait until diagram layout / load overlay is dismissed. */
export async function waitForDiagramIdle(page: Page, timeout = 60_000): Promise<void> {
  await expect(page.locator(DIAGRAM_LOADING_OVERLAY)).toBeHidden({ timeout });
}

/** Wait until the React Flow canvas has at least one node on screen. */
export async function expectCanvasReady(page: Page, timeout = 30_000): Promise<Locator> {
  await waitForDiagramIdle(page, timeout);
  const nodes = page.locator(CANVAS_NODE);
  await expect(nodes.first()).toBeVisible({ timeout });
  await expect.poll(async () => nodes.count(), { timeout }).toBeGreaterThan(0);
  return nodes;
}

export function zoomableNodes(page: Page): Locator {
  return page.locator(CANVAS_NODE).filter({ has: page.getByRole('button', { name: 'Zoom' }) });
}

/** Drill into a child diagram via the node's Zoom button (stable vs dblclick on overlapping nodes). */
export async function drillIntoFirstZoomable(page: Page): Promise<void> {
  await waitForDiagramIdle(page);
  const node = zoomableNodes(page).filter({ hasText: 'EShop System' }).first();
  const fallback = zoomableNodes(page).first();
  const target = (await node.count()) > 0 ? node : fallback;
  await expect(target).toBeVisible({ timeout: 30_000 });
  await target.getByRole('button', { name: 'Zoom' }).click();
  await waitForDiagramIdle(page);
  await expectCanvasReady(page);
}
