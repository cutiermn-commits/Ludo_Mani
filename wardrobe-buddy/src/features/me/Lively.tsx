import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Face, Move, Reaction } from '@/domain/reactions';
import { useReducedMotion } from '@/ui/motion';
import { radius, space } from '@/ui/theme';
import { useTheme } from '@/ui/useTheme';

export interface LivelyHandle {
  react: (r: Reaction, text: string) => void;
}

interface Particle {
  key: string;
  glyph: string;
  x: number;
  delay: number;
}

/**
 * Makes whatever it wraps feel alive (D-067): a reaction plays a move (dance, twirl, jump…),
 * floats emoji up and shows a speech bubble. With "reduce motion" on, nothing moves: the face
 * and the bubble still change. `move: false` keeps the content still (her own photo never
 * dances, only the sparkles and the bubble show).
 * `children` gets the current face and blink, so the avatar can draw them.
 */
export function Lively({
  ref,
  children,
  move = true,
  onTap,
  tapLabel,
}: {
  ref?: Ref<LivelyHandle>;
  children: (face: Face, blink: boolean) => ReactNode;
  move?: boolean;
  onTap?: () => void;
  tapLabel?: string;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const [face, setFace] = useState<Face>('smile');
  const [blink, setBlink] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [t] = useState(() => ({
    rot: new Animated.Value(0),
    y: new Animated.Value(0),
    sx: new Animated.Value(1),
    s: new Animated.Value(1),
    burst: new Animated.Value(0),
    bubble: new Animated.Value(0),
    breathe: new Animated.Value(0),
  }));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  // Blinks now and then, like a real face.
  useEffect(() => {
    let alive = true;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(
        () => {
          if (!alive) return;
          setBlink(true);
          setTimeout(() => alive && setBlink(false), 140);
          next();
        },
        2600 + Math.random() * 2600,
      );
    };
    next();
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, []);

  // A slow, gentle "breathing" bob while idle.
  useEffect(() => {
    if (reduced || !move) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t.breathe, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t.breathe, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, move, t]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (m: Move) => {
    const n = (v: Animated.Value, to: number, duration: number) => Animated.timing(v, { toValue: to, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    t.rot.setValue(0);
    t.y.setValue(0);
    t.sx.setValue(1);
    t.s.setValue(1);
    let a: Animated.CompositeAnimation;
    switch (m) {
      case 'dance':
        a = Animated.parallel([
          Animated.sequence([n(t.rot, -1, 160), n(t.rot, 1, 260), n(t.rot, -1, 260), n(t.rot, 1, 260), n(t.rot, 0, 180)]),
          Animated.sequence([n(t.y, -10, 130), n(t.y, 0, 130), n(t.y, -10, 130), n(t.y, 0, 130), n(t.y, -10, 130), n(t.y, 0, 130), n(t.y, -6, 130), n(t.y, 0, 130)]),
        ]);
        break;
      case 'twirl':
        a = Animated.sequence([n(t.sx, -1, 260), n(t.sx, 1, 260), n(t.sx, -1, 220), n(t.sx, 1, 220)]);
        break;
      case 'jump':
        a = Animated.sequence([
          Animated.parallel([n(t.y, -34, 220), n(t.s, 1.04, 220)]),
          Animated.parallel([n(t.y, 0, 200), n(t.s, 1, 200)]),
          n(t.y, -14, 150),
          Animated.spring(t.y, { toValue: 0, useNativeDriver: true, bounciness: 12 }),
        ]);
        break;
      case 'giggle':
        a = Animated.sequence([0.35, -0.35, 0.35, -0.35, 0.3, -0.3, 0].map((v) => n(t.rot, v, 70)));
        break;
      case 'shake':
        a = Animated.sequence([0.5, -0.5, 0.5, -0.5, 0].map((v) => n(t.rot, v, 110)));
        break;
      default:
        a = Animated.sequence([n(t.s, 1.08, 160), Animated.spring(t.s, { toValue: 1, useNativeDriver: true, bounciness: 14 })]);
    }
    a.start();
  };

  useImperativeHandle(ref, () => ({
    react: (r, text) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setFace(r.face);
      setBubble(text);
      t.bubble.setValue(0);
      Animated.spring(t.bubble, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
      if (!reduced) {
        if (move) play(r.move);
        const stamp = Date.now();
        setParticles(
          Array.from({ length: 7 }, (_, i) => ({ key: `${stamp}-${i}`, glyph: r.burst[i % r.burst.length], x: 0.12 + Math.random() * 0.76, delay: i * 70 })),
        );
        t.burst.setValue(0);
        Animated.timing(t.burst, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }
      later(() => setFace('smile'), 1800);
      later(() => Animated.timing(t.bubble, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setBubble(null)), 2600);
      later(() => setParticles([]), 1700);
    },
  }));

  const rotate = t.rot.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] });
  const bob = Animated.add(t.y, t.breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] }));
  const content = (
    <Animated.View style={{ transformOrigin: 'bottom', transform: [{ translateY: bob }, { rotate }, { scaleX: t.sx }, { scale: t.s }] }}>{children(face, blink)}</Animated.View>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      {onTap ? (
        <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel={tapLabel}>
          {content}
        </Pressable>
      ) : (
        content
      )}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {particles.map((p, i) => {
          const local = t.burst.interpolate({ inputRange: [0, Math.min(0.9, p.delay / 1500 + 0.05), 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
          return (
            <Animated.Text
              key={p.key}
              importantForAccessibility="no"
              accessibilityElementsHidden
              style={[
                st.particle,
                {
                  left: `${p.x * 100}%`,
                  opacity: local.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [
                    { translateY: local.interpolate({ inputRange: [0, 1], outputRange: [0, -150 - (i % 3) * 30] }) },
                    { translateX: local.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? 14 : -14, 0] }) },
                    { scale: local.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.15, 0.9] }) },
                  ],
                },
              ]}>
              {p.glyph}
            </Animated.Text>
          );
        })}
      </View>
      {bubble && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            st.bubble,
            { backgroundColor: c.surface, borderColor: c.primary, opacity: t.bubble, transform: [{ scale: t.bubble.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}>
          <Text style={[st.bubbleText, { color: c.text }]}>{bubble}</Text>
          <View style={[st.tail, { backgroundColor: c.surface, borderColor: c.primary }]} />
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  particle: { position: 'absolute', bottom: '35%', fontSize: 26 },
  bubble: {
    position: 'absolute',
    top: -6,
    right: -4,
    maxWidth: 190,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    boxShadow: '0 6px 16px rgba(40, 20, 60, 0.16)',
  },
  bubbleText: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  tail: { position: 'absolute', bottom: -7, left: 22, width: 14, height: 14, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
});
