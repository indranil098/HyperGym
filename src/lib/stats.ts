import type { LoggedExercise, SetEntry, Unit, WorkoutDay } from '../types';
import { dayKey, shift } from './date';
import type { ExerciseKind } from './exerciseKind';

export const KG_PER_LB = 0.45359237;

export function exerciseKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function e1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) {
    return 0;
  }
  if (reps === 1) {
    return weightKg;
  }
  return weightKg * (1 + reps / 30);
}

export function setVolume(set: SetEntry): number {
  if (set.type === 'warmup') {
    return 0;
  }
  return (set.weightKg ?? 0) * (set.reps ?? 0);
}

export function workingSets(entry: LoggedExercise): SetEntry[] {
  return entry.sets.filter(set => set.type !== 'warmup');
}

export function hasSetData(set: SetEntry): boolean {
  return (
    set.weightKg !== undefined ||
    set.reps !== undefined ||
    set.durationSec !== undefined ||
    set.distanceM !== undefined ||
    set.inclinePct !== undefined ||
    set.speedKph !== undefined ||
    set.rpe !== undefined
  );
}

export function meaningfulSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter(hasSetData);
}

export function entryVolume(entry: LoggedExercise): number {
  return entry.sets.reduce((sum, set) => sum + setVolume(set), 0);
}

export function dayVolume(day: WorkoutDay): number {
  return day.entries.reduce((sum, entry) => sum + entryVolume(entry), 0);
}

export function daySets(day: WorkoutDay): number {
  return day.entries.reduce((sum, entry) => sum + workingSets(entry).length, 0);
}

export function entryBestE1rm(entry: LoggedExercise): number {
  return workingSets(entry).reduce(
    (best, set) => Math.max(best, e1rm(set.weightKg ?? 0, set.reps ?? 0)),
    0,
  );
}

export function heaviestSet(entry: LoggedExercise): SetEntry | undefined {
  return workingSets(entry).reduce<SetEntry | undefined>((best, set) => {
    if (!best) {
      return set;
    }
    return (set.weightKg ?? 0) > (best.weightKg ?? 0) ? set : best;
  }, undefined);
}

export function toDisplayWeight(kg: number, unit: Unit): number {
  if (unit === 'kg') {
    return kg;
  }
  return Math.round((kg / KG_PER_LB) * 2) / 2;
}

export function toKg(value: number, unit: Unit): number {
  if (unit === 'kg') {
    return value;
  }
  return value * KG_PER_LB;
}

export function unitLabel(unit: Unit): string {
  return unit;
}

export function groupDigits(value: number, decimals = 0): string {
  const fixed = decimals > 0 ? value.toFixed(decimals) : `${Math.round(value)}`;
  const [whole, fraction] = fixed.split('.');
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${spaced}.${fraction}` : spaced;
}

export function formatMinutes(seconds: number): string {
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
}

export function weightLabel(kg: number, unit: Unit): string {
  const value = toDisplayWeight(kg, unit);
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${shown} ${unit}`;
}

export function setLabel(set: SetEntry, unit: Unit): string {
  if (set.weightKg !== undefined && set.reps !== undefined) {
    return `${weightLabel(set.weightKg, unit)} × ${set.reps}`;
  }

  const parts: string[] = [];
  if (set.weightKg !== undefined) {
    parts.push(weightLabel(set.weightKg, unit));
  }
  if (set.reps !== undefined) {
    parts.push(`${set.reps} reps`);
  }
  if (set.durationSec !== undefined) {
    parts.push(`${formatMinutes(set.durationSec)} min`);
  }
  if (set.distanceM !== undefined) {
    parts.push(`${(set.distanceM / 1000).toFixed(2)} km`);
  }
  if (set.inclinePct !== undefined) {
    parts.push(`${set.inclinePct}% incline`);
  }
  if (set.speedKph !== undefined) {
    parts.push(`${set.speedKph} km/h`);
  }
  if (set.rpe !== undefined) {
    parts.push(`RPE ${set.rpe}`);
  }
  return parts.join(', ');
}

export function isTimedEntry(entry: LoggedExercise): boolean {
  const hard = workingSets(entry);
  return (
    hard.length > 0 &&
    hard.every(set => set.durationSec !== undefined && set.weightKg === undefined && set.reps === undefined)
  );
}

