import type { RGBAImage } from '@/domain/image/png';
import type { Category, GarmentShape, SleeveShape, Subcategory } from '@/domain/types';

/**
 * Reads a garment's shape from its cut-out (D-068), so it can be worn properly instead of being
 * stretched by its outline:
 * - which way up it was photographed (flat-lay photos are often sideways or upside down);
 * - its body: the centre line, the width of the body (without the sleeves) and where the shoulder
 *   seams or the waistband are;
 * - its sleeves: where they start and which way they point, so they can follow the arms.
 * Pure code on the cut-out's transparency; all values are shares of the cut-out (x of its width,
 * y of its height). Thresholds are ASSUMPTION starting values, measured on the synthetic photo
 * set in scripts/fit-lab (no real-photo dataset can be used here).
 */

export interface Mask {
  width: number;
  height: number;
  /** 1 = garment, 0 = background. */
  on: Uint8Array;
}

export function maskOf(img: RGBAImage, minAlpha = 64): Mask {
  const n = img.width * img.height;
  const on = new Uint8Array(n);
  for (let p = 0; p < n; p++) on[p] = img.data[p * 4 + 3] >= minAlpha ? 1 : 0;
  return { width: img.width, height: img.height, on };
}

/** Quarter turns clockwise. */
export type Turn = 0 | 1 | 2 | 3;

/** Turns a picture a number of quarter turns clockwise (pixel exact). */
export function turnImage<T extends { width: number; height: number }>(img: T & { data: Uint8Array }, turns: Turn, channels = 4): T {
  if (turns === 0) return img;
  const { width: w, height: h, data } = img;
  const W = turns % 2 ? h : w;
  const H = turns % 2 ? w : h;
  const out = new Uint8Array(W * H * channels);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let X: number;
      let Y: number;
      if (turns === 1) {
        X = h - 1 - y;
        Y = x;
      } else if (turns === 2) {
        X = w - 1 - x;
        Y = h - 1 - y;
      } else {
        X = y;
        Y = w - 1 - x;
      }
      const s = (y * w + x) * channels;
      const o = (Y * W + X) * channels;
      for (let c = 0; c < channels; c++) out[o + c] = data[s + c];
    }
  }
  return { ...img, width: W, height: H, data: out };
}

export function turnMask(m: Mask, turns: Turn): Mask {
  const t = turnImage({ width: m.width, height: m.height, data: m.on }, turns, 1);
  return { width: t.width, height: t.height, on: t.data };
}

const at = (m: Mask, x: number, y: number) => (x >= 0 && y >= 0 && x < m.width && y < m.height ? m.on[y * m.width + x] : 0);

