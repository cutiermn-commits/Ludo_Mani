import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
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
  /** Whose turn it is: their base gets a glowing outline. */
  current?: Color | null;
  /** Keyboard/TV-remote focus: the token that Enter would move. */
  selected?: { color: Color; token: number } | null;
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

const MOVE_MS = 260;

/** A token that slides to its new position and gently pulses when it can move. */
function Token(props: {
  color: Color;
  token: number;
  x: number;
  y: number;
  r: number;
  active: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const { color, token, x, y, r, active, selected, onPress } = props;
  const pos = useRef(new Animated.ValueXY({ x: x - r, y: y - r })).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      pos.setValue({ x: x - r, y: y - r });
      return;
    }
    Animated.timing(pos, { toValue: { x: x - r, y: y - r }, duration: MOVE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [x, y, r, pos]);

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const base = selected ? 1.35 : active ? 1.12 : 1;
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [base, base + (active ? 0.12 : 0)] });

  return (
    <Animated.View
      style={[
        styles.tokenPos,
        { width: r * 2, height: r * 2, zIndex: selected ? 3 : active ? 2 : 1, transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${color} token ${token + 1}${active ? ', can move' : ''}`}
        disabled={!active}
        onPress={onPress}
        hitSlop={8}
        style={[
          styles.token,
          {
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            backgroundColor: PALETTE[color].main,
            borderColor: selected ? '#FFB300' : active ? '#111111' : '#FFFFFF',
            borderWidth: selected ? 4 : active ? 3 : 2,
          },
        ]}
      >
        <View style={[styles.tokenInner, { borderRadius: r, backgroundColor: PALETTE[color].dark }]} />
      </Pressable>
    </Animated.View>
  );
}

export function Board({ size, players, movable, selected, current, onTokenPress }: Props) {
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
      {current && (
        <View
          pointerEvents="none"
          style={[
            styles.turnGlow,
            {
              left: BASE_ORIGIN[current][0] * c,
              top: BASE_ORIGIN[current][1] * c,
              width: 6 * c,
              height: 6 * c,
              borderColor: '#FFFFFF',
              shadowColor: PALETTE[current].main,
            },
          ]}
        />
      )}
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
        const isSel = !!selected && selected.color === color && selected.token === token;
        return (
          <Token
            key={`${color}-${token}`}
            color={color}
            token={token}
            x={cx}
            y={cy}
            r={r}
            active={active}
            selected={isSel}
            onPress={() => onTokenPress(color, token)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tokenPos: { position: 'absolute', left: 0, top: 0 },
  turnGlow: { position: 'absolute', borderWidth: 4, borderRadius: 6, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  token: {
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
