import { dayKey } from '../lib/date';
import { exerciseKey } from '../lib/stats';
import type { Draft, DraftExercise, SetEntry, SetType } from '../types';

export type Clarification = {
  question: string;
  options: string[];
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim());
}

function readSetType(raw: unknown): SetType | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const value = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (value === 'warmup') {
    return 'warmup';
  }
  if (value === 'drop' || value === 'dropset') {
    return 'drop';
  }
  if (value === 'failure') {
    return 'failure';
  }
  return undefined;
}

function readSet(raw: unknown): SetEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  return {
    reps: toNumber(record.reps),
    weightKg: toNumber(record.weight_kg ?? record.weightKg ?? record.weight),
    durationSec: toNumber(record.duration_sec ?? record.durationSec),
    distanceM: toNumber(record.distance_m ?? record.distanceM),
    inclinePct: toNumber(record.incline_pct ?? record.inclinePct),
    speedKph: toNumber(record.speed_kph ?? record.speedKph),
    rpe: toNumber(record.rpe),
    type: readSetType(record.type),
  };
}

function readExercise(raw: unknown): DraftExercise | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    return null;
  }
  const sets = Array.isArray(record.sets)
    ? (record.sets.map(readSet).filter(Boolean) as SetEntry[])
    : [];

  return {
    name,
    exerciseKey: exerciseKey(name),
    sets,
    notes: typeof record.notes === 'string' && record.notes.trim() ? record.notes.trim() : undefined,
    assumed: toStrings(record.assumed),
  };
}

export function draftFromArgs(args: unknown): Draft | null {
  if (!args || typeof args !== 'object') {
    return null;
  }
  const record = args as Record<string, unknown>;
  const source = (record.draft ?? record.workout ?? record) as Record<string, unknown>;
  const rawExercises = Array.isArray(source.exercises) ? source.exercises : [];

  const exercises = rawExercises
    .map(readExercise)
    .filter((exercise): exercise is DraftExercise => exercise !== null);

  if (exercises.length === 0) {
    return null;
  }

  const date =
    typeof source.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.date)
      ? source.date
      : dayKey();

  return {
    date,
    exercises,
    notes: typeof source.notes === 'string' && source.notes.trim() ? source.notes.trim() : undefined,
    assumptions: toStrings(source.assumptions),
  };
}

export function draftFromToolCall(rawArguments: string): Draft | null {
  try {
    return draftFromArgs(JSON.parse(rawArguments));
  } catch {
    return null;
  }
}

export function clarificationFromArgs(args: unknown): Clarification | null {
  if (!args || typeof args !== 'object') {
    return null;
  }
  const record = args as Record<string, unknown>;
  const question = typeof record.question === 'string' ? record.question.trim() : '';
  if (!question) {
    return null;
  }
  const options = toStrings(record.options).slice(0, 4);
  return { question, options: options.length >= 2 ? options : [] };
}

export function clarificationFromToolCall(rawArguments: string): Clarification | null {
  try {
    return clarificationFromArgs(JSON.parse(rawArguments));
  } catch {
    return null;
  }
}

export function draftFromText(text: string): Draft | null {
  const candidates: string[] = [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    candidates.push(fenced[1]);
  }

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) {
    candidates.push(text.slice(first, last + 1));
  }

  for (const candidate of candidates) {
    try {
      const draft = draftFromArgs(JSON.parse(candidate));
      if (draft) {
        return draft;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function looksLikePayload(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('```') || (trimmed.startsWith('{') && trimmed.endsWith('}'));
}
