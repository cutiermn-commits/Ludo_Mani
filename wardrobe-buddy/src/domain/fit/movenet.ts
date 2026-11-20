import type { RGBAImage } from '@/domain/image/png';
import type { BodyPose, Pt } from '@/domain/types';

/**
 * Pre- and post-processing for MoveNet SinglePose Lightning (D-064). The model itself runs in the
 * offline pose page; this code is pure and tested.
 * Model contract (VERIFIED from the model's own signature in vendor/movenet/movenet-lightning.json):
 * input int32 [1, 192, 192, 3] RGB 0–255; output float [1, 1, 17, 3] = (y, x, score) per keypoint,
 * 0–1 of the input square. Keypoint order (COCO): 5/6 shoulders, 11/12 hips, 13/14 knees, 15/16 ankles.
 */
export const MOVENET_SIZE = 192;
const KP = { lShoulder: 5, rShoulder: 6, lElbow: 7, rElbow: 8, lWrist: 9, rWrist: 10, lHip: 11, rHip: 12, lKnee: 13, rKnee: 14, lAnkle: 15, rAnkle: 16 } as const;
/** ASSUMPTION starting value: below this the point is treated as not found. */
export const MIN_SCORE = 0.25;

export interface Letterbox {
  /** 192 × 192 × 3 RGB bytes. */
  bytes: Uint8Array;
  /** Picture pixels per model pixel, and where the picture starts inside the square. */
  scale: number;
  offX: number;
  offY: number;
}

/** Fits a (small) picture into the model's square, centred, padded with black, nearest-neighbour. */
export function letterbox(img: RGBAImage, size = MOVENET_SIZE): Letterbox {
  const scale = Math.max(img.width, img.height) / size;
  const w = Math.round(img.width / scale);
  const h = Math.round(img.height / scale);
  const offX = Math.floor((size - w) / 2);
  const offY = Math.floor((size - h) / 2);
  const bytes = new Uint8Array(size * size * 3);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y + 0.5) * scale));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x + 0.5) * scale));
      const s = (sy * img.width + sx) * 4;
      const o = ((y + offY) * size + (x + offX)) * 3;
      bytes[o] = img.data[s];
      bytes[o + 1] = img.data[s + 1];
      bytes[o + 2] = img.data[s + 2];
    }
  }
  return { bytes, scale, offX, offY };
}

export type PoseDecode = { ok: true; pose: BodyPose; estimatedFeet: boolean } | { ok: false; reason: 'no-person' | 'not-full-body' };

/**
 * Model output → shoulders/hips/feet as shares (0–1) of the ORIGINAL picture.
 * Shoulders and hips must be found. Feet may be outside the photo or hidden: then they are
 * estimated below the knees (or hips), and the app suggests a photo with her feet in it.
 */
export function decodePose(kp: ArrayLike<number>, lb: Pick<Letterbox, 'scale' | 'offX' | 'offY'>, imgW: number, imgH: number, size = MOVENET_SIZE): PoseDecode {
  if (kp.length < 51) return { ok: false, reason: 'no-person' };
  const at = (i: number): (Pt & { s: number }) => ({
    x: ((kp[i * 3 + 1] * size - lb.offX) * lb.scale) / imgW,
    y: ((kp[i * 3] * size - lb.offY) * lb.scale) / imgH,
    s: kp[i * 3 + 2],
  });
  const p = Object.fromEntries(Object.entries(KP).map(([k, i]) => [k, at(i)])) as Record<keyof typeof KP, Pt & { s: number }>;
  const found = (q: { s: number }) => q.s >= MIN_SCORE;
  if (![p.lShoulder, p.rShoulder].every(found)) return { ok: false, reason: 'no-person' };
  if (![p.lHip, p.rHip].every(found)) return { ok: false, reason: 'not-full-body' };
  const pt = (q: Pt): Pt => ({ x: q.x, y: q.y });
  const torso = (p.lHip.y + p.rHip.y) / 2 - (p.lShoulder.y + p.rShoulder.y) / 2;
  if (!(torso > 0.03)) return { ok: false, reason: 'no-person' }; // upside down or a mis-detection
  let estimatedFeet = false;
  const foot = (ankle: Pt & { s: number }, knee: Pt & { s: number }, hip: Pt): Pt => {
    if (found(ankle)) return pt(ankle);
    estimatedFeet = true;
    // Legs are roughly 1.6× the shoulder–hip distance in a standing pose. ASSUMPTION.
    if (found(knee)) return { x: knee.x, y: knee.y + (knee.y - hip.y) };
    return { x: hip.x, y: hip.y + torso * 1.6 };
  };
  // Left/right as seen in the picture (smaller x first), with each arm's direction: the elbow
  // (sleeves cover the upper arm), else the wrist (D-068).
  const sides = [
    { s: p.lShoulder, e: p.lElbow, w: p.lWrist },
    { s: p.rShoulder, e: p.rElbow, w: p.rWrist },
  ].sort((a, b) => a.s.x - b.s.x);
  const arm = (a: (typeof sides)[number]) => (found(a.e) ? pt(a.e) : found(a.w) ? pt(a.w) : undefined);
  const [lA, rA] = [arm(sides[0]), arm(sides[1])];
  const byX = <T extends Pt>(a: T, b: T): [Pt, Pt] => (a.x <= b.x ? [pt(a), pt(b)] : [pt(b), pt(a)]);
  const [lHip, rHip] = byX(p.lHip, p.rHip);
  const [lAnkle, rAnkle] = byX(foot(p.lAnkle, p.lKnee, p.lHip), foot(p.rAnkle, p.rKnee, p.rHip));
  const pose: BodyPose = {
    lShoulder: pt(sides[0].s),
    rShoulder: pt(sides[1].s),
    lHip,
    rHip,
    lAnkle,
    rAnkle,
    ...(lA ? { lArm: lA } : {}),
    ...(rA ? { rArm: rA } : {}),
  };
  return { ok: true, pose, estimatedFeet };
}

/** Pose from her taps (shoulder, shoulder, hip, hip, foot, foot), in any left/right order. */
export function poseFromTaps(taps: readonly Pt[]): BodyPose | null {
  if (taps.length < 6) return null;
  const pair = (a: Pt, b: Pt): [Pt, Pt] => (a.x <= b.x ? [a, b] : [b, a]);
  const [lShoulder, rShoulder] = pair(taps[0], taps[1]);
  const [lHip, rHip] = pair(taps[2], taps[3]);
  const [lAnkle, rAnkle] = pair(taps[4], taps[5]);
  return { lShoulder, rShoulder, lHip, rHip, lAnkle, rAnkle };
}
