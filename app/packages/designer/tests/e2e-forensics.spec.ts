import { test, expect, type Page } from '@playwright/test';

const CONTEXT_YAML = `entityRef: e2e
name: E2E Context
version: 1.0.0
level: context
nodes:
  - entityRef: e2e/app
    type: software-system
    name: App System
    x: 100
    y: 100
dependencies: []
`;

const COMPONENTS_YAML = `entityRef: e2e/app/web
name: Web Components
version: 1.0.0
level: component
nodes:
  - entityRef: e2e/app/web/risky
    type: component
    name: Risky Module
    properties:
      filepath: src/risky.ts
      containerId: web
    forensics:
      complexity: 42
      churn: 9
      authorCount: 3
      hotspotScore: 0.92
      classifications:
        - hotspot
      sinceDays: 90
  - entityRef: e2e/app/web/silo
    type: component
    name: Silo Module
    properties:
      filepath: src/silo.ts
      containerId: web
    forensics:
      complexity: 28
      churn: 1
      authorCount: 1
      hotspotScore: 0.18
      classifications:
        - knowledge-silo
      sinceDays: 90
  - entityRef: e2e/app/web/healthy
    type: component
    name: Healthy Module
    properties:
      filepath: src/healthy.ts
      containerId: web
    forensics:
      complexity: 3
      churn: 1
      authorCount: 2
      hotspotScore: 0.04
      classifications: []
      sinceDays: 90
dependencies: []
`;

async function installFakeWorkspacePicker(page: Page) {
  await page.addInitScript(
    ({ contextYaml, componentsYaml }) => {
      const files: Record<string, string> = {
        'context.yaml': contextYaml,
        'web-components.yaml': componentsYaml,
      };

      class FakeFile {
        constructor(private content: string) {}
        async text() {
          return this.content;
        }
      }

      class FakeFileHandle {
        kind = 'file' as const;
        constructor(
          public name: string,
          private content: string
        ) {}
        async getFile() {
          return new FakeFile(this.content);
        }
      }

      class FakeDirHandle {
        kind = 'directory' as const;
        name = 'e2e-forensics-workspace';
        constructor(
          private entries: Record<string, string>,
          private prefix = ''
        ) {}

        async *values() {
          const seen = new Set<string>();
          for (const relative of Object.keys(this.entries)) {
            const rest = this.prefix
              ? relative.slice(this.prefix.length).replace(/^\//, '')
              : relative;
            if (!rest || (this.prefix && !relative.startsWith(this.prefix))) continue;
            const slash = rest.indexOf('/');
            if (slash === -1) {
              yield new FakeFileHandle(rest, this.entries[relative]);
            } else {
              const dirName = rest.slice(0, slash);
              if (seen.has(dirName)) continue;
              seen.add(dirName);
              const childPrefix = this.prefix ? `${this.prefix}/${dirName}` : dirName;
              yield new FakeDirHandle(this.entries, childPrefix);
            }
          }
        }

        async getDirectoryHandle(name: string) {
          const childPrefix = this.prefix ? `${this.prefix}/${name}` : name;
          return new FakeDirHandle(this.entries, childPrefix);
        }

        async getFileHandle(name: string) {
          const key = this.prefix ? `${this.prefix}/${name}` : name;
          const content = this.entries[key];
          if (content === undefined) throw new Error(`Missing file ${key}`);
          return new FakeFileHandle(name, content);
        }

        async queryPermission() {
          return 'granted';
        }
        async requestPermission() {
          return 'granted';
        }
      }

      (
        window as unknown as { showDirectoryPicker: () => Promise<FakeDirHandle> }
      ).showDirectoryPicker = async () => new FakeDirHandle(files);
    },
    { contextYaml: CONTEXT_YAML, componentsYaml: COMPONENTS_YAML }
  );
}

test.describe('Forensics ranking', () => {
  test('ranks hotspots, filters silos, and opens a node on the canvas', async ({ page }) => {
    await installFakeWorkspacePicker(page);
    await page.goto('/workspace');

    await expect(page.getByTitle('Open a local directory workspace')).toBeVisible();
    await page.getByTitle('Open a local directory workspace').click();

    await page.locator('button[aria-label="Toggle Right Panel"]').click();
    await expect(page.locator('#workspace-name-input')).toHaveValue('E2E Context', {
      timeout: 10000,
    });

    await page.getByRole('link', { name: 'Forensics' }).click();
    await expect(page).toHaveURL(/\/forensics$/);
    await expect(page.getByRole('heading', { name: 'Worst offenders' })).toBeVisible();

    await expect(page.getByTestId('offender-list')).toBeVisible();
    const risky = page.getByTestId('offender-row-e2e/app/web/risky');
    const silo = page.getByTestId('offender-row-e2e/app/web/silo');
    const healthy = page.getByTestId('offender-row-e2e/app/web/healthy');

    await expect(risky).toBeVisible();
    await expect(silo).toBeVisible();
    await expect(healthy).toBeVisible();
    await expect(risky).toContainText('#1');
    await expect(risky).toContainText('HOT');
    await expect(page.getByText(/lookback 90d/i)).toBeVisible();

    await page.getByRole('button', { name: /^Hotspots$/i }).click();
    await expect(risky).toBeVisible();
    await expect(silo).toHaveCount(0);
    await expect(healthy).toHaveCount(0);

    await page.getByRole('button', { name: /^Silos$/i }).click();
    await expect(silo).toBeVisible();
    await expect(silo).toContainText('SILO');
    await expect(risky).toHaveCount(0);

    await page.getByRole('button', { name: /^All$/i }).click();
    await expect(risky).toBeVisible();
    await risky.click();

    await expect(page).toHaveURL(/\/workspace\/e2e\/app\/web$/);
    await page.locator('button[aria-label="Toggle Right Panel"]').click();
    await expect(page.getByRole('heading', { name: 'Risky Module' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#component-name-input')).toHaveValue('Risky Module');
  });
});
