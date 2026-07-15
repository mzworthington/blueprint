import { test, expect, type Page } from '@playwright/test';

const DISK_CONTEXT_YAML = `entityRef: e2e
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

const DISK_CONTAINERS_YAML = `entityRef: e2e/app
name: App Containers
version: 1.0.0
level: container
nodes:
  - entityRef: e2e/app/web
    type: container
    name: Web Service
    x: 120
    y: 80
dependencies: []
`;

async function installFakeWorkspacePicker(page: Page) {
  await page.addInitScript(
    ({ contextYaml, containersYaml }) => {
      const files: Record<string, string> = {
        'context.yaml': contextYaml,
        'app/containers.yaml': containersYaml,
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
        name = 'e2e-workspace';
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
    { contextYaml: DISK_CONTEXT_YAML, containersYaml: DISK_CONTAINERS_YAML }
  );
}

async function seedStaleDraft(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('BlueprintDatabase');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['workingNodes', 'workingDependencies'], 'readwrite');
        const nodes = tx.objectStore('workingNodes');
        const deps = tx.objectStore('workingDependencies');
        nodes.put({
          entityRef: 'e2e/orphan',
          id: 'orphan',
          systemId: 'e2e',
          type: 'microservice',
          name: 'Stale Orphan',
          properties: {},
          filePath: 'context.yaml',
        });
        nodes.put({
          entityRef: 'e2e/app',
          id: 'app',
          systemId: 'e2e',
          type: 'software-system',
          name: 'App System',
          properties: {},
          filePath: 'context.yaml',
        });
        deps.put({
          id: 'e2e/orphan->e2e/app',
          fromRef: 'e2e/orphan',
          toRef: 'e2e/app',
          type: 'direct-call',
          description: 'Part of product system',
          filePath: 'context.yaml',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('workingNodes')) {
          db.createObjectStore('workingNodes', { keyPath: 'entityRef' });
        }
        if (!db.objectStoreNames.contains('workingDependencies')) {
          db.createObjectStore('workingDependencies', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('originalNodes')) {
          db.createObjectStore('originalNodes', { keyPath: 'entityRef' });
        }
        if (!db.objectStoreNames.contains('originalDependencies')) {
          db.createObjectStore('originalDependencies', { keyPath: 'id' });
        }
      };
    });
  });
}

test.describe('Hierarchy zoom journeys', () => {
  test('Zoom out button and breadcrumb return to parent', async ({ page }) => {
    await page.goto('/workspace/blueprint');
    await page.locator('button[aria-label="Toggle Right Panel"]').click();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');

    // Match the proven Visual C4 locator style; App System can sit far on the canvas.
    const appSystem = page.locator('.react-flow__node', { hasText: 'App System' }).first();
    await expect(appSystem).toBeVisible({ timeout: 15000 });
    await appSystem.scrollIntoViewIfNeeded();
    await appSystem.dblclick();

    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app', {
      timeout: 10000,
    });
    await expect(page).toHaveURL(/\/workspace\/blueprint\/app/);

    await expect(page.getByTitle('Zoom out to parent diagram (Esc)')).toBeVisible();
    await page.getByTitle('Zoom out to parent diagram (Esc)').click();

    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
    await expect(page).toHaveURL(/\/workspace\/blueprint$/);

    await appSystem.scrollIntoViewIfNeeded();
    await appSystem.dblclick();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app');

    const contextCrumb = page.locator('a[href="/workspace/blueprint"]').first();
    await expect(contextCrumb).toBeVisible();
    await contextCrumb.click();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
  });

  test('Backspace zooms out one level', async ({ page }) => {
    await page.goto('/workspace/blueprint');
    await page.locator('button[aria-label="Toggle Right Panel"]').click();

    const appSystem = page.locator('.react-flow__node', { hasText: 'App System' }).first();
    await expect(appSystem).toBeVisible({ timeout: 15000 });
    await appSystem.scrollIntoViewIfNeeded();
    await appSystem.dblclick();
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint/app', {
      timeout: 10000,
    });

    await page.keyboard.press('Backspace');
    await expect(page.locator('#workspace-slug-input')).toHaveValue('blueprint');
  });
});

test.describe('Disk-first workspace open', () => {
  test('discards stale IndexedDB draft when opening folder', async ({ page }) => {
    await installFakeWorkspacePicker(page);
    await page.goto('/');

    // Wait for app + Dexie to initialize, then plant a polluted draft.
    await expect(page.getByTitle('Open a local directory workspace')).toBeVisible();
    await seedStaleDraft(page);

    await page.getByTitle('Open a local directory workspace').click();

    await expect(page.getByText('Loaded files from disk')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/stale local draft/i)).toBeVisible();

    await page.locator('button[aria-label="Toggle Right Panel"]').click();
    await expect(page.locator('#workspace-name-input')).toHaveValue('E2E Context');

    await expect(page.locator('.react-flow__node', { hasText: 'App System' })).toBeVisible();
    await expect(page.locator('.react-flow__node', { hasText: 'Stale Orphan' })).toHaveCount(0);
  });
});
