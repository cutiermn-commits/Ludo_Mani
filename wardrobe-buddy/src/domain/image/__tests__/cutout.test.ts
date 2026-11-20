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

  /** Share of the cut-out's solid pixels that are the yellow garment (not pattern). */
  const purity = (img: RGBAImage) => {
    let opaque = 0;
    let garment = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i + 3] < 255) continue;
      opaque++;
      if (Math.abs(img.data[i] - 240) < 30 && Math.abs(img.data[i + 1] - 200) < 30 && Math.abs(img.data[i + 2] - 40) < 30) garment++;
    }
    return garment / Math.max(1, opaque);
  };

  it('busy, many-coloured background (a patterned rug): clean cut-out or refusal, never rug in the garment', () => {
    const rug = (x: number, y: number): [number, number, number] => [128 + 90 * Math.sin(x * 0.2) * Math.cos(y * 0.16), 120 + 80 * Math.sin((x + y) * 0.12), 140 + 70 * Math.cos(x * 0.08 - y * 0.24)];
    const res = cutoutBackground(photo(200, 200, rug, [240, 200, 40], { noise: 4 }));
    if (res.ok) expect(purity(res.image)).toBeGreaterThan(0.97);
  });

  it('a two-colour pattern (checks, tiles) with a clearly different garment: clean cut-out or refusal, never pattern in the garment', () => {
    const res = cutoutBackground(photo(200, 200, (x, y) => ((Math.floor(x / 9) + Math.floor(y / 9)) % 2 ? [200, 40, 160] : [30, 170, 60]), [240, 200, 40], { noise: 4 }));
    if (res.ok) expect(purity(res.image)).toBeGreaterThan(0.97);
  });

  it('refuses a garment that fills the whole frame or is cut off by it', () => {
    expect(cutoutBackground(photo(200, 200, () => [236, 232, 226], [205, 40, 45], { scale: 2.2 })).ok).toBe(false);
  });

  it('keeps both shoes of a pair (two separate regions)', () => {
    const w = 200;
    const img = photo(w, 200, (x, y) => [196 - y * 0.1, 160 - y * 0.1, 120], null);
    for (let y = 90; y < 160; y++)
      for (const x0 of [40, 120])
        for (let x = x0; x < x0 + 40; x++) img.data.set([90, 55, 30, 255], (y * w + x) * 4);
    const res = cutoutBackground(img);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.image.width).toBeGreaterThan(110); // spans both shoes
  });

  it('beige top on a beige floor: either a clean cut-out or an honest refusal, never a garment half eaten', () => {
    const res = cutoutBackground(photo(200, 200, () => [222, 205, 178], [196, 175, 140]));
    if (res.ok) expect(opaqueShare(res.image)).toBeGreaterThan(0.4);
  });

  it('a hard shadow next to the garment does not swallow the cut-out', () => {
    const w = 200;
    const img = photo(w, 200, () => [236, 232, 226], [205, 40, 45]);
    for (let y = 60; y < 170; y++) for (let x = 150; x < 175; x++) img.data.set([150, 148, 144, 255], (y * w + x) * 4);
    const res = cutoutBackground(img);
    expect(res.ok).toBe(true);
    if (res.ok) expect(detectColors(res.image, 1)[0]).toBe('red');
  });

  it('refuses a person photographed from the waist up (touches the bottom edge)', () => {
    const w = 200;
    const h = 200;
    const img = photo(w, h, () => [236, 232, 226], null);
    for (let y = 30; y < h; y++)
      for (let x = 0; x < w; x++) {
        const head = y < 80 && (x - 100) ** 2 + (y - 55) ** 2 < 25 ** 2;
        const body = y >= 80 && Math.abs(x - 100) < 55;
        if (head) img.data.set([226, 186, 160, 255], (y * w + x) * 4);
        if (body) img.data.set([60, 92, 150, 255], (y * w + x) * 4);
      }
    expect(cutoutBackground(img)).toEqual({ ok: false, reason: 'cut-off' });
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
