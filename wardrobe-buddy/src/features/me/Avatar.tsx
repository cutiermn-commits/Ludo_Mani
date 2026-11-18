import { useId, type ReactNode } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { avatarBody, AVATAR_VIEW, type AvatarGeometry } from '@/domain/fit/avatarBody';
import { placeGarments, visibleWorn } from '@/domain/fit/place';
import type { AvatarLook, ClothingItem, HairStyle } from '@/domain/types';
import { CLOTHING_HEX } from '@/ui/theme';

/**
 * Wardrobe Buddy's own avatar (D-062): original simple shapes, no known characters. She chooses
 * skin, hair, eyes, height and build from drawings; no body measurements exist anywhere.
 * Layers: back hair + body + plain base clothes (SVG) → her real clothes, cut out (images,
 * placed by the same rules as on her photo) → face, front hair and accessories (SVG).
 */
export const SKIN_TONES = ['#FBE3D3', '#F6D2BC', '#EBC09F', '#D9A982', '#C08A63', '#A06A45', '#7B4B2E', '#563321'];
export const HAIR_COLORS = ['#1E140E', '#3B2416', '#6B4226', '#9B6A3C', '#D9B26A', '#F1D9A0', '#B5442E', '#8B5CD6', '#E87BB0', '#4D8FE0'];
export const EYE_COLORS = ['#3B2416', '#6B4226', '#8A6A2E', '#4E8A4E', '#3D7FC4', '#7D8A99'];
export const HAIR_STYLES: HairStyle[] = ['short', 'bob', 'long', 'ponytail', 'buns', 'braids', 'curly', 'puffs'];

export const DEFAULT_AVATAR: AvatarLook = { skin: 2, hair: 2, hairStyle: 'long', eyes: 1, height: 'medium', build: 2, accessory: 'none' };

const BASE_TOP = '#EDE6F7';
const BASE_SHORTS = '#8C93B5';
const SNEAKER = '#FFFFFF';

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join('')}`;
};

export function Avatar({ look, outfit = [], size = 260, label }: { look: AvatarLook; outfit?: ClothingItem[]; size?: number; label: string }) {
  const g = avatarBody(look);
  // Unique per avatar: several avatars on one web page must not share SVG ids.
  const shadeId = `skin${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const u = size / AVATAR_VIEW.h;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[2];
  const hair = HAIR_COLORS[look.hair] ?? HAIR_COLORS[2];
  const eyes = EYE_COLORS[look.eyes ?? 1] ?? EYE_COLORS[1];
  const garments = placeGarments(outfit, g.pose);
  const cut = new Set(garments.map((x) => x.category));
  // Items she wears that have no cut-out are drawn as simple garment shapes in their colour.
  const drawn = visibleWorn(outfit).filter((i) => !i.cutoutUri);
  const view = `0 0 ${AVATAR_VIEW.w} ${AVATAR_VIEW.h}`;
  const w = AVATAR_VIEW.w * u;

  return (
    <View accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label || undefined} importantForAccessibility={label ? 'auto' : 'no-hide-descendants'} style={{ width: w, height: size }}>
      <Svg width={w} height={size} viewBox={view} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={shadeId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={shade(skin, 0.92)} />
            <Stop offset="0.5" stopColor={skin} />
            <Stop offset="1" stopColor={shade(skin, 0.92)} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={g.cx} cy={g.floor + 2} rx={34 * g.hf} ry={5} fill="#000" opacity={0.08} />
        <HairBack g={g} style={look.hairStyle} color={hair} />
        <Body g={g} skin={skin} shadeId={shadeId} />
        <BaseClothes g={g} hideTop={cut.has('top') || cut.has('dress')} hideShorts={cut.has('bottom') || cut.has('dress')} hideShoes={cut.has('shoes') || drawn.some((i) => i.category === 'shoes')} />
        {drawn.map((i) => (
          <DrawnGarment key={i.id} g={g} item={i} />
        ))}
      </Svg>
      {garments.map((x) => (
        <Image
          key={x.itemId}
          source={{ uri: x.uri }}
          resizeMode="contain"
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{ position: 'absolute', left: x.box.x * u, top: x.box.y * u, width: x.box.w * u, height: x.box.h * u }}
        />
      ))}
      <Svg width={w} height={size} viewBox={view} style={{ position: 'absolute' }} pointerEvents="none">
        <Head g={g} skin={skin} hair={hair} eyes={eyes} look={look} />
      </Svg>
    </View>
  );
}

