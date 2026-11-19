import type { BodyPose, ClothingItem } from '@/domain/types';

import { avatarBody } from '../avatarBody';
import { decodePose, letterbox, MOVENET_SIZE, poseFromTaps } from '../movenet';
import { bodyFrame, FIT_LIMITS, garmentBox, nudgeFit, placeGarments, poseToPixels, toggleWorn, visibleWorn } from '../place';

const item = (id: string, category: ClothingItem['category'], extra: Partial<ClothingItem> = {}): ClothingItem => ({
  id,
  category,
  colors: [],
  warmth: 2,
  waterproof: false,
  windproof: false,
  styleTags: [],
  occasions: [],
  favorite: false,
  inLaundry: false,
  createdAt: '2026-11-18T08:00:00Z',
  cutoutUri: `file:///c/${id}.png`,
  cutoutAspect: 1,
  ...extra,
});

/** A standing person in a 300 × 400 photo. */
const pose: BodyPose = {
  lShoulder: { x: 110, y: 100 },
  rShoulder: { x: 190, y: 100 },
  lHip: { x: 130, y: 220 },
  rHip: { x: 170, y: 220 },
  lAnkle: { x: 135, y: 380 },
  rAnkle: { x: 165, y: 380 },
};

describe('garment placement (D-065)', () => {
  it('hangs a top from the shoulders, centred, wider than the shoulders', () => {
    const b = garmentBox('top', 1.2, pose)!;
    expect(b.x + b.w / 2).toBeCloseTo(150);
    expect(b.w).toBeGreaterThan(80);
    expect(b.y).toBeLessThan(100); // collar a little above the shoulder line
    expect(b.y + b.h).toBeGreaterThan(185); // reaches about the hips (220)
  });

  it('keeps the garment shape: shorts end higher than trousers', () => {
    const shorts = garmentBox('bottom', 1.1, pose)!;
    const trousers = garmentBox('bottom', 0.45, pose)!;
    expect(shorts.y).toBeCloseTo(trousers.y);
    expect(shorts.y + shorts.h).toBeLessThan(trousers.y + trousers.h);
    expect(trousers.y + trousers.h).toBeLessThanOrEqual(pose.lAnkle.y + (pose.lAnkle.y - trousers.y) * 0.25 + 1);
  });

  it('puts shoes on the feet, bottom at the floor', () => {
    const s = garmentBox('shoes', 1.6, pose)!;
    expect(s.y + s.h).toBeGreaterThan(380);
    expect(s.y + s.h).toBeLessThan(400);
    expect(s.x + s.w / 2).toBeCloseTo(150);
  });

  it('a very long garment is capped so it stays on the body', () => {
    const coat = garmentBox('top', 0.1, pose)!;
    expect(coat.h).toBeLessThanOrEqual(bodyFrame(pose).torso * 1.6 + 0.001);
  });

  it('draws back to front, a dress replaces top and bottom, and skips items without a cut-out', () => {
    const order = placeGarments([item('j', 'outerwear'), item('t', 'top'), item('b', 'bottom'), item('s', 'shoes')], pose).map((g) => g.itemId);
    expect(order).toEqual(['s', 'b', 't', 'j']);
    const withDress = placeGarments([item('t', 'top'), item('d', 'dress'), item('b', 'bottom')], pose).map((g) => g.itemId);
    expect(withDress).toEqual(['d']);
    expect(placeGarments([item('x', 'top', { cutoutUri: undefined }), item('a', 'accessory')], pose)).toEqual([]);
  });

  it("applies her own fine-tuning: moved in shoulder-widths, resized around the top centre", () => {
    const plain = placeGarments([item('t', 'top')], pose)[0].box;
    const moved = placeGarments([item('t', 'top', { fit: { dx: 0.5, dy: -0.25, scale: 1.2 } })], pose)[0].box;
    const unit = bodyFrame(pose).shoulderW;
    expect(moved.w).toBeCloseTo(plain.w * 1.2);
    expect(moved.x + moved.w / 2).toBeCloseTo(plain.x + plain.w / 2 + 0.5 * unit);
    expect(moved.y).toBeCloseTo(plain.y - 0.25 * unit);
  });

  it('copes with a sideways photo (shoulders almost on top of each other)', () => {
    const side: BodyPose = { ...pose, lShoulder: { x: 148, y: 100 }, rShoulder: { x: 152, y: 100 } };
    expect(garmentBox('top', 1, side)!.w).toBeGreaterThan(100);
  });

  it('pose shares → pixels', () => {
    const shares: BodyPose = { ...pose, lShoulder: { x: 0.5, y: 0.25 } };
    expect(poseToPixels(shares, 200, 400).lShoulder).toEqual({ x: 100, y: 100 });
  });
});

describe('fine-tuning steps', () => {
  it('adds moves and multiplies size, within limits', () => {
    expect(nudgeFit(undefined, { dy: 0.06 })).toEqual({ dx: 0, dy: 0.06, scale: 1 });
    const big = Array.from({ length: 40 }).reduce<ReturnType<typeof nudgeFit> | undefined>((f) => nudgeFit(f, { scale: 1.06, dx: 0.5 }), undefined)!;
    expect(big.scale).toBe(FIT_LIMITS.maxScale);
    expect(big.dx).toBe(FIT_LIMITS.maxMove);
    expect(nudgeFit({ dx: 0, dy: 0, scale: 0.41 }, { scale: 0.5 }).scale).toBe(FIT_LIMITS.minScale);
  });
});

