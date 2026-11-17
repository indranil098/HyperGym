import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color, layout, space, type } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useTicker } from '../hooks/useTicker';
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

/**
 * Rest countdown drawn as an SVG ring so the arc is GPU-composited and stays
 * crisp at any size. The remaining time is derived from an absolute `endsAt`
 * timestamp, so backgrounding the app or killing it mid-rest keeps the
 * countdown honest.
 */
export function RestTimer({ variant = 'full', onComplete, onOpen }: Props) {
  const rest = useAppStore(state => state.rest);
  const skipRest = useAppStore(state => state.skipRest);
  const extendRest = useAppStore(state => state.extendRest);

  // An expired rest is no longer counting anything, so the ticker must stop
  // rather than re-rendering a static "GO" pill five times a second.
  const active = Boolean(rest) && (rest?.endsAt ?? 0) > Date.now();
  const tick = useTicker(active, 200);
  const firedRef = useRef(false);

  const remaining = rest ? (rest.endsAt - tick) / 1000 : 0;
  const done = Boolean(rest) && remaining <= 0;
  const fraction = rest
    ? Math.max(0, Math.min(1, (rest.endsAt - tick) / (rest.durationSec * 1000)))
    : 0;

  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      hapticConfirm();
      onComplete?.();
    }
    if (!done) {
      firedRef.current = false;
    }
  }, [done, onComplete]);

  if (!rest) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Tap
        minSize={0}
        onPress={() => {
          tap();
          if (done) {
            // Expired rest otherwise lingers forever off the Train tab.
            skipRest();
          } else {
            onOpen?.();
          }
        }}
        accessibilityLabel={
          done ? 'Rest finished. Tap to dismiss.' : `Rest ${clock(remaining)} remaining. Tap to open session.`
        }
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        <Glass radius={999} intensity="high" style={{ height: 46, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, gap: space.xs }}>
            <CompactRing fraction={fraction} />
            <Text
              style={[
                type.bodyStrong,
                { color: done ? color.volt : color.paper, fontVariant: ['tabular-nums'] },
              ]}
            >
              {done ? 'GO' : clock(remaining)}
            </Text>
          </View>
        </Glass>
      </Tap>
    );
  }

  const size = 240;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Glass radius={32} intensity="high" style={{ padding: layout.cardPad, alignItems: 'center' }}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color.ink2}
              strokeWidth={stroke}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color.volt}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
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
      </View>
    </Glass>
  );
}

function CompactRing({ fraction }: { fraction: number }) {
  const size = 20;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color.ink2} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color.volt}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
