import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const docsDist = path.join(repoRoot, 'app/packages/docs/.vitepress/dist');
const designerDist = path.join(repoRoot, 'app/packages/designer/dist');
const siteRoot = path.join(repoRoot, 'app/site');

function assertDir(dir, label) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing ${label} at ${dir}. Build docs and designer first.`);
  }
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

assertDir(docsDist, 'VitePress output');
assertDir(designerDist, 'designer dist');

fs.rmSync(siteRoot, { recursive: true, force: true });
fs.mkdirSync(siteRoot, { recursive: true });

// Designer at site root so existing SPA 404.html / deep links keep working.
copyRecursive(designerDist, siteRoot);

// Docs under /docs/ (VitePress base is /docs/).
const docsOut = path.join(siteRoot, 'docs');
fs.mkdirSync(docsOut, { recursive: true });
copyRecursive(docsDist, docsOut);

console.log(`Assembled GitHub Pages site at ${siteRoot}`);
console.log('  /       → designer app');
console.log('  /docs/  → documentation');
