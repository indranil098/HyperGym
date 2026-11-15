import { create } from 'zustand';
import type {
  ChatMessage,
  LoggedExercise,
  Receipt,
  Routine,
  Settings,
  Thread,
  WorkoutDay,
} from '../types';
import { KEYS, clearAll, createSaver, loadJSON } from '../lib/storage';
import { dayKey } from '../lib/date';
import { entryVolume, exerciseKey, meaningfulSets } from '../lib/stats';
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
};

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

    hydrate: async () => {
      const [days, chat, storedThreads, storedActive, routines, settings] = await Promise.all([
        loadJSON<Record<string, WorkoutDay>>(KEYS.days, {}),
        loadJSON<ChatMessage[]>(KEYS.chat, []),
        loadJSON<Thread[]>(KEYS.threads, []),
        loadJSON<string>(KEYS.activeThread, ''),
        loadJSON<Routine[]>(KEYS.routines, []),
        loadJSON<Partial<Settings>>(KEYS.settings, {}),
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
      const receipt: Receipt = {
        dayKey: date,
        entryIds: finalEntries.map(entry => entry.id),
        exerciseCount: finalEntries.length,
        setCount: finalEntries.reduce((sum, entry) => sum + entry.sets.length, 0),
        volume: finalEntries.reduce((sum, entry) => sum + entryVolume(entry), 0),
        names: finalEntries.map(entry => entry.name),
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

    wipe: async () => {
      await clearAll();
      const thread = emptyThread();
      set({ days: {}, chat: [], threads: [thread], activeThreadId: thread.id, routines: [] });
      saveThreads([thread]);
      saveActiveThread(thread.id);
    },
  };
});

