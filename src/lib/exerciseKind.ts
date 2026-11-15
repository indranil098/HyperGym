import type { SetEntry } from '../types';

export type ExerciseKind = 'weight' | 'bodyweight' | 'duration' | 'cardio';

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CARDIO_WORDS = [
  'treadmill',
  'walk',
  'run',
  'jog',
  'sprint',
  'bike',
  'cycle',
  'rowing machine',
  'rower',
  'erg',
  'elliptical',
  'stair',
  'stepmill',
  'swim',
  'hike',
  'jump rope',
  'skip rope',
  'battle rope',
];

const DURATION_WORDS = [
  'plank',
  'hold',
  'carry',
  'wall sit',
  'dead hang',
  'stretch',
  'foam roll',
  'hollow',
  'l sit',
  'superman',
];

function matches(key: string, words: string[]): boolean {
  const padded = ` ${key} `;
  return words.some(word => padded.includes(` ${word}`) || padded.includes(`${word} `));
}

export function exerciseKind(name: string, sets: SetEntry[] = []): ExerciseKind {
  const key = normalize(name);

  if (matches(key, CARDIO_WORDS)) {
    return 'cardio';
  }
  if (matches(key, DURATION_WORDS)) {
    return 'duration';
  }

  if (sets.some(set => set.weightKg !== undefined)) {
    return 'weight';
  }

  const timed = sets.filter(set => set.durationSec !== undefined);
  if (timed.length > 0 && timed.length === sets.length) {
    const hasCardioDetail = sets.some(
      set => set.distanceM !== undefined || set.inclinePct !== undefined || set.speedKph !== undefined,
    );
    return hasCardioDetail ? 'cardio' : 'duration';
  }

  return 'bodyweight';
}

export function isCardio(name: string, sets: SetEntry[] = []): boolean {
  return exerciseKind(name, sets) === 'cardio';
}
