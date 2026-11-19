import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

/** True when the device asks for reduced motion (WCAG 2.3.3 spirit; UX "calm"). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * Content "drops" in gently whenever `trigger` changes (e.g. a new outfit landing on the avatar).
 * Always visible at rest; with reduced motion it simply appears.
 */
export function DropIn({ trigger, children }: { trigger: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const [y] = useState(() => new Animated.Value(0));
  const [o] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) return;
    y.setValue(-14);
    o.setValue(0.4);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 8 }),
      Animated.timing(o, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [trigger, reduced, y, o]);
  return <Animated.View style={{ transform: [{ translateY: y }], opacity: o }}>{children}</Animated.View>;
}
