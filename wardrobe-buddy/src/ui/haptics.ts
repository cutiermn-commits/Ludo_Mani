import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Gentle feedback on choices (UX "haptics on choice"). Silent on web and where unsupported. */
export function tapFeedback(kind: 'select' | 'confirm' = 'select'): void {
  if (Platform.OS === 'web') return;
  const p = kind === 'confirm' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync();
  p.catch(() => undefined);
}
