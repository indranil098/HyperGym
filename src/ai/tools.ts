export type ToolDef = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const SET_SCHEMA = {
  type: 'object',
  properties: {
    reps: { type: 'number', description: 'Repetitions. Omit when unknown, never guess.' },
    weight_kg: { type: 'number', description: 'Weight in kilograms. Omit when unknown, never guess.' },
    duration_sec: { type: 'number', description: 'Duration in seconds for cardio, holds, planks.' },
    distance_m: { type: 'number', description: 'Distance in metres for cardio.' },
    incline_pct: { type: 'number', description: 'Treadmill or hill incline in percent.' },
    speed_kph: { type: 'number', description: 'Treadmill speed in km/h.' },
    rpe: { type: 'number', description: 'Perceived exertion, only when stated.' },
    type: {
      type: 'string',
      enum: ['working', 'warmup', 'drop', 'failure'],
      description:
        'Set intent. Use warmup for warm-up sets, drop for drop sets, failure when taken to failure. Omit for a normal working set.',
    },
  },
  additionalProperties: false,
} as const;

export const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'propose_workout',
      description:
        'Draft a workout for the member to review. Use this for any description of training, including messy spoken English, cardio, machine work and bodyweight work. Nothing is saved until the member confirms. Unknown numbers are left blank, never guessed.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD. Default today.' },
          notes: { type: 'string', description: 'Short context in the member words: rest, how it felt, setup.' },
          assumptions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Every fact you inferred rather than heard, one short sentence each.',
          },
          exercises: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Clean exercise name, for example Lat pulldown.' },
                sets: { type: 'array', items: SET_SCHEMA },
                notes: { type: 'string' },
                assumed: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'What was guessed for this exercise specifically.',
                },
              },
              required: ['name', 'sets'],
              additionalProperties: false,
            },
          },
        },
        required: ['exercises'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_log',
      description:
        'Remove exercises that are already logged. Only call this when the member explicitly asks to delete something. The app shows a confirmation card and nothing is removed until they confirm.',
      parameters: {
        type: 'object',
        properties: {
          exercise: {
            type: 'string',
            description: 'Name of the logged exercise to remove. Omit to target every exercise on that day.',
          },
          date: {
            type: 'string',
            description: 'YYYY-MM-DD of the day to edit. Defaults to the most recent logged day.',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_clarification',
      description:
        'Ask one short question when a blocking ambiguity makes a useful draft impossible. The app renders the options as tappable chips. Prefer proposing a draft with assumptions over asking.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'One short question, under 90 characters.' },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: { type: 'string' },
            description: 'Concrete answers the member can tap.',
          },
        },
        required: ['question', 'options'],
        additionalProperties: false,
      },
    },
  },
];
