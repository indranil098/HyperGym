import { Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useTicker } from '../hooks/useTicker';
import { tap } from '../lib/feedback';
import { Glass } from './Glass';
import { Tap } from './Tap';

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes}:${`${seconds}`.padStart(2, '0')}.${`${hundredths}`.padStart(2, '0')}`;
}

/**
 * Stopwatch for holds, planks and cardio. Runs off an absolute `startedAt`
 * timestamp in the store, so it keeps counting across screens and survives an
 * app restart mid-session.
 */
export function Stopwatch() {
  const stopwatch = useAppStore(state => state.stopwatch);
  const startStopwatch = useAppStore(state => state.startStopwatch);
  const stopStopwatch = useAppStore(state => state.stopStopwatch);
  const running = Boolean(stopwatch);
  const tick = useTicker(running, 50);

  const elapsed = stopwatch ? tick - stopwatch.startedAt : 0;

  return (
    <Glass radius={radius.card} intensity="mid" style={{ alignItems: 'center', padding: space.md }}>
      <Text
        style={[
          type.numeral,
          { fontSize: 54, lineHeight: 60, fontVariant: ['tabular-nums'], color: color.paper },
        ]}
      >
        {clock(elapsed)}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <Tap
          minSize={0}
          onPress={() => {
            tap();
            if (running) {
              stopStopwatch();
            } else {
              startStopwatch();
            }
          }}
          accessibilityLabel={running ? 'Stop stopwatch' : 'Start stopwatch'}
          style={{
            height: 52,
            paddingHorizontal: space.lg,
            borderRadius: 999,
            backgroundColor: running ? color.ink2 : color.volt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[type.bodyStrong, { color: running ? color.paper : color.voltInk }]}>
            {running ? 'Stop' : 'Start'}
          </Text>
        </Tap>
      </View>
    </Glass>
  );
}
