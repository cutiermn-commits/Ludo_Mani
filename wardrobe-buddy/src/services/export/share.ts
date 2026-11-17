// iOS/Android: write the export to the cache, open the system share sheet (the parent picks
// where it goes: Files, a computer, mail), then delete the cache copy.
// VERIFIED API: docs.expo.dev/versions/v58.0.0/sdk/sharing (shareAsync, isAvailableAsync).
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function readPhotoAsDataUri(uri: string): Promise<string | null> {
  if (uri.startsWith('data:')) return uri;
  const f = new File(uri);
  return f.exists ? `data:image/jpeg;base64,${await f.base64()}` : null;
}

export async function shareExport(json: string, fileName: string, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle });
  } finally {
    if (file.exists) file.delete();
  }
  return true;
}