function Body({ g, skin, shadeId }: { g: AvatarGeometry; skin: string; shadeId: string }) {
  const { cx, shoulderY: sy, shoulderHalf: sh, waistY, waistHalf: wh, hipY, hipHalf: hh } = g;
  const arm = (side: -1 | 1) => {
    const x0 = cx + side * (sh - g.armW * 0.35);
    const x1 = cx + side * (sh + g.armW * 0.25);
    return (
      <G key={side}>
        <Path d={`M${x0},${sy + 3} L${x1},${g.wristY}`} stroke={skin} strokeWidth={g.armW} strokeLinecap="round" />
        <Circle cx={x1} cy={g.wristY + 3 * g.hf} r={5.2 * g.hf} fill={skin} />
      </G>
    );
  };
  const leg = (side: -1 | 1) => {
    const xt = cx + side * g.legX;
    const xb = cx + side * g.ankleX;
    const t = g.legTopHalfW;
    const b = g.legBottomHalfW;
    return (
      <G key={side}>
        <Path d={`M${xt - t},${hipY - 6} L${xt + t},${hipY - 6} L${xb + b},${g.ankleY} L${xb - b},${g.ankleY} Z`} fill={skin} />
        <Ellipse cx={xb + side * 2} cy={g.ankleY + 6 * g.hf} rx={8 * g.hf} ry={4.5 * g.hf} fill={skin} />
      </G>
    );
  };
  return (
    <G>
      {[-1, 1].map((s) => arm(s as -1 | 1))}
      {[-1, 1].map((s) => leg(s as -1 | 1))}
      <Rect x={cx - 5.5 * g.hf} y={g.neckTop} width={11 * g.hf} height={sy - g.neckTop + 4} fill={skin} />
      <Path
        d={`M${cx - sh},${sy + 6} Q${cx - sh},${sy - 2} ${cx - sh + 9},${sy - 3} L${cx + sh - 9},${sy - 3} Q${cx + sh},${sy - 2} ${cx + sh},${sy + 6} L${cx + wh},${waistY} L${cx + hh},${hipY} L${cx - hh},${hipY} L${cx - wh},${waistY} Z`}
        fill={`url(#${shadeId})`}
      />
    </G>
  );
}

/** Plain tank top, bike shorts and white sneakers: what the avatar wears under (or instead of) her clothes. */
function BaseClothes({ g, hideTop, hideShorts, hideShoes }: { g: AvatarGeometry; hideTop: boolean; hideShorts: boolean; hideShoes: boolean }) {
  const { cx, shoulderY: sy, shoulderHalf: sh, waistY, waistHalf: wh, hipY, hipHalf: hh } = g;
  const shortsBottom = g.Y(172);
  return (
    <G>
      {!hideShorts && (
        <Path
          d={`M${cx - wh - 1},${waistY - 2} L${cx + wh + 1},${waistY - 2} L${cx + hh + 1},${hipY} L${cx + g.legX + g.legTopHalfW + 1},${shortsBottom} L${cx + 1.5},${shortsBottom} L${cx},${g.crotchY} L${cx - 1.5},${shortsBottom} L${cx - g.legX - g.legTopHalfW - 1},${shortsBottom} L${cx - hh - 1},${hipY} Z`}
          fill={BASE_SHORTS}
        />
      )}
      {!hideTop && (
        <Path
          d={`M${cx - sh + 7},${sy - 1} L${cx - 7},${sy + 6} Q${cx},${sy + 10} ${cx + 7},${sy + 6} L${cx + sh - 7},${sy - 1} Q${cx + sh - 2},${sy + 8} ${cx + sh - 3},${sy + 14} L${cx + wh + 1},${waistY} L${cx + wh + 2},${waistY + 4} L${cx - wh - 2},${waistY + 4} L${cx - wh - 1},${waistY} L${cx - sh + 3},${sy + 14} Q${cx - sh + 2},${sy + 8} ${cx - sh + 7},${sy - 1} Z`}
          fill={BASE_TOP}
        />
      )}
      {!hideShoes && <Shoes g={g} color={SNEAKER} sole="#C9C3D6" />}
    </G>
  );
}

