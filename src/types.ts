export type SetType = 'working' | 'warmup' | 'drop' | 'failure';

export type SetEntry = {
  reps?: number;
  weightKg?: number;
  durationSec?: number;
  distanceM?: number;
  inclinePct?: number;
  speedKph?: number;
  rpe?: number;
  type?: SetType;
};

export type DraftExercise = {
  name: string;
  exerciseKey: string;
  sets: SetEntry[];
  notes?: string;
  assumed: string[];
};

export type Draft = {
  date: string;
  exercises: DraftExercise[];
  notes?: string;
  assumptions: string[];
};

export type LoggedExercise = {
  id: string;
  name: string;
  exerciseKey: string;
  sets: SetEntry[];
  notes?: string;
  assumed?: string[];
};

export type WorkoutDay = {
  date: string;
  entries: LoggedExercise[];
  notes?: string;
  updatedAt: number;
};

export type RoutineItem = {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
};

export type Routine = {
  id: string;
  name: string;
  items: RoutineItem[];
  updatedAt: number;
};

export type UserMessage = {
  id: string;
  role: 'user';
  text: string;
  images: string[];
  at: number;
};

export type AssistantText = {
  id: string;
  role: 'assistant';
  kind: 'text';
  text: string;
  streaming?: boolean;
  at: number;
};

export type Receipt = {
  dayKey: string;
  entryIds: string[];
  exerciseCount: number;
  setCount: number;
  volume: number;
  names: string[];
};

export type AssistantDraft = {
  id: string;
  role: 'assistant';
  kind: 'draft';
  draftId: string;
  draft: Draft;
  status: 'pending' | 'logged' | 'discarded';
  receipt?: Receipt;
  at: number;
};

export type AssistantQuestion = {
  id: string;
  role: 'assistant';
  kind: 'question';
  question: string;
  options: string[];
  at: number;
};

export type ActionRequest = {
  kind: 'delete';
  date: string;
  entryIds: string[];
  names: string[];
};

export type AssistantAction = {
  id: string;
  role: 'assistant';
  kind: 'action';
  action: ActionRequest;
  status: 'pending' | 'applied' | 'cancelled';
  at: number;
};

export type ChatMessage =
  | UserMessage
  | AssistantText
  | AssistantDraft
  | AssistantQuestion
  | AssistantAction;

export type Thread = {
  id: string;
  title: string;
  at: number;
  updatedAt: number;
  messages: ChatMessage[];
};

export type Unit = 'kg' | 'lb';

export type MotionSetting = 'system' | 'reduced' | 'full';

export type ThemeSetting = 'dark' | 'green' | 'light';

export type Settings = {
  apiKey: string;
  model: string;
  autoFallback: boolean;
  unit: Unit;
  motion: MotionSetting;
  theme: ThemeSetting;
};

export type AttachedImage = {
  uri: string;
  base64: string;
  mime: string;
};
