// Single source of truth for the privacy policy and support page.
// Edit PRIVACY.md and/or site.config.json, then run:  npm run sync-privacy
// It regenerates:
//   src/ui/PrivacyModal.tsx (PRIVACY_TEXT)  - the policy shown inside the app
//   docs/privacy.html                       - public Privacy Policy URL (GitHub Pages)
//   docs/index.html                         - public Support URL (GitHub Pages)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cfg.supportEmail)) throw new Error('site.config.json: supportEmail is not a valid email');

const policy = readFileSync(join(root, 'PRIVACY.md'), 'utf8').replaceAll('{{SUPPORT_EMAIL}}', cfg.supportEmail).trim();
if (/\{\{|\[FILL IN|\[YOUR/.test(policy)) throw new Error('PRIVACY.md still contains a placeholder');

// 1. In-app text
const modalPath = join(root, 'src/ui/PrivacyModal.tsx');
const modal = readFileSync(modalPath, 'utf8');
const start = modal.indexOf('export const PRIVACY_TEXT = `') + 'export const PRIVACY_TEXT = `'.length;
const end = modal.indexOf('`;', start);
if (start < 30 || end < 0) throw new Error('PRIVACY_TEXT not found in PrivacyModal.tsx');
writeFileSync(modalPath, modal.slice(0, start) + policy.replaceAll('`', "'").replaceAll('${', '$ {') + modal.slice(end));

// 2. Web pages
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const mail = `<a href="mailto:${esc(cfg.supportEmail)}">${esc(cfg.supportEmail)}</a>`;
const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; --bg:#ffffff; --fg:#1a1a1a; --muted:#555; --accent:#c77700; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0f1b2d; --fg:#f5f7fa; --muted:#9aa8bc; --accent:#ffb300; } }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.6 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 1.8rem; margin: 0 0 4px; }
  h2 { font-size: 1.15rem; margin-top: 28px; }
  p, li { color: var(--fg); }
  .muted { color: var(--muted); }
  a { color: var(--accent); }
  nav { margin-top: 40px; font-size: .95rem; }
</style>
</head>
<body><main>
${body}
</main></body>
</html>
`;

const [heading, ...paras] = policy.split(/\n\s*\n/);
const policyHtml = paras
  .map((p) => {
    const m = p.match(/^([^:\n]{2,40}):\s([\s\S]*)$/);
    const text = esc(m ? m[2] : p).replace(esc(cfg.supportEmail), mail);
    return m ? `<h2>${esc(m[1])}</h2>\n<p>${text}</p>` : `<p class="muted">${text}</p>`;
  })
  .join('\n');
writeFileSync(
  join(root, 'docs/privacy.html'),
  page(`${cfg.appName} – Privacy Policy`, `<h1>${esc(cfg.appName)} – ${esc(heading)}</h1>\n${policyHtml}\n<nav><a href="./">Support</a></nav>`),
);

writeFileSync(
  join(root, 'docs/index.html'),
  page(
    `${cfg.appName} – Support`,
    `<h1>${esc(cfg.appName)} – Support</h1>
<p class="muted">The classic board game for 2–4 players: online with friends, on one device, or against the computer.</p>
${cfg.webUrl ? `<p><a href="${esc(cfg.webUrl)}/"><b>▶ Play in your browser</b></a> – works on phones, tablets, computers and TV browsers.</p>` : ''}

<h2>Contact</h2>
<p>Questions, problems or feedback? Email ${mail}. Please include your iPhone/iPad model and iOS version.</p>

<h2>How to play</h2>
<ul>
  <li>Roll a 6 to bring a token out of your base. A 6 also gives you another roll.</li>
  <li>Move all four tokens around the board and into the centre. You need the exact number to finish.</li>
  <li>Land on an opponent to send them back to base, except on the star and start squares, which are safe.</li>
  <li>House rules (extra rolls, three-sixes penalty) can be switched on or off before a game.</li>
</ul>

<h2>Playing online</h2>
<ul>
  <li>Tap <b>Play online with friends</b> → <b>Create a room</b>, then share the 6-character room code.</li>
  <li>Friends tap <b>Play online with friends</b>, enter the code and tap <b>Join</b>.</li>
  <li>The host can give empty seats to computer players (Easy, Medium or Hard) and then starts the game.</li>
  <li>If your connection drops, reopen the app; the game reconnects automatically. If you are away too long, your turn is played for you so the game keeps going.</li>
</ul>

<h2>Keyboard and TV remote (browser version)</h2>
<ul>
  <li><b>Space</b> or <b>Enter</b>: roll the dice, or move the highlighted token.</li>
  <li><b>Arrow keys</b>: choose which token to move. <b>1–4</b>: move that token directly.</li>
  <li><b>Tab</b>: move between buttons on the menus.</li>
</ul>

<h2>Troubleshooting</h2>
<ul>
  <li><b>Can't connect online:</b> check your internet connection and try again in a minute.</li>
  <li><b>Lost a game on one device:</b> unfinished games are saved automatically. Look for <b>Resume game</b> on the main menu.</li>
</ul>

<nav><a href="privacy.html">Privacy Policy</a></nav>`,
  ),
);
console.log('Synced: PrivacyModal.tsx, docs/privacy.html, docs/index.html');
