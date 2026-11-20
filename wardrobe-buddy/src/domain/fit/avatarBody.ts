import type { AvatarBuild, AvatarHeight, AvatarLook, BodyPose } from '@/domain/types';

/**
 * The drawn avatar's body, in viewBox units (160 × 260). Height and build are 3 drawn choices
 * each (D-062): they change the drawing's proportions, never a number about her. The same
 * geometry gives the avatar's "pose", so garments are placed on the avatar with exactly the
 * rules used on her photo (place.ts).
 */
export const AVATAR_VIEW = { w: 160, h: 260 } as const;

/** The avatar's arms, in degrees below horizontal (90 = straight down). */
export const ARM_POSE_DEG = 76;

const HEIGHT: Record<AvatarHeight, number> = { shorter: 0.9, medium: 1, taller: 1.07 };
const BUILD: Record<AvatarBuild, number> = { 1: 0.88, 2: 1, 3: 1.14 };

export function avatarBody(look: Pick<AvatarLook, 'height' | 'build'>) {
  const hf = HEIGHT[look.height ?? 'medium'] ?? 1;
  const bw = BUILD[look.build ?? 2] ?? 1;
  const cx = 80;
  const floor = 252;
  /** Medium-height y → this avatar's y (scaled towards the floor, so feet stay on the ground). */
  const Y = (y: number) => floor - (floor - y) * hf;
  /** Horizontal half-width in medium units → this avatar's units. */
  const W = (half: number) => half * hf * bw;
  const g = {
    hf,
    bw,
    cx,
    floor,
    headCy: Y(42),
    neckTop: Y(60),
    shoulderY: Y(82),
    shoulderHalf: W(26),
    armW: 11 * hf * Math.sqrt(bw),
    wristY: Y(152),
    waistY: Y(128),
    waistHalf: W(17),
    hipY: Y(144),
    hipHalf: W(22),
    crotchY: Y(156),
    kneeY: Y(194),
    ankleY: Y(236),
    legTopHalfW: W(8.5),
    legBottomHalfW: 5 * hf,
    legX: W(10.5),
    ankleX: W(9),
  };
  // Arms hang relaxed, a little away from the body (D-068), so sleeves can follow them.
  const armRad = (ARM_POSE_DEG * Math.PI) / 180;
  const armLen = 71 * hf;
  const shoulderJoint = (side: -1 | 1) => ({ x: cx + side * W(22), y: g.shoulderY + 1 });
  const wrist = (side: -1 | 1) => {
    const s = shoulderJoint(side);
    return { x: s.x + side * Math.cos(armRad) * armLen, y: s.y + Math.sin(armRad) * armLen };
  };
  /** A point a share `f` of the way down the arm (0 = shoulder joint, 1 = wrist). */
  const armAt = (side: -1 | 1, f: number) => {
    const s = shoulderJoint(side);
    const w = wrist(side);
    return { x: s.x + (w.x - s.x) * f, y: s.y + (w.y - s.y) * f };
  };
  const pose: BodyPose = {
    lShoulder: { x: cx - W(22), y: g.shoulderY + 1 },
    rShoulder: { x: cx + W(22), y: g.shoulderY + 1 },
    lHip: { x: cx - W(10.5), y: g.hipY },
    rHip: { x: cx + W(10.5), y: g.hipY },
    lAnkle: { x: cx - g.ankleX, y: g.ankleY + 2 },
    rAnkle: { x: cx + g.ankleX, y: g.ankleY + 2 },
    lArm: wrist(-1),
    rArm: wrist(1),
  };
  return { ...g, Y, W, pose, wrist, armAt, shoulderJoint };
}

export type AvatarGeometry = ReturnType<typeof avatarBody>;
