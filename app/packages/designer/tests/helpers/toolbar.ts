import { expect, type Page } from '@playwright/test';

function isBareWorkspaceUrl(page: Page): boolean {
  const { pathname } = new URL(page.url());
  return pathname === '/workspace' || pathname === '/workspace/';
}

/** Dismiss the startup chooser by continuing with the bundled sandbox. */
export async function continueWithSandbox(page: Page) {
  if (!isBareWorkspaceUrl(page)) return;

  const dialog = page.getByTestId('startup-workspace-dialog');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return;
  }
  await page.getByTestId('startup-load-sandbox').click();
  await expect(dialog).toHaveCount(0);
}

/** Opens a workspace folder via the startup chooser when present, else the toolbar. */
export async function openWorkspaceFolder(page: Page) {
  const startupOpen = page.getByTestId('startup-open-directory');
  // Prefer a quick visibility check — do not burn 5s waiting when the chooser is gone.
  if (await startupOpen.isVisible().catch(() => false)) {
    await startupOpen.click();
    return;
  }

  await continueWithSandbox(page);

  const menuButton = page.getByRole('button', { name: 'Open menu' });
  const folderItem = page.getByRole('menuitem', { name: 'Open Folder' });

  if (!(await folderItem.isVisible())) {
    await menuButton.click();
  }

  await folderItem.click();
}

/** Asserts the workspace folder action is reachable (startup chooser or toolbar). */
export async function expectWorkspaceFolderActionAvailable(page: Page) {
  const startupOpen = page.getByTestId('startup-open-directory');
  if (await startupOpen.isVisible().catch(() => false)) {
    await expect(startupOpen).toBeVisible();
    return;
  }

  await continueWithSandbox(page);
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
}

/** Opens Import Mermaid from the toolbar Open menu (after sandbox is loaded). */
export async function openImportMermaid(page: Page) {
  await continueWithSandbox(page);

  const menuButton = page.getByRole('button', { name: 'Open menu' });
  const importItem = page.getByRole('menuitem', { name: 'Import Mermaid' });

  if (!(await importItem.isVisible())) {
    await menuButton.click();
  }

  await importItem.click();
  await expect(page.getByRole('dialog', { name: /Import Mermaid/i })).toBeVisible();
}
