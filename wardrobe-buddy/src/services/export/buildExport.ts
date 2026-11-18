import type { AppData } from '@/data/repository';

/**
 * Parent export (PRIVACY_SAFETY §2.9: "JSON + photos"). One JSON file:
 *   { app, schema, exportedAt, data, photos: { "item:<id>" | "cutout:<id>" | "selfie" | "diary:<id>": "data:image/…;base64,…" } }
 * In `data`, every photo file path is replaced by `photo:<key>`, so no device paths leave the
 * phone. Selfies and diary photos are embedded as stored, i.e. already blurred. The cached
 * forecast is left out (not hers). Photos already stored inline (web data URIs) stay where they
 * are. Built in parts so phones can write it to a file photo by photo instead of one huge string.
 */
export interface ExportPhoto {
  key: string;
  uri: string;
}

const isFile = (u?: string): u is string => !!u && !u.startsWith('data:');
const ref = (key: string) => `photo:${key}`;

export function exportParts(data: AppData, now: Date): { head: string; photos: ExportPhoto[]; tail: string } {
  const photos: ExportPhoto[] = [];
  const items = data.items.map((i) => {
    let out = i;
    if (isFile(i.photoUri)) {
      photos.push({ key: `item:${i.id}`, uri: i.photoUri });
      out = { ...out, photoUri: ref(`item:${i.id}`) };
    }
    if (isFile(i.cutoutUri)) {
      photos.push({ key: `cutout:${i.id}`, uri: i.cutoutUri });
      out = { ...out, cutoutUri: ref(`cutout:${i.id}`) };
    }
    return out;
  });
  const diary = data.diary.map((d) => {
    if (!isFile(d.photoUri)) return d;
    photos.push({ key: `diary:${d.id}`, uri: d.photoUri });
    return { ...d, photoUri: ref(`diary:${d.id}`) };
  });
  let profile = data.profile;
  if (profile && isFile(profile.selfieUri)) {
    photos.push({ key: 'selfie', uri: profile.selfieUri });
    profile = { ...profile, selfieUri: ref('selfie') };
  }
  const { forecast: _forecast, ...rest } = { ...data, items, diary, profile };
  const head = `{"app":"wardrobe-buddy","schema":3,"exportedAt":${JSON.stringify(now.toISOString())},"data":${JSON.stringify(rest)},"photos":{`;
  return { head, photos, tail: '}}' };
}

export function photoEntry(key: string, dataUri: string, first: boolean): string {
  return `${first ? '' : ','}${JSON.stringify(key)}:${JSON.stringify(dataUri)}`;
}

/** Whole export as one string (web, tests). */
export async function buildExport(data: AppData, readPhoto: (uri: string) => Promise<string | null>, now: Date): Promise<string> {
  const { head, photos, tail } = exportParts(data, now);
  let out = head;
  let first = true;
  for (const p of photos) {
    const d = await readPhoto(p.uri).catch(() => null);
    if (!d) continue;
    out += photoEntry(p.key, d, first);
    first = false;
  }
  return out + tail;
}
