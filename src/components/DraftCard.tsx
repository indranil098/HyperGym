import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { color, layout, radius, space, surface, type } from '../theme';
import { confirm as hapticConfirm, tap } from '../lib/feedback';
import { dayLabel, relativeDays } from '../lib/date';
import { nextTarget } from '../lib/insights';
import {
  exerciseKey as makeExerciseKey,
  groupDigits,
  lastPerformance,
  meaningfulSets,
  summarizeEntry,
  toDisplayWeight,
  toKg,
} from '../lib/stats';
import { useAppStore } from '../store/useAppStore';
import type {
  AssistantDraft,
  Draft,
  DraftExercise,
  SetEntry,
  SetType,
  Unit,
} from '../types';
import { GhostButton, PrimaryButton, TextButton } from './Button';
import { Icon } from './Icon';
import { AlertIcon, CheckIcon, CloseIcon } from './icons';
import { NumericStepper } from './NumericStepper';
import { Receipt } from './Receipt';
import { Tap } from './Tap';

type Props = {
  message: AssistantDraft;
  unit: Unit;
};

const SET_TYPES: SetType[] = ['working', 'warmup', 'drop', 'failure'];

function nextSetType(current?: SetType): SetType {
  const index = SET_TYPES.indexOf(current ?? 'working');
  return SET_TYPES[(index + 1) % SET_TYPES.length];
}

function setBadge(setType: SetType | undefined, index: number): string {
  if (setType === 'warmup') {
    return 'W';
  }
  if (setType === 'drop') {
    return 'D';
  }
  if (setType === 'failure') {
    return 'F';
  }
  return String(index + 1);
}

function setTypeLabel(setType?: SetType): string {
  if (setType === 'warmup') {
    return 'warm up';
  }
  if (setType === 'drop') {
    return 'drop';
  }
  if (setType === 'failure') {
    return 'failure';
  }
  return 'working';
}

