// Web: expo-file-system can't write files in the browser, so a small JPEG is kept inline
// as a data URI with the item (in this browser's storage only). Kept small (see capture.ts)
// because browser storage is limited (~5 MB, NOT VERIFIED per browser); IndexedDB is a later option.
import { bytesToBase64 } from '@/domain/image/base64';

import type { PhotoStore } from './types';

export const photoStore: PhotoStore = {
  async save(jpeg) {
    return `data:image/jpeg;base64,${bytesToBase64(jpeg)}`;
  },
  async remove() {},
  async removeAll() {},
  async temp(bytes, mime) {
    return `data:${mime};base64,${bytesToBase64(bytes)}`;
  },
  async discard() {},
  async purgeCaches() {},
  async listSaved() {
    return []; // web photos live inside the items themselves
  },
};
