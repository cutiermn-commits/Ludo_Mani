import type { BodyPose, Category, ClothingItem, GarmentFit, GarmentShape, Pt } from '@/domain/types';

/**
 * Where her clothes go when she "wears" them (D-059, D-065): on the drawn avatar and on her own
 * photo, with ONE rule set. Input is a body pose (shoulders, hips, feet) in pixels of the picture;
 * each garment cut-out is sized from the body width (shoulders or hips) and keeps its own shape,
 * so a cropped top ends higher and long trousers reach further than shorts.
 * This is placement, not a size or fit calculation: no body measurements exist in the app.
 * All factors are ASSUMPTION starting values, tuned by eye on test pictures; she can fine-tune
 * any garment (GarmentFit) and that choice is kept per garment.
 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A sleeve turned to follow the arm (D-068). All values are in pixels inside the garment's box.
 * The sleeve is cut out of the garment picture with a rectangle that starts at (sx, sy) and runs
 * along the sleeve (angle `phi`, `len` long, `across` wide); that piece is then turned by `rot`
 * degrees (clockwise) around the shoulder seam (px, py).
 */
export interface SleevePart {
  sx: number;
  sy: number;
  phi: number;
  len: number;
  across: number;
  px: number;
  py: number;
  rot: number;
}

/**
 * The garment's body: from `y0` down (a hood lying above the collar hangs behind her head when
 * worn, so it is left out), within the band x0–x1 down to `cutY` (without the original sleeves
 * when those are turned), and full width below.
 */
export interface BodyPart {
  y0: number;
  x0: number;
  x1: number;
  cutY: number;
}

export interface PlacedGarment {
  itemId: string;
  uri: string;
  category: Category;
  box: Box;
  /** Present when the sleeves are turned to follow the arms (the picture is drawn in parts). */
  body?: BodyPart;
  sleeves?: SleevePart[];
}

/** Back to front: a jacket over the top, the top over the waistband, trousers over the shoes. */
export const WEAR_ORDER: Category[] = ['shoes', 'bottom', 'dress', 'top', 'outerwear'];

/** Width as a multiple of the shoulder span (tops) or hip span (bottoms), and where the top edge goes. */
export const PLACE = {
  // Lift: the collar sits above the shoulder joints (first browser test 2026-11-18: 0.13 left her own neckline showing).
  top: { width: 1.8, lift: 0.17 },
  outerwear: { width: 2.0, lift: 0.19 },
  dress: { width: 1.7, lift: 0.16 },
  bottom: { width: 2.05, lift: 0.1, minOfShoulders: 1.0 },
  /** A pair of shoes in one picture: as wide as the stance plus a foot each side. */
  shoes: { width: 1.9, minOfHips: 1.35, drop: 0.06, maxOfLegs: 0.2 },
  /** Never taller than this share of the hip-to-feet distance (a long coat photo stays on the body). */
  maxBottomLength: 1.25,
  maxTopLength: 1.6,
} as const;

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Measures of a pose in pixels, with sane minimums so a sideways photo still works. */
export function bodyFrame(p: BodyPose) {
  const shoulders = mid(p.lShoulder, p.rShoulder);
  const hips = mid(p.lHip, p.rHip);
  const feet = mid(p.lAnkle, p.rAnkle);
  const torso = Math.max(1, hips.y - shoulders.y);
  const legs = Math.max(1, feet.y - hips.y);
  const shoulderW = Math.max(dist(p.lShoulder, p.rShoulder), torso * 0.55);
  const hipW = Math.max(dist(p.lHip, p.rHip), torso * 0.4);
  const stance = Math.abs(p.lAnkle.x - p.rAnkle.x);
  return { shoulders, hips, feet, torso, legs, shoulderW, hipW, stance };
}

function sized(w: number, aspect: number | undefined, maxH: number): { w: number; h: number } {
  const a = aspect && aspect > 0 ? aspect : 1;
  let h = w / a;
  if (h > maxH) {
    h = maxH;
    w = h * a;
  }
  return { w, h };
}

export const FIT_LIMITS = { minScale: 0.4, maxScale: 2.5, maxMove: 3 } as const;
const clampScale = (s: number) => Math.min(FIT_LIMITS.maxScale, Math.max(FIT_LIMITS.minScale, s || 1));
const clampMove = (v: number) => Math.min(FIT_LIMITS.maxMove, Math.max(-FIT_LIMITS.maxMove, v || 0));

/** Her fine-tuning step: move by (dx, dy) shoulder-widths and/or multiply the size, within limits. */
export function nudgeFit(fit: GarmentFit | undefined, delta: { dx?: number; dy?: number; scale?: number }): GarmentFit {
  const f = fit ?? { dx: 0, dy: 0, scale: 1 };
  return { dx: clampMove(f.dx + (delta.dx ?? 0)), dy: clampMove(f.dy + (delta.dy ?? 0)), scale: clampScale(f.scale * (delta.scale ?? 1)) };
}

