/**
 * Remove metadata from a JPEG: every APPn segment except APP0 (JFIF) and every comment.
 * That covers APP1 (EXIF, which can hold GPS and device info; XMP), APP2 (ICC/MPF, which can
 * embed extra images) and APP13 (IPTC). Pixel data is untouched. Applied to every saved photo,
 * because whether the image manipulator's re-encode keeps EXIF is NOT VERIFIED.
 */
const isDropped = (marker: number) => (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('jpeg: bad signature');
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) throw new Error('jpeg: bad marker');
    const marker = bytes[pos + 1];
    if (marker === 0xda || marker === 0xd9) break; // start of scan / end: keep the rest as is
    const len = (bytes[pos + 2] << 8) | bytes[pos + 3];
    if (len < 2 || pos + 2 + len > bytes.length) throw new Error('jpeg: bad segment');
    if (!isDropped(marker)) parts.push(bytes.subarray(pos, pos + 2 + len));
    pos += 2 + len;
  }
  parts.push(bytes.subarray(pos));
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** True if any metadata segment (APP1–APP15 or comment) is still present. */
export function hasJpegMetadata(bytes: Uint8Array): boolean {
  let pos = 2;
  while (pos + 4 <= bytes.length && bytes[pos] === 0xff) {
    const marker = bytes[pos + 1];
    if (marker === 0xda || marker === 0xd9) return false;
    if (isDropped(marker)) return true;
    pos += 2 + ((bytes[pos + 2] << 8) | bytes[pos + 3]);
  }
  return false;
}
