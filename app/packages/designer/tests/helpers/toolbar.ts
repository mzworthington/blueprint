import { expect, type Page } from '@playwright/test';

function isBareWorkspaceUrl(page: Page): boolean {
  const { pathname } = new URL(page.url());
  return pathname === '/workspace' || pathname === '/workspace/';
}

/** Dismiss the startup chooser by continuing with the bundled sandbox. */
export async function continueWithSandbox(page: Page) {
  const dialog = page.getByTestId('startup-workspace-dialog');
  // Deep links usually skip the chooser, but still dismiss if it is visible.
  if (!(await dialog.isVisible().catch(() => false))) {
    if (!isBareWorkspaceUrl(page)) return;
    try {
      await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      return;
    }
  }
  await page.getByTestId('startup-load-sandbox').click();
  await expect(dialog).toHaveCount(0);
}

async function openOverflowMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: 'More actions' });
  await menuButton.click();
}

/** Opens a workspace folder via the startup chooser when present, else the toolbar overflow. */
export async function openWorkspaceFolder(page: Page) {
  const startupOpen = page.getByTestId('startup-open-directory');
  // Prefer a quick visibility check — do not burn 5s waiting when the chooser is gone.
  if (await startupOpen.isVisible().catch(() => false)) {
    await startupOpen.click();
    return;
  }

  await continueWithSandbox(page);

  const folderItem = page.getByRole('menuitem', { name: 'Open Folder' });

  if (!(await folderItem.isVisible())) {
    await openOverflowMenu(page);
  }

  await expect(folderItem).toBeVisible();
  await folderItem.click();
}

/** Opens Import Mermaid from the toolbar overflow menu (after sandbox is loaded). */
export async function openImportMermaid(page: Page) {
  await continueWithSandbox(page);

  const importItem = page.getByRole('menuitem', { name: 'Import Mermaid' });

  if (!(await importItem.isVisible())) {
    await openOverflowMenu(page);
  }

  await expect(importItem).toBeVisible();
  await importItem.click();
  await expect(page.getByRole('dialog', { name: /Import Mermaid/i })).toBeVisible();
}