/** What is actually seen when she wears these: a dress replaces any top and bottom (the one place this rule lives). */
export function visibleWorn<T extends Pick<ClothingItem, 'category'>>(items: readonly T[]): T[] {
  const hasDress = items.some((i) => i.category === 'dress');
  return items.filter((i) => !(hasDress && (i.category === 'top' || i.category === 'bottom')));
}

function applyFit(b: Box, fit: GarmentFit | undefined, unit: number): Box {
  if (!fit) return b;
  const s = clampScale(fit.scale);
  const w = b.w * s;
  const h = b.h * s;
  // Resize around the top centre (where a garment hangs from), then move.
  return { x: b.x + (b.w - w) / 2 + fit.dx * unit, y: b.y + fit.dy * unit, w, h };
}

/**
 * How wide a garment's measured body is on her, as a multiple of the shoulder-point distance
 * (tops/jackets: the shoulder seams; dresses: the bodice), and of the hip-point distance for
 * waistbands. Tuned on the avatar, whose drawn shoulders are 1.18× its shoulder points, and on
 * the synthetic test photos. ASSUMPTION starting values; she can fine-tune any garment.
 */
export const SHAPE_FIT = {
  top: { width: 1.2, drop: 0.04 },
  outerwear: { width: 1.3, drop: 0.02 },
  dress: { width: 1.06, drop: 0.04 },
  bottom: { ofHips: 1.85, ofShoulders: 0.82, lift: 0.18, stretch: 0.9, belowAnkle: 0.03 },
} as const;

/** Where a garment with a measured shape goes on a body. */
function shapeBox(category: Category, aspect: number | undefined, shape: GarmentShape, pose: BodyPose): Box | null {
  const f = bodyFrame(pose);
  const a = aspect && aspect > 0 ? aspect : 1;
  const half = Math.max(0.02, shape.bodyHalf);
  if (category === 'top' || category === 'outerwear' || category === 'dress') {
    const k = SHAPE_FIT[category];
    const w = (f.shoulderW * k.width) / (2 * half);
    const h = w / a;
    return { x: f.shoulders.x - shape.cx * w, y: f.shoulders.y - f.torso * k.drop - shape.top * h, w, h };
  }
  if (category === 'bottom') {
    const k = SHAPE_FIT.bottom;
    // Leggings lie narrower than they are worn (they stretch). ASSUMPTION.
    const stretch = shape.stretchy ? k.stretch : 1;
    const waist = Math.max(f.hipW * k.ofHips, f.shoulderW * k.ofShoulders) * stretch;
    const w = waist / (2 * half);
    let h = w / a;
    const y = f.hips.y - f.torso * k.lift - shape.top * h;
    // Never longer than to her feet: long trousers end at the ankles (a little squeezed if needed).
    const floor = f.feet.y + f.legs * k.belowAnkle;
    if (y + h > floor) h = Math.max(h * 0.7, floor - y);
    return { x: f.hips.x - shape.cx * w, y, w, h };
  }
  return null;
}

/** The arm's direction on one side of the picture, in degrees below horizontal (outwards). */
export function armAngle(pose: BodyPose, side: -1 | 1): number {
  const shoulders = [pose.lShoulder, pose.rShoulder].sort((p, q) => p.x - q.x);
  const s = side < 0 ? shoulders[0] : shoulders[1];
  const arm = side < 0 ? pose.lArm : pose.rArm;
  if (!arm) return ARM_DEFAULT;
  const deg = (Math.atan2(arm.y - s.y, side * (arm.x - s.x)) * 180) / Math.PI;
  return Math.min(100, Math.max(10, deg));
}
/** Arms we can't see are taken to hang relaxed by her sides. ASSUMPTION. */
export const ARM_DEFAULT = 80;

/** Cuts the sleeves off a placed garment and turns them to follow the arms; leaves out a hood. */
function shapeParts(box: Box, shape: GarmentShape, pose: BodyPose): Pick<PlacedGarment, 'body' | 'sleeves'> {
  const W = box.w;
  const H = box.h;
  const bodyHalf = shape.bodyHalf * W;
  const y0 = shape.of === 'bottom' ? 0 : Math.max(0, shape.top * H - bodyHalf * 0.3);
  const whole: BodyPart = { y0, x0: 0, x1: W, cutY: H };
  const sl = shape.sleeves;
  const sleeves: SleevePart[] = [];
  let cutY = 0;
  for (const [side, sh] of [
    [-1, sl?.l],
    [1, sl?.r],
  ] as const) {
    if (!sh) continue;
    const a = (sh.angle * Math.PI) / 180;
    const u = { x: side * Math.cos(a), y: Math.sin(a) };
    const n = { x: -u.y, y: u.x };
    const P = { x: sh.pivot.x * W, y: sh.pivot.y * H };
    const O = { x: P.x, y: P.y + bodyHalf * 0.45 };
    const len = sh.length * W;
    const across = sh.width * W;
    const t0 = -bodyHalf * 0.45 * Math.max(0, Math.sin(a)) - across * 0.15;
    const half = across * 0.62;
    // The rectangle's corner; its x axis runs along the sleeve, its y axis across it.
    const S = { x: O.x + t0 * u.x - half * n.x, y: O.y + t0 * u.y - half * n.y };
    cutY = Math.max(cutY, O.y + Math.sin(a) * len + Math.abs(Math.cos(a)) * across * 0.6);
    sleeves.push({
      sx: S.x,
      sy: S.y,
      phi: (Math.atan2(u.y, u.x) * 180) / Math.PI,
      len: len * 1.1 - t0,
      across: half * 2,
      px: P.x,
      py: P.y,
      rot: side * (armAngle(pose, side) - sh.angle),
    });
  }
  if (!sleeves.length || sleeves.every((x) => Math.abs(x.rot) < 4)) return y0 > 0 ? { body: whole } : {};
  const cx = shape.cx * W;
  return { body: { y0, x0: cx - bodyHalf * 1.06, x1: cx + bodyHalf * 1.06, cutY: cutY > H * 0.85 ? H : Math.min(H, Math.max(y0, cutY)) }, sleeves };
}

