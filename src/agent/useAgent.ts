import { useCallback, useEffect, useRef, useState } from 'react';
import {
  OpenRouterError,
  friendlyError,
  streamChat,
  type ContentPart,
  type StreamResult,
  type WireMessage,
} from '../ai/client';
import { fallbackChain, modelShort } from '../ai/models';
import { SYSTEM_PROMPT } from '../ai/prompt';
import { TOOLS } from '../ai/tools';
import { streak } from '../lib/insights';
import { uid } from '../lib/id';
import { keyPool, useAppStore } from '../store/useAppStore';
import type { AttachedImage, ChatMessage, Draft, WorkoutDay } from '../types';
import {
  clarificationFromToolCall,
  draftFromText,
  draftFromToolCall,
  looksLikePayload,
  type Clarification,
} from './parseDraft';
import { resolveDeleteRequest } from './actions';
import {
  lastPerformance,
  summarizeEntry,
  trackedExercises,
  weeklySetsByGroup,
} from '../lib/stats';
import { dayKey, dayLabel } from '../lib/date';

function setSummary(set: { reps?: number; weightKg?: number; durationSec?: number; inclinePct?: number }): string {
  const parts: string[] = [];
  if (set.weightKg) {
    parts.push(`${set.weightKg}kg`);
  }
  if (set.reps) {
    parts.push(`${set.reps} reps`);
  }
  if (set.durationSec) {
    parts.push(`${Math.round(set.durationSec / 60)} min`);
  }
  if (set.inclinePct) {
    parts.push(`${set.inclinePct}% incline`);
  }
  return parts.join(' x ');
}

function describeDraft(draft: Draft): string {
  return draft.exercises
    .map(exercise => {
      const sets = exercise.sets
        .map(setSummary)
        .filter(Boolean)
        .join(', ');
      return `${exercise.name}${sets ? `: ${sets}` : ': numbers unknown'}`;
    })
    .join('; ');
}

/**
 * Everything the coach needs to be useful, built from analytics that already
 * existed but were never surfaced. Injected as text rather than a tool call:
 * the free models in the fallback chain are unreliable at multi-turn tool
 * loops, and injection needs no protocol change.
 */
function coachContext(days: Record<string, WorkoutDay>): string {
  const sections: string[] = [];
  sections.push(`Today is ${dayKey()}. Streak: ${streak(days)} day(s) with a session.`);

  const weekly = weeklySetsByGroup(Object.values(days));
  if (weekly.length > 0) {
    sections.push(
      `Hard sets per muscle group, last 7 days: ${weekly
        .map(item => `${item.group} ${item.sets}`)
        .join(', ')}.`,
    );
  }

  const tracked = trackedExercises(Object.values(days)).slice(0, 14);
  if (tracked.length > 0) {
    const lines = tracked.map(item => {
      const last = lastPerformance(Object.values(days), item.key);
      const lastBit = last ? `last ${summarizeEntry(last.entry, 'kg').detail || 'no numbers'}` : 'never';
      return `- ${item.name}: best est. 1RM ${Math.round(item.record)} kg, ${lastBit}`;
    });
    sections.push(`Exercises on record:\n${lines.join('\n')}`);
  }

  const keys = Object.keys(days)
    .sort()
    .slice(-3);
  if (keys.length > 0) {
    const lines = keys.map(key => {
      const day = days[key];
      const items = day.entries.map(entry => {
        const sets = entry.sets
          .map(setSummary)
          .filter(Boolean)
          .join(' ');
        return `${entry.name}${sets ? ` ${sets}` : ''}`;
      });
      return `${key} (${dayLabel(key)}): ${items.join('; ')}`;
    });
    sections.push(`Last sessions:\n${lines.join('\n')}`);
  }

  if (sections.length === 0) {
    return 'COACH CONTEXT: the log is empty. Nothing has been recorded yet.';
  }
  return `COACH CONTEXT\n${sections.join('\n\n')}`;
}

function toWire(chat: ChatMessage[], days: Record<string, WorkoutDay>): WireMessage[] {
  const recent = chat.slice(-40);
  const imageSlots = new Set(
    recent
      .map((message, index) => (message.role === 'user' ? index : -1))
      .filter(index => index >= 0)
      .slice(-3),
  );

  const wire: WireMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  const context = coachContext(days);
  if (context) {
    wire.push({ role: 'system', content: context });
  }

  recent.forEach((message, index) => {
    if (message.role === 'user') {
      const text = message.text.trim();
      if (message.images.length > 0 && imageSlots.has(index)) {
        const parts: ContentPart[] = [];
        if (text) {
          parts.push({ type: 'text', text });
        }
        for (const uri of message.images) {
          parts.push({ type: 'image_url', image_url: { url: uri } });
        }
        wire.push({ role: 'user', content: parts });
        return;
      }
      wire.push({ role: 'user', content: text || '[photo sent]' });
      return;
    }

    if (message.kind === 'text') {
      const text = message.text.trim();
      if (text) {
        wire.push({ role: 'assistant', content: text });
      }
      return;
    }

    if (message.kind === 'draft') {
      const status =
        message.status === 'logged'
          ? 'member confirmed it, already logged'
          : message.status === 'discarded'
            ? 'member discarded it'
            : 'waiting for member to confirm';
      wire.push({
        role: 'assistant',
        content: `[Draft card shown: ${describeDraft(message.draft)}. ${status}]`,
      });
      return;
    }

    if (message.kind === 'action') {
      wire.push({
        role: 'assistant',
        content: `[Delete card shown: ${message.action.names.join(', ')} on ${message.action.date}. Status: ${message.status}]`,
      });
      return;
    }

    wire.push({
      role: 'assistant',
      content: `[Question asked: ${message.question}${
        message.options.length > 0 ? ` Options: ${message.options.join(' / ')}` : ''
      }]`,
    });
  });

  return wire;
}

