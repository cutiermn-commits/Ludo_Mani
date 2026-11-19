// Builds the mobile-first browser version into ./dist-site for GitHub Pages, served from its own
// origin (web/site.json, D-055: https://wardrobe-buddy.github.io/), never a shared one.
//   npm run build:web            then publish dist-site/ to the organisation's <org>.github.io repo
// Adds: home-screen install (web app manifest + icons), mobile meta tags, a 404.html
// fallback so reloading a deep link works on GitHub Pages, and an offline service worker.
// No analytics, no third-party scripts or fonts.
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'web', 'site.json'), 'utf8'));
const BASE = site.basePath.replace(/\/$/, ''); // '' = site root; GitHub Pages paths are case-sensitive
const out = join(root, 'dist-site');

if (existsSync(out)) rmSync(out, { recursive: true });
const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out, '--clear'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ...(BASE ? { WEB_BASE_URL: BASE } : {}) },
});
if (r.status !== 0) process.exit(r.status ?? 1);

for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) copyFileSync(join(root, 'assets', 'web', f), join(out, f));

const manifest = {
  name: 'Wardrobe Buddy',
  short_name: 'Wardrobe',
  description: 'What to wear today, from your own clothes. Free, no ads, everything stays on your device.',
  start_url: `${BASE}/`,
  scope: `${BASE}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F8F4FF',
  theme_color: '#6A3FC2',
  icons: [
    { src: `${BASE}/icon-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${BASE}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    { src: `${BASE}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

const indexPath = join(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
const head = [
  `<link rel="manifest" href="${BASE}/manifest.webmanifest">`,
  '<meta name="theme-color" content="#6A3FC2">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Wardrobe">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="description" content="What to wear today, from your own clothes. Free, no ads, everything stays on your device.">',
  '<meta name="referrer" content="no-referrer">',
  `<link rel="apple-touch-icon" href="${BASE}/apple-touch-icon.png">`,
  `<script>if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('${BASE}/sw.js', { scope: '${BASE}/' }).catch(function () {}); });</script>`,
].join('\n');
html = html.replace('</head>', `${head}\n</head>`);
writeFileSync(indexPath, html);
// GitHub Pages serves 404.html for unknown paths: the single-page app then routes itself.
writeFileSync(join(out, '404.html'), html);
// Service worker: precache every built file (hashed names) so the app opens offline.
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (!name.endsWith('.map')) files.push(p);
  }
})(out);
// Not precached: the service worker itself, and the 404 copy (written below).
// Also not precached: the 6.8 MB offline pose page (D-064). It is cached the first time she
// checks a photo, so the first visit stays light on mobile data.
const precache = files.filter((p) => !/[\\/](sw\.js|404\.html)$/.test(p) && !/[\\/]pose\.[0-9a-f]+\.html$/.test(p));
// Version from file CONTENTS, so a change to un-hashed files (index.html, manifest, icons) also
// produces a new service worker and refreshes the cache.
const hash = createHash('sha256');
for (const p of precache.sort()) hash.update(relative(out, p)).update(readFileSync(p));
const version = hash.digest('hex').slice(0, 12);
const urls = precache.map((p) => `${BASE}/${relative(out, p).split(sep).join('/')}`);
const sw = readFileSync(join(root, 'web', 'sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__BASE__', BASE)
  .replace('__FILES__', JSON.stringify(urls, null, 2));
writeFileSync(join(out, 'sw.js'), sw);

// GitHub Pages: serve folders starting with _ (Expo's _expo/) instead of running Jekyll.
writeFileSync(join(out, '.nojekyll'), '');
console.log(`Web build ready in dist-site (${urls.length} files precached) for ${site.origin}${BASE}/`);