function Shoes({ g, color, sole }: { g: AvatarGeometry; color: string; sole: string }) {
  return (
    <G>
      {[-1, 1].map((side) => {
        const x = g.cx + side * g.ankleX + side * 2;
        const y = g.ankleY + 2 * g.hf;
        return (
          <G key={side}>
            <Path d={`M${x - 9 * g.hf},${y + 9 * g.hf} Q${x - 9 * g.hf},${y} ${x - 3 * g.hf},${y - 1} L${x + 3 * g.hf},${y - 1} Q${x + 10 * g.hf},${y + 2} ${x + 10 * g.hf},${y + 9 * g.hf} Z`} fill={color} stroke={shade(color, 0.8)} strokeWidth={0.8} />
            <Rect x={x - 9.5 * g.hf} y={y + 8 * g.hf} width={20 * g.hf} height={3 * g.hf} rx={1.5} fill={sole} />
          </G>
        );
      })}
    </G>
  );
}

/** Simple garment shapes in the item's colour, for clothes whose photo couldn't be cut out. */
function DrawnGarment({ g, item }: { g: AvatarGeometry; item: ClothingItem }) {
  const fill = CLOTHING_HEX[item.colors[0] ?? 'grey'];
  const edge = shade(fill, 0.82);
  const { cx, shoulderY: sy, shoulderHalf: sh, waistY, waistHalf: wh, hipY, hipHalf: hh } = g;
  const longSleeves = ['sweater', 'hoodie', 'shirt'].includes(item.subcategory ?? '');
  const sleeveEnd = longSleeves ? g.wristY - 2 : g.Y(106);
  const sleeves = (end: number, extra = 0) =>
    [-1, 1].map((side) => (
      <Path
        key={side}
        d={`M${cx + side * (sh - g.armW * 0.35)},${sy + 3} L${cx + side * (sh + g.armW * 0.12)},${end}`}
        stroke={fill}
        strokeWidth={g.armW + 3 + extra}
        strokeLinecap="round"
      />
    ));
  const torso = (bottom: number, flare = 0) =>
    `M${cx - sh},${sy + 5} Q${cx - sh},${sy - 3} ${cx - sh + 9},${sy - 4} L${cx - 6},${sy - 4} Q${cx},${sy + 3} ${cx + 6},${sy - 4} L${cx + sh - 9},${sy - 4} Q${cx + sh},${sy - 3} ${cx + sh},${sy + 5} L${cx + wh + 2},${waistY} L${cx + hh + 2 + flare},${bottom} L${cx - hh - 2 - flare},${bottom} L${cx - wh - 2},${waistY} Z`;
  switch (item.category) {
    case 'top':
      return (
        <G>
          {sleeves(sleeveEnd)}
          <Path d={torso(hipY + 2)} fill={fill} stroke={edge} strokeWidth={0.8} />
        </G>
      );
    case 'dress':
      return (
        <G>
          {sleeves(g.Y(100))}
          <Path d={torso(g.Y(196), 10)} fill={fill} stroke={edge} strokeWidth={0.8} />
        </G>
      );
    case 'outerwear':
      return (
        <G>
          {sleeves(g.wristY - 1, 2)}
          <Path d={`M${cx - sh - 2},${sy + 4} Q${cx - sh - 1},${sy - 4} ${cx - sh + 9},${sy - 5} L${cx - 5},${sy - 3} L${cx - 9},${hipY + 10} L${cx - hh - 5},${hipY + 10} Z`} fill={fill} stroke={edge} strokeWidth={0.8} />
          <Path d={`M${cx + sh + 2},${sy + 4} Q${cx + sh + 1},${sy - 4} ${cx + sh - 9},${sy - 5} L${cx + 5},${sy - 3} L${cx + 9},${hipY + 10} L${cx + hh + 5},${hipY + 10} Z`} fill={fill} stroke={edge} strokeWidth={0.8} />
        </G>
      );
    case 'bottom': {
      const sub = item.subcategory;
      if (sub === 'skirt') return <Path d={`M${cx - wh - 1},${waistY - 2} L${cx + wh + 1},${waistY - 2} L${cx + hh + 12},${g.Y(184)} L${cx - hh - 12},${g.Y(184)} Z`} fill={fill} stroke={edge} strokeWidth={0.8} />;
      const end = sub === 'shorts' ? g.Y(176) : g.ankleY - 1;
      const bw = sub === 'leggings' ? 0.5 : 2;
      return (
        <Path
          d={`M${cx - wh - 1},${waistY - 2} L${cx + wh + 1},${waistY - 2} L${cx + hh + 1},${hipY} L${cx + g.ankleX + g.legBottomHalfW + bw + (sub === 'shorts' ? 6 : 0)},${end} L${cx + 2},${end} L${cx},${g.crotchY} L${cx - 2},${end} L${cx - g.ankleX - g.legBottomHalfW - bw - (sub === 'shorts' ? 6 : 0)},${end} L${cx - hh - 1},${hipY} Z`}
          fill={fill}
          stroke={edge}
          strokeWidth={0.8}
        />
      );
    }
    case 'shoes':
      return <Shoes g={g} color={fill} sole={shade(fill, 0.7)} />;
    default:
      return null;
  }
}

