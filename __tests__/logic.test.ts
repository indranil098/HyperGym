import { draftFromArgs, draftFromText } from '../src/agent/parseDraft';
import { dayKey, dayLabel, shift } from '../src/lib/date';
import { SseParser } from '../src/ai/sse';
import { exerciseKind } from '../src/lib/exerciseKind';
import { resolveDeleteRequest } from '../src/agent/actions';
import {
  daySets,
  dayVolume,
  e1rm,
  entryVolume,
  exerciseKey,
  formatDuration,
  historyFor,
  meaningfulSets,
  muscleGroup,
  recordsFor,
  setLabel,
  summarizeEntry,
  toDisplayWeight,
  toKg,
} from '../src/lib/stats';
import type { LoggedExercise, WorkoutDay } from '../src/types';

describe('draft parsing never invents numbers', () => {
  it('leaves unknown values undefined instead of defaulting to zero', () => {
    const draft = draftFromArgs({
      exercises: [{ name: 'Bench press', sets: [{ reps: 8 }] }],
    });

    expect(draft).not.toBeNull();
    const set = draft!.exercises[0].sets[0];
    expect(set.reps).toBe(8);
    expect(set.weightKg).toBeUndefined();
    expect(set.rpe).toBeUndefined();
  });

  it('drops exercises with no usable name', () => {
    const draft = draftFromArgs({
      exercises: [{ name: '   ', sets: [{ reps: 5 }] }, { name: 'Row', sets: [] }],
    });

    expect(draft!.exercises).toHaveLength(1);
    expect(draft!.exercises[0].name).toBe('Row');
  });

  it('returns null when nothing can be read', () => {
    expect(draftFromArgs({ exercises: [] })).toBeNull();
    expect(draftFromArgs(null)).toBeNull();
    expect(draftFromText('no json here at all')).toBeNull();
  });

  it('recovers a draft printed as fenced json instead of a tool call', () => {
    const text = 'Here you go\n```json\n{"exercises":[{"name":"Squat","sets":[{"reps":5,"weight_kg":100}]}]}\n```';
    const draft = draftFromText(text);

    expect(draft!.exercises[0].name).toBe('Squat');
    expect(draft!.exercises[0].sets[0].weightKg).toBe(100);
  });

  it('parses weights written as strings with units', () => {
    const draft = draftFromArgs({
      exercises: [{ name: 'Row', sets: [{ weight_kg: '80 kg', reps: '12' }] }],
    });

    expect(draft!.exercises[0].sets[0].weightKg).toBe(80);
    expect(draft!.exercises[0].sets[0].reps).toBe(12);
  });
});

describe('stats', () => {
  it('estimates one rep max with epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(e1rm(0, 10)).toBe(0);
  });

  it('sums volume as weight times reps', () => {
    const entry: LoggedExercise = {
      id: 'e1',
      name: 'Bench press',
      exerciseKey: 'bench press',
      sets: [{ weightKg: 80, reps: 8 }, { weightKg: 80, reps: 7 }],
    };
    expect(entryVolume(entry)).toBe(1200);
  });

  it('converts display units without drift on round trips', () => {
    expect(toDisplayWeight(100, 'kg')).toBe(100);
    expect(toDisplayWeight(100, 'lb')).toBe(220.5);
    expect(toKg(toDisplayWeight(100, 'lb'), 'lb')).toBeCloseTo(100, 1);
  });

  it('normalizes exercise names', () => {
    expect(exerciseKey('  Barbell Bench-Press! ')).toBe('barbell bench press');
  });

  it('buckets exercises into muscle groups', () => {
    expect(muscleGroup('Barbell bench press')).toBe('Chest');
    expect(muscleGroup('Dumbbell row')).toBe('Back');
    expect(muscleGroup('Overhead press')).toBe('Shoulders');
    expect(muscleGroup('Bicep curl')).toBe('Arms');
  });
});

