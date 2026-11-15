import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  days: 'hg.days.v1',
  chat: 'hg.chat.v1',
  threads: 'hg.threads.v1',
  activeThread: 'hg.activeThread.v1',
  routines: 'hg.routines.v1',
  settings: 'hg.settings.v1',
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function createSaver(key: string, wait = 400): (value: unknown) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: unknown;

  return (value: unknown) => {
    pending = value;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void saveJSON(key, pending);
    }, wait);
  };
}

export async function clearAll(): Promise<void> {
  await Promise.all(
    [KEYS.days, KEYS.chat, KEYS.threads, KEYS.activeThread, KEYS.routines].map(key =>
      AsyncStorage.removeItem(key),
    ),
  );
}
