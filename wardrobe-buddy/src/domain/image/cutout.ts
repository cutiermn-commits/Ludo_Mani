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
  minThreshold: 12,
  maxThreshold: 50,
  /** How much darker (shadow) or lighter a background colour may get and still count as background. */
  darker: 0.8,
  lighter: 1.08,
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
  /** Colour distance from the border's main colour that counts as "not floor" at the frame's edge. */
  foreign: 45,
  /** Gap closing radius in pixels (stripes, seams) at the cut-out working size. */
  close: 2,
  /** Refuse when closing the outline would add more than this share (a bitten, ragged cut). */
  maxRagged: 0.12,
} as const;

export type CutoutResult =
  | { ok: true; image: RGBAImage; foregroundShare: number; crop: { x: number; y: number; w: number; h: number } }
  | { ok: false; reason: 'busy-background' | 'no-garment' | 'fills-frame' | 'cut-off' };

/** Squared "redmean" distance, scaled so that sqrt(dist2) matches the old 0–255-ish range. No sqrt in the hot loop. */
function dist2(d: Uint8Array, i: number, r: number, g: number, b: number): number {
  const rm = (d[i] + r) / 2;
  const dr = d[i] - r;
  const dg = d[i + 1] - g;
  const db = d[i + 2] - b;
  return ((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) / 9;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

/** Small k-means on chosen pixels (deterministic: spread-out start, a few rounds). */
function kmeans(d: Uint8Array, pixels: number[], k: number): { rgb: number[]; share: number }[] {
  const step = Math.max(1, Math.floor(pixels.length / 3000));
  const sample: number[] = [];
  for (let i = 0; i < pixels.length; i += step) sample.push(pixels[i] * 4);
  if (!sample.length) return [];
  const centres: number[][] = [[d[sample[0]], d[sample[0] + 1], d[sample[0] + 2]]];
  while (centres.length < k) {
    let far = sample[0];
    let farD = -1;
    for (const i of sample) {
      let m = Infinity;
      for (const c of centres) m = Math.min(m, dist2(d, i, c[0], c[1], c[2]));
      if (m > farD) {
        farD = m;
        far = i;
      }
    }
    if (farD <= 0) break;
    centres.push([d[far], d[far + 1], d[far + 2]]);
  }
  let counts = centres.map(() => 0);
  for (let round = 0; round < 6; round++) {
    const sums = centres.map(() => [0, 0, 0]);
    counts = centres.map(() => 0);
    for (const i of sample) {
      let best = 0;
      let bestD = Infinity;
      centres.forEach((c, j) => {
        const v = dist2(d, i, c[0], c[1], c[2]);
        if (v < bestD) {
          bestD = v;
          best = j;
        }
      });
      sums[best][0] += d[i];
      sums[best][1] += d[i + 1];
      sums[best][2] += d[i + 2];
      counts[best]++;
    }
    centres.forEach((c, j) => {
      if (counts[j]) for (let ch = 0; ch < 3; ch++) c[ch] = sums[j][ch] / counts[j];
    });
  }
  return centres.map((rgb, j) => ({ rgb, share: counts[j] / sample.length }));
}

/**
 * Box blur of the colour channels with radius r (sliding sums, one pass each way), for
 * classifying only. Alpha is copied.
 */
function smooth(d: Uint8Array, w: number, h: number, r = 2): Uint8Array {
  const out = d.slice();
  const tmp = new Float32Array(w * h);
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += d[(row + Math.min(w - 1, Math.max(0, x))) * 4 + c];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / (2 * r + 1);
        sum += d[(row + Math.min(w - 1, x + r + 1)) * 4 + c] - d[(row + Math.max(0, x - r)) * 4 + c];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[(y * w + x) * 4 + c] = sum / (2 * r + 1);
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
  return out;
}

/** Square erosion: the opposite of dilate. */
function erode(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const inv = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1;
  const grown = dilate(inv, w, h, r);
  for (let i = 0; i < m.length; i++) inv[i] = grown[i] ? 0 : 1;
  return inv;
}

/** Square dilation of a 0/1 mask by r pixels (two separable passes). */
function dilate(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return m.slice();
  const a = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) {
    let last = -Infinity;
    let nextOn = Infinity;
    // left-to-right: distance to the last "on"; right-to-left: to the next "on".
    const row = y * w;
    const left = new Int32Array(w);
    for (let x = 0; x < w; x++) {
      if (m[row + x]) last = x;
      left[x] = x - last <= r ? 1 : 0;
    }
    for (let x = w - 1; x >= 0; x--) {
      if (m[row + x]) nextOn = x;
      a[row + x] = left[x] || nextOn - x <= r ? 1 : 0;
    }
  }
  const out = new Uint8Array(m.length);
  for (let x = 0; x < w; x++) {
    let last = -Infinity;
    const up = new Uint8Array(h);
    for (let y = 0; y < h; y++) {
      if (a[y * w + x]) last = y;
      up[y] = y - last <= r ? 1 : 0;
    }
    let nextOn = Infinity;
    for (let y = h - 1; y >= 0; y--) {
      if (a[y * w + x]) nextOn = y;
      out[y * w + x] = up[y] || nextOn - y <= r ? 1 : 0;
    }
  }
  return out;
}

export function cutoutBackground(img: RGBAImage, opts: Partial<typeof CUTOUT> = {}): CutoutResult {
  const o = { ...CUTOUT, ...opts };
  const { width: w, height: h, data: d } = img;
  const n = w * h;
  if (w < 8 || h < 8) return { ok: false, reason: 'no-garment' };

  // 1. Background colours from the border ring: a few clusters (wood planks, floor and shade,
  //    tiles and grout), plus the same colours in soft shadow.
  const ring = Math.max(o.border, Math.round(Math.min(w, h) * 0.02));
  const border: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (x < ring || y < ring || x >= w - ring || y >= h - ring) border.push(y * w + x);
  // Work on a lightly smoothed copy: carpet fibres, wood grain and camera noise average out.
  // Same smoothing and gap closing at every working size (tuned at 160 px wide; D-068).
  const k160 = Math.max(1, Math.round(Math.min(w, h) / 160));
  const sm = smooth(d, w, h, 1 + k160);
  // Privacy guard first (D-059): something unlike the floor running into the frame's edge (a
  // person, a garment cut off by the frame) means "no cut-out", whatever the colour clusters say.
  // Measured against the border's main colour only, so a person can never become "background".
  const main = [0, 1, 2].map((c) => median(border.map((p) => sm[p * 4 + c])));
  const toMain = (i: number) => {
    const cc = main[0] * main[0] + main[1] * main[1] + main[2] * main[2] || 1;
    const k = Math.min(o.lighter, Math.max(o.darker, (sm[i] * main[0] + sm[i + 1] * main[1] + sm[i + 2] * main[2]) / cc));
    return Math.sqrt(dist2(sm, i, main[0] * k, main[1] * k, main[2] * k));
  };
  const mainSpread = median(border.map((p) => toMain(p * 4)));
  const foreignT = Math.max(o.foreign, mainSpread * 3);
  const edgeRows = [
    Array.from({ length: w }, (_, x) => x),
    Array.from({ length: w }, (_, x) => (h - 1) * w + x),
    Array.from({ length: h }, (_, y) => y * w),
    Array.from({ length: h }, (_, y) => y * w + w - 1),
  ];
  const foreignShare = (pts: number[]) => pts.filter((p) => toMain(p * 4) > foreignT).length / pts.length;
  const sideShares = edgeRows.map(foreignShare);
  if (sideShares.some((v) => v > o.maxSideTouch) || sideShares.reduce((a, b) => a + b, 0) / 4 > o.maxBorderTouch) {
    // Mostly foreign all round is a busy background; one or two sides is something cut off.
    return { ok: false, reason: sideShares.filter((v) => v > o.maxSideTouch).length >= 3 ? 'busy-background' : 'cut-off' };
  }

  const bgClusters = kmeans(sm, border, 4)
    .filter((c) => c.share >= 0.03)
    .map((c) => c.rgb);
  // Distance to the nearest background colour, allowing it to be a bit darker or lighter
  // (soft shadow next to the garment, light falling off across the room).
  const ccs = bgClusters.map((c) => c[0] * c[0] + c[1] * c[1] + c[2] * c[2] || 1);
  const toBg = (i: number) => {
    let best = Infinity;
    for (let j = 0; j < bgClusters.length; j++) {
      const c = bgClusters[j];
      const k = Math.min(o.lighter, Math.max(o.darker, (sm[i] * c[0] + sm[i + 1] * c[1] + sm[i + 2] * c[2]) / ccs[j]));
      const v = dist2(sm, i, c[0] * k, c[1] * k, c[2] * k);
      if (v < best) best = v;
    }
    return Math.sqrt(best);
  };
  const dBg = new Float32Array(n);
  for (let p = 0; p < n; p++) dBg[p] = toBg(p * 4);
  const spread = median(border.map((p) => dBg[p]));
  const T = Math.min(o.maxThreshold, Math.max(o.minThreshold, 8 + spread * 3));
  const nearest2 = (i: number, model: number[][]) => {
    let best = Infinity;
    for (const c of model) {
      const v = dist2(sm, i, c[0], c[1], c[2]);
      if (v < best) best = v;
    }
    return best;
  };

  // 2. Garment colours: clusters of the pixels that are clearly not background.
  const strong: number[] = [];
  for (let p = 0; p < n; p++) if (dBg[p] > T * 1.6) strong.push(p);
  const fgModel = strong.length >= n * 0.01 ? kmeans(sm, strong, 3).filter((c) => c.share >= 0.05).map((c) => c.rgb) : [];
  // A pixel is garment when it is away from every background colour and nearer a garment colour.
  const fg = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    if (dBg[p] <= T) continue;
    fg[p] = fgModel.length === 0 || Math.sqrt(nearest2(p * 4, fgModel)) < dBg[p] * 1.15 ? 1 : 0;
  }
  // Close small gaps (stripes, seams, highlights) so background can't run into the garment,
  // then flood the background in from the border.
  const grown = dilate(fg, w, h, o.close * k160);
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (const p of border) {
    if (!grown[p]) {
      isBg[p] = 1;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const visit = (q: number) => {
      if (!isBg[q] && !grown[q]) {
        isBg[q] = 1;
        queue[tail++] = q;
      }
    };
    if (x > 0) visit(p - 1);
    if (x < w - 1) visit(p + 1);
    if (p >= w) visit(p - w);
    if (p < n - w) visit(p + w);
  }
  // Undo the growing at the outside edge: background next to the reached background is background.
  const shrink = dilate(isBg, w, h, o.close * k160);
  for (let p = 0; p < n; p++) if (shrink[p] && !fg[p]) isBg[p] = 1;

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
  // The garment: kept regions with their enclosed holes filled (checks, stripes and prints that
  // look like the floor are still the garment).
  const solid = new Uint8Array(n);
  for (let p = 0; p < n; p++) solid[p] = keepLabel[label[p]] === 1 ? 1 : 0;
  const outside = new Uint8Array(n);
  head = 0;
  tail = 0;
  for (const p of border) {
    if (!solid[p] && !outside[p]) {
      outside[p] = 1;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const go = (q: number) => {
      if (!solid[q] && !outside[q]) {
        outside[q] = 1;
        queue[tail++] = q;
      }
    };
    if (x > 0) go(p - 1);
    if (x < w - 1) go(p + 1);
    if (p >= w) go(p - w);
    if (p < n - w) go(p + w);
  }
  let filledSize = 0;
  for (let p = 0; p < n; p++) {
    if (!outside[p]) solid[p] = 1;
    filledSize += solid[p];
  }
  const kept = (p: number) => solid[p] === 1;

  // 4. Quality checks.
  // First: a garment (or a person) running off the frame is never cut out (privacy audit, D-059).
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
  const share = keptSize / n;
  if (keptSize === 0 || share < o.minForeground) return { ok: false, reason: fgTotal / n > 0.3 ? 'busy-background' : 'no-garment' };
  if (share > o.maxForeground) return { ok: false, reason: 'fills-frame' };
  if (keptSize / fgTotal < o.minMainRegion) return { ok: false, reason: 'busy-background' };
  // A ragged, bitten outline means the floor and the garment were mixed up: say so instead.
  const R = Math.max(3, Math.round(Math.min(w, h) * 0.03));
  const closed = erode(dilate(solid, w, h, R), w, h, R);
  let bites = 0;
  for (let p = 0; p < n; p++) if (closed[p] && !solid[p]) bites++;
  if (filledSize && bites / filledSize > o.maxRagged) return { ok: false, reason: 'busy-background' };

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
  return { ok: true, image: { width: cw, height: ch, data: out }, foregroundShare: share, crop: { x: x0, y: y0, w: cw, h: ch } };
}
