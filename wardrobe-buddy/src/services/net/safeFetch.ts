/**
 * The single network entry point of the app (PRIVACY_SAFETY §2.2).
 * - https only, host must be on the allowlist
 * - no cookies/credentials, no custom headers, no referrer
 * A test fails if `fetch(` appears anywhere else in src/.
 */
export const ALLOWED_HOSTS = ['api.open-meteo.com', 'geocoding-api.open-meteo.com'] as const;

export class BlockedHostError extends Error {
  constructor(url: string) {
    super(`Blocked network request: ${url}`);
    this.name = 'BlockedHostError';
  }
}

/** Parse the host without relying on the URL class (its React Native support varies — NOT VERIFIED for RN 0.88). */
export function hostOf(url: string): string | null {
  const m = /^https:\/\/([a-z0-9.-]+)(?::443)?(?:[/?#]|$)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

export function isAllowedUrl(url: string): boolean {
  const host = hostOf(url);
  return host !== null && (ALLOWED_HOSTS as readonly string[]).includes(host);
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function safeFetchJson<T>(url: string, opts: { timeoutMs?: number; fetchImpl?: FetchLike } = {}): Promise<T> {
  if (!isAllowedUrl(url)) throw new BlockedHostError(url);
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000) : undefined;
  try {
    const res = await doFetch(url, {
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal: controller?.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
