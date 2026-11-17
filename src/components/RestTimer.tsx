import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  Easing,
  createAnimatedComponent,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { color, layout, space, type } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useTicker } from '../hooks/useTicker';
import { useReduceMotion } from '../lib/motion';
import { confirm as hapticConfirm, tap } from '../lib/feedback';
import { Glass } from './Glass';
import { Tap } from './Tap';

type Props = {
  variant?: 'full' | 'compact';
  onComplete?: () => void;
  /** Where a tap on the compact pill should navigate. */
  onOpen?: () => void;
};

function clock(totalSec: number): string {
  const safe = Math.max(0, Math.ceil(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

const AnimatedCircle = createAnimatedComponent(Circle);

/**
 * Rest countdown drawn as an SVG ring so the arc is GPU-composited and stays
 * crisp at any size. The remaining time is derived from an absolute `endsAt`
 * timestamp, so backgrounding the app or killing it mid-rest keeps the
 * countdown honest. Only this readout re-renders on ticks — the Glass shell
 * and buttons around it stay still.
 */
export function RestTimer({ variant = 'full', onComplete, onOpen }: Props) {
  const rest = useAppStore(state => state.rest);
  const skipRest = useAppStore(state => state.skipRest);
  const extendRest = useAppStore(state => state.extendRest);

  const [expired, setExpired] = useState(false);
  const firedRef = useRef(false);

  // A new rest resets the expiry latch.
  useEffect(() => {
    setExpired(false);
  }, [rest?.endsAt]);

  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      hapticConfirm();
      onComplete?.();
    }
    if (!expired) {
      firedRef.current = false;
    }
  }, [expired, onComplete]);

  if (!rest) {
    return null;
  }

  const handleExpire = () => setExpired(true);

  if (variant === 'compact') {
    return (
      <Tap
        minSize={0}
        onPress={() => {
          tap();
          if (expired) {
            // Expired rest otherwise lingers forever off the Train tab.
            skipRest();
          } else {
            onOpen?.();
          }
        }}
        accessibilityLabel={
          expired ? 'Rest finished. Tap to dismiss.' : 'Rest timer running. Tap to open session.'
        }
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        <Glass preset="compactControl" radius={999} style={{ height: 46, justifyContent: 'center' }}>
          <RestReadout
            compact
            endsAt={rest.endsAt}
            durationSec={rest.durationSec}
            expired={expired}
            onExpire={handleExpire}
          />
        </Glass>
      </Tap>
    );
  }

  const size = 240;
  const stroke = 10;

  return (
    <Glass radius={32} intensity="high" style={{ padding: layout.cardPad, alignItems: 'center' }}>
      <RestReadout
        size={size}
        stroke={stroke}
        endsAt={rest.endsAt}
        durationSec={rest.durationSec}
        expired={expired}
        onExpire={handleExpire}
      />

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <Tap
          minSize={0}
          onPress={() => {
            tap();
            extendRest(15);
          }}
          accessibilityLabel="Extend rest by 15 seconds"
          style={{
            height: 52,
            paddingHorizontal: space.md,
            borderRadius: 999,
            backgroundColor: color.ink2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={type.bodyStrong}>+15s</Text>
        </Tap>
        <Tap
          minSize={0}
          onPress={() => {
            tap();
            skipRest();
          }}
          accessibilityLabel="Skip rest"
          style={{
            height: 52,
            paddingHorizontal: space.lg,
            borderRadius: 999,
            backgroundColor: color.volt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[type.bodyStrong, { color: color.voltInk }]}>Skip</Text>
        </Tap>
      </View>
    </Glass>
  );
}

type ReadoutProps = {
  endsAt: number;
  durationSec: number;
  expired: boolean;
  onExpire: () => void;
  compact?: boolean;
  size?: number;
  stroke?: number;
};

function RestReadout({ endsAt, durationSec, expired, onExpire, compact, size = 240, stroke = 10 }: ReadoutProps) {
  // An expired rest is no longer counting anything, so the ticker must stop
  // rather than re-rendering a static "GO" pill five times a second.
  const active = endsAt > Date.now();
  const tick = useTicker(active && !expired, 200);

  const remaining = (endsAt - tick) / 1000;
  const done = expired || remaining <= 0;

  useEffect(() => {
    if (done) {
      onExpire();
    }
  }, [done, onExpire]);

  const fraction = Math.max(0, Math.min(1, (endsAt - tick) / (durationSec * 1000)));

  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, gap: space.xs }}>
        <Ring fraction={fraction} size={20} stroke={3} />
        <Text
          style={[
            type.bodyStrong,
            { color: done ? color.volt : color.paper, fontVariant: ['tabular-nums'] },
          ]}
        >
          {done ? 'GO' : clock(remaining)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ring fraction={fraction} size={size} stroke={stroke} />
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text
            style={[
              type.numeral,
              { fontSize: 62, lineHeight: 66, color: done ? color.volt : color.paper },
            ]}
          >
            {done ? 'GO' : clock(remaining)}
          </Text>
          <Text style={[type.label, { marginTop: space.xxs }]}>
            {done ? 'next set' : 'rest'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * The arc. Each 200ms tick nudges a shared value toward the honest fraction
 * with a linear timing of the same length, so the visible steps melt into one
 * continuous sweep — still anchored to `endsAt`, never a free-running
 * animation that drifts from the truth.
 */
function Ring({ fraction, size, stroke }: { fraction: number; size: number; stroke: number }) {
  const reduce = useReduceMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * (1 - fraction);

  const offset = useSharedValue(target);

  useEffect(() => {
    offset.value = reduce ? target : withTiming(target, { duration: 220, easing: Easing.linear });
  }, [target, offset, reduce]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color.ink2}
        strokeWidth={stroke}
        fill="none"
      />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color.volt}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