export type EntrySummary = {
  headline?: string;
  detail: string;
};

export function summarizeEntry(entry: LoggedExercise, unit: Unit): EntrySummary {
  const hard = workingSets(entry);

  if (isTimedEntry(entry)) {
    const totalSeconds = hard.reduce((sum, set) => sum + (set.durationSec ?? 0), 0);
    const first = hard[0];
    const distance = hard.reduce((sum, set) => sum + (set.distanceM ?? 0), 0);
    const parts: string[] = [];

    if (totalSeconds > 0) {
      parts.push(`${formatMinutes(totalSeconds)} min`);
    }
    if (distance > 0) {
      parts.push(`${(distance / 1000).toFixed(2)} km`);
    }
    if (first?.inclinePct !== undefined) {
      parts.push(`${first.inclinePct}% incline`);
    }
    if (first?.speedKph !== undefined) {
      parts.push(`${first.speedKph} km/h`);
    }

    return {
      headline: totalSeconds > 0 ? `${formatMinutes(totalSeconds)} min` : undefined,
      detail: parts.join(', ') || 'no time recorded',
    };
  }

  const heaviest = heaviestSet(entry);
  const setWord = hard.length === 1 ? 'set' : 'sets';
  const parts = [`${hard.length} ${setWord}`];

  if (heaviest?.weightKg !== undefined) {
    parts.push(`top ${weightLabel(heaviest.weightKg, unit)}${heaviest.reps ? ` × ${heaviest.reps}` : ''}`);
  } else if (hard.some(set => set.reps !== undefined)) {
    const reps = hard.map(set => set.reps).filter((value): value is number => value !== undefined);
    parts.push(`${reps.join(', ')} reps`);
  }

  return {
    headline: heaviest?.weightKg !== undefined ? weightLabel(heaviest.weightKg, unit) : undefined,
    detail: parts.join(', '),
  };
}

export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio';

const GROUP_RULES: { group: MuscleGroup; words: string[] }[] = [
  { group: 'Chest', words: ['bench', 'chest', 'fly', 'flye', 'pec', 'pushup', 'push up', 'dip'] },
  { group: 'Back', words: ['row', 'pull', 'lat', 'deadlift', 'chin', 'back extension'] },
  { group: 'Legs', words: ['squat', 'leg', 'lunge', 'calf', 'hamstring', 'quad', 'rdl', 'hip thrust', 'glute'] },
  { group: 'Shoulders', words: ['press', 'shoulder', 'lateral', 'rear delt', 'ohp', 'shrug', 'raise'] },
  { group: 'Arms', words: ['curl', 'tricep', 'bicep', 'pushdown', 'skull', 'extension', 'forearm'] },
  { group: 'Core', words: ['plank', 'crunch', 'ab ', 'abs', 'sit up', 'leg raise', 'hollow'] },
  { group: 'Cardio', words: ['run', 'bike', 'treadmill', 'elliptical', 'swim', 'jump rope', 'cardio', 'walk'] },
];

export function muscleGroup(name: string): MuscleGroup {
  const key = ` ${exerciseKey(name)} `;
  for (const rule of GROUP_RULES) {
    if (rule.words.some(word => key.includes(` ${word}`) || key.includes(`${word} `))) {
      return rule.group;
    }
  }
  return 'Chest';
}

export type ExercisePoint = {
  date: string;
  best: number;
  topWeight: number;
  volume: number;
  sets: number;
  reps: number;
  bestReps: number;
  durationSec: number;
  distanceM: number;
  inclinePct?: number;
  speedKph?: number;
  entry: LoggedExercise;
};

export function historyFor(days: WorkoutDay[], key: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const day of days) {
    for (const entry of day.entries) {
      if (entry.exerciseKey !== key) {
        continue;
      }
      const hard = workingSets(entry);
      const reps = hard.map(set => set.reps).filter((value): value is number => value !== undefined);
      points.push({
        date: day.date,
        best: entryBestE1rm(entry),
        topWeight: heaviestSet(entry)?.weightKg ?? 0,
        volume: entryVolume(entry),
        sets: hard.length,
        reps: reps.reduce((sum, value) => sum + value, 0),
        bestReps: reps.reduce((best, value) => Math.max(best, value), 0),
        durationSec: hard.reduce((sum, set) => sum + (set.durationSec ?? 0), 0),
        distanceM: hard.reduce((sum, set) => sum + (set.distanceM ?? 0), 0),
        inclinePct: hard.find(set => set.inclinePct !== undefined)?.inclinePct,
        speedKph: hard.find(set => set.speedKph !== undefined)?.speedKph,
        entry,
      });
    }
  }
  return points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function personalRecord(days: WorkoutDay[], key: string): number {
  return historyFor(days, key).reduce((best, point) => Math.max(best, point.best), 0);
}

