import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useAppStore } from '../store/useAppStore';

export const duration = {
  instant: 100,
  fast: 150,
  base: 250,
  exit: 175,
  slow: 400,
  breathe: 700,
  /** Aura phase transitions (lift, gather). */
  ambient: 900,
  /** Aura rise into position before drifting. */
  rise: 1100,
  /** Aura dissolve once the reply lands. */
  settle: 1600,
} as const;

export const curve = {
  enter: Easing.out(Easing.exp),
  exit: Easing.in(Easing.quad),
  soft: Easing.inOut(Easing.quad),
  glide: Easing.out(Easing.cubic),
  sway: Easing.inOut(Easing.sin),
  linear: Easing.linear,
} as const;

/**
 * Spring feels, named for the surface they belong to. `lens` keeps the tab
 * bar's liquid overshoot (the old friction 8 / tension 70 on the legacy
 * driver); `press` is the tap-scale feel; `sheet` is heavy enough that a
 * bottom sheet arrives settled rather than wobbling; `pop` is for small
 * elements that should land with a bounce.
 */
export const spring = {
  lens: { damping: 17, stiffness: 160, mass: 1 },
  press: { damping: 20, stiffness: 340, mass: 0.9 },
  sheet: { damping: 28, stiffness: 240, mass: 1 },
  pop: { damping: 15, stiffness: 280, mass: 0.9 },
} as const;

/**
 * One subscription to the system reduce-motion setting for the whole app.
 * Previously every component that animated registered its own listener, so a
 * 200-message thread held 200 identical subscriptions.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (alive) {
        setSystemReduce(value);
      }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return <SystemMotion.Provider value={systemReduce}>{children}</SystemMotion.Provider>;
}

const SystemMotion = createContext(false);

export function useReduceMotion(): boolean {
  const systemReduce = useContext(SystemMotion);
  const preference = useAppStore(state => state.settings.motion);

  if (preference === 'reduced') {
    return true;
  }
  if (preference === 'full') {
    return false;
  }
  return systemReduce;
}

export function useEntrance(delay = 0): { style: ReturnType<typeof useAnimatedStyle> } {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      reduce ? 0 : delay,
      withTiming(1, {
        duration: reduce ? duration.instant : duration.base,
        easing: curve.enter,
      }),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress, delay, reduce]);

  const style = useAnimatedStyle(() => ({
    opacity: reduce
      ? progress.value
      : interpolate(progress.value, [0, 0.6, 1], [0, 0.8, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], reduce ? [0, 0] : [6, 0]) },
    ],
  }));

  return { style };
}

export function usePulse(active: boolean): SharedValue<number> {
  const reduce = useReduceMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      value.value = 0;
      return;
    }
    if (reduce) {
      value.value = 1;
      return;
    }
    value.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration.breathe, easing: curve.soft }),
        withTiming(0, { duration: duration.breathe, easing: curve.soft }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(value);
    };
  }, [active, reduce, value]);

  return value;
}
