import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, layout, space, surface, type } from '../theme';
import {
  countLabel,
  dayKey,
  dayLabel,
  keyOf,
  monthCells,
  monthLabel,
  sortedDesc,
} from '../lib/date';
import {
  daySets,
  dayVolume,
  groupDigits,
  summarizeEntry,
  weeklySetsByGroup,
} from '../lib/stats';
import { exerciseKind } from '../lib/exerciseKind';
import { useAppStore } from '../store/useAppStore';
import type { LogNav } from '../nav';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Tap } from '../components/Tap';
import { ChevronLeftIcon, ChevronRightIcon, HistoryIcon } from '../components/icons';

const CELL_WIDTH = '14.2857%' as const;
const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function LogScreen() {
  const navigation = useNavigation<LogNav>();
  const days = useAppStore(state => state.days);
  const unit = useAppStore(state => state.settings.unit);

  const today = dayKey();
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const keys = sortedDesc(Object.keys(days));
  const day = days[selected];
  const cells = monthCells(view.year, view.month);
  const shownVolume = (kg: number) => groupDigits(unit === 'kg' ? kg : kg / 0.45359237);

  const shiftMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const volume = day ? dayVolume(day) : 0;
  const sets = day ? daySets(day) : 0;
  const cardioMinutes = day
    ? Math.round(
        day.entries.reduce((sum, entry) => {
          const kind = exerciseKind(entry.name, entry.sets);
          if (kind !== 'cardio' && kind !== 'duration') {
            return sum;
          }
          return (
            sum +
            entry.sets.reduce(
              (inner, set) => inner + (set.type === 'warmup' ? 0 : (set.durationSec ?? 0)),
              0,
            )
          );
        }, 0) / 60,
      )
    : 0;
  const weekly = weeklySetsByGroup(Object.values(days));
  const weeklyMax = weekly.reduce((max, item) => Math.max(max, item.sets), 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScreenHeader
        title="Log"
        meta={keys.length === 0 ? 'Nothing logged yet' : `${countLabel(keys.length, 'session')} on record`}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: space.xxxl + layout.tabBarHeight,
        }}
      >
        <View style={[surface.card, { paddingHorizontal: space.xs, paddingVertical: space.md, marginBottom: space.lg }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.xs,
            }}
          >
            <Tap minSize={44} onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month">
              <Icon icon={ChevronLeftIcon} size={22} tone="dim" />
            </Tap>
            <Text style={type.bodyStrong} accessibilityLabel={monthLabel(view.year, view.month)}>
              {monthLabel(view.year, view.month)}
            </Text>
            <Tap minSize={44} onPress={() => shiftMonth(1)} accessibilityLabel="Next month">
              <Icon icon={ChevronRightIcon} size={22} tone="dim" />
            </Tap>
          </View>

          <View style={{ flexDirection: 'row', marginTop: space.xs }}>
            {WEEKDAY_INITIALS.map((initial, index) => (
              <Text key={`${initial}-${index}`} style={[type.micro, { width: CELL_WIDTH, textAlign: 'center' }]}>
                {initial}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.xxs }}>
            {cells.map((dayNumber, index) => {
              if (dayNumber === null) {
                return <View key={`blank-${index}`} style={{ width: CELL_WIDTH, height: 50 }} />;
              }

              const key = keyOf(view.year, view.month, dayNumber);
              const hasSession = Boolean(days[key]);
              const isSelected = key === selected;
              const isToday = key === today;

              return (
                <View key={key} style={{ width: CELL_WIDTH, alignItems: 'center' }}>
                  <Tap
                    minSize={0}
                    onPress={() => setSelected(key)}
                    accessibilityLabel={`${dayNumber} ${monthLabel(view.year, view.month)}${
                      hasSession ? ', has a session' : ''
                    }`}
                    style={{
                      width: 42,
                      height: 46,
                      borderRadius: 12,
                      backgroundColor: isSelected ? color.ink2 : 'transparent',
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: color.line,
                    }}
                  >
                    <Text
                      style={[
                        type.body,
                        {
                          color: isToday ? color.volt : hasSession ? color.paper : color.paperDim,
                        },
                      ]}
                    >
                      {dayNumber}
                    </Text>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        marginTop: 3,
                        backgroundColor: hasSession ? color.volt : 'transparent',
                      }}
                    />
                  </Tap>
                </View>
              );
            })}
          </View>
        </View>

        {keys.length === 0 && !day ? (
          <EmptyState
            icon={HistoryIcon}
            title="No sessions yet"
            body="Tell the coach what you did in Chat. Confirmed workouts land on this calendar."
          />
        ) : null}

        {day ? (
          <View style={[surface.card, { padding: layout.cardPad }]}>
            <Tap
              minSize={0}
              onPress={() => navigation.navigate('DayDetail', { date: selected })}
              accessibilityLabel={`Open ${dayLabel(selected)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 }}
            >
              <Text style={[type.bodyStrong, { flex: 1, fontSize: 18 }]}>{dayLabel(selected)}</Text>
              <Icon icon={ChevronRightIcon} size={16} tone="faint" />
            </Tap>

            {volume > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, marginTop: space.xxs }}>
                <Text style={type.numeral}>{shownVolume(volume)}</Text>
                <Text style={[type.label, { marginBottom: 12 }]}>{unit} lifted</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, marginTop: space.xxs }}>
                <Text style={type.numeral}>{sets}</Text>
                <Text style={[type.label, { marginBottom: 12 }]}>
                  {sets === 1 ? 'set' : 'sets'}
                </Text>
              </View>
            )}

            <Text style={type.micro}>
              {countLabel(day.entries.length, 'exercise')}
              {volume > 0 ? `, ${countLabel(sets, 'set')}` : ''}
              {cardioMinutes > 0 ? ` and ${cardioMinutes} min cardio` : ''}
            </Text>
            {day.notes ? (
              <Text style={[type.micro, { marginTop: 2, color: color.paperDim }]}>{day.notes}</Text>
            ) : null}
            <View style={{ height: space.sm }} />

            {day.entries.map((entry, index) => {
              const summary = summarizeEntry(entry, unit);
              return (
                <View key={entry.id}>
                  {index > 0 ? <View style={{ height: 1, backgroundColor: color.lineSoft }} /> : null}
                  <Tap
                    minSize={0}
                    onPress={() =>
                      navigation.navigate('Exercise', { key: entry.exerciseKey, name: entry.name })
                    }
                    accessibilityLabel={`${entry.name}, ${summary.detail}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.sm,
                      paddingVertical: space.sm,
                      minHeight: 56,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={type.bodyStrong} numberOfLines={2}>
                        {entry.name}
                      </Text>
                      <Text style={type.micro}>{summary.detail}</Text>
                    </View>
                    {summary.headline ? (
                      <Text style={type.numeralSm}>{summary.headline}</Text>
                    ) : null}
                    <Icon icon={ChevronRightIcon} size={16} tone="faint" />
                  </Tap>
                </View>
              );
            })}
          </View>
        ) : keys.length > 0 ? (
          <View style={[surface.card, { padding: layout.cardPad }]}>
            <Text style={[type.bodyStrong, { fontSize: 18, marginBottom: space.xxs }]}>
              {dayLabel(selected)}
            </Text>
            <Text style={type.compact}>
              Nothing logged on this day. Tap a day with a lime dot, or tell the coach what you did.
            </Text>
          </View>
        ) : null}

        {weekly.length > 0 ? (
          <View style={[surface.card, { padding: layout.cardPad, marginTop: space.lg }]}>
            <Text style={[type.label, { marginBottom: space.xs }]}>Last 7 days</Text>
            {weekly.map(item => (
              <View key={item.group} style={{ marginBottom: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={type.body}>{item.group}</Text>
                  <Text style={type.numeralSm}>{item.sets}</Text>
                </View>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: color.ink3,
                    marginTop: space.xxs,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      width: `${Math.max(4, Math.round((item.sets / weeklyMax) * 100))}%`,
                      backgroundColor: item.sets === weeklyMax ? color.volt : color.paperDim,
                    }}
                  />
                </View>
              </View>
            ))}
            <Text style={[type.micro, { marginTop: space.xs }]}>Hard sets, warm-ups excluded.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
