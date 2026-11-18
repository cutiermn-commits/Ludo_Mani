import { detectColors } from '../colorDetect';
import { cutoutBackground } from '../cutout';
import type { RGBAImage } from '../png';

/** Synthetic "photo": background function + a T-shirt shape, with a little sensor noise. */
function photo(w: number, h: number, bg: (x: number, y: number) => [number, number, number], shirt: [number, number, number] | null, opts: { noise?: number; scale?: number } = {}): RGBAImage {
  const data = new Uint8Array(w * h * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32 - 0.5) * (opts.noise ?? 6);
  const s = opts.scale ?? 1;
  const inShirt = (x: number, y: number) => {
    const cx = w / 2;
    const u = (x - cx) / (w * 0.5 * s);
    const v = (y - h * 0.18) / (h * 0.7 * s);
    if (v < 0 || v > 1) return false;
    if (v < 0.3) return Math.abs(u) < 0.95 - v * 0.8; // sleeves
    return Math.abs(u) < 0.5;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = shirt && inShirt(x, y) ? shirt : bg(x, y);
      const i = (y * w + x) * 4;
      data[i] = Math.max(0, Math.min(255, c[0] + rnd()));
      data[i + 1] = Math.max(0, Math.min(255, c[1] + rnd()));
      data[i + 2] = Math.max(0, Math.min(255, c[2] + rnd()));
      data[i + 3] = 255;
    }
  return { width: w, height: h, data };
}

const opaqueShare = (img: RGBAImage) => {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 0) n++;
  return n / (img.width * img.height);
};

describe('cutoutBackground', () => {
  it('cuts a red top off a plain light floor: background transparent, garment kept, cropped', () => {
    const res = cutoutBackground(photo(200, 200, () => [236, 232, 226], [205, 40, 45]));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.image.width).toBeLessThan(200);
    expect(res.image.height).toBeLessThan(200);
    expect(res.image.data[3]).toBe(0); // corner is transparent
    expect(opaqueShare(res.image)).toBeGreaterThan(0.4);
    expect(detectColors(res.image, 1)[0]).toBe('red'); // colours come from the garment only
  });

  it('follows a soft shadow / gradient across the background', () => {
    const res = cutoutBackground(photo(200, 200, (x, y) => [230 - x * 0.25 - y * 0.15, 226 - x * 0.25 - y * 0.15, 220 - x * 0.25], [30, 38, 82]));
    expect(res.ok).toBe(true);
    if (res.ok) expect(detectColors(res.image, 1)[0]).toBe('navy');
  });

  it('works for a white top on a dark bed cover', () => {
    const res = cutoutBackground(photo(160, 200, () => [45, 50, 70], [245, 245, 245]));
    expect(res.ok).toBe(true);
    if (res.ok) expect(detectColors(res.image, 1)[0]).toBe('white');
  });

  it('refuses a busy, patterned background', () => {
    const res = cutoutBackground(photo(200, 200, (x, y) => ((Math.floor(x / 9) + Math.floor(y / 9)) % 2 ? [200, 40, 160] : [30, 170, 60]), [240, 200, 40], { noise: 4 }));
    expect(res.ok).toBe(false);
  });

  it('refuses a garment that fills the whole frame or is cut off by it', () => {
    expect(cutoutBackground(photo(200, 200, () => [236, 232, 226], [205, 40, 45], { scale: 2.2 })).ok).toBe(false);
  });

  it('refuses a photo with no garment', () => {
    expect(cutoutBackground(photo(200, 200, () => [236, 232, 226], null))).toEqual({ ok: false, reason: 'no-garment' });
  });

  it('is fast enough for a 256 px photo', () => {
    const img = photo(256, 256, () => [236, 232, 226], [205, 40, 45]);
    const t0 = performance.now();
    cutoutBackground(img);
    expect(performance.now() - t0).toBeLessThan(1000); // plain Node is ~10× faster; guards against O(n²)
  });
});
