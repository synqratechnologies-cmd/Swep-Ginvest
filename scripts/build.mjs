#!/usr/bin/env node
/**
 * Builds the static site (no dependencies).
 *
 *   src/layout.html        page skeleton
 *   src/partials/*.html    shared head, header, footer, call to action ({{> name}})
 *   src/pages/*.html       page bodies, each starting with a <!--page {json} --> block
 *
 * Writes:  index.html, <page>/index.html, 404.html, config.js, sitemap.xml, robots.txt
 *
 * Environment (or .env):
 *   WEB3FORMS_ACCESS_KEY  Web3Forms key created for tkelly@swep-ginvest.com
 *   SITE_URL              Production origin (default https://swep-ginvest.com)
 *
 * Leadership portraits: drop assets/leaders/<id>.(avif|webp|jpg|jpeg|png), e.g.
 * thomas-kelly.jpg or thana-balan-j.jpg, and rebuild. Until then a designed panel is shown.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const RECIPIENT = 'tkelly@swep-ginvest.com';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function readDotEnv(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith('#')) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

// Real environment variables take precedence over .env.
const env = { ...readDotEnv(join(ROOT, '.env')), ...process.env };
const SITE = (env.SITE_URL || 'https://swep-ginvest.com').replace(/\/+$/, '');
const accessKey = (env.WEB3FORMS_ACCESS_KEY || '').trim();

if (accessKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accessKey)) {
  console.warn('Warning: WEB3FORMS_ACCESS_KEY does not look like a Web3Forms access key (expected a UUID).');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const escapeHtml = (value) =>
  String(value).replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

/** Pixel dimensions from an image header (PNG, JPEG, WebP, AVIF); null if unknown. */
function imageSize(file) {
  const b = readFileSync(file);
  if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xcb)) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  const ispe = b.indexOf('ispe');
  if (ispe > 0) return { w: b.readUInt32BE(ispe + 8), h: b.readUInt32BE(ispe + 12) };
  return null;
}

/** Locate a supplied leadership photograph: assets/leaders/<id>.<ext> (any case). */
function findPortrait(id) {
  const dir = join(ROOT, 'assets', 'leaders');
  if (!existsSync(dir)) return null;
  const found = {};
  for (const name of readdirSync(dir)) {
    const match = name.match(/^(.+)\.(avif|webp|jpe?g|png)$/i);
    if (match && match[1].toLowerCase() === id) found[match[2].toLowerCase().replace('jpeg', 'jpg')] = name;
  }
  const fallback = found.jpg || found.png || found.webp || found.avif;
  if (!fallback) return null;
  const size = imageSize(join(dir, fallback)) || { w: 1000, h: 1250 };
  return { found, fallback, size };
}

function portrait(attrs) {
  const { id, name, title, tag = '', mirror } = attrs;
  const photo = findPortrait(id);
  const classes = ['portrait', mirror ? 'portrait--mirror' : '', photo ? 'has-photo' : 'is-pending'].filter(Boolean).join(' ');
  let media;
  if (photo) {
    const sources = ['avif', 'webp']
      .filter((ext) => photo.found[ext] && photo.found[ext] !== photo.fallback)
      .map((ext) => `<source type="image/${ext}" srcset="/assets/leaders/${photo.found[ext]}">`)
      .join('');
    media = `<picture>${sources}<img src="/assets/leaders/${photo.fallback}" width="${photo.size.w}" height="${photo.size.h}" loading="lazy" decoding="async" alt="Portrait of ${escapeHtml(name)}, ${escapeHtml(title)}, South West Energy Partners"></picture>`;
  } else {
    media = `<div class="portrait__fallback"><img src="/assets/brand/swep-emblem-160.webp" width="180" height="160" loading="lazy" decoding="async" alt=""><span class="portrait__monogram">${escapeHtml(name)}</span></div>`;
  }
  return [
    `<figure class="${classes}" data-reveal="mask"${photo ? '' : ' aria-hidden="true"'}>`,
    '<div class="portrait__frame">',
    `<div class="portrait__media">${media}</div>`,
    '<span class="portrait__corner portrait__corner--tl" aria-hidden="true"></span>',
    '<span class="portrait__corner portrait__corner--br" aria-hidden="true"></span>',
    tag ? `<span class="portrait__tag" aria-hidden="true">${escapeHtml(tag)}</span>` : '',
    '</div>',
    '</figure>',
  ].join('');
}

const parseAttrs = (text) => {
  const attrs = {};
  for (const [, key, value] of text.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[key] = value;
  return attrs;
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const partials = Object.fromEntries(
  readdirSync(join(SRC, 'partials'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), readFileSync(join(SRC, 'partials', f), 'utf8')])
);
const layout = readFileSync(join(SRC, 'layout.html'), 'utf8');

function render(template, vars, depth = 0) {
  if (depth > 8) throw new Error('Partials nested too deeply');
  return template
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error(`Unknown partial "${name}"`);
      return render(partials[name], vars, depth + 1).replace(/\s+$/, '');
    })
    .replace(/\{\{portrait\s+([^}]*)\}\}/g, (_, attrs) => portrait(parseAttrs(attrs)))
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => String(vars[key] ?? ''))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      if (!(key in vars)) throw new Error(`Unknown variable "${key}"`);
      return escapeHtml(vars[key]);
    });
}

