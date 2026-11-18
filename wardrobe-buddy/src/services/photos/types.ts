/** Where clothing photos live. Never uploaded anywhere (CLAUDE.md non-negotiable 2). */
export interface PhotoStore {
  /** Saves image bytes (JPEG with metadata stripped, or a PNG cut-out) and returns a URI the Image component can show. */
  save(bytes: Uint8Array, kind?: 'jpeg' | 'png'): Promise<string>;
  remove(uri: string): Promise<void>;
  /** Parent "delete everything". */
  removeAll(): Promise<void>;
  /** A short-lived URI for intermediate image data (deleted with `discard`). */
  temp(bytes: Uint8Array, mime: 'image/png' | 'image/jpeg'): Promise<string>;
  /** Delete a temporary or picker-cache file. Never touches saved photos. */
  discard(uri: string): Promise<void>;
  /**
   * Empty the image picker's and manipulator's own cache folders and our temp files.
   * Those can hold unblurred or EXIF-carrying copies (the Android crop step writes its own file).
   */
  purgeCaches(): Promise<void>;
  /** URIs of all saved photos, to clean up ones no item or profile refers to. */
  listSaved(): Promise<string[]>;
}
