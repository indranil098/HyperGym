import { dayKey, fromKey } from './date';
import { daySets, dayVolume, exerciseKey as makeKey, groupDigits, lastPerformance } from './stats';
import type { WorkoutDay } from '../types';

const DAY_MS = 86400000;

/**
 * Consecutive days with a logged session, counting back from today. A session
 * yesterday keeps the streak alive; one two days ago does not.
 */
export function streak(days: Record<string, WorkoutDay>): number {
  const today = new Date();
  const candidates = [dayKey(today), dayKey(new Date(today.getTime() - DAY_MS))];

  let probe: string | null = null;
  for (const key of candidates) {
    if (days[key]) {
      probe = key;
      break;
    }
  }
  if (!probe) {
    return 0;
  }

  let count = 0;
  while (days[probe]) {
    count += 1;
    probe = dayKey(new Date(fromKey(probe).getTime() - DAY_MS));
  }
  return count;
}

export type WeekSummary = {
  sessions: number;
  volume: number;
  sets: number;
};

function weekWindow(now: Date, weeksAgo: number): { start: number; end: number } {
  // Weeks start on Monday, matching the Log calendar.
  const weekday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday - weeksAgo * 7);
  const start = monday.getTime();
  const end = start + 7 * DAY_MS;
  return { start, end };
}

export function weekSummary(
  days: Record<string, WorkoutDay>,
  weeksAgo = 0,
  now: Date = new Date(),
): WeekSummary {
  const { start, end } = weekWindow(now, weeksAgo);
  let sessions = 0;
  let volume = 0;
  let sets = 0;

  for (const key of Object.keys(days)) {
    const date = fromKey(key);
    const stamp = date.getTime();
    if (stamp < start || stamp >= end) {
      continue;
    }
    const day = days[key];
    sessions += 1;
    volume += dayVolume(day);
    sets += daySets(day);
  }

  return { sessions, volume, sets };
}

/**
 * What to attempt next on an exercise. Progressive, conservative, and always
 * anchored to something actually logged rather than a programme.
 */
export function nextTarget(
  days: Record<string, WorkoutDay>,
  key: string,
  before?: string,
  unit: 'kg' | 'lb' = 'kg',
): { headline: string; weightKg?: number; reps?: number } | null {
  const last = lastPerformance(Object.values(days), key, before);
  if (!last) {
    return null;
  }
  const working = last.entry.sets.filter(set => set.type !== 'warmup');
  const weighted = working.filter(set => set.weightKg !== undefined && set.reps !== undefined);
  const heaviest = weighted.reduce<number>((best, set) => Math.max(best, set.weightKg ?? 0), 0);
  const atHeaviest = weighted.filter(set => set.weightKg === heaviest);
  const bestReps = atHeaviest.reduce<number>((best, set) => Math.max(best, set.reps ?? 0), 0);

  if (heaviest > 0) {
    // Same weight, one more rep, until a rep-max is reached — then load.
    const reps = bestReps >= 8 ? bestReps : bestReps + 1;
    const weightKg = bestReps >= 8 ? Math.round((heaviest + 2.5) * 2) / 2 : heaviest;
    const shownLast = unit === 'kg' ? heaviest : heaviest / 0.45359237;
    return {
      headline: `beat ${groupDigits(shownLast, 1)} ${unit} × ${bestReps}`,
      weightKg,
      reps,
    };
  }

  const timed = working.find(set => set.durationSec !== undefined);
  if (timed?.durationSec) {
    const seconds = timed.durationSec;
    return { headline: `beat ${Math.round(seconds / 60)} min`, weightKg: undefined, reps: undefined };
  }

  const repsOnly = working.find(set => set.reps !== undefined);
  if (repsOnly?.reps) {
    return { headline: `beat ${repsOnly.reps} reps`, weightKg: undefined, reps: repsOnly.reps + 1 };
  }

  return null;
}

export function keyFor(name: string): string {
  return makeKey(name);
}