describe('cardio and timed work', () => {
  const treadmill: LoggedExercise = {
    id: 'e2',
    name: 'Treadmill walk',
    exerciseKey: 'treadmill walk',
    sets: [{ durationSec: 600, inclinePct: 12 }],
  };

  it('summarizes a timed entry by duration and incline, not by sets', () => {
    const summary = summarizeEntry(treadmill, 'kg');
    expect(summary.headline).toBe('10 min');
    expect(summary.detail).toBe('10 min, 12% incline');
    expect(summary.detail).not.toContain('set');
  });

  it('labels a cardio set with time and incline', () => {
    expect(setLabel({ durationSec: 600, inclinePct: 12 }, 'kg')).toBe('10 min, 12% incline');
    expect(setLabel({ distanceM: 2500, durationSec: 900 }, 'kg')).toBe('15 min, 2.50 km');
  });

  it('summarizes a strength entry with its top set', () => {
    const bench: LoggedExercise = {
      id: 'e3',
      name: 'Barbell bench press',
      exerciseKey: 'barbell bench press',
      sets: [{ weightKg: 80, reps: 8 }, { weightKg: 80, reps: 6 }],
    };
    const summary = summarizeEntry(bench, 'kg');
    expect(summary.headline).toBe('80 kg');
    expect(summary.detail).toBe('2 sets, top 80 kg × 8');
  });

  it('falls back to reps when no weight was recorded', () => {
    const pushUps: LoggedExercise = {
      id: 'e4',
      name: 'Push ups',
      exerciseKey: 'push ups',
      sets: [{ reps: 15 }],
    };
    expect(summarizeEntry(pushUps, 'kg').detail).toBe('1 set, 15 reps');
  });

  it('keeps duration and incline through draft parsing', () => {
    const draft = draftFromArgs({
      exercises: [
        { name: 'Treadmill walk', sets: [{ duration_sec: 600, incline_pct: 12 }] },
      ],
    });
    const set = draft!.exercises[0].sets[0];
    expect(set.durationSec).toBe(600);
    expect(set.inclinePct).toBe(12);
    expect(set.weightKg).toBeUndefined();
  });

  it('does not invent a blank set when the model sends none', () => {
    const draft = draftFromArgs({ exercises: [{ name: 'Lat pulldown', sets: [] }] });
    expect(draft!.exercises[0].sets).toHaveLength(0);
  });
});

describe('dates', () => {
  it('labels today and yesterday', () => {
    const today = dayKey();
    expect(dayLabel(today)).toBe('Today');
    expect(dayLabel(shift(today, -1))).toBe('Yesterday');
  });
});

describe('exercise kinds', () => {
  it('classifies by name first', () => {
    expect(exerciseKind('Treadmill walk', [{ durationSec: 600 }])).toBe('cardio');
    expect(exerciseKind('Assault bike', [])).toBe('cardio');
    expect(exerciseKind('Plank', [{ durationSec: 90 }])).toBe('duration');
    expect(exerciseKind('Push ups', [{ reps: 15 }])).toBe('bodyweight');
    expect(exerciseKind('Barbell bench press', [{ weightKg: 80, reps: 8 }])).toBe('weight');
  });

  it('falls back to the shape of the sets for unknown names', () => {
    expect(exerciseKind('Mystery machine', [{ durationSec: 300, distanceM: 1000 }])).toBe('cardio');
    expect(exerciseKind('Mystery sit', [{ durationSec: 60 }])).toBe('duration');
    expect(exerciseKind('Mystery move', [{ reps: 10 }])).toBe('bodyweight');
  });
});

describe('warm-up sets are excluded', () => {
  const day: WorkoutDay = {
    date: dayKey(),
    updatedAt: 0,
    entries: [
      {
        id: 'e1',
        name: 'Barbell bench press',
        exerciseKey: 'barbell bench press',
        sets: [
          { weightKg: 40, reps: 10, type: 'warmup' },
          { weightKg: 80, reps: 8 },
        ],
      },
    ],
  };

  it('does not count warm-up tonnage', () => {
    expect(dayVolume(day)).toBe(640);
  });

  it('does not count warm-up sets as hard sets', () => {
    expect(daySets(day)).toBe(1);
    expect(summarizeEntry(day.entries[0], 'kg').detail).toBe('1 set, top 80 kg × 8');
  });

  it('ignores warm-up weight for the top set', () => {
    expect(historyFor([day], 'barbell bench press')[0].topWeight).toBe(80);
  });
});