describe('wearing rules', () => {
  it('a dress hides top and bottom (one rule for avatar and photo)', () => {
    const worn = [item('t', 'top'), item('b', 'bottom'), item('d', 'dress'), item('s', 'shoes')];
    expect(visibleWorn(worn).map((i) => i.id)).toEqual(['d', 's']);
    expect(visibleWorn([item('t', 'top')]).map((i) => i.id)).toEqual(['t']);
  });
  const all = [item('t1', 'top'), item('t2', 'top'), item('b', 'bottom'), item('d', 'dress'), item('j', 'outerwear')];
  it('one per slot, tap again to take off', () => {
    expect(toggleWorn(['t1', 'b'], all[1], all)).toEqual(['b', 't2']);
    expect(toggleWorn(['t1', 'b'], all[0], all)).toEqual(['b']);
  });
  it('a dress takes off top and bottom, and a top takes off the dress', () => {
    expect(toggleWorn(['t1', 'b', 'j'], all[3], all)).toEqual(['j', 'd']);
    expect(toggleWorn(['d', 'j'], all[0], all)).toEqual(['j', 't1']);
  });
});

describe('avatar body (D-062)', () => {
  it('height and build change the drawing, feet stay on the floor', () => {
    const tall = avatarBody({ height: 'taller' });
    const short = avatarBody({ height: 'shorter' });
    expect(tall.headCy).toBeLessThan(short.headCy);
    expect(tall.floor).toBe(short.floor);
    expect(Math.abs(tall.ankleY - short.ankleY)).toBeLessThan(4);
    expect(avatarBody({ build: 3 }).shoulderHalf).toBeGreaterThan(avatarBody({ build: 1 }).shoulderHalf);
  });
  it("the avatar's pose dresses it with the same rules as a photo", () => {
    const g = avatarBody({});
    const top = garmentBox('top', 1.3, g.pose)!;
    expect(top.x + top.w / 2).toBeCloseTo(g.cx);
    expect(top.y).toBeLessThan(g.shoulderY);
    expect(top.y).toBeGreaterThan(g.headCy); // below the face
  });
});

describe('MoveNet pre/post-processing (D-064)', () => {
  it('letterboxes a portrait picture into the 192 square, centred', () => {
    const img = { width: 3, height: 4, data: new Uint8Array(3 * 4 * 4).fill(200) };
    const lb = letterbox(img);
    expect(lb.bytes).toHaveLength(MOVENET_SIZE * MOVENET_SIZE * 3);
    expect(lb.offY).toBe(0);
    expect(lb.offX).toBe(24); // 192 - 144 = 48 → 24 each side
    expect(lb.bytes[0]).toBe(0); // padding
    expect(lb.bytes[(96 * MOVENET_SIZE + 96) * 3]).toBe(200); // picture
  });

  const kp = (pts: Record<number, [number, number, number]>) => {
    const a = new Array(51).fill(0);
    for (const [i, [y, x, s]] of Object.entries(pts)) a.splice(Number(i) * 3, 3, y, x, s);
    return a;
  };
  const lb = { scale: 1, offX: 24, offY: 0 };
  const person = { 5: [0.25, 0.4, 0.9], 6: [0.25, 0.6, 0.9], 11: [0.5, 0.45, 0.8], 12: [0.5, 0.55, 0.8], 15: [0.92, 0.46, 0.7], 16: [0.92, 0.54, 0.7] } as Record<number, [number, number, number]>;

  it('maps keypoints back to shares of the original picture (undoing the padding)', () => {
    const res = decodePose(kp(person), lb, 144, 192);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.estimatedFeet).toBe(false);
    expect(res.pose.lShoulder.y).toBeCloseTo(0.25);
    expect(res.pose.lShoulder.x).toBeCloseTo((0.4 * 192 - 24) / 144);
  });

  it('estimates feet that are out of the photo, and says so', () => {
    const res = decodePose(kp({ ...person, 15: [0, 0, 0.05], 16: [0, 0, 0.05] }), lb, 144, 192);
    expect(res.ok && res.estimatedFeet).toBe(true);
    if (res.ok) expect(res.pose.lAnkle.y).toBeGreaterThan(res.pose.lHip.y);
  });

  it('refuses when there is no person, or only a face', () => {
    expect(decodePose(kp({}), lb, 144, 192)).toEqual({ ok: false, reason: 'no-person' });
    expect(decodePose(kp({ 5: person[5], 6: person[6] }), lb, 144, 192)).toEqual({ ok: false, reason: 'not-full-body' });
    expect(decodePose([1, 2], lb, 144, 192)).toEqual({ ok: false, reason: 'no-person' });
  });

  it('six taps become a pose, whichever side she taps first', () => {
    const p = poseFromTaps([
      { x: 0.6, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.45, y: 0.5 },
      { x: 0.55, y: 0.5 },
      { x: 0.5, y: 0.9 },
      { x: 0.45, y: 0.9 },
    ])!;
    expect(p.lShoulder.x).toBe(0.4);
    expect(p.rShoulder.x).toBe(0.6);
    expect(poseFromTaps([{ x: 0, y: 0 }])).toBeNull();
  });
});
