import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDocs = path.resolve(__dirname, '../../../docs');
const base = process.env.VITE_BASE || '/';

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

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    syncDocsAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/apple-touch-icon.png'],
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
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell + hashed bundles. Skip docs screenshots (large, non-critical offline).
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webmanifest,png}'],
        globIgnores: ['**/docs-assets/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Main designer chunk includes grammar/WASM payloads and exceeds Workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
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