/** Hair that falls behind the head and body. Head-local units (head centre 0,0; face 21 × 24). */
function HairBack({ g, style, color }: { g: AvatarGeometry; style: HairStyle; color: string }) {
  const tf = `translate(${g.cx} ${g.headCy}) scale(${g.hf})`;
  const dark = shade(color, 0.85);
  let d: ReactNode = null;
  switch (style) {
    case 'long':
      d = <Path d="M-27,-8 C-29,-31 29,-31 27,-8 L31,62 C20,72 -20,72 -31,62 Z" fill={dark} />;
      break;
    case 'bob':
      d = <Path d="M-27,-8 C-29,-31 29,-31 27,-8 L28,20 C20,27 -20,27 -28,20 Z" fill={dark} />;
      break;
    case 'ponytail':
      d = <Path d="M14,-22 C40,-20 46,14 36,52 C33,34 28,10 14,-4 Z" fill={dark} />;
      break;
    case 'buns':
      d = (
        <>
          <Circle cx={-19} cy={-25} r={10.5} fill={color} />
          <Circle cx={19} cy={-25} r={10.5} fill={color} />
        </>
      );
      break;
    case 'braids':
      d = <Path d="M-26,-8 C-28,-31 28,-31 26,-8 L26,8 L-26,8 Z" fill={dark} />;
      break;
    case 'curly':
      d = (
        <G fill={color}>
          {[
            [-24, -18],
            [-28, -2],
            [-27, 14],
            [-20, 26],
            [24, -18],
            [28, -2],
            [27, 14],
            [20, 26],
            [-12, -28],
            [0, -31],
            [12, -28],
          ].map(([x, y]) => (
            <Circle key={`${x},${y}`} cx={x} cy={y} r={11} />
          ))}
        </G>
      );
      break;
    case 'puffs':
      d = (
        <>
          <Circle cx={-25} cy={-20} r={14} fill={color} />
          <Circle cx={25} cy={-20} r={14} fill={color} />
        </>
      );
      break;
    default:
      d = null;
  }
  return <G transform={tf}>{d}</G>;
}

