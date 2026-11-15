jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

import { useAppStore } from '../src/store/useAppStore';
import type { ChatMessage } from '../src/types';

const userMessage = (id: string, text: string): ChatMessage => ({
  id,
  role: 'user',
  text,
  images: [],
  at: Date.now(),
});

describe('chats', () => {
  beforeEach(() => {
    useAppStore.setState({ chat: [], threads: [], activeThreadId: '' });
  });

  it('creates an empty chat on demand', () => {
    useAppStore.getState().newChat();
    const { threads, chat, activeThreadId } = useAppStore.getState();
    expect(threads).toHaveLength(1);
    expect(chat).toHaveLength(0);
    expect(activeThreadId).toBe(threads[0].id);
  });

  it('does not stack up empty chats when a fresh one already exists', () => {
    useAppStore.getState().newChat();
    useAppStore.getState().newChat();
    expect(useAppStore.getState().threads).toHaveLength(1);
  });

  it('titles a chat from its first user message', () => {
    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u1', '4 sets bench at 80 kg'));
    const [thread] = useAppStore.getState().threads;
    expect(thread.title).toBe('4 sets bench at 80 kg');
    expect(thread.messages).toHaveLength(1);
  });

  it('keeps messages separate per chat', () => {
    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u1', 'Squats today'));
    const firstId = useAppStore.getState().activeThreadId;

    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u2', 'Rows today'));
    const secondId = useAppStore.getState().activeThreadId;
    expect(secondId).not.toBe(firstId);
    expect(useAppStore.getState().chat).toHaveLength(1);

    useAppStore.getState().openThread(firstId);
    expect(useAppStore.getState().chat.map(message => message.id)).toEqual(['u1']);

    useAppStore.getState().openThread(secondId);
    expect(useAppStore.getState().chat.map(message => message.id)).toEqual(['u2']);
  });

  it('deletes an inactive chat without touching the open one', () => {
    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u1', 'Bench'));
    const firstId = useAppStore.getState().activeThreadId;
    useAppStore.getState().newChat();

    useAppStore.getState().deleteThread(firstId);

    const state = useAppStore.getState();
    expect(state.threads.map(thread => thread.id)).not.toContain(firstId);
    expect(state.chat).toHaveLength(0);
  });

  it('replaces the open chat when it is deleted', () => {
    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u1', 'Bench'));
    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u2', 'Rows'));
    const openId = useAppStore.getState().activeThreadId;

    useAppStore.getState().deleteThread(openId);

    const state = useAppStore.getState();
    expect(state.threads).toHaveLength(1);
    expect(state.activeThreadId).not.toBe(openId);
    expect(state.chat.map(message => message.id)).toEqual(['u1']);
  });

  it('always leaves at least one empty chat behind', () => {
    useAppStore.getState().newChat();
    const onlyId = useAppStore.getState().activeThreadId;
    useAppStore.getState().deleteThread(onlyId);

    const state = useAppStore.getState();
    expect(state.threads).toHaveLength(1);
    expect(state.threads[0].id).not.toBe(onlyId);
    expect(state.chat).toHaveLength(0);
  });

  it('truncates long titles instead of storing the whole message', () => {
    useAppStore.getState().newChat();
    useAppStore.getState().addMessage(userMessage('u1', 'a'.repeat(200)));
    const title = useAppStore.getState().threads[0].title;
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title.endsWith('...')).toBe(true);
  });
});
