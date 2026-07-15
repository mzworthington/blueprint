import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitepress';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repo-level Markdown source (local + git + site). */
const docsRoot = path.resolve(__dirname, '../../../../docs');
const packageRoot = path.resolve(__dirname, '..');
const vueRoot = path.resolve(packageRoot, 'node_modules/vue');
const base = process.env.DOCS_BASE || '/docs/';

export default defineConfig({
  srcDir: docsRoot,
  base,
  title: 'Blueprint',
  description:
    'Local-first visual systems architecture canvas with YAML sync and codebase forensics.',
  lang: 'en-US',
  cleanUrls: false,
  lastUpdated: true,
  ignoreDeadLinks: ['/../'],
  appearance: 'force-dark',
  head: [
    ['link', { rel: 'icon', href: `${base}favicon.svg`, type: 'image/svg+xml' }],
    ['link', { rel: 'icon', href: `${base}favicon.png`, type: 'image/png', sizes: '32x32' }],
    ['link', { rel: 'apple-touch-icon', href: `${base}favicon.png` }],
    ['link', { rel: 'shortcut icon', href: `${base}favicon.svg` }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
      },
    ],
    [
      'style',
      {},
      `:root { --bp-grid-url: url("${base}assets/grid.svg"); --bp-logo-url: url("${base}assets/logo.svg"); }`,
    ],
  ],
  vite: {
    resolve: {
      // Markdown lives outside the package; pin Vue so SSR can resolve from /docs paths.
      alias: {
        vue: vueRoot,
        'vue/server-renderer': path.join(vueRoot, 'server-renderer'),
      },
      dedupe: ['vue'],
    },
    server: {
      fs: {
        allow: [docsRoot, packageRoot, path.resolve(packageRoot, '../..')],
      },
    },
  },
  themeConfig: {
    logo: {
      src: '/favicon.svg',
      alt: 'Blueprint',
    },
    siteTitle: 'Blueprint',
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Reference', link: '/setup', activeMatch: '/(setup|architecture|journeys)' },
      { text: 'Open App', link: '/../' },
      {
        text: 'GitHub',
        link: 'https://github.com/mzworthington/blueprint',
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Product guide',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Canvas & workspace', link: '/guide/canvas' },
            { text: 'CLI analysis', link: '/guide/cli' },
            { text: 'Git forensics', link: '/guide/forensics' },
          ],
        },
      ],
      '/': [
        {
          text: 'Reference',
          items: [
            { text: 'Setup & local development', link: '/setup' },
            { text: 'Architecture & security', link: '/architecture' },
            { text: 'Interface tour & journeys', link: '/journeys' },
          ],
        },
        {
          text: 'Package READMEs',
          items: [
            {
              text: 'Designer',
              link: 'https://github.com/mzworthington/blueprint/blob/main/app/packages/designer/README.md',
            },
            {
              text: 'CLI',
              link: 'https://github.com/mzworthington/blueprint/blob/main/app/packages/cli/README.md',
            },
            {
              text: 'Core',
              link: 'https://github.com/mzworthington/blueprint/blob/main/app/packages/core/README.md',
            },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/mzworthington/blueprint' }],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/mzworthington/blueprint/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Markdown source in /docs — same files locally, in git, and on this site.',
      copyright: 'Blueprint',
    },
  },
});
