import type { BodyPose, ClothingItem } from '@/domain/types';

import { avatarBody } from '../avatarBody';
import { garmentShape, mirrorMatch, needsShape, readGarment, turnImage, turnMask, uprightTurn, type Mask, type Turn } from '../garmentShape';
import { armAngle, bodyFrame, garmentBox, placeGarments } from '../place';

/** Garments as polygons in cm (upright, origin top centre), like flat-lay photos (D-068). */
type Poly = [number, number][];
function sleeve(S: [number, number], A: [number, number], deg: number, len: number, side: number): Poly {
  const a = (deg * Math.PI) / 180;
  const d = [side * Math.cos(a), Math.sin(a)];
  return [S, [S[0] + d[0] * len, S[1] + d[1] * len], [A[0] + d[0] * len * 0.92, A[1] + d[1] * len * 0.92], A];
}
const tshirt = (sleeveDeg = 32, sleeveLen = 19): Poly[] => [
  [[-9, 0], [-5, 5], [0, 6.5], [5, 5], [9, 0], [24.5, 4], [23, 25], [23, 64], [-23, 64], [-23, 25], [-24.5, 4]],
  sleeve([24.5, 4], [23, 25], sleeveDeg, sleeveLen, 1),
  sleeve([-24.5, 4], [-23, 25], sleeveDeg, sleeveLen, -1),
];
const trousers: Poly[] = [[[-20, 0], [20, 0], [22, 23], [24, 102], [5, 102], [0.8, 29], [-0.8, 29], [-5, 102], [-24, 102], [-22, 23]]];
const dress: Poly[] = [
  [[-8, 0], [8, 0], [20, 3], [19, 20], [16, 36], [44, 92], [-44, 92], [-16, 36], [-19, 20], [-20, 3]],
  sleeve([20, 3], [19, 19], 50, 12, 1),
  sleeve([-20, 3], [-19, 19], 50, 12, -1),
];

/** Rasterise polygons (cm) into a mask, `px` pixels per cm, with a margin. */
function raster(polys: Poly[], px = 2): Mask {
  const xs = polys.flat().map((p) => p[0]);
  const ys = polys.flat().map((p) => p[1]);
  const x0 = Math.min(...xs) - 2;
  const y0 = Math.min(...ys) - 2;
  const width = Math.ceil((Math.max(...xs) + 2 - x0) * px);
  const height = Math.ceil((Math.max(...ys) + 2 - y0) * px);
  const on = new Uint8Array(width * height);
  const inside = (poly: Poly, x: number, y: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const cx = (x + 0.5) / px + x0;
      const cy = (y + 0.5) / px + y0;
      if (polys.some((p) => inside(p, cx, cy))) on[y * width + x] = 1;
    }
  return { width, height, on };
}

const asImage = (m: Mask) => {
  const data = new Uint8Array(m.width * m.height * 4);
  for (let p = 0; p < m.on.length; p++) if (m.on[p]) data.set([200, 40, 60, 255], p * 4);
  return { width: m.width, height: m.height, data };
};

describe('turning pictures', () => {
  it('a quarter turn clockwise moves the top-left corner to the top-right', () => {
    const img = { width: 3, height: 2, data: new Uint8Array(3 * 2 * 4) };
    img.data.set([255, 0, 0, 255], 0); // top-left red
    const t = turnImage(img, 1);
    expect([t.width, t.height]).toEqual([2, 3]);
    expect(Array.from(t.data.slice((0 * 2 + 1) * 4, (0 * 2 + 1) * 4 + 4))).toEqual([255, 0, 0, 255]);
    const back = turnImage(turnImage(turnImage(t, 1), 1), 1);
    expect(Array.from(back.data)).toEqual(Array.from(img.data));
  });
});

describe('which way up (D-068)', () => {
  const cases: [string, Poly[], ClothingItem['category'], ClothingItem['subcategory']][] = [
    ['T-shirt', tshirt(), 'top', 'tshirt'],
    ['long-sleeved top, arms hanging', tshirt(65, 55), 'top', 'sweater'],
    ['shirt, arms straight out', tshirt(8, 58), 'top', 'shirt'],
    ['trousers', trousers, 'bottom', 'trousers'],
    ['dress', dress, 'dress', 'dress'],
  ];
  for (const [name, polys, cat, sub] of cases) {
    it(`${name}: finds the turn that puts it upright, from any of the four ways`, () => {
      const up = raster(polys);
      for (const t of [0, 1, 2, 3] as Turn[]) {
        // Photographed turned by t clockwise → the fix is (4 - t) % 4 clockwise.
        expect(uprightTurn(turnMask(up, t), cat, sub)).toBe((4 - t) % 4);
      }
    });
  }
  it('clothes are mirror-symmetric when upright, not when sideways', () => {
    const m = raster(tshirt());
    expect(mirrorMatch(m)).toBeGreaterThan(0.9);
    expect(mirrorMatch(turnMask(m, 1))).toBeLessThan(0.8);
  });
  it('shoes are never turned', () => {
    expect(uprightTurn(turnMask(raster(trousers), 2), 'shoes')).toBe(0);
  });
});