/** The run of garment pixels in row y that contains x (or the nearest run within `reach`). */
function runAt(m: Mask, y: number, x: number, reach: number): [number, number] | null {
  let c = Math.round(x);
  if (!at(m, c, y)) {
    let found = -1;
    for (let d = 1; d <= reach && found < 0; d++) {
      if (at(m, c - d, y)) found = c - d;
      else if (at(m, c + d, y)) found = c + d;
    }
    if (found < 0) return null;
    c = found;
  }
  let a = c;
  let b = c;
  while (at(m, a - 1, y)) a--;
  while (at(m, b + 1, y)) b++;
  return [a, b];
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

function bounds(m: Mask) {
  let x0 = m.width;
  let y0 = m.height;
  let x1 = -1;
  let y1 = -1;
  let n = 0;
  let sx = 0;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (m.on[y * m.width + x]) {
        n++;
        sx += x;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1, n, cx: n ? sx / n : m.width / 2 };
}

/** Lowest (or highest) garment pixel in each column, over the middle part of the garment. */
function edgeProfile(m: Mask, from: 'top' | 'bottom', x0: number, x1: number): number[] {
  const out: number[] = [];
  for (let x = Math.round(x0); x <= Math.round(x1); x++) {
    let y = from === 'top' ? 0 : m.height - 1;
    const step = from === 'top' ? 1 : -1;
    while (y >= 0 && y < m.height && !at(m, x, y)) y += step;
    if (y >= 0 && y < m.height) out.push(y);
  }
  return out;
}

/** Share of a straight, level edge: how many columns end within `tol` of the typical end. */
function flatness(edge: number[], tol: number): number {
  if (!edge.length) return 0;
  const med = median(edge);
  return edge.filter((y) => Math.abs(y - med) <= tol).length / edge.length;
}

/** Average filled width of the rows between two shares of the height. */
function bandWidth(m: Mask, y0: number, y1: number, b: ReturnType<typeof bounds>): number {
  const h = b.y1 - b.y0 + 1;
  let sum = 0;
  let rows = 0;
  for (let y = Math.round(b.y0 + y0 * h); y < Math.round(b.y0 + y1 * h); y++) {
    let c = 0;
    for (let x = b.x0; x <= b.x1; x++) c += at(m, x, y);
    sum += c;
    rows++;
  }
  return rows ? sum / rows : 0;
}

/** Is there a gap between two legs in the middle of the bottom part? */
function legGap(m: Mask, b: ReturnType<typeof bounds>): number {
  const h = b.y1 - b.y0 + 1;
  let gaps = 0;
  let rows = 0;
  for (let y = Math.round(b.y0 + 0.7 * h); y < Math.round(b.y0 + 0.97 * h); y++) {
    rows++;
    // A row "has a gap" when it has two runs of garment with background between them near the middle.
    let runs = 0;
    let inRun = false;
    for (let x = b.x0; x <= b.x1; x++) {
      const v = at(m, x, y);
      if (v && !inRun) runs++;
      inRun = !!v;
    }
    if (runs >= 2 && !at(m, Math.round((b.x0 + b.x1) / 2), y)) gaps++;
  }
  return rows ? gaps / rows : 0;
}

const isLegwear = (sub?: Subcategory) => sub === 'jeans' || sub === 'trousers' || sub === 'leggings' || sub === 'shorts';

/** How alike the garment is to its own mirror image, left–right (clothes are symmetric when upright). */
export function mirrorMatch(m: Mask): number {
  const b = bounds(m);
  if (!b.n) return 0;
  let both = 0;
  let either = 0;
  for (let y = b.y0; y <= b.y1; y++)
    for (let x = b.x0; x <= b.x1; x++) {
      const a = at(m, x, y);
      const mx = Math.round(2 * b.cx - x);
      const c = at(m, mx, y);
      if (a && c) both++;
      if (a || c) either++;
    }
  return either ? both / either : 0;
}

/**
 * How much an upright or upside-down mask looks the right way up (higher is better): a straight
 * hem at the bottom and a neckline at the top for tops and dresses; a straight waistband at the
 * top and two legs at the bottom for trousers; wider at the hem for skirts and dresses.
 */
export function uprightScore(m: Mask, category: Category, sub?: Subcategory): number {
  const b = bounds(m);
  if (!b.n) return 0;
  const w = b.x1 - b.x0 + 1;
  const h = b.y1 - b.y0 + 1;
  const tol = Math.max(2, h * 0.025);
  // Judge the edges across the middle of the body, not the sleeves: the run through the centre
  // at mid-height is the body (or, for trousers, the hips).
  const run = runAt(m, Math.round(b.y0 + h * 0.5), b.cx, w * 0.1);
  const mid0 = run ? run[0] + (run[1] - run[0]) * 0.15 : b.x0 + w * 0.3;
  const mid1 = run ? run[1] - (run[1] - run[0]) * 0.15 : b.x0 + w * 0.7;
  const topFlat = flatness(edgeProfile(m, 'top', mid0, mid1), tol);
  const lowFlat = flatness(edgeProfile(m, 'bottom', mid0, mid1), tol);
  const topW = bandWidth(m, 0.02, 0.2, b);
  const lowW = bandWidth(m, 0.8, 0.98, b);
  const flare = lowW > topW * 1.15 ? 1 : lowW < topW * 0.87 ? -1 : 0;
  switch (category) {
    case 'top':
    case 'outerwear':
      return lowFlat - topFlat;
    case 'dress':
      return lowFlat - topFlat + flare;
    case 'bottom':
      if (isLegwear(sub)) return topFlat - lowFlat + legGap(m, b) - legGap(turnMask(m, 2), bounds(turnMask(m, 2)));
      return topFlat - lowFlat + flare;
    default:
      return 0;
  }
}

/**
 * Which quarter turn (clockwise) puts the garment the right way up. First the symmetry decides
 * between "up or down" and "sideways"; then the garment's own features decide which end is up.
 * Only turns when the evidence is clear; shoes and accessories are left as photographed.
 */
export function uprightTurn(m: Mask, category: Category, sub?: Subcategory): Turn {
  if (category === 'shoes' || category === 'accessory') return 0;
  const upright = mirrorMatch(m);
  const sideways = mirrorMatch(turnMask(m, 1));
  const base: Turn = sideways > upright + 0.04 ? 1 : 0;
  const first = turnMask(m, base);
  const a = uprightScore(first, category, sub);
  const z = uprightScore(turnMask(first, 2), category, sub);
  if (z > a + 0.25) return ((base + 2) % 4) as Turn;
  return base;
}

function sleeveOf(m: Mask, side: -1 | 1, cx: number, bodyHalf: number, shoulderY: number, maxY: number): SleeveShape | undefined {
  const pts: [number, number][] = [];
  const edge = cx + side * bodyHalf * 1.08;
  for (let y = 0; y < Math.min(m.height, maxY); y++)
    for (let x = 0; x < m.width; x++) if (m.on[y * m.width + x] && side * (x - edge) > 0) pts.push([x, y]);
  if (pts.length < 0.02 * m.width * m.height) return undefined;
  // Pivot: the shoulder seam. Direction: from the armhole middle to the sleeve's centre of mass.
  const pivot = { x: cx + side * bodyHalf, y: shoulderY };
  const armhole = { x: pivot.x, y: shoulderY + bodyHalf * 0.45 };
  const c = pts.reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]).map((v) => v / pts.length);
  let dx = c[0] - armhole.x;
  let dy = c[1] - armhole.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  // Length: furthest sleeve pixel along the direction; width: spread across it.
  let far = 0;
  let across = 0;
  for (const [x, y] of pts) {
    const along = (x - pivot.x) * dx + (y - pivot.y) * dy;
    if (along > far) far = along;
    across = Math.max(across, Math.abs(-(x - c[0]) * dy + (y - c[1]) * dx));
  }
  const angle = (Math.atan2(dy, side * dx) * 180) / Math.PI; // degrees below horizontal, outwards
  return {
    pivot: { x: pivot.x / m.width, y: pivot.y / m.height },
    angle: Math.round(angle * 10) / 10,
    length: far / m.width,
    width: (across * 2) / m.width,
  };
}

