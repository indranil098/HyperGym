import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { color } from '../theme';
import { curve, duration as motionDuration, useReduceMotion } from '../lib/motion';
import type { AuraPhase } from '../agent/useAgent';

type Props = {
  phase: AuraPhase;
};

type Bloom = {
  size: number;
  /** Normalised resting position within the screen. */
  x: number;
  y: number;
  /** Centre opacity of the bloom at full intensity. */
  alpha: number;
  /** Drift amplitude and period, per phase. */
  drift: number;
  period: number;
};

/**
 * The intro aura. Three soft blooms behind the chat that change character with
 * the request lifecycle, then sink away and unmount once the reply lands. Only
 * ever present for a chat's opening exchange.
 *
 * The bloom takes the theme's accent, so it is lime on the black theme and a
 * dark wash on the lime and white themes where lime would disappear. The veil
 * uses the theme background rather than hardcoded black, which previously
 * painted a dark smear across the white and lime pages.
 *
 * Every bloom runs its own shared values on the UI thread — the phase system
 * only ever assigns new animations, so no JS timer keeps the drift alive.
 * Blur is approximated with radial-gradient falloff rather than a filter:
 * a wide transparent-to-transparent stop ramp reads as a bloom, not a circle.
 */
const BLOOMS: Bloom[] = [
  { size: 560, x: 0.2, y: 0.9, alpha: 0.62, drift: 46, period: 9000 },
  { size: 430, x: 0.84, y: 0.82, alpha: 0.48, drift: 62, period: 7000 },
  { size: 320, x: 0.52, y: 0.98, alpha: 0.36, drift: 38, period: 11000 },
];

const PROFILE: Record<Exclude<AuraPhase, 'off'>, { intensity: number; speed: number; rise: number }> = {
  // Breathing, barely there.
  idle: { intensity: 0.55, speed: 1, rise: 0 },
  // The prompt is on its way: blooms lift and gather.
  sending: { intensity: 0.8, speed: 1.9, rise: 70 },
  // Inference running: steeper, tighter, brighter.
  thinking: { intensity: 1, speed: 2.6, rise: 130 },
  // Reply landed: sink and dissolve.
  settling: { intensity: 0, speed: 1, rise: 260 },
} as const;

function BloomView({ bloom, phase, reduce }: { bloom: Bloom; phase: AuraPhase; reduce: boolean }) {
  const profile = phase === 'off' ? PROFILE.idle : PROFILE[phase];
  const opacity = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (phase === 'off') {
      return;
    }
    const settling = phase === 'settling';

    if (reduce) {
      opacity.value = profile.intensity * bloom.alpha;
      y.value = profile.rise;
      return;
    }

    opacity.value = withTiming(profile.intensity * bloom.alpha, {
      duration: settling ? motionDuration.settle : motionDuration.ambient,
      easing: settling ? curve.glide : curve.soft,
    });

    if (settling) {
      y.value = withTiming(profile.rise, {
        duration: motionDuration.settle + 100,
        easing: curve.glide,
      });
      return () => {
        cancelAnimation(opacity);
        cancelAnimation(y);
      };
    }

    // Rise into position, then hand off to an endless palindrome drift,
    // phase-scaled so "thinking" visibly hurries.
    const leg = (bloom.period / profile.speed) * 0.5;
    const driftTop = profile.rise - bloom.drift * profile.speed;
    const driftBottom = profile.rise + bloom.drift * profile.speed;
    y.value = withSequence(
      withTiming(profile.rise, { duration: motionDuration.rise, easing: curve.glide }),
      withRepeat(
        withSequence(
          withTiming(driftTop, { duration: leg, easing: curve.sway }),
          withTiming(driftBottom, { duration: leg, easing: curve.sway }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
  }, [phase, profile, reduce, bloom, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${bloom.x * 100}%` as `${number}%`,
          top: `${bloom.y * 100}%` as `${number}%`,
          marginLeft: -bloom.size / 2,
          marginTop: -bloom.size / 2,
          width: bloom.size,
          height: bloom.size,
        },
        style,
      ]}
    >
      <Svg width={bloom.size} height={bloom.size}>
        <Defs>
          <RadialGradient id={`aura-${bloom.size}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={color.aura} stopOpacity={0.9} />
            <Stop offset="0.45" stopColor={color.aura} stopOpacity={0.28} />
            <Stop offset="0.78" stopColor={color.aura} stopOpacity={0.07} />
            <Stop offset="1" stopColor={color.aura} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={bloom.size} height={bloom.size} fill={`url(#aura-${bloom.size})`} />
      </Svg>
    </Animated.View>
  );
}

export function ChatAura({ phase }: Props) {
  const reduce = useReduceMotion();

  if (phase === 'off') {
    return null;
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%' }}>
      {BLOOMS.map(bloom => (
        <BloomView key={bloom.size} bloom={bloom} phase={phase} reduce={reduce} />
      ))}
      {/* Melt the blooms into black toward the top so the aura reads as light
          rising from the composer rather than shapes floating mid-screen. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="aura-veil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.ink} stopOpacity={1} />
            <Stop offset="0.42" stopColor={color.ink} stopOpacity={0.82} />
            <Stop offset="0.72" stopColor={color.ink} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color.ink} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#aura-veil)" />
      </Svg>
    </View>
  );
}
