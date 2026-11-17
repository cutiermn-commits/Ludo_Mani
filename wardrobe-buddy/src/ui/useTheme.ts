import { useColorScheme } from 'react-native';

import { useApp } from '@/features/app/AppState';

import { PALETTES, type Palette } from './theme';

export function useTheme(): Palette & { dark: boolean; playful: boolean } {
  const { profile } = useApp();
  const system = useColorScheme();
  const mode = profile?.themeMode ?? 'system';
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const p = PALETTES[profile?.theme ?? 'purple'][dark ? 'dark' : 'light'];
  return { ...p, dark, playful: (profile?.uiStyle ?? 'playful') === 'playful' };
}
