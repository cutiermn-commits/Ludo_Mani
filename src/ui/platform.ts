// Small cross-platform helpers for things React Native's built-ins don't cover on web.
import { Alert, Platform, Share } from 'react-native';

/** Yes/No confirmation. Native: system alert. Web: browser confirm dialog. */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export type ShareResult = 'shared' | 'copied' | 'failed';

/**
 * Share a room invite. Native: share sheet. Web: the browser's share sheet where
 * available (most phones), otherwise copy to the clipboard (desktop, TV).
 */
export async function shareInvite(text: string, url?: string): Promise<ShareResult> {
  const full = url ? `${text} ${url}` : text;
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message: full });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
  if (nav?.share) {
    try {
      await nav.share({ text, ...(url ? { url } : {}) });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'shared'; // user closed the sheet
    }
  }
  try {
    await nav?.clipboard?.writeText(full);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Web-only: the page address players can open to join (used in invites). */
export function webJoinUrl(code: string): string | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('join', code);
  return u.toString();
}

/** Web-only: room code from a "?join=CODE" invite link, if present. */
export function joinCodeFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URL(window.location.href).searchParams.get('join');
}

/** Web-only: remove "?join=" from the address bar once used. */
export function clearJoinFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  if (!u.searchParams.has('join')) return;
  u.searchParams.delete('join');
  window.history.replaceState(null, '', u.toString());
}
