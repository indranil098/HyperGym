import { exerciseKey, muscleGroup, type MuscleGroup } from './stats';

export type CatalogEntry = {
  name: string;
  group: MuscleGroup;
};

/**
 * Curated exercise names for autocomplete. This is the only name list in the
 * app — everything else derives from the user's own log, which always outranks
 * the catalog in suggestions.
 */
export const EXERCISE_CATALOG: CatalogEntry[] = [
  // Chest
  { name: 'Barbell bench press', group: 'Chest' },
  { name: 'Incline barbell bench press', group: 'Chest' },
  { name: 'Dumbbell bench press', group: 'Chest' },
  { name: 'Incline dumbbell press', group: 'Chest' },
  { name: 'Dumbbell fly', group: 'Chest' },
  { name: 'Cable fly', group: 'Chest' },
  { name: 'Pec deck', group: 'Chest' },
  { name: 'Machine chest press', group: 'Chest' },
  { name: 'Push up', group: 'Chest' },
  { name: 'Dip', group: 'Chest' },

  // Back
  { name: 'Lat pulldown', group: 'Back' },
  { name: 'Pull up', group: 'Back' },
  { name: 'Chin up', group: 'Back' },
  { name: 'Barbell row', group: 'Back' },
  { name: 'Dumbbell row', group: 'Back' },
  { name: 'Seated cable row', group: 'Back' },
  { name: 'Chest supported row', group: 'Back' },
  { name: 'T-bar row', group: 'Back' },
  { name: 'Deadlift', group: 'Back' },
  { name: 'Romanian deadlift', group: 'Back' },
  { name: 'Sumo deadlift', group: 'Back' },
  { name: 'Trap bar deadlift', group: 'Back' },
  { name: 'Back extension', group: 'Back' },
  { name: 'Straight arm pulldown', group: 'Back' },
  { name: 'Face pull', group: 'Back' },
  { name: 'Shrug', group: 'Back' },

  // Legs
  { name: 'Barbell back squat', group: 'Legs' },
  { name: 'Front squat', group: 'Legs' },
  { name: 'Goblet squat', group: 'Legs' },
  { name: 'Hack squat', group: 'Legs' },
  { name: 'Leg press', group: 'Legs' },
  { name: 'Leg extension', group: 'Legs' },
  { name: 'Leg curl', group: 'Legs' },
  { name: 'Lunge', group: 'Legs' },
  { name: 'Walking lunge', group: 'Legs' },
  { name: 'Bulgarian split squat', group: 'Legs' },
  { name: 'Romanian split squat', group: 'Legs' },
  { name: 'Calf raise', group: 'Legs' },
  { name: 'Seated calf raise', group: 'Legs' },
  { name: 'Hip thrust', group: 'Legs' },
  { name: 'Glute bridge', group: 'Legs' },
  { name: 'Good morning', group: 'Legs' },
  { name: 'Step up', group: 'Legs' },
  { name: 'Box jump', group: 'Legs' },

  // Shoulders
  { name: 'Overhead press', group: 'Shoulders' },
  { name: 'Seated dumbbell shoulder press', group: 'Shoulders' },
  { name: 'Arnold press', group: 'Shoulders' },
  { name: 'Machine shoulder press', group: 'Shoulders' },
  { name: 'Lateral raise', group: 'Shoulders' },
  { name: 'Cable lateral raise', group: 'Shoulders' },
  { name: 'Front raise', group: 'Shoulders' },
  { name: 'Rear delt fly', group: 'Shoulders' },
  { name: 'Upright row', group: 'Shoulders' },
  { name: 'Plate raise', group: 'Shoulders' },

  // Arms
  { name: 'Barbell curl', group: 'Arms' },
  { name: 'Dumbbell curl', group: 'Arms' },
  { name: 'Incline dumbbell curl', group: 'Arms' },
  { name: 'Hammer curl', group: 'Arms' },
  { name: 'Preacher curl', group: 'Arms' },
  { name: 'Cable curl', group: 'Arms' },
  { name: 'Concentration curl', group: 'Arms' },
  { name: 'Tricep pushdown', group: 'Arms' },
  { name: 'Overhead tricep extension', group: 'Arms' },
  { name: 'Skull crusher', group: 'Arms' },
  { name: 'Close grip bench press', group: 'Arms' },
  { name: 'Bench dip', group: 'Arms' },
  { name: 'Wrist curl', group: 'Arms' },

  // Core
  { name: 'Plank', group: 'Core' },
  { name: 'Side plank', group: 'Core' },
  { name: 'Hanging leg raise', group: 'Core' },
  { name: 'Hanging knee raise', group: 'Core' },
  { name: 'Cable crunch', group: 'Core' },
  { name: 'Crunch', group: 'Core' },
  { name: 'Sit up', group: 'Core' },
  { name: 'Ab wheel rollout', group: 'Core' },
  { name: 'Russian twist', group: 'Core' },
  { name: 'Dead hang', group: 'Core' },
  { name: 'Farmer carry', group: 'Core' },

  // Cardio
  { name: 'Treadmill walk', group: 'Cardio' },
  { name: 'Treadmill run', group: 'Cardio' },
  { name: 'Outdoor run', group: 'Cardio' },
  { name: 'Cycling', group: 'Cardio' },
  { name: 'Spin bike', group: 'Cardio' },
  { name: 'Rowing machine', group: 'Cardio' },
  { name: 'Elliptical', group: 'Cardio' },
  { name: 'Stair climber', group: 'Cardio' },
  { name: 'Swim', group: 'Cardio' },
  { name: 'Jump rope', group: 'Cardio' },
  { name: 'Hike', group: 'Cardio' },
  { name: 'Battle rope', group: 'Cardio' },

  // Mobility
  { name: 'Stretching', group: 'Core' },
  { name: 'Foam roll', group: 'Core' },
];

const INDEXED = EXERCISE_CATALOG.map(entry => ({ ...entry, key: exerciseKey(entry.name) }));

/**
 * Suggestions for a partial exercise name. The member's own history comes
 * first so their logged names always outrank the catalog, then exact-prefix
 * catalog matches, then anything containing the query.
 */
export function suggestExercises(
  query: string,
  history: { name: string; key: string }[],
  limit = 6,
): CatalogEntry[] {
  const needle = exerciseKey(query);
  if (!needle) {
    return [];
  }

  const seen = new Set<string>();
  const out: CatalogEntry[] = [];

  const push = (name: string, group?: CatalogEntry['group']) => {
    const key = exerciseKey(name);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    // muscleGroup() defaults unknown names to Chest, so the catalog's own
    // classification wins where we have one.
    out.push({ name, group: group ?? muscleGroup(name) });
  };

  for (const item of history) {
    if (item.key.startsWith(needle) && out.length < limit) {
      push(item.name);
    }
  }

  for (const entry of INDEXED) {
    if (entry.key.startsWith(needle) && out.length < limit) {
      push(entry.name, entry.group);
    }
  }

  for (const entry of INDEXED) {
    if (entry.key.includes(needle) && out.length < limit) {
      push(entry.name, entry.group);
    }
  }

  return out;
}
