import { crc32 as nodeCrc32 } from 'zlib';

import { blurTop, SELFIE_BLUR } from '../blur';
import { decodePng, type RGBAImage } from '../png';
import { crc32, encodePng } from '../pngEncode';

/** A checkerboard: maximum detail, so any real blur shows up as lost contrast. */
function checker(w: number, h: number, cell = 2): RGBAImage {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? 255 : 0;
      data.set([v, v, v, 255], (y * w + x) * 4);
    }
  return { width: w, height: h, data };
}

/** Mean absolute difference between horizontal neighbours in rows [y0, y1): a "detail" measure. */
function detail(img: RGBAImage, y0: number, y1: number): number {
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = 1; x < img.width; x++) {
      s += Math.abs(img.data[(y * img.width + x) * 4] - img.data[(y * img.width + x - 1) * 4]);
      n++;
    }
  return s / n;
}

describe('encodePng', () => {
  it('round-trips through our decoder', () => {
    const img = checker(37, 23, 3);
    img.data[5] = 77; // some non-binary values
    expect(decodePng(encodePng(img))).toEqual(img);
  });
  it('handles images bigger than one stored block (64 KiB)', () => {
    const img = checker(200, 120);
    expect(decodePng(encodePng(img)).data).toEqual(img.data);
  });
  it('crc32 matches Node', () => {
    const bytes = new Uint8Array([...Array(500)].map((_, i) => (i * 31) & 255));
    expect(crc32(bytes)).toBe(nodeCrc32(Buffer.from(bytes)) >>> 0);
  });
});

describe('blurTop (selfie privacy blur)', () => {
  const img = checker(120, 160);
  const out = blurTop(img);
  const full = Math.round(160 * SELFIE_BLUR.blurShare);
  const fadeEnd = full + Math.round(160 * SELFIE_BLUR.fadeShare);

  it('wipes out detail in the face area', () => {
    expect(detail(img, 0, full)).toBeGreaterThan(100);
    expect(detail(out, 0, full)).toBeLessThan(5);
  });
  it('leaves the outfit area below the fade untouched', () => {
    for (let y = fadeEnd; y < 160; y++) {
      const row = y * 120 * 4;
      expect(Array.from(out.data.subarray(row, row + 120 * 4))).toEqual(Array.from(img.data.subarray(row, row + 120 * 4)));
    }
  });
  it('fades between the two (no hard edge)', () => {
    const mid = Math.round((full + fadeEnd) / 2);
    const d = detail(out, mid, mid + 1);
    expect(d).toBeGreaterThan(detail(out, 0, full));
    expect(d).toBeLessThan(detail(img, mid, mid + 1));
  });
  it('does not change the input image', () => {
    expect(img.data).toEqual(checker(120, 160).data);
  });
  it('works on tiny images', () => {
    expect(() => blurTop(checker(3, 3, 1))).not.toThrow();
  });
  it('"blur the whole photo" leaves no detail anywhere', () => {
    const all = blurTop(img, { blurShare: 1 });
    expect(detail(all, 0, 160)).toBeLessThan(5);
  });
  it('is fast enough for a 360×480 selfie', () => {
    const big = checker(360, 480);
    const t0 = performance.now();
    blurTop(big);
    // ~5 ms in plain Node; coverage instrumentation inflates it. Guards against an accidental O(n²).
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