export type AuraPhase = 'off' | 'idle' | 'sending' | 'thinking' | 'settling';

export type AgentState = {
  busy: boolean;
  status: string;
  error: string | null;
  activeModel: string;
  /** Drives the animated intro gradient on the Chat page. */
  auraPhase: AuraPhase;
  send: (text: string, images?: AttachedImage[]) => Promise<void>;
  cancel: () => void;
  clearError: () => void;
};

export function useAgent(): AgentState {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState('');
  const [auraPhase, setAuraPhase] = useState<AuraPhase>('off');
  const auraRef = useRef(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);

  /** Retire the aura: fade out, then stop rendering it for this chat. */
  const settleAura = useCallback(() => {
    if (!auraRef.current) {
      return;
    }
    auraRef.current = false;
    setAuraPhase('settling');
    setTimeout(() => setAuraPhase('off'), 1900);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    cancelRef.current?.();
    cancelRef.current = null;
    setBusy(false);
    setStatus('');
    settleAura();
  }, [settleAura]);

  useEffect(() => () => cancelRef.current?.(), []);

  const send = useCallback(
    async (text: string, images: AttachedImage[] = []) => {
      const trimmed = text.trim();
      if (!trimmed && images.length === 0) {
        return;
      }

      const settings = useAppStore.getState().settings;
      if (keyPool(settings).length === 0) {
        setError('Add your OpenRouter key in Settings first.');
        return;
      }

      setError(null);
      cancelledRef.current = false;
      setBusy(true);

      const store = useAppStore.getState();
      const activeThread = store.threads.find(thread => thread.id === store.activeThreadId);
      // The aura belongs to a chat's opening exchange, and only plays once.
      const auraEligible = !activeThread?.auraAt && (activeThread?.messages.length ?? 0) === 0;
      if (auraEligible) {
        auraRef.current = true;
        setAuraPhase('sending');
      }

      store.addMessage({
        id: uid('u'),
        role: 'user',
        text: trimmed,
        images: images.map(image => `data:${image.mime};base64,${image.base64}`),
        at: Date.now(),
      });

      const assistantId = uid('a');
      useAppStore.getState().addMessage({
        id: assistantId,
        role: 'assistant',
        kind: 'text',
        text: '',
        streaming: true,
        at: Date.now(),
      });

      if (auraEligible) {
        setAuraPhase('thinking');
      }

      const snapshot = useAppStore.getState();
      const wire = toWire(snapshot.chat, snapshot.days);
      const chain = settings.autoFallback ? fallbackChain(settings.model) : [settings.model];

    let retriedNumberless = false;

    const apply = (result: StreamResult): boolean => {
      const current = useAppStore.getState();
      const finalText = result.text.trim();

      const settleText = () => {
        if (finalText && !looksLikePayload(finalText)) {
          current.patchMessage(assistantId, message =>
            message.role === 'assistant' && message.kind === 'text'
              ? { ...message, text: finalText, streaming: false }
              : message,
          );
        } else {
          current.removeMessage(assistantId);
        }
      };

      const draftCall = result.toolCalls.find(call => call.name === 'propose_workout');
      if (draftCall) {
        const draft = draftFromToolCall(draftCall.arguments);
        if (draft) {
          const hasAnyNumber = draft.exercises.some(exercise =>
            exercise.sets.some(
              set =>
                set.weightKg !== undefined ||
                set.reps !== undefined ||
                set.durationSec !== undefined ||
                set.distanceM !== undefined ||
                set.inclinePct !== undefined ||
                set.speedKph !== undefined,
            ),
          );
          const memberStatedNumbers = /\d/.test(trimmed);

          if (memberStatedNumbers && !hasAnyNumber && !retriedNumberless) {
            retriedNumberless = true;
            return false;
          }

          settleText();
          current.addMessage({
            id: uid('d'),
            role: 'assistant',
            kind: 'draft',
            draftId: uid('k'),
            draft,
            status: 'pending',
            at: Date.now(),
          });
          return true;
        }
      }

      const askCall = result.toolCalls.find(call => call.name === 'ask_clarification');
      if (askCall) {
        const question = clarificationFromToolCall(askCall.arguments);
        if (question) {
          settleText();
          current.addMessage({
            id: uid('q'),
            role: 'assistant',
            kind: 'question',
            question: question.question,
            options: question.options,
            at: Date.now(),
          });
          return true;
        }
      }

      const deleteCall = result.toolCalls.find(call => call.name === 'delete_log');
      if (deleteCall) {
        const request = resolveDeleteRequest(deleteCall.arguments, current.days);
        settleText();
        if (request) {
          current.addMessage({
            id: uid('x'),
            role: 'assistant',
            kind: 'action',
            action: request,
            status: 'pending',
            at: Date.now(),
          });
        } else {
          current.addMessage({
            id: uid('a'),
            role: 'assistant',
            kind: 'text',
            text: 'I cannot find that in your log. Tell me the exercise name, or which day.',
            at: Date.now(),
          });
        }
        return true;
      }

      if (finalText) {
        const rescued = draftFromText(finalText);
        if (rescued) {
          current.removeMessage(assistantId);
          current.addMessage({
            id: uid('d'),
            role: 'assistant',
            kind: 'draft',
            draftId: uid('k'),
            draft: rescued,
            status: 'pending',
            at: Date.now(),
          });
          return true;
        }
        if (looksLikePayload(finalText)) {
          return false;
        }
        current.patchMessage(assistantId, message =>
          message.role === 'assistant' && message.kind === 'text'
            ? { ...message, text: finalText, streaming: false }
            : message,
        );
        return true;
      }

      return false;
    };

    let lastError: unknown = null;

    // Round-robin across every key on file, then across the model fallback
    // chain. A key that is out of credits or rejected moves the cursor forward
    // permanently, so the pool self-heals instead of retrying a dead key.
    const pool = keyPool(settings);
    const cursor = settings.keyIndex ?? 0;
    const startIndex = pool.length > 0 ? cursor % pool.length : 0;

    for (let keyOffset = 0; keyOffset < pool.length; keyOffset += 1) {
      const apiKey = pool[(startIndex + keyOffset) % pool.length];

      for (let index = 0; index < chain.length; index += 1) {
        const model = chain[index];
        setActiveModel(model);
        setStatus(
          index === 0
            ? `Asking ${modelShort(model)}`
            : `${modelShort(chain[0])} struggled, trying ${modelShort(model)}`,
        );

        let lastFlush = 0;

        try {
          const handle = streamChat({
            apiKey,
            model,
            messages: wire,
            tools: TOOLS,
            onText: (_delta, full) => {
              const now = Date.now();
              if (now - lastFlush < 55) {
                return;
              }
              lastFlush = now;
              useAppStore.getState().patchMessage(assistantId, message =>
                message.role === 'assistant' && message.kind === 'text'
                  ? { ...message, text: full }
                  : message,
              );
            },
          });
          cancelRef.current = handle.cancel;
          const result = await handle.promise;
          cancelRef.current = null;

          if (cancelledRef.current) {
            useAppStore.getState().removeMessage(assistantId);
            break;
          }

          if (apply(result)) {
            setStatus('');
            setBusy(false);
            // Spread the next request across the pool.
            if (pool.length > 1) {
              const next = (startIndex + 1) % pool.length;
              if (next !== cursor) {
                useAppStore.getState().updateSettings({ keyIndex: next });
              }
            }
            if (auraRef.current) {
              const threadId = useAppStore.getState().activeThreadId;
              useAppStore.getState().markAuraDone(threadId);
            }
            settleAura();
            return;
          }

          lastError = new OpenRouterError('Usable reply not found.', 0);
          continue;
        } catch (caught) {
          cancelRef.current = null;
          if (cancelledRef.current) {
            useAppStore.getState().removeMessage(assistantId);
            break;
          }
          lastError = caught;
          if (caught instanceof OpenRouterError && caught.retryable) {
            continue;
          }
          break;
        }
      }

      if (cancelledRef.current) {
        break;
      }
    }

    // A key that ran dry or was rejected is skipped next time.
    if (pool.length > 1) {
      const next = (startIndex + 1) % pool.length;
      if (next !== cursor) {
        useAppStore.getState().updateSettings({ keyIndex: next });
      }
    }

    setBusy(false);
    setStatus('');

    if (cancelledRef.current) {
      settleAura();
      return;
    }

    useAppStore.getState().removeMessage(assistantId);

    const wasEmpty = lastError instanceof OpenRouterError && lastError.status === 0;
    setError(
      wasEmpty
        ? 'No model could read that. Try naming an exercise, or send a photo of the machine.'
        : friendlyError(lastError),
    );
    settleAura();
  }, [settleAura]);

  const clearError = useCallback(() => setError(null), []);

  return { busy, status, error, activeModel, auraPhase, send, cancel, clearError };
}

export type { Clarification };
