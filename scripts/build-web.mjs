// Builds the browser version into docs/play/ for GitHub Pages.
//   npm run build:web
// Server address comes from eas.json (production profile) so web and native always match.
import { readFileSync, rmSync, existsSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const site = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const serverUrl = eas.build?.production?.env?.EXPO_PUBLIC_SERVER_URL;
if (!serverUrl || !serverUrl.startsWith('wss://')) throw new Error('eas.json production EXPO_PUBLIC_SERVER_URL must be a wss:// address');
const webUrl = new URL(site.webUrl);
const basePath = webUrl.pathname.replace(/\/$/, ''); // e.g. /ludo_mani/play

const out = join(root, 'docs', 'play');
if (existsSync(out)) rmSync(out, { recursive: true });

const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', out, '--clear'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    EXPO_PUBLIC_SERVER_URL: serverUrl,
    EXPO_PUBLIC_WEB_URL: site.webUrl,
    WEB_BASE_URL: basePath,
  },
});
if (r.status !== 0) process.exit(r.status ?? 1);

// Mobile-friendly page metadata (theme colour, home-screen title, no zoom on double-tap).
const indexPath = join(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
const head = [
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Ludo">',
  '<meta name="description" content="The classic board game: play online with friends, on one device, or against the computer.">',
  `<link rel="apple-touch-icon" href="${basePath}/apple-touch-icon.png">`,
].join('\n');
html = html.replace('</head>', `${head}\n</head>`);
copyFileSync(join(root, 'assets', 'apple-touch-icon.png'), join(out, 'apple-touch-icon.png'));
writeFileSync(indexPath, html);
console.log(`Web build ready in docs/play (server ${serverUrl}, served at ${site.webUrl})`);
