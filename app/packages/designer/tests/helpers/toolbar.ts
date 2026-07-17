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

/** Opens the toolbar Open menu and chooses Open Folder. */
export async function openWorkspaceFolder(page: Page) {
  await continueWithSandbox(page);

  const menuButton = page.getByRole('button', { name: 'Open menu' });
  const folderItem = page.getByRole('menuitem', { name: 'Open Folder' });

  if (!(await folderItem.isVisible())) {
    await menuButton.click();
  }

  await folderItem.click();
}

/** Asserts the workspace folder action is reachable from the toolbar. */
export async function expectWorkspaceFolderActionAvailable(page: Page) {
  await continueWithSandbox(page);
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
}
