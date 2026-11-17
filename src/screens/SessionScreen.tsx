import { useState, useMemo } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, radius, space, type } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { sessionElapsedSec, sessionSetCount, sessionVolume } from '../lib/session';
import { nextTarget } from '../lib/insights';
import { groupDigits, hasValue, setLabel, KG_PER_LB, trackedExercises } from '../lib/stats';
import { suggestExercises } from '../lib/exerciseCatalog';
import { countLabel, dayLabel } from '../lib/date';
import { tap } from '../lib/feedback';
import type { Receipt } from '../types';
import { useTicker } from '../hooks/useTicker';
import { Glass } from '../components/Glass';
import { RestTimer } from '../components/RestTimer';
import { Stopwatch } from '../components/Stopwatch';
import { Icon } from '../components/Icon';
import { NumericStepper } from '../components/NumericStepper';
import { ScreenHeader } from '../components/ScreenHeader';
import { Tap } from '../components/Tap';
import {
  CheckIcon,
  CloseIcon,
  DumbbellIcon,
  PlusIcon,
  StopwatchIcon,
  TrashIcon,
} from '../components/icons';

function elapsedLabel(sec: number): string {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

export function SessionScreen() {
  const session = useAppStore(state => state.session);
  const rest = useAppStore(state => state.rest);
  const unit = useAppStore(state => state.settings.unit);
  const days = useAppStore(state => state.days);
  const startSession = useAppStore(state => state.startSession);
  const addSessionExerciseFromHistory = useAppStore(state => state.addSessionExerciseFromHistory);
  const removeSessionExercise = useAppStore(state => state.removeSessionExercise);
  const removeSessionSet = useAppStore(state => state.removeSessionSet);
  const logSessionSet = useAppStore(state => state.logSessionSet);
  const updateSessionSet = useAppStore(state => state.updateSessionSet);
  const finishSession = useAppStore(state => state.finishSession);
  const cancelSession = useAppStore(state => state.cancelSession);
  const insets = useSafeAreaInsets();
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [summary, setSummary] = useState<Receipt | null>(null);

  const tick = useTicker(Boolean(session), 500);
  const elapsed = session ? sessionElapsedSec(session, tick) : 0;

  const suggestions = useMemo(
    () =>
      suggestExercises(
        draftName,
        trackedExercises(Object.values(days)).map(item => ({ name: item.name, key: item.key })),
      ),
    [draftName, days],
  );

  const volume = session ? sessionVolume(session) : 0;
  const sets = session ? sessionSetCount(session) : 0;

  const start = () => {
    tap();
    startSession();
  };

  const finish = () => {
    tap();
    const receipt = finishSession();
    if (!receipt) {
      return;
    }
    // Train is a tab root, so there is nothing to go back to. Surface the
    // result inline instead of silently dropping it.
    setSummary(receipt);
  };

  if (!session) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.ink }}>
        <ScreenHeader title="Train" meta="Log sets as you lift" />
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: layout.gutter,
            paddingBottom: space.xxxl + layout.tabBarHeight,
          }}
        >
          {summary ? (
            <Glass radius={32} intensity="mid" style={{ marginBottom: space.md, padding: layout.cardPad }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.xs }}>
                <Icon icon={CheckIcon} size={22} tone="volt" />
                <Text style={[type.bodyStrong, { flex: 1, fontSize: 18 }]}>Session logged</Text>
              </View>
              <Text style={type.compact}>
                {dayLabel(summary.dayKey)} · {countLabel(summary.exerciseCount, 'exercise')},{' '}
                {countLabel(summary.setCount, 'set')},{' '}
                {groupDigits(unit === 'kg' ? summary.volume : summary.volume / KG_PER_LB)} {unit}
              </Text>
              {(summary.prs ?? []).length > 0 ? (
                <View style={{ marginTop: space.sm, gap: space.xxs }}>
                  {(summary.prs ?? []).map(pr => (
                    <Text key={`${pr.name}-${pr.value}`} style={[type.compact, { color: color.volt }]}>
                      New PR {pr.name} {groupDigits(unit === 'kg' ? pr.value : pr.value / KG_PER_LB, 1)} {unit}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Glass>
          ) : null}

          <Glass radius={32} intensity="mid" style={{ padding: layout.cardPad, alignItems: 'center' }}>
            <Text style={[type.title, { textAlign: 'center' }]}>No session running</Text>
            <Text style={[type.compact, { textAlign: 'center', marginTop: space.xs }]}>
              Start one and every set you log gets a rest timer, plus a target from your last time.
            </Text>
            <Tap
              minSize={0}
              onPress={start}
              accessibilityLabel="Start a session"
              style={{
                marginTop: space.lg,
                height: 56,
                paddingHorizontal: space.xl,
                borderRadius: 999,
                backgroundColor: color.volt,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: space.xs,
              }}
            >
              <Icon icon={DumbbellIcon} size={22} tone="ink" />
              <Text style={[type.bodyStrong, { color: color.voltInk }]}>Start session</Text>
            </Tap>
          </Glass>

          <View style={{ marginTop: space.md }}>
            <Stopwatch />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScreenHeader
        title="Train"
        meta={`${elapsedLabel(elapsed)} elapsed · ${sets} sets · ${groupDigits(unit === 'kg' ? volume : volume / 0.45359237)} ${unit}`}
        action={
          <Tap
            minSize={44}
            onPress={() => {
              tap();
              setShowStopwatch(value => !value);
            }}
            accessibilityLabel="Toggle stopwatch"
          >
            <Icon icon={StopwatchIcon} size={24} tone={showStopwatch ? 'volt' : 'paper'} />
          </Tap>
        }
      />

      {showStopwatch ? (
        <View style={{ paddingHorizontal: layout.gutter, marginBottom: space.md }}>
          <Stopwatch />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: space.xxxl + layout.tabBarHeight,
        }}
      >
        {rest ? (
          <View style={{ marginBottom: space.md }}>
            <RestTimer variant="full" />
          </View>
        ) : null}

        {session.exercises.map(exercise => {
          const target = nextTarget(days, exercise.exerciseKey, undefined, unit);
          const doneCount = exercise.sets.filter(set => set.done).length;
          return (
            <Glass key={exercise.id} radius={radius.card} intensity="mid" style={{ marginBottom: space.md }}>
              <View style={{ padding: layout.cardPad }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Text style={[type.bodyStrong, { flex: 1, fontSize: 18 }]} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text style={type.label}>
                    {doneCount}/{exercise.sets.length || 0}
                  </Text>
                  <Tap
                    minSize={0}
                    hitSlop={8}
                    onPress={() => {
                      const logged = exercise.sets.filter(set => set.done && hasValue(set)).length;
                      Alert.alert(
                        `Remove ${exercise.name || 'exercise'}?`,
                        logged > 0
                          ? `${logged} logged ${logged === 1 ? 'set' : 'sets'} go with it.`
                          : 'Nothing logged on it yet.',
                        [
                          { text: 'Keep', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => removeSessionExercise(exercise.id) },
                        ],
                      );
                    }}
                    accessibilityLabel={`Remove ${exercise.name}`}
                    style={{ width: 32, height: 40 }}
                  >
                    <Icon icon={TrashIcon} size={16} tone="faint" />
                  </Tap>
                </View>

                {target ? (
                  <Text style={[type.micro, { marginTop: 2, color: color.volt }]}>{target.headline}</Text>
                ) : null}

                <View style={{ marginTop: space.sm, gap: space.xxs }}>
                  {exercise.sets.map((entry, index) => (
                    <View
                      key={entry.id}
                      style={{
                        paddingVertical: space.xxs,
                        borderBottomWidth: 1,
                        borderColor: color.lineSoft,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                        <Text style={[type.label, { width: 18 }]}>{index + 1}</Text>
                        <NumericStepper
                          compact
                          value={entry.weightKg}
                          onChange={value =>
                            updateSessionSet(exercise.id, entry.id, { weightKg: value })
                          }
                          accessibilityLabel={`${exercise.name} set ${index + 1} weight`}
                        />
                        <NumericStepper
                          compact
                          value={entry.reps}
                          onChange={value => updateSessionSet(exercise.id, entry.id, { reps: value })}
                          accessibilityLabel={`${exercise.name} set ${index + 1} reps`}
                        />
                        <Tap
                          minSize={0}
                          hitSlop={8}
                          onPress={() => removeSessionSet(exercise.id, entry.id)}
                          accessibilityLabel={`Remove set ${index + 1}`}
                          style={{ width: 28, height: 40 }}
                        >
                          <Icon icon={CloseIcon} size={14} tone="faint" />
                        </Tap>
                      </View>
                      {setLabel(entry, unit) ? (
                        <Text style={[type.micro, { marginLeft: 18, marginTop: 2 }]}>
                          {setLabel(entry, unit)}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                  <Tap
                    minSize={0}
                    onPress={() => {
                      tap();
                      logSessionSet(exercise.id, {});
                    }}
                    accessibilityLabel="Log an empty set"
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 999,
                      backgroundColor: color.ink2,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={type.bodyStrong}>+ set</Text>
                  </Tap>
                  <Tap
                    minSize={0}
                    onPress={() => {
                      tap();
                      logSessionSet(exercise.id, target?.weightKg !== undefined ? { weightKg: target.weightKg, reps: target.reps } : {});
                    }}
                    accessibilityLabel="Log target set"
                    style={{
                      flex: 2,
                      height: 48,
                      borderRadius: 999,
                      backgroundColor: color.volt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={[type.bodyStrong, { color: color.voltInk }]}>Log set</Text>
                  </Tap>
                </View>
              </View>
            </Glass>
          );
        })}

        <Glass radius={radius.card} intensity="mid" style={{ marginBottom: space.md }}>
          <View style={{ padding: layout.cardPad, flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Add an exercise"
              placeholderTextColor={color.paperFaint}
              autoCapitalize="words"
              accessibilityLabel="New exercise name"
              style={[type.body, { flex: 1, paddingVertical: space.sm }]}
              onSubmitEditing={() => {
                if (!draftName.trim()) {
                  return;
                }
                addSessionExerciseFromHistory(draftName);
                setDraftName('');
              }}
            />
            <Tap
              minSize={0}
              onPress={() => {
                if (!draftName.trim()) {
                  return;
                }
                tap();
                addSessionExerciseFromHistory(draftName);
                setDraftName('');
              }}
              accessibilityLabel="Add exercise"
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                backgroundColor: color.ink2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon icon={PlusIcon} size={22} tone="volt" />
            </Tap>
          </View>

          {suggestions.length > 0 ? (
            <View style={{ paddingHorizontal: layout.cardPad, paddingBottom: layout.cardPad, gap: space.xxs }}>
              {suggestions.map(suggestion => (
                <Tap
                  key={suggestion.name}
                  minSize={0}
                  onPress={() => {
                    tap();
                    addSessionExerciseFromHistory(suggestion.name);
                    setDraftName('');
                  }}
                  accessibilityLabel={`Add ${suggestion.name}`}
                  style={{
                    minHeight: 46,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.xs,
                    paddingHorizontal: space.sm,
                    borderRadius: radius.row,
                    backgroundColor: color.ink2,
                  }}
                >
                  <Text style={[type.bodyStrong, { flex: 1, fontSize: 15 }]} numberOfLines={1}>
                    {suggestion.name}
                  </Text>
                  <Text style={type.micro}>{suggestion.group}</Text>
                </Tap>
              ))}
            </View>
          ) : null}
        </Glass>

        <View style={{ flexDirection: 'row', gap: space.sm, paddingBottom: insets.bottom }}>
          <Tap
            minSize={0}
            onPress={() => {
              tap();
              Alert.alert(
                'Discard this session?',
                `${sets} logged ${sets === 1 ? 'set' : 'sets'} and ${groupDigits(unit === 'kg' ? volume : volume / 0.45359237)} ${unit} are lost.`,
                [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: cancelSession },
                ],
              );
            }}
            accessibilityLabel="Discard session"
            style={{
              flex: 1,
              height: 56,
              borderRadius: 999,
              backgroundColor: color.ink2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={type.bodyStrong}>Discard</Text>
          </Tap>
          <Tap
            minSize={0}
            onPress={finish}
            disabled={sets === 0}
            accessibilityLabel="Finish session"
            style={{
              flex: 1,
              height: 56,
              borderRadius: 999,
              backgroundColor: sets === 0 ? color.ink3 : color.volt,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: space.xxs,
            }}
          >
            <Icon icon={CheckIcon} size={22} tone={sets === 0 ? 'faint' : 'ink'} />
            <Text style={[type.bodyStrong, { color: sets === 0 ? color.paperFaint : color.voltInk }]}>
              Finish
            </Text>
          </Tap>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