describe('garment shape (D-068)', () => {
  it('T-shirt: body width without the sleeves, shoulder seams, sleeves pointing out and down', () => {
    const m = raster(tshirt(), 2);
    const s = garmentShape(m, 'top', 'tshirt')!;
    const pxPerCm = 2;
    expect(s.bodyHalf * m.width).toBeGreaterThan(21 * pxPerCm);
    expect(s.bodyHalf * m.width).toBeLessThan(25.5 * pxPerCm);
    expect(Math.abs(s.cx * m.width - m.width / 2)).toBeLessThan(3);
    expect(s.top * m.height).toBeLessThan(12 * pxPerCm); // the shoulder line, not the hem
    expect(s.sleeves?.l && s.sleeves?.r).toBeTruthy();
    expect(s.sleeves!.r!.angle).toBeGreaterThan(15);
    expect(s.sleeves!.r!.angle).toBeLessThan(60);
    expect(s.sleeves!.l!.pivot.x).toBeLessThan(s.sleeves!.r!.pivot.x);
  });
  it('trousers: the waistband at the top', () => {
    const m = raster(trousers, 2);
    const s = garmentShape(m, 'bottom', 'trousers')!;
    expect(s.bodyHalf * m.width).toBeGreaterThan(19 * 2);
    expect(s.bodyHalf * m.width).toBeLessThan(22.5 * 2);
    expect(s.top * m.height).toBeLessThan(3 * 2);
    expect(s.sleeves).toBeUndefined();
  });
  it('reads and turns in one step, and says when an item needs measuring', () => {
    const r = readGarment(asImage(turnMask(raster(tshirt()), 3)), 'top', 'tshirt');
    expect(r.turn).toBe(1);
    expect(r.shape?.of).toBe('top');
    expect(readGarment(asImage(turnMask(raster(tshirt()), 3)), 'top', 'tshirt', false).turn).toBe(0);
    expect(needsShape({ cutoutUri: 'x', category: 'top' })).toBe(true);
    expect(needsShape({ cutoutUri: 'x', category: 'top', shape: r.shape })).toBe(false);
    expect(needsShape({ cutoutUri: 'x', category: 'dress', shape: r.shape })).toBe(true); // type changed
    expect(needsShape({ cutoutUri: 'x', category: 'shoes' })).toBe(false);
    expect(needsShape({ category: 'top' })).toBe(false);
  });
});

describe('wearing a measured garment (D-068)', () => {
  const g = avatarBody({});
  const item = (polys: Poly[], category: ClothingItem['category'], sub: ClothingItem['subcategory']): ClothingItem => {
    const m = raster(polys, 2);
    return {
      id: sub ?? category,
      category,
      subcategory: sub,
      colors: [],
      warmth: 2,
      waterproof: false,
      windproof: false,
      styleTags: [],
      occasions: [],
      favorite: false,
      inLaundry: false,
      createdAt: '2026-11-20T08:00:00Z',
      cutoutUri: `file:///c/${sub}.png`,
      cutoutAspect: m.width / m.height,
      shape: garmentShape(m, category, sub),
    };
  };

  it("a T-shirt's shoulder seams land on the avatar's shoulders, whatever its sleeves do", () => {
    for (const polys of [tshirt(), tshirt(8, 58), tshirt(65, 55)]) {
      const it = item(polys, 'top', 'tshirt');
      const b = garmentBox('top', it.cutoutAspect, g.pose, it.shape)!;
      const seamL = b.x + (it.shape!.cx - it.shape!.bodyHalf) * b.w;
      const seamR = b.x + (it.shape!.cx + it.shape!.bodyHalf) * b.w;
      const seamY = b.y + it.shape!.top * b.h;
      expect((seamL + seamR) / 2).toBeCloseTo(g.cx, 0);
      // Drawn shoulders are ±26 units; the seams sit within a few units of them.
      expect(Math.abs(seamR - (g.cx + g.shoulderHalf))).toBeLessThan(5);
      expect(Math.abs(seamY - g.shoulderY)).toBeLessThan(6);
    }
  });

  it('sleeves turn towards the arms: down on both sides, mirrored', () => {
    const [placed] = placeGarments([item(tshirt(8, 58), 'top', 'shirt')], g.pose);
    expect(placed.sleeves).toHaveLength(2);
    const [l, r] = placed.sleeves!;
    expect(r.rot).toBeGreaterThan(40); // clockwise on the right side of the picture
    expect(l.rot).toBeLessThan(-40); // anticlockwise on the left
    expect(placed.body!.x1 - placed.body!.x0).toBeLessThan(placed.box.w * 0.75); // original sleeves left out
  });

  it('trousers: waistband between waist and hips, never longer than to the feet', () => {
    const it = item(trousers, 'bottom', 'trousers');
    const b = garmentBox('bottom', it.cutoutAspect, g.pose, it.shape)!;
    expect(b.y).toBeGreaterThan(g.waistY - 6);
    expect(b.y).toBeLessThan(g.hipY);
    expect(b.y + b.h).toBeLessThanOrEqual(bodyFrame(g.pose).feet.y + bodyFrame(g.pose).legs * 0.03 + 0.01);
  });

  it("arm direction: from the pose's arm points, or relaxed when they aren't known", () => {
    expect(armAngle(g.pose, 1)).toBeCloseTo(76, 0);
    expect(armAngle(g.pose, -1)).toBeCloseTo(76, 0);
    const noArms: BodyPose = { ...g.pose, lArm: undefined, rArm: undefined };
    expect(armAngle(noArms, 1)).toBe(80);
  });
});
