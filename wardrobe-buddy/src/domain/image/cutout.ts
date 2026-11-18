import type { RGBAImage } from './png';

/**
 * Background removal for clothing photos (D-059), on the device, in our own code: there is no
 * segmentation module in Expo SDK 58. Works for the case the app asks for: a garment laid flat
 * (or hung) against a fairly plain floor, bed or wall.
 *
 * 1. The background colour is the median of the photo's border pixels.
 * 2. A flood fill from the border marks background: pixels close to that colour, or close to
 *    their already-filled neighbour (so soft shadows and gradients are followed).
 * 3. The large remaining regions are the garment (a pair of shoes is two); specks are dropped,
 *    the edge is softened, and the result is cropped to the garment.
 * 4. A quality check refuses busy backgrounds and garments cut off by the frame; the app then
 *    keeps showing the normal photo tile instead of a bad cut-out.
 * All thresholds are ASSUMPTION starting values, tested on synthetic photos (see tests).
 */
export const CUTOUT = {
  border: 2,
  minThreshold: 20,
  maxThreshold: 62,
  neighbourStep: 12,
  minForeground: 0.04,
  maxForeground: 0.9,
  /** Garment pixels allowed on the whole border ring, and on any one side. A flat-lay never
   *  reaches the frame; a person photographed from the waist up does (privacy audit, D-059). */
  maxBorderTouch: 0.2,
  maxSideTouch: 0.35,
  /** Kept area must fill at least this share of its bounding box (catches leaky, stringy fills). */
  minBoxFill: 0.22,
  /** Regions at least this share of all foreground are kept (a pair of shoes or gloves is two). */
  minKeptRegion: 0.15,
  /** The kept regions must hold this share of all foreground (garment(s), not scattered noise). */
  minMainRegion: 0.6,
  margin: 3,
} as const;

export type CutoutResult =
  | { ok: true; image: RGBAImage; foregroundShare: number }
  | { ok: false; reason: 'busy-background' | 'no-garment' | 'fills-frame' | 'cut-off' };

/** Squared "redmean" distance, scaled so that sqrt(dist2) matches the old 0–255-ish range. No sqrt in the hot loop. */
function dist2(d: Uint8Array, i: number, r: number, g: number, b: number): number {
  const rm = (d[i] + r) / 2;
  const dr = d[i] - r;
  const dg = d[i + 1] - g;
  const db = d[i + 2] - b;
  return ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) / 9;
}
const dist = (d: Uint8Array, i: number, r: number, g: number, b: number) => Math.sqrt(dist2(d, i, r, g, b));

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

