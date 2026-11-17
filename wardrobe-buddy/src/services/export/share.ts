// iOS/Android: write the export to the cache photo by photo (append), so even hundreds of photos
// never sit in memory as one string; then open the system share sheet (the parent picks where it
// goes). The cache copy is not deleted straight after sharing (the receiving app may still be
// reading it); the start-up sweep removes it (purgeCaches).
// VERIFIED API: docs.expo.dev/versions/v58.0.0/sdk/sharing; File.write `append` option (SDK 58 typings).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppData } from '@/data/repository';

import { exportParts, photoEntry } from './buildExport';

export const EXPORT_PREFIX = 'wardrobe-buddy-export';

export async function shareExport(data: AppData, now: Date, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, `${EXPORT_PREFIX}-${now.toISOString().slice(0, 10)}.json`);
  const { head, photos, tail } = exportParts(data, now);
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(head);
    let first = true;
    for (const p of photos) {
      const photo = new File(p.uri);
      if (!photo.exists) continue;
      file.write(photoEntry(p.key, `data:image/jpeg;base64,${await photo.base64()}`, first), { append: true });
      first = false;
    }
    file.write(tail, { append: true });
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle });
    return true;
  } catch (e) {
    if (file.exists) file.delete();
    throw e;
  }
}
