import * as fs from 'fs';
import * as path from 'path';

import { AVATAR_HEIGHTS, CATEGORIES, COLORS, EXTRA_KINDS, HAIR_ACCESSORIES, HAIR_STYLE_IDS, MOODS, RATING_REASONS, STYLE_PREFS, STYLE_TAGS, SUBCATEGORIES } from '@/domain/types';
import { BANDS } from '@/engine';
import { THEME_NAMES } from '@/ui/theme';

import da from '../da.json';
import en from '../en.json';
import { formatTemp, formatWeekday, translate } from '../index';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('DA/EN key parity (D-014)', () => {
  it('both files have exactly the same keys', () => {
    expect(Object.keys(da).sort()).toEqual(Object.keys(en).sort());
  });
  it.each(Object.keys(en))('%s is non-empty in both and has the same placeholders', (key) => {
    const e = (en as Record<string, string>)[key];
    const d = (da as Record<string, string>)[key];
    expect(e.trim()).not.toBe('');
    expect(d.trim()).not.toBe('');
    expect(placeholders(d)).toEqual(placeholders(e));
  });
});

describe('every domain value has a label in both languages', () => {
  const need: string[] = [
    ...CATEGORIES.flatMap((c) => [`cat.${c}`, `catPlural.${c}`]),
    ...Object.values(SUBCATEGORIES).flat().map((s) => `sub.${s}`),
    ...COLORS.map((c) => `color.${c}`),
    ...STYLE_TAGS.map((s) => `tag.${s}`),
    ...MOODS.map((m) => `mood.${m}`),
    ...STYLE_PREFS.map((s) => `stylePref.${s}`),
    ...EXTRA_KINDS.map((e) => `extra.${e}`),
    ...RATING_REASONS.map((r) => `rate.reason.${r}`),
    ...THEME_NAMES.map((t) => `theme.${t}`),
    ...BANDS.map((b) => `why.band.${b.name}`),
    ...[1, 2, 3, 4, 5].map((w) => `warmth.${w}`),
    ...(['system', 'light', 'dark'] as const).map((m) => `themeMode.${m}`),
    ...HAIR_STYLE_IDS.map((s) => `avatar.style.${s}`),
    ...HAIR_ACCESSORIES.map((a) => `avatar.acc.${a}`),
    ...AVATAR_HEIGHTS.map((h) => `avatar.height.${h}`),
  ];
  it.each(need)('%s', (key) => {
    expect(en).toHaveProperty([key]);
    expect(da).toHaveProperty([key]);
  });
});

describe('no hard-coded user-facing text in components (CLAUDE.md non-negotiable 6)', () => {
  const root = path.join(__dirname, '..', '..');
  const files = ['app', 'features', 'ui'].flatMap(function walk(rel: string): string[] {
    const dir = path.join(root, rel);
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === '__tests__' ? [] : walk(path.join(rel, e.name))) : e.name.endsWith('.tsx') ? [path.join(rel, e.name)] : [],
    );
  });
  it.each(files)('%s', (file) => {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    // JSX text containing letters, e.g. <T>Hello</T>
    const jsxText = [...src.matchAll(/>\s*([^<>{}\n]*[A-Za-zÆØÅæøå]{2,}[^<>{}\n]*)\s*<\//g)].map((m) => m[1].trim()).filter(Boolean);
    // String literal props that are read out or shown
    const props = [...src.matchAll(/\b(label|title|placeholder|accessibilityLabel|accessibilityHint|hint|a11yLabel)="([^"]*[A-Za-z][^"]*)"/g)].map((m) => m[0]);
    expect([...jsxText, ...props]).toEqual([]);
  });
});

describe('body-image safety in copy (PRIVACY_SAFETY §2.6)', () => {
  const banned = /\b(weight|weigh|size|slim|slimming|flattering|fat|skinny|ugly|perfect body|body|figure|vægt|vejer|størrelse|slank|slankende|tyk|tynd|grim|krop|figur)\b/i;
  it.each([
    ['en', en],
    ['da', da],
  ] as const)('%s has no body, weight or size words', (_l, dict) => {
    const hits = Object.entries(dict).filter(([, v]) => banned.test(v));
    expect(hits).toEqual([]);
  });
});

describe('translate + formatting', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(translate('en', 'gate.question', { a: 12, b: 7 })).toBe('What is 12 × 7?');
    expect(translate('da', 'gate.question', { a: 12 })).toBe('Hvad er 12 × {b}?');
  });
  it('formats temperatures and weekdays per locale', () => {
    expect(formatTemp(6.6, 'en')).toBe('7°');
    expect(formatTemp(-3, 'da')).toMatch(/^[-−]3°$/);
    expect(formatWeekday('2026-11-17', 'en')).toBe('Tuesday');
    expect(formatWeekday('2026-11-17', 'da')).toBe('tirsdag');
  });
});
