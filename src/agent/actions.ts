import { dayKey } from '../lib/date';
import type { ActionRequest, WorkoutDay } from '../types';

type Args = {
  date?: unknown;
  exercise?: unknown;
};

export function resolveDeleteRequest(
  rawArguments: string,
  days: Record<string, WorkoutDay>,
): ActionRequest | null {
  let args: Args;
  try {
    args = JSON.parse(rawArguments) as Args;
  } catch {
    return null;
  }

  const requestedDate =
    typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : null;
  const needle = typeof args.exercise === 'string' ? args.exercise.trim().toLowerCase() : '';

  const dates = requestedDate
    ? [requestedDate]
    : Object.keys(days).sort((a, b) => (a < b ? 1 : -1)).slice(0, 1);

  for (const date of dates) {
    const day = days[date];
    if (!day) {
      continue;
    }
    const matches = needle
      ? day.entries.filter(
          entry =>
            entry.name.toLowerCase().includes(needle) ||
            entry.exerciseKey.includes(needle) ||
            needle.includes(entry.exerciseKey),
        )
      : day.entries;

    if (matches.length > 0) {
      return {
        kind: 'delete',
        date,
        entryIds: matches.map(entry => entry.id),
        names: matches.map(entry => entry.name),
      };
    }
  }

  return null;
}

export function describeDelete(request: ActionRequest): string {
  const label = request.date === dayKey() ? 'today' : request.date;
  if (request.names.length === 1) {
    return `Delete ${request.names[0]} from ${label}`;
  }
  return `Delete ${request.names.length} exercises from ${label}`;
}
