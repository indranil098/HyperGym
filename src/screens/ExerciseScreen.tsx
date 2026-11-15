import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, layout, radius, space, surface, type } from '../theme';
import { dayLabel, shortDate } from '../lib/date';
import { exerciseKind } from '../lib/exerciseKind';
import {
  formatDuration,
  groupDigits,
  historyFor,
  recordsFor,
  summarizeEntry,
  weightLabel,
  type ExercisePoint,
} from '../lib/stats';
import { useAppStore } from '../store/useAppStore';
import type { LogStackParamList } from '../nav';
import { LineChart } from '../components/LineChart';
import { EmptyState } from '../components/EmptyState';
import { TrendingIcon } from '../components/icons';

export function ExerciseScreen() {
  const route = useRoute<RouteProp<LogStackParamList, 'Exercise'>>();
  const days = useAppStore(state => state.days);
  const unit = useAppStore(state => state.settings.unit);

  const { key, name } = route.params;
  const dayList = Object.values(days).sort((a, b) => (a.date < b.date ? -1 : 1));
  const history = historyFor(dayList, key);
  const kind = exerciseKind(name, history[0]?.entry.sets ?? []);
  const chips = recordsFor(history, kind, unit);

  const headline = (() => {
    if (kind === 'weight') {
      const best = Math.max(...history.map(point => point.best));
      return { label: 'Best estimated 1RM', value: groupDigits(unit === 'kg' ? best : best / 0.45359237, 1), suffix: unit };
    }
    if (kind === 'bodyweight') {
      return {
        label: 'Most reps in a set',
        value: String(Math.max(...history.map(point => point.bestReps))),
        suffix: 'reps',
      };
    }
    if (kind === 'duration') {
      return {
        label: 'Longest hold',
        value: formatDuration(Math.max(...history.map(point => point.durationSec))),
        suffix: '',
      };
    }
    const distance = Math.max(...history.map(point => point.distanceM));
    if (distance > 0) {
      return {
        label: 'Longest distance',
        value: (distance / 1000).toFixed(2),
        suffix: 'km',
      };
    }
    return {
      label: 'Longest time',
      value: formatDuration(Math.max(...history.map(point => point.durationSec))),
      suffix: '',
    };
  })();

  const chartPoints = history.map(point => {
    if (kind === 'weight') {
      return { date: point.date, value: unit === 'kg' ? point.best : point.best / 0.45359237 };
    }
    if (kind === 'bodyweight') {
      return { date: point.date, value: point.reps };
    }
    if (kind === 'duration') {
      return { date: point.date, value: Math.round((point.durationSec / 60) * 10) / 10 };
    }
    const distance = Math.max(...history.map(item => item.distanceM));
    return {
      date: point.date,
      value:
        distance > 0
          ? Math.round(point.distanceM / 10) / 100
          : Math.round((point.durationSec / 60) * 10) / 10,
    };
  });

  const chartLabel = (() => {
    if (kind === 'weight') return `Estimated 1RM in ${unit}`;
    if (kind === 'bodyweight') return 'Reps per session';
    if (kind === 'duration') return 'Minutes held';
    return chartPoints.some(point => point.value > 0) && history.some(item => item.distanceM > 0)
      ? 'Distance in km'
      : 'Minutes';
  })();

  const sessionHeadline = (point: ExercisePoint): string => {
    if (kind === 'weight') {
      return point.topWeight > 0 ? weightLabel(point.topWeight, unit) : `${point.reps} reps`;
    }
    if (kind === 'bodyweight') {
      return `${point.bestReps} reps`;
    }
    if (point.distanceM > 0) {
      return `${(point.distanceM / 1000).toFixed(2)} km`;
    }
    return formatDuration(point.durationSec);
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: space.sm,
          paddingBottom: space.xxxl + layout.tabBarHeight,
        }}
      >
        {history.length === 0 ? (
          <EmptyState
            icon={TrendingIcon}
            title="No history yet"
            body="Log this exercise once and the trend starts here."
          />
        ) : (
          <>
            <Text style={type.label}>{headline.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs }}>
              <Text style={type.numeral}>{headline.value}</Text>
              {headline.suffix ? (
                <Text style={[type.label, { marginBottom: 12 }]}>{headline.suffix}</Text>
              ) : null}
            </View>

            {chips.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.sm }}>
                {chips.map(chip => (
                  <View
                    key={chip.label}
                    style={{
                      backgroundColor: color.ink1,
                      borderWidth: 1,
                      borderColor: color.line,
                      borderRadius: radius.row,
                      paddingHorizontal: space.sm,
                      paddingVertical: space.xxs,
                    }}
                  >
                    <Text style={type.micro}>{chip.label}</Text>
                    <Text style={[type.label, { color: color.paper }]}>{chip.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[surface.card, { padding: layout.cardPad, marginTop: space.md }]}>
              <Text style={[type.label, { marginBottom: space.sm }]}>{chartLabel}</Text>
              <LineChart points={chartPoints} />
              {history.length > 1 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: space.xxs,
                  }}
                >
                  <Text style={type.micro}>{shortDate(history[0].date)}</Text>
                  <Text style={type.micro}>{shortDate(history[history.length - 1].date)}</Text>
                </View>
              ) : null}
              <Text style={[type.micro, { marginTop: space.sm }]}>
                {history.length === 1
                  ? 'One session so far, so the chart shows a single point. The line appears at two.'
                  : `${history.length} sessions`}
              </Text>
            </View>

            <Text style={[type.label, { marginTop: space.lg, marginBottom: space.xs }]}>Sessions</Text>

            {[...history].reverse().map(point => {
              const summary = summarizeEntry(point.entry, unit);
              return (
                <View
                  key={point.date}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    minHeight: 64,
                    borderBottomWidth: 1,
                    borderColor: color.lineSoft,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{dayLabel(point.date)}</Text>
                    <Text style={type.micro}>{summary.detail || 'no numbers recorded'}</Text>
                  </View>
                  <Text style={type.numeralSm}>{sessionHeadline(point)}</Text>
                </View>
              );
            })}

            <Text style={[type.micro, { marginTop: space.md }]}>
              {headline.label === 'Best estimated 1RM'
                ? `Weights shown in ${unit}. Warm-up sets are excluded.`
                : 'Warm-up sets are excluded from every record.'}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
