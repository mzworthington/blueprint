import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDocs = path.resolve(__dirname, '../../../docs');
const repoSchemas = path.resolve(__dirname, '../../../schemas');
const base = process.env.VITE_BASE || '/';

function resolveBuildId(): string {
  const fromCi = process.env.GITHUB_SHA?.slice(0, 12);
  if (fromCi) return fromCi;
  if (process.env.VITE_APP_BUILD_ID) return process.env.VITE_APP_BUILD_ID;
  return `local-${Date.now().toString(36)}`;
}

const appBuildId = resolveBuildId();
const appPackageVersion = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
  .version as string;

/** Inject `<meta name="app-build-id">` for deploy-time version checks (index.html fetch). */
function injectBuildIdMeta(): Plugin {
  return {
    name: 'inject-build-id-meta',
    transformIndexHtml(html) {
      if (html.includes('name="app-build-id"')) return html;
      return html.replace(
        '<head>',
        `<head>\n    <meta name="app-build-id" content="${appBuildId}" />`
      );
    },
  };
}

/** Copy docs screenshots (and other static assets) into public for production & dev. */
function syncDocsAssets(): Plugin {
  const dest = path.resolve(__dirname, 'public/docs-assets');

  const sync = () => {
    const screenshots = path.join(repoDocs, 'screenshots');
    if (!fs.existsSync(screenshots)) return;
    fs.mkdirSync(path.join(dest, 'screenshots'), { recursive: true });
    for (const name of fs.readdirSync(screenshots)) {
      const from = path.join(screenshots, name);
      if (fs.statSync(from).isFile()) {
        fs.copyFileSync(from, path.join(dest, 'screenshots', name));
      }
    }
  };

  return {
    name: 'sync-docs-assets',
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}

/**
 * Publish JSON Schema for external IDE validation under /schemas/v{n}/ and /schemas/latest/.
 * Source of truth: repo `schemas/` (generated from Zod in @blueprint/core).
 */
function syncJsonSchemas(): Plugin {
  const destRoot = path.resolve(__dirname, 'public/schemas');

  const sync = () => {
    if (!fs.existsSync(repoSchemas)) return;
    const channels = fs
      .readdirSync(repoSchemas, { withFileTypes: true })
      .filter(d => d.isDirectory() && (d.name === 'latest' || /^v\d+$/.test(d.name)))
      .map(d => d.name);

    for (const channel of channels) {
      const src = path.join(repoSchemas, channel, 'blueprint.schema.json');
      if (!fs.existsSync(src)) continue;
      const destDir = path.join(destRoot, channel);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'blueprint.schema.json'));
    }
  };

  return {
    name: 'sync-json-schemas',
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
    __APP_PACKAGE_VERSION__: JSON.stringify(appPackageVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    syncDocsAssets(),
    syncJsonSchemas(),
    injectBuildIdMeta(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/apple-touch-icon-dark.png'],
      manifest: {
        name: 'Blueprint',
        short_name: 'Blueprint',
        description:
          'Maps your codebase as an interactive C4-style diagram — explore systems, containers, and components.',
        theme_color: '#040914',
        background_color: '#040914',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/pwa-192x192-dark.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512-dark.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512-dark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell + hashed bundles. Skip docs screenshots (large, non-critical offline).
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webmanifest,png}'],
        globIgnores: ['**/docs-assets/**', '**/schemas/**'],
        navigateFallback: 'index.html',
        // Keep /schemas/* as real JSON (IDE validators + browser), not the SPA shell.
        navigateFallbackDenylist: [/^\/schemas\//],
        cleanupOutdatedCaches: true,
        // Bundled sandbox blueprints inflate the main chunk (~17MB); allow Workbox to precache it.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@docs': repoDocs,
    },
  },
  server: {
    fs: {
      allow: ['../../..'],
    },
  },
  test: {
    name: 'app',
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura', 'json-summary', 'json'],
      include: ['src/**/*'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/setupTests.ts'],
    },
  },
} as any);