function Head({ g, skin, hair, eyes, look }: { g: AvatarGeometry; skin: string; hair: string; eyes: string; look: AvatarLook }) {
  const tf = `translate(${g.cx} ${g.headCy}) scale(${g.hf})`;
  const brow = shade(hair, 0.8);
  const line = '#3A2230';
  const style = look.hairStyle;
  return (
    <G transform={tf}>
      {/* ears + earrings */}
      <Ellipse cx={-21} cy={3} rx={4} ry={5.5} fill={shade(skin, 0.95)} />
      <Ellipse cx={21} cy={3} rx={4} ry={5.5} fill={shade(skin, 0.95)} />
      {look.earrings && (
        <>
          <Circle cx={-21.5} cy={10} r={1.8} fill="#E8C34A" />
          <Circle cx={21.5} cy={10} r={1.8} fill="#E8C34A" />
        </>
      )}
      {/* face */}
      <Ellipse cx={0} cy={0} rx={21} ry={24} fill={skin} />
      <Ellipse cx={-12.5} cy={10} rx={4.2} ry={2.6} fill="#F08DA8" opacity={0.35} />
      <Ellipse cx={12.5} cy={10} rx={4.2} ry={2.6} fill="#F08DA8" opacity={0.35} />
      {look.freckles &&
        [
          [-11, 6],
          [-8, 8],
          [-13, 8.5],
          [11, 6],
          [8, 8],
          [13, 8.5],
        ].map(([x, y]) => <Circle key={`${x},${y}`} cx={x} cy={y} r={0.75} fill={shade(skin, 0.7)} />)}
      {/* eyes */}
      {[-8, 8].map((x) => (
        <G key={x}>
          <Ellipse cx={x} cy={2} rx={4.6} ry={5.2} fill="#FFFFFF" />
          <Circle cx={x} cy={2.6} r={3.3} fill={eyes} />
          <Circle cx={x} cy={2.8} r={1.6} fill="#1A1014" />
          <Circle cx={x + 1.1} cy={1.2} r={1} fill="#FFFFFF" />
          <Path d={`M${x - 4.8},${0} Q${x},${-4.6} ${x + 4.8},${0}`} stroke={line} strokeWidth={1.2} fill="none" strokeLinecap="round" />
          <Path d={x < 0 ? `M${x - 4.6},${0.2} L${x - 6.4},${-1.6}` : `M${x + 4.6},${0.2} L${x + 6.4},${-1.6}`} stroke={line} strokeWidth={1} strokeLinecap="round" />
          <Path d={`M${x - 4},${-6.5} Q${x},${-8.6} ${x + 4},${-6.8}`} stroke={brow} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        </G>
      ))}
      {/* nose + smile */}
      <Path d="M-1.6,9.5 Q0,11 1.6,9.5" stroke={shade(skin, 0.75)} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Path d="M-5.5,14.5 Q0,19.5 5.5,14.5 Q0,17 -5.5,14.5 Z" fill="#C0475E" stroke="#A3364C" strokeWidth={0.8} strokeLinejoin="round" />
      {look.glasses && (
        <G stroke="#3A2A44" strokeWidth={1.3} fill="#FFFFFF" fillOpacity={0.12}>
          <Circle cx={-8} cy={2} r={6.6} />
          <Circle cx={8} cy={2} r={6.6} />
          <Path d="M-1.4,1.4 Q0,0 1.4,1.4" fill="none" />
        </G>
      )}
      <HairFront style={style} color={hair} />
      <Accessory kind={look.accessory ?? 'none'} hair={hair} style={style} />
    </G>
  );
}

