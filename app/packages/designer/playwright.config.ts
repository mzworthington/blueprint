import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : '50%',
  reporter: [['list'], ['html']],
  use: {
    baseURL: 'http://localhost:5188',
    trace: 'on-first-retry',
    /** Full-page shot attached to the HTML report for every test. */
    screenshot: 'on',
    /** WebM per test kept when the run fails (also in CI artifacts). */
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2880, height: 1864 },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev --port 5188',
    url: 'http://localhost:5188',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