const organization = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'South West Energy Partners LLC',
  alternateName: 'SWEP',
  url: `${SITE}/`,
  logo: `${SITE}/assets/brand/swep-emblem.png`,
  description: 'A global energy and strategic investment company operating across oil & gas, commodities, infrastructure and international capital deployment.',
  email: RECIPIENT,
  telephone: '+1-432-638-6414',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1004 N. Big Spring, Suite 340',
    addressLocality: 'Midland',
    addressRegion: 'TX',
    postalCode: '79701',
    addressCountry: 'US',
  },
};

const JSONLD = {
  organization: { '@context': 'https://schema.org', ...organization },
  people: {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Person', name: 'Dr. Thana Balan J', jobTitle: 'Chairman Emeritus', worksFor: { '@id': `${SITE}/#organization` } },
      {
        '@type': 'Person',
        name: 'Thomas E. Kelly',
        jobTitle: 'President',
        alumniOf: { '@type': 'CollegeOrUniversity', name: 'Baylor University' },
        worksFor: { '@id': `${SITE}/#organization` },
      },
      organization,
    ],
  },
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
const pages = readdirSync(join(SRC, 'pages'))
  .filter((f) => f.endsWith('.html'))
  .map((file) => {
    const raw = readFileSync(join(SRC, 'pages', file), 'utf8');
    const match = raw.match(/^\s*<!--page\s*([\s\S]*?)-->/);
    if (!match) throw new Error(`${file}: missing <!--page {...} --> block`);
    return { file, meta: JSON.parse(match[1]), body: raw.slice(match[0].length) };
  });

const written = [];
for (const { file, meta, body } of pages) {
  const vars = {
    robots: 'index, follow',
    ogTitle: meta.title,
    ...meta,
    url: `${SITE}${meta.path}`,
    image: `${SITE}${meta.image}`,
    source: `src/pages/${file}`,
    waPath: WHATSAPP_PATH,
    headExtra: meta.jsonld
      ? `  <script type="application/ld+json">${JSON.stringify(JSONLD[meta.jsonld])}</script>`
      : '',
  };
  vars.content = render(body, vars).replace(/^\n+|\s+$/g, '');
  let html = render(layout, vars);

  // Mark the current page in every navigation (header, menu, footer).
  html = html.replace(new RegExp(`<a\\b([^>]*?)\\bdata-page="${meta.id}"([^>]*)>`, 'g'), '<a$1data-page="' + meta.id + '"$2 aria-current="page">');

  const out = meta.path === '/' ? 'index.html' : meta.path === '/404' ? '404.html' : join(meta.path.replace(/^\/|\/$/g, ''), 'index.html');
  mkdirSync(dirname(join(ROOT, out)), { recursive: true });
  writeFileSync(join(ROOT, out), html);
  written.push(out.replace(/\\/g, '/'));
}

// ---------------------------------------------------------------------------
// Config, sitemap, robots
// ---------------------------------------------------------------------------
writeFileSync(
  join(ROOT, 'config.js'),
  '/* Generated by scripts/build.mjs. Set WEB3FORMS_ACCESS_KEY in the environment (or .env) and rebuild; do not edit by hand. */\n' +
    `window.SWEP_CONFIG = Object.freeze(${JSON.stringify({ web3formsAccessKey: accessKey, enquiryRecipient: RECIPIENT }, null, 2)});\n`
);

const today = new Date().toISOString().slice(0, 10);
const NAV_ORDER = ['home', 'about', 'energy', 'investments', 'institutional-capital', 'projects', 'leadership'];
const rank = (id) => (NAV_ORDER.includes(id) ? NAV_ORDER.indexOf(id) : NAV_ORDER.length);
const urls = pages
  .filter(({ meta }) => meta.path !== '/404')
  .sort((a, b) => rank(a.meta.id) - rank(b.meta.id))
  .map(({ meta }) => `  <url>\n    <loc>${SITE}${meta.path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
  .join('\n');
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

const portraits = ['thana-balan-j', 'thomas-kelly'].map((id) => `${id}: ${findPortrait(id) ? 'photo' : 'pending (fallback panel)'}`);
console.log(`Built ${written.length} pages for ${SITE}: ${written.join(', ')}`);
console.log(`Enquiry form: ${accessKey ? 'enabled' : 'no WEB3FORMS_ACCESS_KEY (visitors are directed to email and phone)'}`);
console.log(`Portraits: ${portraits.join('; ')}`);
