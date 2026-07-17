import { expect, type Page } from '@playwright/test';

/** Opens the toolbar Open menu and chooses Open Folder. */
export async function openWorkspaceFolder(page: Page) {
  const menuButton = page.getByRole('button', { name: 'Open menu' });
  const folderItem = page.getByRole('menuitem', { name: 'Open Folder' });

  if (!(await folderItem.isVisible())) {
    await menuButton.click();
  }

  await folderItem.click();
}

/** Asserts the workspace folder action is reachable from the toolbar. */
export async function expectWorkspaceFolderActionAvailable(page: Page) {
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
}
