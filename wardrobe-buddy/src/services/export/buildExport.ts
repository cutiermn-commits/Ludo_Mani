import type { AppData } from '@/data/repository';

/**
 * Parent export (PRIVACY_SAFETY §2.9: "JSON + photos"). One JSON file with all data and every
 * photo embedded as a data URI, so no zip library is needed. Selfies and diary photos are
 * embedded as stored, i.e. already blurred. The cached weather forecast is left out (not hers).
 */
export async function buildExport(data: AppData, readPhoto: (uri: string) => Promise<string | null>, now: Date): Promise<string> {
  const uris = [...new Set([...data.items.map((i) => i.photoUri), data.profile?.selfieUri, ...data.diary.map((d) => d.photoUri)].filter((u): u is string => !!u))];
  const photos: Record<string, string> = {};
  for (const uri of uris) {
    const d = await readPhoto(uri).catch(() => null);
    if (d) photos[uri] = d;
  }
  const { forecast: _forecast, ...rest } = data;
  return JSON.stringify({ app: 'wardrobe-buddy', schema: 2, exportedAt: now.toISOString(), data: rest, photos }, null, 2);
}
