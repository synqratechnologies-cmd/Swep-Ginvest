# South West Energy Partners: corporate website

Single-page corporate site for South West Energy Partners LLC (SWEP). It is plain HTML, CSS and JavaScript with no framework and no runtime dependencies. Node.js is used only for two small scripts: config generation and a local preview server.

## Structure

```
index.html            The site (all sections)
404.html              Not-found page
style.css             All styles (mobile-first; colour roles per light/dark section)
script.js             Navigation, menu, reveal/parallax, map, enquiry form
config.js             GENERATED: Web3Forms access key (see below)
scripts/
  build-config.mjs    Writes config.js from environment variables / .env
  serve.mjs           Local preview server
assets/
  images/             Responsive AVIF + WebP photography, world map SVG
  fonts/              Self-hosted Newsreader and Archivo (+ licences)
  brand/              Favicon, touch/manifest icons, Open Graph image
favicon.ico, site.webmanifest, robots.txt, sitemap.xml
```

## Local preview

```bash
npm run build   # generates config.js from .env
npm start       # http://localhost:4173
```

## Enquiry form (Web3Forms)

The form posts to `https://api.web3forms.com/submit` using an access key held outside the source code.

1. Create the access key at [web3forms.com](https://web3forms.com) **using `tkelly@swep-ginvest.com`**. Web3Forms sends every submission to the address the key was created for; the recipient cannot be changed from the website.
2. Provide the key as `WEB3FORMS_ACCESS_KEY`:
   - locally: copy `.env.example` to `.env` and set the value (`.env` is git-ignored);
   - on the host: set it in the project's environment variables.
3. Run `npm run build` (or use it as the host's build command). This writes `config.js`.

Without a key the site still works: the form validates input, then directs visitors to email or call instead of failing silently.

Web3Forms access keys are public by design: their documentation states the key does not need to be hidden, and it is visible in the browser once deployed. Keeping it in the environment keeps it out of source files and makes it easy to rotate. For protection against misuse, enable **domain restriction** for the key in the Web3Forms dashboard once the production domain is live. The form also includes the Web3Forms honeypot field.

Form behaviour: inline validation with specific messages, a loading state, duplicate-submission protection, a 20-second timeout, distinct messages for server errors, rate limiting (HTTP 429) and network failure, and an on-page success state. There are no browser alerts.

## Deployment

Any static host works (Netlify, Vercel, Cloudflare Pages, S3/CloudFront, cPanel).

- **Build command:** `npm run build`  **Publish directory:** project root
- Enable gzip/Brotli for HTML, CSS, JS and SVG. Text assets are about 140 KB uncompressed and under 30 KB gzipped.
- Cache `assets/` long-term (file names are stable; rename files when replacing them).
- Point 404s to `404.html`.

The canonical URL, Open Graph URLs, `robots.txt` and `sitemap.xml` assume **https://swep-ginvest.com/** (the domain of the company email address). Update them if the site is published elsewhere.

## Content to confirm before launch

- **Logo:** no SWEP logo file was available, so the site uses a typographic "SWEP" wordmark and a matching "S" favicon. To use the official logo, replace the `.brand` contents in the header (and `.footer__mark` / `.menu__bar` brand) with an `<img>` or inline SVG, regenerate the icons in `assets/brand/`, and adjust `--brass` in `style.css` if the logo colours call for it.
- **Leadership:** the site shows only confirmed names and titles. No biographies or portraits were added because none could be verified from credible public sources. The title "Chairman of Emeritus" from the brief is displayed as "Chairman Emeritus".
- **Photography** is illustrative (see `CREDITS.md`); the footer states it does not depict SWEP assets.

## Replacing photography

Each image is published in AVIF (primary) and WebP (fallback) at several widths. Keep the existing file names and sizes, or update the `srcset`/`sizes` attributes in `index.html`:

| Image | Widths | Aspect |
| --- | --- | --- |
| Hero (landscape) | 1280, 1920, 2560 | about 4:3, vessel right of centre |
| Hero / Platform / Projects / Partnerships (portrait) | 720, 1080, 1600 | 3:4, used on portrait screens |
| Platform / Projects / Partnerships (landscape) | 1280, 1920, 2560 | 3:2 |
| Oil & Gas items | 600, 900, 1200 | 4:5 |
| Investment band | 960, 1440, 2048 | 16:9 |

## Quality checks performed

- Viewports 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px: no horizontal overflow, no console errors and no failed requests.
- axe-core (WCAG 2.2 AA + best practice): no violations at desktop and mobile, with the mobile menu open, and with the form's error state shown.
- html-validate (recommended preset): clean. `role="list"` on styled lists is deliberate (it restores list semantics in Safari).
- Keyboard: skip link, visible focus, modal menu with focus containment and Escape, focus moved to sections after menu navigation.
- Reduced motion and JavaScript-disabled modes: all content visible and usable.
- Throttled mobile (Fast 4G, 4x CPU): LCP about 0.7 s, CLS 0. Initial transfer about 400 KB uncompressed.
