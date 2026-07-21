import { test, expect } from '@playwright/test';
import { loadSandbox } from './helpers/workspace';

test.describe('Forensics page', () => {
  test('renders the ranking shell', async ({ page }) => {
    await page.goto('/forensics');

    await expect(page).toHaveURL(/\/forensics$/);
    await expect(page.getByRole('heading', { name: 'Worst offenders' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search offenders' })).toBeVisible();
  });

  test('lists offenders when opened from a loaded workspace', async ({ page }) => {
    await loadSandbox(page);
    await page.getByRole('link', { name: 'Forensics' }).click();

    await expect(page).toHaveURL(/\/forensics$/);
    await expect(page.getByTestId('offender-list')).toBeVisible();
  });
});
