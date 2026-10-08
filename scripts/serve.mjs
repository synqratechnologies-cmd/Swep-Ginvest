#!/usr/bin/env node
/**
 * Minimal static server for local preview (no dependencies).
 * Usage: node scripts/serve.mjs   (or: npm start)   then open http://localhost:4173
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function resolveFile(urlPath) {
  const safePath = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  const file = join(root, safePath);
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const info = await stat(file);
    return info.isDirectory() ? join(file, 'index.html') : file;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  // Directory URLs without a trailing slash redirect, as production static hosts do (/about -> /about/).
  const [pathname, query = ''] = (req.url || '/').split('?');
  if (!pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(pathname)) {
    const dir = join(root, normalize(decodeURIComponent(pathname)));
    const info = await stat(dir).catch(() => null);
    if (info?.isDirectory()) {
      res.writeHead(301, { Location: `${pathname}/${query ? `?${query}` : ''}` });
      res.end();
      return;
    }
  }
  const file = await resolveFile(req.url || '/');
  try {
    if (!file) throw new Error('not found');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    const body = await readFile(join(root, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  }
}).listen(port, () => {
  console.log(`SWEP site running at http://localhost:${port}`);
});
