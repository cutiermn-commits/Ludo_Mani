// Writes docs/COPY_REVIEW.md: every user-facing string, English and Danish side by side,
// for the native-speaker review (D-011). Run: node scripts/copy-review.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8'));
const da = JSON.parse(readFileSync(join(root, 'src/i18n/da.json'), 'utf8'));
const esc = (s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const groups = {};
for (const k of Object.keys(en)) (groups[k.split('.')[0]] ??= []).push(k);
let md = `# Copy review: Danish and English (D-011)\n\nGenerated from \`src/i18n/*.json\` by \`scripts/copy-review.mjs\`. ${Object.keys(en).length} strings.\n\nFor the reviewer: read the Danish column aloud. Is it natural for an 11–15-year-old in Denmark? Mark anything odd in the "Note" column. \`{name}\` placeholders are filled in by the app. Things to check especially: item names ("hættetrøje i grå"), the "Why this?" sentences (\`why.*\`), and words kept the same as English (beige, jeans, Sporty).\n`;
for (const [g, keys] of Object.entries(groups)) {
  md += `\n## ${g}\n\n| Key | English | Dansk | Note |\n|---|---|---|---|\n`;
  for (const k of keys) md += `| \`${k}\` | ${esc(en[k])} | ${esc(da[k])} | |\n`;
}
writeFileSync(join(root, 'docs', 'COPY_REVIEW.md'), md);
console.log(`docs/COPY_REVIEW.md: ${Object.keys(en).length} strings`);