export function cutoutBackground(img: RGBAImage, opts: Partial<typeof CUTOUT> = {}): CutoutResult {
  const o = { ...CUTOUT, ...opts };
  const { width: w, height: h, data: d } = img;
  const n = w * h;
  if (w < 8 || h < 8) return { ok: false, reason: 'no-garment' };

  // 1. Background colour and how much it varies, from the border ring.
  const border: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (x < o.border || y < o.border || x >= w - o.border || y >= h - o.border) border.push(y * w + x);
  const bg = [0, 1, 2].map((c) => median(border.map((p) => d[p * 4 + c])));
  const spread = median(border.map((p) => dist(d, p * 4, bg[0], bg[1], bg[2])));
  const T = Math.min(o.maxThreshold, Math.max(o.minThreshold, 14 + spread * 2.5));
  const T2 = T * T;
  const seed2 = (T * 1.6) ** 2;
  // Following a gradient (soft shadow) is allowed only up to 1.6×T from the background, so a
  // garment close to the floor colour isn't slowly eaten (architecture review).
  const grad2 = (T * 1.6) ** 2;
  const step2 = o.neighbourStep * o.neighbourStep;

  // 2. Flood fill the background from the border.
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (const p of border) {
    if (dist2(d, p * 4, bg[0], bg[1], bg[2]) < seed2) {
      isBg[p] = 1;
      queue[tail++] = p;
    }
  }
  const visit = (p: number, q: number) => {
    if (isBg[q]) return;
    const toBg = dist2(d, q * 4, bg[0], bg[1], bg[2]);
    if (toBg < T2 || (toBg < grad2 && dist2(d, q * 4, d[p * 4], d[p * 4 + 1], d[p * 4 + 2]) < step2)) {
      isBg[q] = 1;
      queue[tail++] = q;
    }
  };
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    if (x > 0) visit(p, p - 1);
    if (x < w - 1) visit(p, p + 1);
    if (p >= w) visit(p, p - w);
    if (p < n - w) visit(p, p + w);
  }

  // 3. Foreground regions.
  const label = new Int32Array(n);
  const sizes: number[] = [0];
  let fgTotal = 0;
  let next = 0;
  for (let s = 0; s < n; s++) {
    if (isBg[s] || label[s]) continue;
    next++;
    let size = 0;
    head = 0;
    tail = 0;
    queue[tail++] = s;
    label[s] = next;
    const add = (q: number) => {
      if (!isBg[q] && !label[q]) {
        label[q] = next;
        queue[tail++] = q;
      }
    };
    while (head < tail) {
      const p = queue[head++];
      size++;
      const x = p % w;
      if (x > 0) add(p - 1);
      if (x < w - 1) add(p + 1);
      if (p >= w) add(p - w);
      if (p < n - w) add(p + w);
    }
    fgTotal += size;
    sizes.push(size);
  }
  const keepLabel = new Uint8Array(next + 1);
  let keptSize = 0;
  for (let l = 1; l <= next; l++) {
    if (sizes[l] >= o.minKeptRegion * fgTotal) {
      keepLabel[l] = 1;
      keptSize += sizes[l];
    }
  }
  const kept = (p: number) => keepLabel[label[p]] === 1;

  // 4. Quality checks.
  const share = keptSize / n;
  if (keptSize === 0 || share < o.minForeground) return { ok: false, reason: fgTotal / n > 0.3 ? 'busy-background' : 'no-garment' };
  if (share > o.maxForeground) return { ok: false, reason: 'fills-frame' };
  if (keptSize / fgTotal < o.minMainRegion) return { ok: false, reason: 'busy-background' };
  const touching = border.filter((p) => kept(p)).length / border.length;
  if (touching > o.maxBorderTouch) return { ok: false, reason: 'cut-off' };
  const side = (pts: number[]) => pts.filter((p) => kept(p)).length / pts.length;
  const sides = [
    Array.from({ length: w }, (_, x) => x),
    Array.from({ length: w }, (_, x) => (h - 1) * w + x),
    Array.from({ length: h }, (_, y) => y * w),
    Array.from({ length: h }, (_, y) => y * w + w - 1),
  ];
  if (sides.some((pts) => side(pts) > o.maxSideTouch)) return { ok: false, reason: 'cut-off' };

  // 5. Crop to the garment, transparent background, softened edge.
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let p = 0; p < n; p++) {
    if (!kept(p)) continue;
    const x = p % w;
    const y = (p - x) / w;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  x0 = Math.max(0, x0 - o.margin);
  y0 = Math.max(0, y0 - o.margin);
  x1 = Math.min(w - 1, x1 + o.margin);
  y1 = Math.min(h - 1, y1 + o.margin);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  if (keptSize / (cw * ch) < o.minBoxFill) return { ok: false, reason: 'busy-background' };
  const out = new Uint8Array(cw * ch * 4);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * w + x;
      const o4 = ((y - y0) * cw + (x - x0)) * 4;
      if (!kept(p)) continue; // stays transparent
      const edge = (x > 0 && !kept(p - 1)) || (x < w - 1 && !kept(p + 1)) || (y > 0 && !kept(p - w)) || (y < h - 1 && !kept(p + w));
      out[o4] = d[p * 4];
      out[o4 + 1] = d[p * 4 + 1];
      out[o4 + 2] = d[p * 4 + 2];
      out[o4 + 3] = edge ? 150 : 255;
    }
  }
  return { ok: true, image: { width: cw, height: ch, data: out }, foregroundShare: share };
}
