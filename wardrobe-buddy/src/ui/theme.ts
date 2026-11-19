import type { ColorName, ThemeName } from '@/domain/types';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  border: string;
}

/**
 * Four themes × light/dark (UX "Look and feel"). WCAG 2.1 AA pairs are checked
 * by src/ui/__tests__/contrast.test.ts — change a colour, run the test.
 */
export const PALETTES: Record<ThemeName, { light: Palette; dark: Palette }> = {
  pink: {
    light: {
      background: '#FFF5F8',
      surface: '#FFFFFF',
      surfaceAlt: '#FFE4EE',
      text: '#2B1B24',
      textMuted: '#6B4A5A',
      primary: '#B8175A',
      onPrimary: '#FFFFFF',
      primarySoft: '#FFD1E1',
      onPrimarySoft: '#5C0B2E',
      border: '#B06A87',
    },
    dark: {
      background: '#1E1418',
      surface: '#2A1D23',
      surfaceAlt: '#3A2630',
      text: '#FCEFF4',
      textMuted: '#D9B8C6',
      primary: '#FF8FB8',
      onPrimary: '#3A0A1E',
      primarySoft: '#5A2A3E',
      onPrimarySoft: '#FFE1EC',
      border: '#8A6475',
    },
  },
  blue: {
    light: {
      background: '#F3F8FF',
      surface: '#FFFFFF',
      surfaceAlt: '#E0ECFF',
      text: '#142033',
      textMuted: '#46566E',
      primary: '#1D5FC4',
      onPrimary: '#FFFFFF',
      primarySoft: '#CFE0FF',
      onPrimarySoft: '#0B2A5C',
      border: '#6880A8',
    },
    dark: {
      background: '#0F1724',
      surface: '#172234',
      surfaceAlt: '#22324A',
      text: '#EEF4FF',
      textMuted: '#B2C2DA',
      primary: '#7FB2FF',
      onPrimary: '#0A1A33',
      primarySoft: '#233D66',
      onPrimarySoft: '#DDE9FF',
      border: '#5D7397',
    },
  },
  green: {
    light: {
      background: '#F2FBF5',
      surface: '#FFFFFF',
      surfaceAlt: '#DDF3E5',
      text: '#13261A',
      textMuted: '#44604D',
      primary: '#1B7A45',
      onPrimary: '#FFFFFF',
      primarySoft: '#C8EBD5',
      onPrimarySoft: '#0B3A20',
      border: '#5C8F6D',
    },
    dark: {
      background: '#0F1A14',
      surface: '#17261D',
      surfaceAlt: '#21362A',
      text: '#EAF7EF',
      textMuted: '#A9CDB6',
      primary: '#6FD69B',
      onPrimary: '#08240F',
      primarySoft: '#1F4A31',
      onPrimarySoft: '#D7F5E3',
      border: '#4F7A60',
    },
  },
  purple: {
    light: {
      background: '#F8F4FF',
      surface: '#FFFFFF',
      surfaceAlt: '#EBE1FF',
      text: '#221A33',
      textMuted: '#574B6E',
      primary: '#6A3FC2',
      onPrimary: '#FFFFFF',
      primarySoft: '#DED0FF',
      onPrimarySoft: '#2E145E',
      border: '#8670B5',
    },
    dark: {
      background: '#16111F',
      surface: '#211A2E',
      surfaceAlt: '#2E2440',
      text: '#F3EEFF',
      textMuted: '#C3B6DD',
      primary: '#B79BFF',
      onPrimary: '#1E0F3D',
      primarySoft: '#3A2C5C',
      onPrimarySoft: '#ECE4FF',
      border: '#7D6DA0',
    },
  },
};

export const THEME_NAMES = Object.keys(PALETTES) as ThemeName[];

/** Swatch colours for the clothing colour names. "multi" is drawn as stripes. */
export const CLOTHING_HEX: Record<ColorName, string> = {
  black: '#1B1B1F',
  white: '#FAFAFA',
  grey: '#9A9AA2',
  beige: '#D9C7A7',
  brown: '#7A5232',
  navy: '#1F2D5C',
  denim: '#4A6FA5',
  blue: '#2F6FE0',
  lightblue: '#9CC8F2',
  green: '#3C9A5F',
  yellow: '#F2CF3A',
  orange: '#F08A2C',
  red: '#D6383A',
  pink: '#F28DB5',
  purple: '#8B5CD6',
  multi: '#F28DB5',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
/** Minimum tap target (UX: ≥ 44 pt). */
export const TAP = 44;
