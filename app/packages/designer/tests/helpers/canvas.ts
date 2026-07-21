import { expect, type Page } from '@playwright/test';

/** Bundled sandbox context diagram: top-level system with a container drill-down. */
export const SANDBOX_CONTEXT_SYSTEM = 'EShop System';
export const SANDBOX_CONTEXT_SLUG = 'blueprint';
export const SANDBOX_CONTAINER_SLUG = 'blueprint/eshop';
export const SANDBOX_CONTAINER_NAME = 'Eshop Containers';
export const SANDBOX_COMPONENT_SLUG = 'blueprint/eshop/webapp';
export const SANDBOX_COMPONENT_NAME = 'WebApp Service Components';
export const SANDBOX_CONTAINER_NODE = 'WebApp Service';

export async function expectCanvasNode(page: Page, label: string, timeout = 15_000) {
  const node = page.locator('.react-flow__node', { hasText: label }).first();
  await expect(node).toBeVisible({ timeout });
  return node;
}