export type RecordChip = {
  label: string;
  value: string;
};

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function recordsFor(points: ExercisePoint[], kind: ExerciseKind, unit: Unit): RecordChip[] {
  if (points.length === 0) {
    return [];
  }

  if (kind === 'weight') {
    const heaviest = Math.max(...points.map(point => point.topWeight));
    const best = Math.max(...points.map(point => point.best));
    const chips: RecordChip[] = [];
    if (heaviest > 0) {
      chips.push({ label: 'Heaviest', value: weightLabel(heaviest, unit) });
    }
    if (best > 0) {
      chips.push({ label: 'Best 1RM', value: weightLabel(best, unit) });
    }
    return chips;
  }

  if (kind === 'bodyweight') {
    return [
      { label: 'Most reps', value: String(Math.max(...points.map(point => point.bestReps))) },
      { label: 'Session reps', value: String(Math.max(...points.map(point => point.reps))) },
    ];
  }

  if (kind === 'duration') {
    const longest = Math.max(...points.map(point => point.durationSec));
    return longest > 0 ? [{ label: 'Longest', value: formatDuration(longest) }] : [];
  }

  const chips: RecordChip[] = [];
  const distance = Math.max(...points.map(point => point.distanceM));
  const time = Math.max(...points.map(point => point.durationSec));

  if (distance > 0) {
    chips.push({ label: 'Longest distance', value: `${(distance / 1000).toFixed(2)} km` });
  }
  if (time > 0) {
    chips.push({ label: 'Longest time', value: formatDuration(time) });
  }

  const paced = points.filter(point => point.distanceM > 0 && point.durationSec > 0);
  if (paced.length > 0) {
    const bestPace = Math.min(...paced.map(point => point.durationSec / point.distanceM));
    chips.push({ label: 'Best pace', value: `${formatDuration(bestPace * 1000)} /km` });
  }
  return chips;
}

export function weeklySetsByGroup(
  days: WorkoutDay[],
  windowDays = 7,
): { group: MuscleGroup; sets: number }[] {
  const today = dayKey();
  const from = shift(today, -(windowDays - 1));
  const totals = new Map<MuscleGroup, number>();

  for (const day of days) {
    if (day.date < from || day.date > today) {
      continue;
    }
    for (const entry of day.entries) {
      const hard = workingSets(entry).length;
      if (hard === 0) {
        continue;
      }
      const group = muscleGroup(entry.name);
      totals.set(group, (totals.get(group) ?? 0) + hard);
    }
  }

  return [...totals.entries()]
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);
}

export function lastPerformance(
  days: WorkoutDay[],
  key: string,
  before?: string,
): { entry: LoggedExercise; date: string } | undefined {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const day of sorted) {
    if (before && day.date >= before) {
      continue;
    }
    const entry = day.entries.find(item => item.exerciseKey === key);
    if (entry) {
      return { entry, date: day.date };
    }
  }
  return undefined;
}

export type TrackedExercise = {
  key: string;
  name: string;
  lastDate: string;
  sessions: number;
  record: number;
};

export function trackedExercises(days: WorkoutDay[]): TrackedExercise[] {
  const map = new Map<string, TrackedExercise>();
  for (const day of days) {
    for (const entry of day.entries) {
      if (!entry.exerciseKey) {
        continue;
      }
      const existing = map.get(entry.exerciseKey);
      if (!existing) {
        map.set(entry.exerciseKey, {
          key: entry.exerciseKey,
          name: entry.name,
          lastDate: day.date,
          sessions: 1,
          record: entryBestE1rm(entry),
        });
        continue;
      }
      existing.sessions += 1;
      existing.record = Math.max(existing.record, entryBestE1rm(entry));
      if (day.date > existing.lastDate) {
        existing.lastDate = day.date;
        existing.name = entry.name;
      }
    }
  }
  return [...map.values()].sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
}
