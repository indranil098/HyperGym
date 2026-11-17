import { create } from 'zustand';
import type {
  ActiveSession,
  ChatMessage,
  LoggedExercise,
  PrGain,
  Receipt,
  Rest,
  Routine,
  SessionExercise,
  SessionSet,
  SetEntry,
  Settings,
  Stopwatch,
  Thread,
  WorkoutDay,
} from '../types';
import { KEYS, clearAll, createSaver, loadJSON } from '../lib/storage';
import { dayKey } from '../lib/date';
import { entryBestE1rm, entryVolume, exerciseKey, hasValue, lastPerformance, meaningfulSets, personalRecord } from '../lib/stats';
import { sessionToDay } from '../lib/session';
import { uid } from '../lib/id';
import { DEFAULT_MODEL, MODELS } from '../ai/models';
import { applyTheme } from '../theme';

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: DEFAULT_MODEL,
  autoFallback: true,
  unit: 'kg',
  motion: 'system',
  theme: 'dark',
};

const CHAT_LIMIT = 200;
const THREAD_LIMIT = 60;
const UNTITLED = 'New chat';

const saveDays = createSaver(KEYS.days);
const saveChat = createSaver(KEYS.chat);
const saveThreads = createSaver(KEYS.threads);
const saveActiveThread = createSaver(KEYS.activeThread);
const saveSession = createSaver(KEYS.session, 200);
const saveRest = createSaver(KEYS.rest, 200);
const saveStopwatch = createSaver(KEYS.stopwatch, 200);
const saveRoutines = createSaver(KEYS.routines);
const saveSettings = createSaver(KEYS.settings);

function forStorage(chat: ChatMessage[]): ChatMessage[] {
  return chat.slice(-CHAT_LIMIT).map(message =>
    message.role === 'user' && message.images.length > 0
      ? { ...message, images: [] }
      : message,
  );
}

function forStorageThreads(threads: Thread[]): Thread[] {
  return threads.slice(0, THREAD_LIMIT).map(thread => ({
    ...thread,
    messages: forStorage(thread.messages),
  }));
}

function emptyThread(at = Date.now()): Thread {
  return { id: uid('t'), title: UNTITLED, at, updatedAt: at, messages: [] };
}

function titleFrom(chat: ChatMessage[]): string {
  const first = chat.find(
    message => message.role === 'user' && message.text.trim().length > 0,
  );
  if (first && first.role === 'user') {
    const text = first.text.trim().replace(/\s+/g, ' ');
    return text.length > 58 ? `${text.slice(0, 58).trimEnd()}...` : text;
  }
  if (chat.length > 0) {
    return 'Photo session';
  }
  return UNTITLED;
}

type State = {
  hydrated: boolean;
  days: Record<string, WorkoutDay>;
  chat: ChatMessage[];
  threads: Thread[];
  activeThreadId: string;
  routines: Routine[];
  settings: Settings;
  session: ActiveSession | null;
  rest: Rest | null;
  stopwatch: Stopwatch | null;
  /** Focused tab name, used to suppress the rest dock on the session screen. */
  activeTab: string;
};

const DEFAULT_REST_SEC = 90;

type Actions = {
  hydrate: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  addMessage: (message: ChatMessage) => void;
  patchMessage: (id: string, update: (message: ChatMessage) => ChatMessage) => void;
  removeMessage: (id: string) => void;
  clearChat: () => void;
  newChat: () => void;
  openThread: (id: string) => void;
  deleteThread: (id: string) => void;
  commitDraft: (messageId: string) => Receipt | null;
  discardDraft: (messageId: string) => void;
  applyAction: (messageId: string) => void;
  cancelAction: (messageId: string) => void;
  undoReceipt: (receipt: Receipt) => void;
  deleteDay: (key: string) => void;
  deleteEntry: (key: string, entryId: string) => void;
  saveRoutine: (name: string, items: Routine['items']) => void;
  deleteRoutine: (id: string) => void;
  startSession: (seed?: SessionExercise[]) => void;
  addSessionExercise: (name: string, restSec?: number) => void;
  addSessionExerciseFromHistory: (name: string) => void;
  removeSessionExercise: (id: string) => void;
  logSessionSet: (exerciseId: string, set: SetEntry, restSec?: number) => void;
  updateSessionSet: (exerciseId: string, setId: string, patch: Partial<SetEntry>) => void;
  removeSessionSet: (exerciseId: string, setId: string) => void;
  setSessionNotes: (notes: string) => void;
  finishSession: () => Receipt | null;
  cancelSession: () => void;
  startRest: (sec: number) => void;
  skipRest: () => void;
  extendRest: (sec: number) => void;
  startStopwatch: () => void;
  stopStopwatch: () => void;
  setActiveTab: (name: string) => void;
  markAuraDone: (threadId: string) => void;
  wipe: () => Promise<void>;
};

