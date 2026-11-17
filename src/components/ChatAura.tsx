import { useEffect, useMemo } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color } from '../theme';
import { useReduceMotion } from '../lib/motion';
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
 * Blur is approximated with radial-gradient falloff rather than a filter:
 * React Native has no backdrop blur without a native dependency, and a wide
 * transparent-to-transparent stop ramp reads as a bloom rather than a circle.
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

export function ChatAura({ phase }: Props) {
  const reduce = useReduceMotion();
  // Hooks must run on every render; the phase may flip to 'off' at any point,
  // so profile falls back rather than early-returning before them.
  const profile = phase === 'off' ? PROFILE.idle : PROFILE[phase];

  const drivers = useMemo(
    () => BLOOMS.map(() => ({ opacity: new Animated.Value(0), y: new Animated.Value(0) })),
    [],
  );

  useEffect(() => {
    if (phase === 'off') {
      return;
    }

    const animations: Animated.CompositeAnimation[] = [];

    BLOOMS.forEach((bloom, index) => {
      const { opacity, y } = drivers[index];

      if (reduce) {
        opacity.setValue(profile.intensity * bloom.alpha);
        y.setValue(profile.rise);
        return;
      }

      animations.push(
        Animated.timing(opacity, {
          toValue: profile.intensity * bloom.alpha,
          duration: phase === 'settling' ? 1600 : 900,
          easing: phase === 'settling' ? Easing.out(Easing.quad) : Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      );
      animations.push(
        Animated.timing(y, {
          toValue: profile.rise,
          duration: phase === 'settling' ? 1700 : 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );

      if (phase !== 'settling') {
        // Continuous drift, phase-scaled so "thinking" visibly hurries.
        animations.push(
          Animated.loop(
            Animated.sequence([
              Animated.timing(y, {
                toValue: profile.rise - bloom.drift * profile.speed,
                duration: (bloom.period / profile.speed) * 0.5,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(y, {
                toValue: profile.rise + bloom.drift * profile.speed,
                duration: (bloom.period / profile.speed) * 0.5,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
          ),
        );
      }
    });

    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [phase, profile, reduce, drivers]);

  if (phase === 'off') {
    return null;
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%' }}>
      {BLOOMS.map((bloom, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            left: `${bloom.x * 100}%` as `${number}%`,
            top: `${bloom.y * 100}%` as `${number}%`,
            marginLeft: -bloom.size / 2,
            marginTop: -bloom.size / 2,
            width: bloom.size,
            height: bloom.size,
            opacity: drivers[index].opacity,
            transform: [{ translateY: drivers[index].y }],
          }}
        >
          <Svg width={bloom.size} height={bloom.size}>
            <Defs>
              <RadialGradient id={`aura-${index}`} cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor={color.aura} stopOpacity={0.9} />
                <Stop offset="0.45" stopColor={color.aura} stopOpacity={0.28} />
                <Stop offset="0.78" stopColor={color.aura} stopOpacity={0.07} />
                <Stop offset="1" stopColor={color.aura} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={bloom.size} height={bloom.size} fill={`url(#aura-${index})`} />
          </Svg>
        </Animated.View>
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
