import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, layout, radius, space, surface, type } from '../theme';
import {
  daySets,
  dayVolume,
  groupDigits,
  setLabel,
  summarizeEntry,
} from '../lib/stats';
import { countLabel } from '../lib/date';
import { useAppStore } from '../store/useAppStore';
import type { LogNav, LogStackParamList } from '../nav';
import { Icon } from '../components/Icon';
import { Tap } from '../components/Tap';
import { ChevronRightIcon, TrashIcon } from '../components/icons';

export function DayDetailScreen() {
  const route = useRoute<RouteProp<LogStackParamList, 'DayDetail'>>();
  const navigation = useNavigation<LogNav>();
  const days = useAppStore(state => state.days);
  const deleteEntry = useAppStore(state => state.deleteEntry);
  const unit = useAppStore(state => state.settings.unit);

  const date = route.params.date;
  const day = days[date];
  const shown = (kg: number) => groupDigits(unit === 'kg' ? kg : kg / 0.45359237);

  if (!day) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: color.ink, padding: layout.gutter }}>
        <Text style={type.body}>That session is gone.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingTop: space.sm,
          paddingBottom: space.xxxl + layout.tabBarHeight,
        }}
      >
        {dayVolume(day) > 0 ? (
          <>
            <Text style={type.numeral}>{shown(dayVolume(day))}</Text>
            <Text style={[type.label, { marginBottom: space.lg }]}>
              {unit} lifted across {countLabel(day.entries.length, 'exercise')} and {countLabel(daySets(day), 'set')}
            </Text>
          </>
        ) : (
          <>
            <Text style={type.numeral}>{daySets(day)}</Text>
            <Text style={[type.label, { marginBottom: space.lg }]}>
              sets across {countLabel(day.entries.length, 'exercise')}, no weights recorded
            </Text>
          </>
        )}

        {day.entries.map(entry => (
          <View key={entry.id} style={[surface.card, { padding: layout.cardPad, marginBottom: space.sm }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Tap
                minSize={0}
                onPress={() =>
                  navigation.navigate('Exercise', { key: entry.exerciseKey, name: entry.name })
                }
                accessibilityLabel={`Open ${entry.name}`}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 48 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={type.bodyStrong} numberOfLines={2}>
                    {entry.name}
                  </Text>
                  <Text style={type.micro}>{summarizeEntry(entry, unit).detail}</Text>
                </View>
                <Icon icon={ChevronRightIcon} size={16} tone="faint" />
              </Tap>

              <Tap
                minSize={0}
                style={{ width: 44, height: 44 }}
                hitSlop={8}
                accessibilityLabel={`Delete ${entry.name}`}
                onPress={() =>
                  Alert.alert('Delete this exercise?', entry.name, [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteEntry(date, entry.id),
                    },
                  ])
                }
              >
                <Icon icon={TrashIcon} size={18} tone="faint" />
              </Tap>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.sm }}>
              {entry.sets.map((set, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: color.ink2,
                    borderRadius: radius.row,
                    paddingHorizontal: space.sm,
                    paddingVertical: space.xxs,
                  }}
                >
                  <Text style={[type.label, { color: color.paper }]}>
                    {setLabel(set, unit) || 'blank'}
                  </Text>
                </View>
              ))}
            </View>

            {entry.notes ? (
              <Text style={[type.compact, { marginTop: space.xs }]}>{entry.notes}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
