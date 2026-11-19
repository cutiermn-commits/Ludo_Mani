import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 7 exit: screen-reader labels everywhere. Scans every component's JSX for controls and
 * images and checks their accessibility props. Our own Chip/Button set role + label internally.
 */
const root = path.join(__dirname, '..', '..');
const files = ['app', 'features', 'ui'].flatMap(function walk(rel: string): string[] {
  return fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === '__tests__' ? [] : walk(path.join(rel, e.name))) : e.name.endsWith('.tsx') ? [path.join(rel, e.name)] : [],
  );
});

/** Opening tags of `name`, scanning braces so `=>` inside props doesn't end the tag. */
function openingTags(src: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}[\\s>]`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = m.index + 1;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    out.push(src.slice(m.index, i + 1));
  }
  return out;
}

describe.each(files)('%s', (file) => {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  it('pressables and switches have a role and a label', () => {
    for (const tag of openingTags(src, 'Pressable')) {
      expect(tag).toMatch(/accessibilityRole=/);
      expect(tag).toMatch(/accessibilityLabel=/);
    }
    for (const tag of openingTags(src, 'Switch')) expect(tag).toMatch(/accessibilityLabel=/);
  });
  it('text fields are labelled', () => {
    for (const tag of openingTags(src, 'TextInput')) expect(tag).toMatch(/accessibilityLabel=/);
  });
  it('images are described or hidden from screen readers', () => {
    for (const tag of openingTags(src, 'Image')) expect(tag).toMatch(/accessibilityLabel=|importantForAccessibility="no"|accessibilityElementsHidden/);
  });
});
