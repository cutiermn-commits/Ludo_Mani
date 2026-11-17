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
  async temp(bytes, mime) {
    const file = new File(Paths.cache, `wb-tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${mime === 'image/png' ? 'png' : 'jpg'}`);
    file.create();
    file.write(bytes);
    return file.uri;
  },
  async purgeCaches() {
    // Folder names from the libraries' source (SDK 58): Android picker + manipulator use
    // cache/ImagePicker and cache/ImageManipulator; iOS picker uses Caches/ImagePicker.
    for (const name of ['ImagePicker', 'ImageManipulator']) {
      const dir = new Directory(Paths.cache, name);
      if (dir.exists) dir.delete();
    }
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && (entry.name.startsWith('wb-tmp-') || entry.name.startsWith('wardrobe-buddy-export'))) entry.delete();
    }
  },
  async listSaved() {
    const dir = photosDir();
    return dir.exists ? dir.list().filter((e): e is File => e instanceof File).map((f) => f.uri) : [];
  },
  async discard(uri) {
    // Only the cache folder: picker copies and our own temp files live there.
    if (!uri.startsWith(Paths.cache.uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  },
};
