import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { color } from '../theme';
import { useReduceMotion } from '../lib/motion';

const BAND = 96;
const SWEEP_MS = 1400;

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  /** Stagger offset so stacked lines shimmer out of phase. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A loading line. A soft light band sweeps across it rather than the whole
 * plate breathing, so a stack of lines reads as one surface catching light
 * instead of three bars blinking in unison. Reduce motion hides the sweep and
 * leaves a still plate.
 */
export function Skeleton({ width = '100%', height = 14, radius = 7, delay = 0, style }: Props) {
  const reduce = useReduceMotion();
  const sweep = useSharedValue(0);
  const [lineWidth, setLineWidth] = useState(0);

  useEffect(() => {
    if (reduce) {
      sweep.value = 0;
      return;
    }
    sweep.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), -1),
    );
  }, [delay, reduce, sweep]);

  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value * (lineWidth + BAND) - BAND }],
    opacity: reduce ? 0 : 1,
  }));

  return (
    <View
      onLayout={event => setLineWidth(event.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: color.ink3,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: BAND }, band]}>
        <Svg width={BAND} height="100%">
          <Defs>
            <LinearGradient id="skeleton-sheen" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color.paper} stopOpacity={0} />
              <Stop offset="0.5" stopColor={color.paper} stopOpacity={0.14} />
              <Stop offset="1" stopColor={color.paper} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={BAND} height="100%" fill="url(#skeleton-sheen)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths: (`${number}%`)[] = ['100%', '84%', '56%'];

  return (
    <>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={widths[index % widths.length]}
          height={14}
          delay={index * 160}
          style={{ marginBottom: index === lines - 1 ? 0 : 8 }}
        />
      ))}
    </>
  );
}
