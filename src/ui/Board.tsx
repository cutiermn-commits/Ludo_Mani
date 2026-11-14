import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polygon, Rect } from 'react-native-svg';
import {
  BASE_ORIGIN,
  COLORS,
  Color,
  HOME_COLUMN,
  SAFE_INDICES,
  START_INDEX,
  TRACK,
  baseSlot,
  cellFor,
} from '../engine/board';
import { Player } from '../engine/game';
import { PALETTE } from './theme';

interface Props {
  size: number;
  players: Player[];
  movable: { color: Color; token: number }[];
  onTokenPress: (color: Color, token: number) => void;
}

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`);
  }
  return pts.join(' ');
}

/** Static board artwork. Memoised: it only depends on size. */
const BoardArt = memo(function BoardArt({ size }: { size: number }) {
  const c = size / 15;
  const startColorByIndex = new Map<number, Color>(COLORS.map((col) => [START_INDEX[col], col]));

  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />

      {COLORS.map((col) => {
        const [ox, oy] = BASE_ORIGIN[col];
        return (
          <G key={`base-${col}`}>
            <Rect x={ox * c} y={oy * c} width={6 * c} height={6 * c} fill={PALETTE[col].main} />
            <Rect x={(ox + 0.75) * c} y={(oy + 0.75) * c} width={4.5 * c} height={4.5 * c} rx={c * 0.4} fill="#FFFFFF" />
            {[0, 1, 2, 3].map((i) => {
              const [sx, sy] = baseSlot(col, i);
              return <Circle key={i} cx={sx * c} cy={sy * c} r={c * 0.6} fill={PALETTE[col].light} stroke={PALETTE[col].main} strokeWidth={2} />;
            })}
          </G>
        );
      })}

      {TRACK.map(([x, y], i) => {
        const startCol = startColorByIndex.get(i);
        return (
          <G key={`t-${i}`}>
            <Rect
              x={x * c}
              y={y * c}
              width={c}
              height={c}
              fill={startCol ? PALETTE[startCol].main : '#FFFFFF'}
              stroke="#2B2B2B"
              strokeWidth={0.6}
            />
            {SAFE_INDICES.has(i) && !startCol && (
              <Polygon points={starPoints((x + 0.5) * c, (y + 0.5) * c, c * 0.38)} fill="#B0BEC5" />
            )}
          </G>
        );
      })}

      {COLORS.map((col) =>
        HOME_COLUMN[col].map(([x, y], i) => (
          <Rect key={`h-${col}-${i}`} x={x * c} y={y * c} width={c} height={c} fill={PALETTE[col].main} stroke="#2B2B2B" strokeWidth={0.6} />
        )),
      )}

      {/* Centre: four triangles pointing to each colour's home column */}
      <Polygon points={`${6 * c},${6 * c} ${6 * c},${9 * c} ${7.5 * c},${7.5 * c}`} fill={PALETTE.red.main} />
      <Polygon points={`${6 * c},${6 * c} ${9 * c},${6 * c} ${7.5 * c},${7.5 * c}`} fill={PALETTE.green.main} />
      <Polygon points={`${9 * c},${6 * c} ${9 * c},${9 * c} ${7.5 * c},${7.5 * c}`} fill={PALETTE.yellow.main} />
      <Polygon points={`${6 * c},${9 * c} ${9 * c},${9 * c} ${7.5 * c},${7.5 * c}`} fill={PALETTE.blue.main} />
      <Rect x={0} y={0} width={size} height={size} fill="none" stroke="#2B2B2B" strokeWidth={2} />
    </Svg>
  );
});

export function Board({ size, players, movable, onTokenPress }: Props) {
  const c = size / 15;

  // Group tokens by cell so stacked tokens can be fanned out.
  const placed: { color: Color; token: number; x: number; y: number; key: string }[] = [];
  const byCell = new Map<string, number>();
  for (const p of players) {
    p.tokens.forEach((prog, ti) => {
      const [x, y] = cellFor(p.color, ti, prog);
      const key = `${x},${y}`;
      byCell.set(key, (byCell.get(key) ?? 0) + 1);
      placed.push({ color: p.color, token: ti, x, y, key });
    });
  }
  const seen = new Map<string, number>();
  const isMovable = (color: Color, token: number) => movable.some((m) => m.color === color && m.token === token);

  return (
    <View style={{ width: size, height: size }}>
      <BoardArt size={size} />
      {placed.map(({ color, token, x, y, key }) => {
        const total = byCell.get(key)!;
        const idx = seen.get(key) ?? 0;
        seen.set(key, idx + 1);
        const inBase = Number.isInteger(x) === false; // base slots are fractional
        const r = c * (total > 1 && !inBase ? 0.3 : 0.38);
        const offset = total > 1 && !inBase ? (idx - (total - 1) / 2) * c * 0.22 : 0;
        const cx = (inBase ? x : x + 0.5) * c + offset;
        const cy = (inBase ? y : y + 0.5) * c + offset;
        const active = isMovable(color, token);
        return (
          <Pressable
            key={`${color}-${token}`}
            accessibilityRole="button"
            accessibilityLabel={`${color} token ${token + 1}${active ? ', can move' : ''}`}
            disabled={!active}
            onPress={() => onTokenPress(color, token)}
            hitSlop={8}
            style={[
              styles.token,
              {
                left: cx - r,
                top: cy - r,
                width: r * 2,
                height: r * 2,
                borderRadius: r,
                backgroundColor: PALETTE[color].main,
                borderColor: active ? '#111111' : '#FFFFFF',
                borderWidth: active ? 3 : 2,
                transform: [{ scale: active ? 1.15 : 1 }],
                zIndex: active ? 2 : 1,
              },
            ]}
          >
            <View style={[styles.tokenInner, { borderRadius: r, backgroundColor: PALETTE[color].dark }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  token: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  tokenInner: { width: '40%', height: '40%' },
});
