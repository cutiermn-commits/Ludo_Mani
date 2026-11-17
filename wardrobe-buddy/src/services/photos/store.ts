// iOS/Android: photos are files in the app's private documents folder (the sandbox),
// removed when the app is uninstalled. VERIFIED API: docs.expo.dev/versions/v58.0.0/sdk/filesystem
import { Directory, File, Paths } from 'expo-file-system';

import type { PhotoStore } from './types';

const photosDir = () => new Directory(Paths.document, 'photos');

export const photoStore: PhotoStore = {
  async save(jpeg) {
    const dir = photosDir();
    dir.create({ intermediates: true, idempotent: true });
    const file = new File(dir, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`);
    file.create();
    file.write(jpeg);
    return file.uri;
  },
  async remove(uri) {
    if (!uri.startsWith('file:')) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  },
  async removeAll() {
    const dir = photosDir();
    if (dir.exists) dir.delete();
  },
};
