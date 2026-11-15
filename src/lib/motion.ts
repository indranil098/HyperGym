import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export const duration = {
  instant: 100,
  fast: 150,
  base: 250,
  exit: 175,
} as const;

export const curve = {
  enter: Easing.out(Easing.exp),
  exit: Easing.in(Easing.quad),
} as const;

export function useReduceMotion(): boolean {
  const [systemReduce, setSystemReduce] = useState(false);
  const preference = useAppStore(state => state.settings.motion);

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

  if (preference === 'reduced') {
    return true;
  }
  if (preference === 'full') {
    return false;
  }
  return systemReduce;
}

export function stagger(index: number, step = 20): number {
  return index * step + (((index * 37) % 11) - 5);
}

export function useEntrance(delay = 0): { style: Animated.WithAnimatedValue<ViewStyle> } {
  const reduce = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduce ? duration.instant : duration.base,
      delay: reduce ? 0 : delay,
      easing: curve.enter,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, reduce]);

  const lit = reduce
    ? { opacity: progress, transform: [] }
    : {
        opacity: progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [0, 0.8, 1],
        }),
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 0.6, 1],
              outputRange: [0.96, 1.02, 1],
            }),
          },
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      };

  return { style: lit };
}

export function usePulse(active: boolean): Animated.Value {
  const reduce = useReduceMotion();
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || reduce) {
      value.setValue(active ? 1 : 0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduce, value]);

  return value;
}
