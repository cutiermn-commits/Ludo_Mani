/** Where clothing photos live. Never uploaded anywhere (CLAUDE.md non-negotiable 2). */
export interface PhotoStore {
  /** Saves JPEG bytes (metadata already stripped) and returns a URI the Image component can show. */
  save(jpeg: Uint8Array): Promise<string>;
  remove(uri: string): Promise<void>;
  /** Parent "delete everything". */
  removeAll(): Promise<void>;
}