export function DraftCard({ message, unit }: Props) {
  const patchMessage = useAppStore(state => state.patchMessage);
  const commitDraft = useAppStore(state => state.commitDraft);
  const discardDraft = useAppStore(state => state.discardDraft);
  const saveRoutine = useAppStore(state => state.saveRoutine);
  const days = useAppStore(state => state.days);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const draft = message.draft;

  if (message.status === 'logged' && message.receipt) {
    return <Receipt receipt={message.receipt} unit={unit} />;
  }

  if (message.status === 'discarded') {
    return (
      <View style={{ paddingVertical: space.sm }}>
        <Text style={type.micro}>Draft discarded. Nothing was saved.</Text>
      </View>
    );
  }

  const patch = (next: Draft) => {
    patchMessage(message.id, current =>
      current.role === 'assistant' && current.kind === 'draft' ? { ...current, draft: next } : current,
    );
  };

  const patchExercise = (index: number, next: Partial<DraftExercise>) => {
    patch({
      ...draft,
      exercises: draft.exercises.map((exercise, position) =>
        position === index ? { ...exercise, ...next } : exercise,
      ),
    });
  };

  const patchSet = (exerciseIndex: number, setIndex: number, next: Partial<SetEntry>) => {
    const exercise = draft.exercises[exerciseIndex];
    const base = exercise.sets.length === 0 ? [{}] : exercise.sets;
    patchExercise(exerciseIndex, {
      sets: base.map((entry, position) =>
        position === setIndex ? { ...entry, ...next } : entry,
      ),
    });
  };

  const addSet = (exerciseIndex: number) => {
    const exercise = draft.exercises[exerciseIndex];
    const last = exercise.sets[exercise.sets.length - 1];
    patchExercise(exerciseIndex, { sets: [...exercise.sets, last ? { ...last } : {}] });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = draft.exercises[exerciseIndex];
    patchExercise(exerciseIndex, {
      sets: exercise.sets.filter((_, position) => position !== setIndex),
    });
  };

  const addExercise = () => {
    patch({
      ...draft,
      exercises: [...draft.exercises, { name: '', exerciseKey: '', sets: [{}], assumed: [] }],
    });
  };

  const removeExercise = (index: number) => {
    const exercises = draft.exercises.filter((_, position) => position !== index);
    if (exercises.length === 0) {
      return;
    }
    patch({ ...draft, exercises });
  };

  const assumptionList = [
    ...draft.assumptions,
    ...draft.exercises.flatMap(exercise => exercise.assumed),
  ];

  const hardSets = draft.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter(set => set.type !== 'warmup').length,
    0,
  );
  const volume = draft.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (inner, entry) =>
          inner + (entry.type === 'warmup' ? 0 : (entry.weightKg ?? 0) * (entry.reps ?? 0)),
        0,
      ),
    0,
  );
  const shownVolume = unit === 'kg' ? volume : volume / 0.45359237;
  const loggable = draft.exercises.some(
    exercise => exercise.name.trim().length > 0 && meaningfulSets(exercise.sets).length > 0,
  );

  const dayList = Object.values(days);

  return (
    <View style={[surface.card, { padding: layout.cardPad, marginTop: space.md }]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: space.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { fontSize: 18 }]}>{dayLabel(draft.date)}</Text>
          <Text style={[type.micro, { marginTop: 2 }]}>
            {hardSets} {hardSets === 1 ? 'set' : 'sets'}
            {volume > 0 ? `, ${groupDigits(shownVolume)} ${unit}` : ''}
          </Text>
        </View>
        {assumptionList.length > 0 ? (
          <Tap
            minSize={44}
            onPress={() => {
              tap();
              setShowAssumptions(value => !value);
            }}
            accessibilityLabel={`${assumptionList.length} assumed. Tap to see what was guessed.`}
            style={{ flexDirection: 'row', gap: space.xxs, paddingHorizontal: space.xs, borderRadius: radius.pill }}
          >
            <Icon icon={AlertIcon} size={16} tone="volt" />
            <Text style={[type.label, { color: color.volt }]}>{assumptionList.length} assumed</Text>
          </Tap>
        ) : null}
      </View>

      {showAssumptions && assumptionList.length > 0 ? (
        <View
          style={{
            backgroundColor: color.ink2,
            borderRadius: radius.row,
            padding: space.sm,
            marginBottom: space.md,
            gap: space.xs,
          }}
        >
          {assumptionList.map((item, index) => (
            <View key={`${index}-${item}`} style={{ flexDirection: 'row', gap: space.xs }}>
              <Icon icon={AlertIcon} size={13} tone="volt" />
              <Text style={[type.micro, { flex: 1, fontSize: 12, color: color.paperDim }]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {draft.exercises.map((exercise, exerciseIndex) => {
        const weightAssumed = exercise.assumed.some(item => /weight|kg|lb|pound/i.test(item));
        const timed =
          exercise.sets.length > 0 &&
          exercise.sets.every(
            entry => entry.durationSec !== undefined && entry.weightKg === undefined && entry.reps === undefined,
          );
        const rows: SetEntry[] = exercise.sets.length > 0 ? exercise.sets : [{}];
        const previous = exercise.exerciseKey
          ? lastPerformance(dayList, exercise.exerciseKey, draft.date)
          : undefined;
        const previousSummary = previous ? summarizeEntry(previous.entry, unit) : null;
        const target = exercise.exerciseKey
          ? nextTarget(days, exercise.exerciseKey, draft.date, unit)
          : null;

        return (
          <View key={exerciseIndex} style={{ marginBottom: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <TextInput
                value={exercise.name}
                onChangeText={text =>
                  patchExercise(exerciseIndex, { name: text, exerciseKey: makeExerciseKey(text) })
                }
                placeholder="Exercise name"
                placeholderTextColor={color.paperFaint}
                accessibilityLabel={`Name of exercise ${exerciseIndex + 1}`}
                style={[type.bodyStrong, { flex: 1, paddingVertical: space.xs, paddingHorizontal: 0 }]}
              />
              <Text style={type.label}>{exercise.sets.length} sets</Text>
              <Tap
                minSize={0}
                style={{ width: 30, height: 44 }}
                hitSlop={10}
                onPress={() => removeExercise(exerciseIndex)}
                accessibilityLabel={`Remove ${exercise.name || 'exercise'}`}
              >
                <Icon icon={CloseIcon} size={15} tone="faint" />
              </Tap>
            </View>

            {previous && previousSummary ? (
              <Text style={[type.micro, { marginBottom: space.xxs }]}>
                Last {relativeDays(previous.date)}, {previousSummary.headline ?? previousSummary.detail}
              </Text>
            ) : null}

            {target ? (
              <Text style={[type.micro, { marginBottom: space.xxs, color: color.volt }]}>
                Try {target.headline}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xxs }}>
              <Text style={[type.micro, { width: 20 }]}>#</Text>
              {timed ? (
                <>
                  <Text style={[type.micro, { width: 90, textAlign: 'center' }]}>minutes</Text>
                  <Text style={[type.micro, { width: 90, textAlign: 'center' }]}>incline %</Text>
                </>
              ) : (
                <>
                  <Text style={[type.micro, { width: 90, textAlign: 'center' }]}>weight</Text>
                  <Text style={[type.micro, { width: 16, textAlign: 'center' }]}> </Text>
                  <Text style={[type.micro, { width: 90, textAlign: 'center' }]}>reps</Text>
                </>
              )}
            </View>

            {rows.map((entry, setIndex) => {
              const typed = entry.type !== undefined && entry.type !== 'working';
              const cardioDetail = [
                entry.distanceM !== undefined ? `${(entry.distanceM / 1000).toFixed(2)} km` : null,
                entry.speedKph !== undefined ? `${entry.speedKph} km/h` : null,
              ]
                .filter(Boolean)
                .join(' at ');

              return (
                <View key={setIndex}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Tap
                      minSize={0}
                      style={{ width: 20, height: 44 }}
                      hitSlop={8}
                      onPress={() => {
                        tap();
                        patchSet(exerciseIndex, setIndex, { type: nextSetType(entry.type) });
                      }}
                      accessibilityLabel={`Set ${setIndex + 1}, ${setTypeLabel(entry.type)}. Tap to change the set type.`}
                    >
                      <Text style={[type.micro, typed ? { color: color.volt } : null]}>
                        {setBadge(entry.type, setIndex)}
                      </Text>
                    </Tap>

                    {timed ? (
                      <>
                        <NumericStepper
                          compact
                          value={
                            entry.durationSec === undefined
                              ? undefined
                              : Math.round(entry.durationSec / 6) / 10
                          }
                          onChange={value =>
                            patchSet(exerciseIndex, setIndex, {
                              durationSec: value === undefined ? undefined : Math.round(value * 60),
                            })
                          }
                          accessibilityLabel={`${exercise.name || 'exercise'} set ${setIndex + 1} minutes`}
                        />
                        <NumericStepper
                          compact
                          value={entry.inclinePct}
                          onChange={value => patchSet(exerciseIndex, setIndex, { inclinePct: value })}
                          accessibilityLabel={`${exercise.name || 'exercise'} set ${setIndex + 1} incline percent`}
                        />
                      </>
                    ) : (
                      <>
                        <NumericStepper
                          compact
                          value={entry.weightKg === undefined ? undefined : toDisplayWeight(entry.weightKg, unit)}
                          onChange={value =>
                            patchSet(exerciseIndex, setIndex, {
                              weightKg: value === undefined ? undefined : toKg(value, unit),
                            })
                          }
                          assumed={weightAssumed}
                          accessibilityLabel={`${exercise.name || 'exercise'} set ${setIndex + 1} weight`}
                        />
                        <Text style={[type.label, { width: 16, textAlign: 'center' }]}>×</Text>
                        <NumericStepper
                          compact
                          value={entry.reps}
                          onChange={value => patchSet(exerciseIndex, setIndex, { reps: value })}
                          accessibilityLabel={`${exercise.name || 'exercise'} set ${setIndex + 1} reps`}
                        />
                      </>
                    )}

                    <Tap
                      minSize={0}
                      style={{ width: 24, height: 44 }}
                      hitSlop={8}
                      onPress={() => removeSet(exerciseIndex, setIndex)}
                      accessibilityLabel={`Remove set ${setIndex + 1}`}
                    >
                      <Icon icon={CloseIcon} size={13} tone="faint" />
                    </Tap>
                  </View>

                  {cardioDetail ? (
                    <Text style={[type.micro, { paddingLeft: 20, marginTop: 2 }]}>{cardioDetail}</Text>
                  ) : null}
                </View>
              );
            })}

            <View style={{ flexDirection: 'row' }}>
              <TextButton label="Add set" onPress={() => addSet(exerciseIndex)} />
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextButton label="Add exercise" onPress={addExercise} />
        <TextButton
          label="Save as routine"
          tone="dim"
          onPress={() =>
            saveRoutine(
              draft.exercises
                .filter(exercise => exercise.name.trim())
                .slice(0, 2)
                .map(exercise => exercise.name.trim())
                .join(' + ') || 'Routine',
              draft.exercises
                .filter(exercise => exercise.name.trim())
                .map(exercise => ({
                  name: exercise.name.trim(),
                  targetSets: exercise.sets.length,
                  targetReps: exercise.sets[0]?.reps ?? 0,
                  targetWeightKg: exercise.sets[0]?.weightKg,
                })),
            )
          }
        />
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <GhostButton label="Discard" onPress={() => discardDraft(message.id)} />
        <PrimaryButton
          label="Log it"
          icon={CheckIcon}
          disabled={!loggable}
          onPress={() => {
            hapticConfirm();
            commitDraft(message.id);
          }}
        />
      </View>
    </View>
  );
}