/** One garment's box on a body, before her own fine-tuning. */
export function garmentBox(category: Category, aspect: number | undefined, pose: BodyPose, shape?: GarmentShape): Box | null {
  if (shape) {
    const b = shapeBox(category, aspect, shape, pose);
    if (b) return b;
  }
  const f = bodyFrame(pose);
  switch (category) {
    case 'top':
    case 'outerwear':
    case 'dress': {
      const k = PLACE[category];
      const maxH = category === 'dress' ? f.torso + f.legs * 0.95 : f.torso * PLACE.maxTopLength;
      const { w, h } = sized(f.shoulderW * k.width, aspect, maxH);
      return { x: f.shoulders.x - w / 2, y: f.shoulders.y - f.torso * k.lift, w, h };
    }
    case 'bottom': {
      const k = PLACE.bottom;
      const top = f.hips.y - f.torso * k.lift;
      const { w, h } = sized(Math.max(f.hipW * k.width, f.shoulderW * k.minOfShoulders), aspect, (f.feet.y - top) * PLACE.maxBottomLength);
      return { x: f.hips.x - w / 2, y: top, w, h };
    }
    case 'shoes': {
      const k = PLACE.shoes;
      const { w, h } = sized(Math.max(f.stance * k.width, f.hipW * k.minOfHips), aspect, f.legs * k.maxOfLegs);
      const bottom = f.feet.y + f.legs * k.drop;
      return { x: f.feet.x - w / 2, y: bottom - h, w, h };
    }
    default:
      return null; // accessories aren't worn on the picture (yet)
  }
}

/**
 * The garments she is wearing, placed and in drawing order. Only items with a cut-out are drawn
 * as her real clothes; a dress replaces top and bottom.
 */
export function placeGarments(items: readonly ClothingItem[], pose: BodyPose): PlacedGarment[] {
  const shown = visibleWorn(items);
  const unit = bodyFrame(pose).shoulderW;
  const out: PlacedGarment[] = [];
  for (const category of WEAR_ORDER) {
    const it = shown.find((i) => i.category === category && i.cutoutUri);
    if (!it?.cutoutUri) continue;
    const box = garmentBox(category, it.cutoutAspect, pose, it.shape);
    if (!box) continue;
    const fitted = applyFit(box, it.fit && { ...it.fit, dx: clampMove(it.fit.dx), dy: clampMove(it.fit.dy) }, unit);
    out.push({ itemId: it.id, uri: it.cutoutUri, category, box: fitted, ...(it.shape ? shapeParts(fitted, it.shape, pose) : {}) });
  }
  return out;
}

/** A pose given as shares of a picture (0–1) → pixels of that picture drawn at w × h. */
export function poseToPixels(p: BodyPose, w: number, h: number): BodyPose {
  const px = (q: Pt): Pt => ({ x: q.x * w, y: q.y * h });
  return {
    lShoulder: px(p.lShoulder),
    rShoulder: px(p.rShoulder),
    lHip: px(p.lHip),
    rHip: px(p.rHip),
    lAnkle: px(p.lAnkle),
    rAnkle: px(p.rAnkle),
    ...(p.lArm ? { lArm: px(p.lArm) } : {}),
    ...(p.rArm ? { rArm: px(p.rArm) } : {}),
  };
}

/**
 * Wearing rules: one garment per body slot. Picking a dress takes off the top and bottom;
 * picking a top or bottom takes off a dress; picking the same item again takes it off.
 */
export function toggleWorn(worn: readonly string[], item: ClothingItem, all: readonly ClothingItem[]): string[] {
  if (worn.includes(item.id)) return worn.filter((id) => id !== item.id);
  const cat = (id: string) => all.find((i) => i.id === id)?.category;
  const clash = (c: Category | undefined) =>
    c === item.category || (item.category === 'dress' && (c === 'top' || c === 'bottom')) || ((item.category === 'top' || item.category === 'bottom') && c === 'dress');
  return [...worn.filter((id) => !clash(cat(id))), item.id];
}