describe('records by kind', () => {
  const treadmillDay: WorkoutDay = {
    date: dayKey(),
    updatedAt: 0,
    entries: [
      {
        id: 't1',
        name: 'Treadmill walk',
        exerciseKey: 'treadmill walk',
        sets: [{ durationSec: 600, inclinePct: 12, distanceM: 1000 }],
      },
    ],
  };

  it('never reports kilos for cardio', () => {
    const chips = recordsFor(historyFor([treadmillDay], 'treadmill walk'), 'cardio', 'kg');
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.some(chip => /kg/.test(chip.value) || /kg/.test(chip.label))).toBe(false);
    expect(chips.map(chip => chip.label)).toContain('Longest distance');
    expect(chips.map(chip => chip.label)).toContain('Best pace');
  });

  it('reads a duration exercise as a single best time', () => {
    const plankDay: WorkoutDay = {
      date: dayKey(),
      updatedAt: 0,
      entries: [
        {
          id: 'p1',
          name: 'Plank',
          exerciseKey: 'plank',
          sets: [{ durationSec: 90 }],
        },
      ],
    };
    const chips = recordsFor(historyFor([plankDay], 'plank'), 'duration', 'kg');
    expect(chips).toEqual([{ label: 'Longest', value: '1:30' }]);
  });

  it('reports weight records for a barbell movement', () => {
    const benchDay: WorkoutDay = {
      date: dayKey(),
      updatedAt: 0,
      entries: [
        {
          id: 'b1',
          name: 'Barbell bench press',
          exerciseKey: 'barbell bench press',
          sets: [{ weightKg: 80, reps: 8 }],
        },
      ],
    };
    const chips = recordsFor(historyFor([benchDay], 'barbell bench press'), 'weight', 'kg');
    expect(chips.map(chip => chip.label)).toEqual(['Heaviest', 'Best 1RM']);
    expect(chips[0].value).toBe('80 kg');
  });
});

describe('durations and set types', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatDuration(750)).toBe('12:30');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('reads a set type from the model, including sloppy spellings', () => {
    const draft = draftFromArgs({
      exercises: [
        {
          name: 'Barbell bench press',
          sets: [
            { weight_kg: 40, reps: 10, type: 'Warm-up' },
            { weight_kg: 80, reps: 8, type: 'working' },
          ],
        },
      ],
    });
    expect(draft!.exercises[0].sets[0].type).toBe('warmup');
    expect(draft!.exercises[0].sets[1].type).toBeUndefined();
  });

  it('drops sets that carry no data at all, so blanks never get logged', () => {
    expect(meaningfulSets([{}])).toHaveLength(0);
    expect(meaningfulSets([{}, { reps: 8 }])).toHaveLength(1);
    expect(meaningfulSets([{ durationSec: 600 }])).toHaveLength(1);
    expect(meaningfulSets([{ type: 'warmup' }])).toHaveLength(0);
  });
});

describe('delete requests', () => {
  const deleteDay: WorkoutDay = {
    date: dayKey(),
    updatedAt: 0,
    entries: [
      { id: 'a', name: 'Treadmill walk', exerciseKey: 'treadmill walk', sets: [{ durationSec: 600 }] },
      { id: 'b', name: 'Push ups', exerciseKey: 'push ups', sets: [{ reps: 15 }] },
    ],
  };

  it('finds one exercise by a fuzzy name', () => {
    const request = resolveDeleteRequest(JSON.stringify({ exercise: 'treadmill' }), {
      [dayKey()]: deleteDay,
    });
    expect(request?.entryIds).toEqual(['a']);
  });

  it('targets the whole day when no exercise is named', () => {
    const request = resolveDeleteRequest('{}', { [dayKey()]: deleteDay });
    expect(request?.entryIds).toEqual(['a', 'b']);
  });

  it('returns nothing when the exercise is not logged', () => {
    expect(
      resolveDeleteRequest(JSON.stringify({ exercise: 'squat' }), { [dayKey()]: deleteDay }),
    ).toBeNull();
  });
});

describe('sse parsing', () => {
  it('splits events across chunk boundaries', () => {
    const parser = new SseParser();
    expect(parser.push('data: {"a"')).toHaveLength(0);

    const events = parser.push(':1}\n\ndata: [DONE]\n\n');
    expect(events).toHaveLength(2);
    expect(events[0].data).toBe('{"a":1}');
    expect(events[1].data).toBe('[DONE]');
  });

  it('ignores comment lines and handles carriage returns', () => {
    const parser = new SseParser();
    const events = parser.push(': keepalive\r\ndata: hello\r\n\r\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('hello');
  });
});
