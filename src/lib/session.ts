import { entryVolume, hasValue, meaningfulSets } from './stats';
import { uid } from './id';
import type { ActiveSession, LoggedExercise, SessionExercise, WorkoutDay } from '../types';

/** Sets worth logging — must be confirmed *and* carry numbers. */
export function loggableSets(sets: SessionExercise['sets']) {
  return sets.filter(set => set.done && hasValue(set));
}

export function sessionVolume(session: ActiveSession): number {
  return session.exercises.reduce((total, exercise) => {
    const weighted: LoggedExercise = {
      id: exercise.id,
      name: exercise.name,
      exerciseKey: exercise.exerciseKey,
      sets: loggableSets(exercise.sets),
    };
    return total + entryVolume(weighted);
  }, 0);
}

export function sessionSetCount(session: ActiveSession): number {
  return session.exercises.reduce(
    (total, exercise) => total + loggableSets(exercise.sets).length,
    0,
  );
}

export function sessionElapsedSec(session: ActiveSession, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - session.startedAt) / 1000));
}

/**
 * A completed session becomes an ordinary workout day. Sets logged but never
 * confirmed are dropped, and exercises with no confirmed sets are dropped too.
 */
export function sessionToDay(session: ActiveSession): WorkoutDay | null {
  const entries: LoggedExercise[] = [];

  for (const exercise of session.exercises) {
    const name = exercise.name.trim();
    if (!name) {
      continue;
    }
    const sets = meaningfulSets(
      exercise.sets
        .filter(set => set.done)
        .map(({ done: _done, at: _at, ...rest }) => rest),
    );
    if (sets.length === 0) {
      continue;
    }
    entries.push({
      id: uid('e'),
      name,
      exerciseKey: exercise.exerciseKey || makeKeyFromName(name),
      sets,
      notes: exercise.notes,
    });
  }

  if (entries.length === 0) {
    return null;
  }

  return {
    date: dayStamp(session.startedAt),
    entries,
    notes: session.notes,
    updatedAt: Date.now(),
  };
}

function makeKeyFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function dayStamp(at: number): string {
  const date = new Date(at);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function sessionExerciseLabel(exercise: SessionExercise): string {
  const done = exercise.sets.filter(set => set.done).length;
  return `${done}/${exercise.sets.length || 0} sets`;
}
