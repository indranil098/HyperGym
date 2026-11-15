import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, layout, radius, space, surface, type } from '../theme';
import { dayKey } from '../lib/date';
import { exerciseKey } from '../lib/stats';
import { uid } from '../lib/id';
import { tap } from '../lib/feedback';
import { useAppStore } from '../store/useAppStore';
import type { RoutineNav } from '../nav';
import type { Draft, Routine } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Tap } from '../components/Tap';
import { ListIcon, TrashIcon } from '../components/icons';

function draftFromRoutine(routine: Routine): Draft {
  return {
    date: dayKey(),
    exercises: routine.items.map(item => ({
      name: item.name,
      exerciseKey: exerciseKey(item.name),
      sets: Array.from({ length: Math.max(1, item.targetSets) }, () => ({
        reps: item.targetReps > 0 ? item.targetReps : undefined,
        weightKg: item.targetWeightKg,
      })),
      assumed: item.targetWeightKg === undefined ? ['weight is not set in this routine'] : [],
    })),
    assumptions: [],
  };
}

export function RoutinesScreen() {
  const navigation = useNavigation<RoutineNav>();
  const routines = useAppStore(state => state.routines);
  const deleteRoutine = useAppStore(state => state.deleteRoutine);
  const addMessage = useAppStore(state => state.addMessage);

  const start = (routine: Routine) => {
    tap();
    addMessage({
      id: uid('d'),
      role: 'assistant',
      kind: 'draft',
      draftId: uid('k'),
      draft: draftFromRoutine(routine),
      status: 'pending',
      at: Date.now(),
    });
    navigation.navigate('Chat');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScreenHeader
        title="Routines"
        meta={routines.length === 0 ? 'No templates yet' : `${routines.length} saved`}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: space.xxxl + layout.tabBarHeight,
        }}
      >
        {routines.length === 0 ? (
          <EmptyState
            icon={ListIcon}
            title="No routines yet"
            body="When the coach drafts a workout you like, tap Save as routine on the card. It shows up here for one-tap repeat."
          />
        ) : null}

        {routines.map(routine => {
          const setCount = routine.items.reduce((sum, item) => sum + item.targetSets, 0);
          return (
            <View
              key={routine.id}
              style={[surface.card, { padding: layout.cardPad, marginBottom: space.sm }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.bodyStrong} numberOfLines={2}>
                    {routine.name}
                  </Text>
                  <Text style={type.micro}>
                    {routine.items.length} exercises, {setCount} sets
                  </Text>
                </View>

                <Tap
                  minSize={0}
                  style={{
                    height: 44,
                    paddingHorizontal: space.md,
                    borderRadius: radius.pill,
                    backgroundColor: color.volt,
                  }}
                  onPress={() => start(routine)}
                  accessibilityLabel={`Log ${routine.name}`}
                >
                  <Text style={[type.bodyStrong, { color: color.voltInk, fontSize: 15 }]}>Log this</Text>
                </Tap>

                <Tap
                  minSize={0}
                  style={{ width: 44, height: 44 }}
                  hitSlop={8}
                  accessibilityLabel={`Delete ${routine.name}`}
                  onPress={() =>
                    Alert.alert('Delete routine?', routine.name, [
                      { text: 'Keep', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteRoutine(routine.id),
                      },
                    ])
                  }
                >
                  <Icon icon={TrashIcon} size={18} tone="faint" />
                </Tap>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xxs, marginTop: space.sm }}>
                {routine.items.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    style={{
                      backgroundColor: color.ink2,
                      borderRadius: radius.row,
                      paddingHorizontal: space.xs,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={[type.micro, { color: color.paperDim }]}>
                      {item.name} {item.targetSets}×{item.targetReps > 0 ? item.targetReps : '?'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