/**
 * The garment's shape, read from an upright mask. Returns undefined for shoes/accessories or
 * when nothing sensible can be measured (the app then falls back to the outline).
 */
export function garmentShape(m: Mask, category: Category, sub?: Subcategory): GarmentShape | undefined {
  const b = bounds(m);
  if (!b.n || category === 'shoes' || category === 'accessory') return undefined;
  const h = b.y1 - b.y0 + 1;
  const rowsBetween = (a: number, z: number) => {
    const out: number[] = [];
    for (let y = Math.round(b.y0 + a * h); y <= Math.round(b.y0 + z * h); y++) out.push(y);
    return out;
  };
  const measure = (rows: number[], cx: number) => {
    const runs = rows.map((y) => runAt(m, y, cx, m.width * 0.08)).filter((r): r is [number, number] => !!r);
    if (runs.length < rows.length * 0.5) return null;
    return { half: median(runs.map(([a, z]) => (z - a + 1) / 2)), mid: median(runs.map(([a, z]) => (a + z) / 2)) };
  };

  if (category === 'bottom') {
    const waist = measure(rowsBetween(0.01, 0.06), b.cx);
    if (!waist) return undefined;
    return { v: 1, of: category, cx: waist.mid / m.width, bodyHalf: waist.half / m.width, top: b.y0 / m.height, ...(sub === 'leggings' ? { stretchy: true } : {}) };
  }

  // Tops, jackets, dresses: the body is measured below the armholes, clear of the sleeves.
  const band = category === 'dress' ? rowsBetween(0.24, 0.34) : rowsBetween(0.6, 0.85);
  let body = measure(band, b.cx);
  if (!body) return undefined;
  body = measure(band, body.mid) ?? body; // re-centre on the body, not the sleeves
  // Shoulder seams: where the columns at the body's sides first meet the garment.
  const ys = [-1, 1].map((s) => edgeProfile(m, 'top', body.mid + s * body.half * 0.85, body.mid + s * body.half * 0.85)[0]).filter((y) => y !== undefined);
  if (!ys.length) return undefined;
  const shoulderY = median(ys);
  const maxY = b.y0 + h * (category === 'dress' ? 0.5 : 0.95);
  const sleeves = {
    l: sleeveOf(m, -1, body.mid, body.half, shoulderY, maxY),
    r: sleeveOf(m, 1, body.mid, body.half, shoulderY, maxY),
  };
  return {
    v: 1,
    of: category,
    cx: body.mid / m.width,
    bodyHalf: body.half / m.width,
    top: shoulderY / m.height,
    ...(sleeves.l || sleeves.r ? { sleeves } : {}),
  };
}

/** Upright turn and shape in one go (what the photo pipeline stores). `auto: false` keeps her own way up. */
export function readGarment(img: RGBAImage, category: Category, sub?: Subcategory, auto = true): { turn: Turn; shape?: GarmentShape } {
  const m = maskOf(img);
  const turn = auto ? uprightTurn(m, category, sub) : 0;
  return { turn, shape: garmentShape(turnMask(m, turn), category, sub) };
}

/** Types whose shape is measured (shoes and accessories are placed by their outline). */
export const SHAPED: Category[] = ['top', 'outerwear', 'dress', 'bottom'];

/** Does this item need (re-)measuring? */
export const needsShape = (i: { cutoutUri?: string; category: Category; shape?: GarmentShape }) => !!i.cutoutUri && SHAPED.includes(i.category) && i.shape?.of !== i.category;
