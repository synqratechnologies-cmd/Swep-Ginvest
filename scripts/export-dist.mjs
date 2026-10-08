import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

mkdirSync(DIST, { recursive: true });

const items = [
  'index.html',
  '404.html',
  'style.css',
  'script.js',
  'config.js',
  'favicon.ico',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'about',
  'energy',
  'institutional-capital',
  'investments',
  'leadership',
  'projects',
  'assets'
];

for (const item of items) {
  const src = join(ROOT, item);
  if (existsSync(src)) {
    cpSync(src, join(DIST, item), { recursive: true });
  }
}
console.log('✓ Assets successfully staged into dist/');