function HairFront({ style, color }: { style: HairStyle; color: string }) {
  // Cap with a side-swept fringe, shared by most styles.
  const cap = <Path d="M-23,2 C-25,-24 -12,-31 0,-31 C13,-31 25,-24 23,2 C21,-10 15,-16 6,-17 C1,-11 -9,-12 -15,-15 C-19,-10 -22,-5 -23,2 Z" fill={color} />;
  const shine = <Path d="M-10,-25 Q-2,-28 6,-26" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={1.8} fill="none" strokeLinecap="round" />;
  switch (style) {
    case 'short':
      return (
        <>
          <Path d="M-23,0 C-26,-25 -12,-32 0,-32 C13,-32 26,-25 23,0 C22,-9 17,-14 9,-15 C3,-13 -7,-14 -13,-17 C-18,-12 -21,-7 -23,0 Z" fill={color} />
          {shine}
        </>
      );
    case 'long':
      return (
        <>
          {cap}
          <Path d="M-21,-6 C-29,10 -29,40 -24,56 C-19,50 -18,24 -17,4 Z" fill={color} />
          <Path d="M21,-6 C29,10 29,40 24,56 C19,50 18,24 17,4 Z" fill={color} />
          {shine}
        </>
      );
    case 'bob':
      return (
        <>
          {cap}
          <Path d="M-21,-6 C-27,6 -27,18 -24,23 C-19,22 -18,10 -17,2 Z" fill={color} />
          <Path d="M21,-6 C27,6 27,18 24,23 C19,22 18,10 17,2 Z" fill={color} />
          {shine}
        </>
      );
    case 'braids':
      return (
        <>
          {cap}
          {[-1, 1].map((s) => (
            <G key={s}>
              {[8, 17, 26, 35, 44, 53].map((y, i) => (
                <Ellipse key={y} cx={s * (23 - i * 0.4)} cy={y} rx={4.6} ry={5.4} fill={i % 2 ? shade(color, 0.88) : color} />
              ))}
              <Rect x={s * 22.6 - 2.5} y={58} width={5} height={3} rx={1.5} fill="#F28DB5" />
            </G>
          ))}
          {shine}
        </>
      );
    case 'curly':
      return (
        <G fill={color}>
          {[-16, -8, 0, 8, 16].map((x, i) => (
            <Circle key={x} cx={x} cy={-22 + (i % 2) * 3} r={8} />
          ))}
          <Circle cx={-21} cy={-10} r={6} />
          <Circle cx={21} cy={-10} r={6} />
        </G>
      );
    default:
      return (
        <>
          {cap}
          {shine}
        </>
      );
  }
}

function Accessory({ kind, hair, style }: { kind: NonNullable<AvatarLook['accessory']>; hair: string; style: HairStyle }) {
  const pink = '#F05C93';
  switch (kind) {
    case 'bow': {
      const x = style === 'ponytail' ? 17 : 14;
      const y = style === 'ponytail' ? -20 : -24;
      return (
        <G>
          <Path d={`M${x},${y} L${x - 8},${y - 5} L${x - 8},${y + 5} Z`} fill={pink} />
          <Path d={`M${x},${y} L${x + 8},${y - 5} L${x + 8},${y + 5} Z`} fill={pink} />
          <Circle cx={x} cy={y} r={2.2} fill={shade(pink, 0.8)} />
        </G>
      );
    }
    case 'headband':
      return <Path d="M-22,-12 C-18,-30 18,-30 22,-12" stroke={hair === '#E87BB0' ? '#7C5CD6' : pink} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
    case 'clips':
      return (
        <G>
          <Rect x={-17} y={-21} width={8} height={2.6} rx={1.3} fill="#F2CF3A" transform="rotate(-20 -13 -20)" />
          <Rect x={-16} y={-16} width={8} height={2.6} rx={1.3} fill="#9CC8F2" transform="rotate(-20 -12 -15)" />
        </G>
      );
    default:
      return null;
  }
}