export const useAppStore = create<State & Actions>()((set, get) => {
  const writeChat = (chat: ChatMessage[], threads?: Thread[], activeThreadId?: string) => {
    const current = get();
    const nextThreads = (threads ?? current.threads).map(thread =>
      thread.id === (activeThreadId ?? current.activeThreadId)
        ? { ...thread, title: titleFrom(chat), messages: chat, updatedAt: Date.now() }
        : thread,
    );
    set({ chat, threads: nextThreads });
    saveChat(forStorage(chat));
    saveThreads(forStorageThreads(nextThreads));
  };

  return {
    hydrated: false,
    days: {},
    chat: [],
    threads: [],
    activeThreadId: '',
    routines: [],
    settings: DEFAULT_SETTINGS,
    session: null,
    rest: null,
    stopwatch: null,
    activeTab: 'Chat',

    hydrate: async () => {
      const [days, chat, storedThreads, storedActive, routines, settings, session, rest, stopwatch] =
        await Promise.all([
          loadJSON<Record<string, WorkoutDay>>(KEYS.days, {}),
          loadJSON<ChatMessage[]>(KEYS.chat, []),
          loadJSON<Thread[]>(KEYS.threads, []),
          loadJSON<string>(KEYS.activeThread, ''),
          loadJSON<Routine[]>(KEYS.routines, []),
          loadJSON<Partial<Settings>>(KEYS.settings, {}),
          loadJSON<ActiveSession | null>(KEYS.session, null),
          loadJSON<Rest | null>(KEYS.rest, null),
          loadJSON<Stopwatch | null>(KEYS.stopwatch, null),
        ]);
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      if (!MODELS.some(model => model.id === merged.model)) {
        merged.model = DEFAULT_MODEL;
      }
      applyTheme(merged.theme);

      const threads =
        storedThreads.length > 0
          ? storedThreads
          : chat.length > 0
            ? [{ id: uid('t'), title: titleFrom(chat), at: chat[0].at, updatedAt: Date.now(), messages: chat }]
            : [emptyThread()];

      const active = threads.some(thread => thread.id === storedActive)
        ? storedActive
        : threads[0].id;
      const activeThread = threads.find(thread => thread.id === active) ?? threads[0];

      set({
        days,
        chat: activeThread.messages,
        threads,
        activeThreadId: active,
        routines,
        settings: merged,
        session: session ?? null,
        rest: rest ?? null,
        stopwatch: stopwatch ?? null,
        hydrated: true,
      });
      saveThreads(forStorageThreads(threads));
      saveActiveThread(active);
    },

    updateSettings: patch => {
      if (patch.theme) {
        applyTheme(patch.theme);
      }
      const settings = { ...get().settings, ...patch };
      set({ settings });
      saveSettings(settings);
    },

    addMessage: message => {
      writeChat([...get().chat, message].slice(-CHAT_LIMIT));
    },

    patchMessage: (id, update) => {
      writeChat(get().chat.map(message => (message.id === id ? update(message) : message)));
    },

    clearChat: () => {
      writeChat([]);
    },

    newChat: () => {
      const { threads, activeThreadId } = get();
      const active = threads.find(thread => thread.id === activeThreadId);
      if (active && active.messages.length === 0) {
        return;
      }
      const thread = emptyThread();
      const nextThreads = [thread, ...threads].slice(0, THREAD_LIMIT);
      set({ chat: [], threads: nextThreads, activeThreadId: thread.id });
      saveChat([]);
      saveThreads(forStorageThreads(nextThreads));
      saveActiveThread(thread.id);
    },

    openThread: id => {
      const { threads } = get();
      const thread = threads.find(item => item.id === id);
      if (!thread) {
        return;
      }
      set({ chat: thread.messages, activeThreadId: id });
      saveChat(forStorage(thread.messages));
      saveActiveThread(id);
    },

    deleteThread: id => {
      const { threads, activeThreadId } = get();
      const remaining = threads.filter(thread => thread.id !== id);
      if (remaining.length === 0) {
        const thread = emptyThread();
        set({ chat: [], threads: [thread], activeThreadId: thread.id });
        saveChat([]);
        saveThreads([thread]);
        saveActiveThread(thread.id);
        return;
      }
      if (id !== activeThreadId) {
        set({ threads: remaining });
        saveThreads(forStorageThreads(remaining));
        return;
      }
      const next = remaining[0];
      set({ chat: next.messages, threads: remaining, activeThreadId: next.id });
      saveChat(forStorage(next.messages));
      saveThreads(forStorageThreads(remaining));
      saveActiveThread(next.id);
    },

    removeMessage: (id: string) => {
      writeChat(get().chat.filter(message => message.id !== id));
    },

    commitDraft: messageId => {
      const message = get().chat.find(item => item.id === messageId);
      if (!message || message.role !== 'assistant' || message.kind !== 'draft') {
        return null;
      }
      if (message.status !== 'pending') {
        return null;
      }

      const date = message.draft.date || dayKey();
      const entries: LoggedExercise[] = message.draft.exercises
        .filter(exercise => exercise.name.trim().length > 0)
        .map(exercise => ({
          id: uid('e'),
          name: exercise.name.trim(),
          exerciseKey: exercise.exerciseKey || exerciseKey(exercise.name),
          sets: meaningfulSets(exercise.sets),
          notes: exercise.notes,
          assumed: exercise.assumed.length > 0 ? exercise.assumed : undefined,
        }))
        .filter(exercise => exercise.sets.length > 0);

      if (entries.length === 0) {
        return null;
      }

      const merged = new Map<string, LoggedExercise>();
      for (const entry of entries) {
        const existing = merged.get(entry.exerciseKey);
        if (existing) {
          existing.sets = [...existing.sets, ...entry.sets];
          if (!existing.notes && entry.notes) {
            existing.notes = entry.notes;
          }
        } else {
          merged.set(entry.exerciseKey, { ...entry, sets: [...entry.sets] });
        }
      }
      const finalEntries = [...merged.values()];

      const existing = get().days[date];
      const day: WorkoutDay = {
        date,
        notes: existing?.notes ?? message.draft.notes,
        entries: [...(existing?.entries ?? []), ...finalEntries],
        updatedAt: Date.now(),
      };

      const days = { ...get().days, [date]: day };

      const prs: PrGain[] = [];
      for (const entry of finalEntries) {
        const previous = personalRecord(Object.values(get().days), entry.exerciseKey);
        const best = entryBestE1rm(entry);
        if (best > previous) {
          prs.push({ name: entry.name, previous, value: best });
        }
      }

      const receipt: Receipt = {
        dayKey: date,
        entryIds: finalEntries.map(entry => entry.id),
        exerciseCount: finalEntries.length,
        setCount: finalEntries.reduce((sum, entry) => sum + entry.sets.length, 0),
        volume: finalEntries.reduce((sum, entry) => sum + entryVolume(entry), 0),
        names: finalEntries.map(entry => entry.name),
        prs,
      };

      const chat = get().chat.map(item =>
        item.id === messageId && item.role === 'assistant' && item.kind === 'draft'
          ? { ...item, status: 'logged' as const, receipt }
          : item,
      );

      set({ days });
      saveDays(days);
      writeChat(chat);
      return receipt;
    },

    discardDraft: messageId => {
      writeChat(
        get().chat.map(item =>
          item.id === messageId && item.role === 'assistant' && item.kind === 'draft'
            ? { ...item, status: 'discarded' as const }
            : item,
        ),
      );
    },

    applyAction: messageId => {
      const message = get().chat.find(item => item.id === messageId);
      if (
        !message ||
        message.role !== 'assistant' ||
        message.kind !== 'action' ||
        message.status !== 'pending'
      ) {
        return;
      }

      const { date, entryIds } = message.action;
      const days = { ...get().days };
      const day = days[date];
      if (!day) {
        return;
      }

      const entries = day.entries.filter(entry => !entryIds.includes(entry.id));
      if (entries.length === 0) {
        delete days[date];
      } else {
        days[date] = { ...day, entries, updatedAt: Date.now() };
      }

      const chat = get().chat.map(item =>
        item.id === messageId && item.role === 'assistant' && item.kind === 'action'
          ? { ...item, status: 'applied' as const }
          : item,
      );

      set({ days });
      saveDays(days);
      writeChat(chat);
    },

    cancelAction: messageId => {
      writeChat(
        get().chat.map(item =>
          item.id === messageId && item.role === 'assistant' && item.kind === 'action'
            ? { ...item, status: 'cancelled' as const }
            : item,
        ),
      );
    },

    undoReceipt: receipt => {
      const days = { ...get().days };
      const day = days[receipt.dayKey];
      if (!day) {
        return;
      }
      const remaining = day.entries.filter(entry => !receipt.entryIds.includes(entry.id));
      if (remaining.length === 0) {
        delete days[receipt.dayKey];
      } else {
        days[receipt.dayKey] = { ...day, entries: remaining, updatedAt: Date.now() };
      }

      const chat = get().chat.map(item =>
        item.role === 'assistant' &&
        item.kind === 'draft' &&
        item.receipt?.entryIds.join() === receipt.entryIds.join()
          ? { ...item, status: 'discarded' as const, receipt: undefined }
          : item,
      );

      set({ days });
      saveDays(days);
      writeChat(chat);
    },

    deleteDay: key => {
      const days = { ...get().days };
      delete days[key];
      set({ days });
      saveDays(days);
    },

    deleteEntry: (key, entryId) => {
      const days = { ...get().days };
      const day = days[key];
      if (!day) {
        return;
      }
      const entries = day.entries.filter(entry => entry.id !== entryId);
      if (entries.length === 0) {
        delete days[key];
      } else {
        days[key] = { ...day, entries, updatedAt: Date.now() };
      }
      set({ days });
      saveDays(days);
    },

    saveRoutine: (name, items) => {
      if (items.length === 0) {
        return;
      }
      const routines = [
        { id: uid('r'), name: name.trim() || 'Untitled routine', items, updatedAt: Date.now() },
        ...get().routines,
      ];
      set({ routines });
      saveRoutines(routines);
    },

    deleteRoutine: id => {
      const routines = get().routines.filter(routine => routine.id !== id);
      set({ routines });
      saveRoutines(routines);
    },

    startSession: seed => {
      const session: ActiveSession = {
        id: uid('s'),
        startedAt: Date.now(),
        exercises: seed ? seed.map(exercise => ({ ...exercise })) : [],
      };
      set({ session, rest: null });
      saveSession(session);
      saveRest(null);
    },

    addSessionExercise: (name, restSec = DEFAULT_REST_SEC) => {
      const session = get().session;
      if (!session) {
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      const next: ActiveSession = {
        ...session,
        exercises: [
          ...session.exercises,
          {
            id: uid('x'),
            name: trimmed,
            exerciseKey: exerciseKey(trimmed),
            sets: [],
            restSec,
          },
        ],
      };
      set({ session: next });
      saveSession(next);
    },

    addSessionExerciseFromHistory: name => {
      const state = get();
      if (!state.session) {
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      const key = exerciseKey(trimmed);
      // Pre-fill from the last time this was trained, so the member confirms
      // instead of retyping. Blank when it has never been logged.
      const last = lastPerformance(Object.values(state.days), key, undefined);
      const source = last?.entry.sets ?? [];
      const seedSets: SessionSet[] = source.map(set => ({
        ...set,
        id: uid('t'),
        done: false,
        at: Date.now(),
      }));

      const next: ActiveSession = {
        ...state.session,
        exercises: [
          ...state.session.exercises,
          {
            id: uid('x'),
            name: trimmed,
            exerciseKey: key,
            sets: seedSets,
            restSec: DEFAULT_REST_SEC,
          },
        ],
      };
      set({ session: next });
      saveSession(next);
    },

    removeSessionExercise: id => {
      const session = get().session;
      if (!session) {
        return;
      }
      const next: ActiveSession = {
        ...session,
        exercises: session.exercises.filter(exercise => exercise.id !== id),
      };
      set({ session: next });
      saveSession(next);
    },

    logSessionSet: (exerciseId, setEntry, restSec) => {
      const { session } = get();
      if (!session) {
        return;
      }
      const now = Date.now();
      let startedRest: Rest | null = null;

      const next: ActiveSession = {
        ...session,
        exercises: session.exercises.map(exercise => {
          if (exercise.id !== exerciseId) {
            return exercise;
          }
          const duration = restSec ?? exercise.restSec ?? DEFAULT_REST_SEC;
          startedRest = { startedAt: now, endsAt: now + duration * 1000, durationSec: duration };
          return {
            ...exercise,
            sets: [
              ...exercise.sets.filter(entry => entry.done || hasValue(entry)),
              { ...setEntry, id: uid('t'), done: true, at: now },
            ],
          };
        }),
      };

      set({ session: next, rest: startedRest });
      saveSession(next);
      if (startedRest) {
        saveRest(startedRest);
      }
    },

    updateSessionSet: (exerciseId, setId, patch) => {
      const session = get().session;
      if (!session) {
        return;
      }
      const next: ActiveSession = {
        ...session,
        exercises: session.exercises.map(exercise =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map(entry =>
                  entry.id === setId ? { ...entry, ...patch } : entry,
                ),
              }
            : exercise,
        ),
      };
      set({ session: next });
      saveSession(next);
    },

    removeSessionSet: (exerciseId, setId) => {
      const session = get().session;
      if (!session) {
        return;
      }
      const next: ActiveSession = {
        ...session,
        exercises: session.exercises.map(exercise =>
          exercise.id === exerciseId
            ? { ...exercise, sets: exercise.sets.filter(entry => entry.id !== setId) }
            : exercise,
        ),
      };
      set({ session: next });
      saveSession(next);
    },

    setSessionNotes: notes => {
      const session = get().session;
      if (!session) {
        return;
      }
      const next: ActiveSession = { ...session, notes };
      set({ session: next });
      saveSession(next);
    },

    finishSession: () => {
      const { session } = get();
      if (!session) {
        return null;
      }
      const day = sessionToDay(session);
      if (!day) {
        return null;
      }

      const before = get().days;
      const prs: PrGain[] = [];
      for (const entry of day.entries) {
        const previous = personalRecord(Object.values(before), entry.exerciseKey);
        const best = entryBestE1rm(entry);
        if (best > previous) {
          prs.push({ name: entry.name, previous, value: best });
        }
      }

      const existing = before[day.date];
      const mergedDay: WorkoutDay = existing
        ? {
            ...existing,
            entries: [...existing.entries, ...day.entries],
            notes: existing.notes ?? day.notes,
            updatedAt: Date.now(),
          }
        : day;

      const days = { ...before, [day.date]: mergedDay };

      set({ days, session: null, rest: null });
      saveDays(days);
      saveSession(null);
      saveRest(null);

      const workingSets = mergedDay.entries.reduce(
        (sum, entry) => sum + meaningfulSets(entry.sets).length,
        0,
      );
      return {
        dayKey: day.date,
        entryIds: day.entries.map(entry => entry.id),
        exerciseCount: day.entries.length,
        setCount: workingSets,
        volume: day.entries.reduce((sum, entry) => sum + entryVolume(entry), 0),
        names: day.entries.map(entry => entry.name),
        prs,
      };
    },

    cancelSession: () => {
      set({ session: null, rest: null });
      saveSession(null);
      saveRest(null);
    },

    startRest: sec => {
      const now = Date.now();
      const rest: Rest = { startedAt: now, endsAt: now + sec * 1000, durationSec: sec };
      set({ rest });
      saveRest(rest);
    },

    skipRest: () => {
      set({ rest: null });
      saveRest(null);
    },

    extendRest: sec => {
      const rest = get().rest;
      if (!rest) {
        return;
      }
      const next: Rest = {
        ...rest,
        endsAt: Math.max(rest.endsAt, Date.now()) + sec * 1000,
        durationSec: rest.durationSec + sec,
      };
      set({ rest: next });
      saveRest(next);
    },

    startStopwatch: () => {
      const stopwatch: Stopwatch = { startedAt: Date.now() };
      set({ stopwatch });
      saveStopwatch(stopwatch);
    },

    stopStopwatch: () => {
      set({ stopwatch: null });
      saveStopwatch(null);
    },

    setActiveTab: name => {
      if (get().activeTab !== name) {
        set({ activeTab: name });
      }
    },

    markAuraDone: threadId => {
      const threads = get().threads.map(thread =>
        thread.id === threadId && thread.auraAt === undefined
          ? { ...thread, auraAt: Date.now() }
          : thread,
      );
      set({ threads });
      saveThreads(forStorageThreads(threads));
    },

    wipe: async () => {
      await clearAll();
      const thread = emptyThread();
      set({
        days: {},
        chat: [],
        threads: [thread],
        activeThreadId: thread.id,
        routines: [],
        session: null,
        rest: null,
        stopwatch: null,
      });
      saveThreads([thread]);
      saveActiveThread(thread.id);
    },
  };
});

