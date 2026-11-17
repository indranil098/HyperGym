import { streak, weekSummary, nextTarget } from '../src/lib/insights';
import { sessionToDay, sessionVolume, sessionSetCount } from '../src/lib/session';
import type { ActiveSession, LoggedExercise, WorkoutDay } from '../src/types';

function day(key: string, entries: LoggedExercise[]): WorkoutDay {
  return { date: key, entries, updatedAt: 0 };
}

function weighted(name: string, key: string, weightKg: number, reps: number): LoggedExercise {
  return {
    id: `e-${name}-${weightKg}-${reps}`,
    name,
    exerciseKey: key,
    sets: [{ weightKg, reps }],
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

describe('streak', () => {
  it('is zero with no sessions', () => {
    expect(streak({})).toBe(0);
  });

  it('counts today only', () => {
    const log = { [daysAgo(0)]: day(daysAgo(0), []) };
    expect(streak(log)).toBe(1);
  });

  it('keeps the streak alive from yesterday', () => {
    const log = {
      [daysAgo(1)]: day(daysAgo(1), []),
      [daysAgo(2)]: day(daysAgo(2), []),
    };
    expect(streak(log)).toBe(2);
  });

  it('breaks on a gap', () => {
    const log = {
      [daysAgo(0)]: day(daysAgo(0), []),
      [daysAgo(2)]: day(daysAgo(2), []),
    };
    expect(streak(log)).toBe(1);
  });
});

describe('weekSummary', () => {
  // Fixed "now" so the Monday-anchored window is deterministic.
  const now = new Date(2026, 10, 15); // Sunday 15 Nov 2026
  const keyFor = (offsetDays: number) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const dayOfMonth = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${dayOfMonth}`;
  };

  it('counts only sessions inside the window', () => {
    const log = {
      [keyFor(1)]: day(keyFor(1), [weighted('Bench', 'bench', 80, 5)]),
      [keyFor(25)]: day(keyFor(25), [weighted('Bench', 'bench', 90, 5)]),
    };
    const thisWeek = weekSummary(log, 0, now);
    expect(thisWeek.sessions).toBe(1);
    expect(thisWeek.volume).toBe(400);
  });

  it('puts older sessions in a previous week', () => {
    // now is Sunday 15 Nov; 20 days back is Monday 26 Oct, the first day of
    // the week two weeks ago. Exercises the window boundary on purpose.
    const log = { [keyFor(20)]: day(keyFor(20), [weighted('Bench', 'bench', 90, 5)]) };
    expect(weekSummary(log, 0, now).sessions).toBe(0);
    expect(weekSummary(log, 2, now).sessions).toBe(1);
  });
});

describe('nextTarget', () => {
  it('adds a rep below a rep-max', () => {
    const log = { [daysAgo(2)]: day(daysAgo(2), [weighted('Bench', 'bench', 80, 5)]) };
    const target = nextTarget(log, 'bench');
    expect(target?.weightKg).toBe(80);
    expect(target?.reps).toBe(6);
  });

  it('adds load at a rep-max', () => {
    const log = {
      [daysAgo(2)]: day(daysAgo(2), [weighted('Bench', 'bench', 80, 8)]),
    };
    const target = nextTarget(log, 'bench');
    expect(target?.weightKg).toBe(82.5);
    expect(target?.reps).toBe(8);
  });

  it('returns null for an unknown exercise', () => {
    expect(nextTarget({}, 'nothing', undefined)).toBeNull();
  });
});

describe('sessionToDay', () => {
  const base: ActiveSession = {
    id: 's1',
    startedAt: Date.now(),
    exercises: [
      {
        id: 'x1',
        name: 'Lat pulldown',
        exerciseKey: 'latpulldown',
        restSec: 90,
        sets: [
          { weightKg: 55, reps: 10, done: true, at: 1 },
          { weightKg: 55, reps: 10, done: false, at: 2 },
        ],
      },
      {
        id: 'x2',
        name: '   ',
        exerciseKey: '',
        restSec: 90,
        sets: [{ reps: 10, done: true, at: 3 }],
      },
      {
        id: 'x3',
        name: 'Treadmill walk',
        exerciseKey: 'treadmillwalk',
        restSec: 60,
        sets: [{ durationSec: 600, done: true, at: 4 }],
      },
    ],
  };

  it('keeps confirmed sets and drops unconfirmed ones', () => {
    const result = sessionToDay(base);
    expect(result).not.toBeNull();
    const bench = result!.entries.find(entry => entry.name === 'Lat pulldown');
    expect(bench?.sets).toHaveLength(1);
    expect(bench?.sets[0].weightKg).toBe(55);
    expect('done' in bench!.sets[0]).toBe(false);
  });

  it('drops blank-named exercises', () => {
    const result = sessionToDay(base);
    expect(result!.entries.some(entry => entry.name.trim() === '')).toBe(false);
  });

  it('keeps timed work as duration', () => {
    const result = sessionToDay(base);
    const walk = result!.entries.find(entry => entry.name === 'Treadmill walk');
    expect(walk?.sets[0].durationSec).toBe(600);
  });

  it('reports volume and set count from confirmed sets only', () => {
    // x1 first set, x2 and x3 are confirmed; x1's second set is not.
    expect(sessionSetCount(base)).toBe(3);
    expect(sessionVolume(base)).toBe(550);
  });
});
