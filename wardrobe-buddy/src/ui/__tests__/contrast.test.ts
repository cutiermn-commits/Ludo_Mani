import { contrastRatio } from '../contrast';
import { PALETTES, type Palette } from '../theme';

/** Text pairs need 4.5:1 (WCAG 1.4.3 AA); borders of controls need 3:1 (WCAG 1.4.11). */
const TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceAlt'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceAlt'],
  ['onPrimary', 'primary'],
  ['onPrimarySoft', 'primarySoft'],
  ['primary', 'background'],
  ['primary', 'surface'],
];
const UI_PAIRS: [keyof Palette, keyof Palette][] = [
  ['border', 'surface'],
  ['border', 'background'],
];

describe('WCAG AA contrast in every theme', () => {
  for (const [theme, modes] of Object.entries(PALETTES)) {
    for (const [mode, p] of Object.entries(modes) as [string, Palette][]) {
      it.each(TEXT_PAIRS)(`${theme}/${mode}: %s on %s ≥ 4.5`, (fg, bg) => {
        expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5);
      });
      it.each(UI_PAIRS)(`${theme}/${mode}: %s on %s ≥ 3`, (fg, bg) => {
        expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('contrastRatio matches known values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });
});
