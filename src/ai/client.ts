import { SseParser } from './sse';
import type { ToolDef } from './tools';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type WireMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type StreamResult = {
  text: string;
  toolCalls: ToolCall[];
  finishReason?: string;
};

export class OpenRouterError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.retryable = status === 403 || status === 408 || status === 429 || status >= 500;
  }
}

export type StreamOptions = {
  apiKey: string;
  model: string;
  messages: WireMessage[];
  tools?: ToolDef[];
  onText?: (delta: string, full: string) => void;
  maxTokens?: number;
};

export type StreamHandle = {
  promise: Promise<StreamResult>;
  cancel: () => void;
};

export function streamChat(options: StreamOptions): StreamHandle {
  const xhr = new XMLHttpRequest();
  const parser = new SseParser();
  const toolCalls = new Map<number, ToolCall>();
  let seen = 0;
  let text = '';
  let finishReason: string | undefined;
  let cancelled = false;

  const promise = new Promise<StreamResult>((resolve, reject) => {
    xhr.open('POST', ENDPOINT, true);
    xhr.setRequestHeader('Authorization', `Bearer ${options.apiKey}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Title', 'HyperGym');
    xhr.timeout = 90000;

    const consume = () => {
      if (cancelled) {
        return;
      }
      const raw = xhr.responseText ?? '';
      if (raw.length <= seen) {
        return;
      }
      const chunk = raw.slice(seen);
      seen = raw.length;

      for (const event of parser.push(chunk)) {
        if (event.data.trim() === '[DONE]') {
          continue;
        }

        let payload: any;
        try {
          payload = JSON.parse(event.data);
        } catch {
          continue;
        }
        if (payload?.error?.message && !payload?.choices) {
          reject(new OpenRouterError(String(payload.error.message), 500));
          return;
        }

        const choice = payload?.choices?.[0];
        if (!choice) {
          continue;
        }

        const delta = choice.delta ?? {};
        if (typeof delta.content === 'string' && delta.content.length > 0) {
          text += delta.content;
          options.onText?.(delta.content, text);
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const part of delta.tool_calls) {
            const index = typeof part.index === 'number' ? part.index : 0;
            const slot = toolCalls.get(index) ?? { id: '', name: '', arguments: '' };
            if (typeof part.id === 'string' && part.id) {
              slot.id = part.id;
            }
            const fn = part.function ?? {};
            if (typeof fn.name === 'string') {
              slot.name += fn.name;
            }
            if (typeof fn.arguments === 'string') {
              slot.arguments += fn.arguments;
            }
            toolCalls.set(index, slot);
          }
        }

        if (typeof choice.finish_reason === 'string') {
          finishReason = choice.finish_reason;
        }
      }
    };

    xhr.onprogress = consume;

    xhr.onload = () => {
      if (cancelled) {
        return;
      }
      consume();
      if (xhr.status >= 400) {
        reject(new OpenRouterError(readError(xhr), xhr.status));
        return;
      }
      resolve({
        text,
        toolCalls: [...toolCalls.values()].filter(call => call.name.length > 0),
        finishReason,
      });
    };

    xhr.onerror = () => {
      if (!cancelled) {
        reject(new OpenRouterError('No connection to OpenRouter. Check the network.', 0));
      }
    };

    xhr.ontimeout = () => {
      if (!cancelled) {
        reject(new OpenRouterError('The model took too long to answer.', 408));
      }
    };

    xhr.onabort = () => reject(new OpenRouterError('Cancelled.', 0));

    xhr.send(
      JSON.stringify({
        model: options.model,
        messages: options.messages,
        tools: options.tools,
        tool_choice: options.tools && options.tools.length > 0 ? 'auto' : undefined,
        reasoning: { effort: 'low' },
        stream: true,
        temperature: 0.3,
        max_tokens: options.maxTokens ?? 2500,
      }),
    );
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      xhr.abort();
    },
  };
}

function readError(xhr: XMLHttpRequest): string {
  try {
    const parsed = JSON.parse(xhr.responseText);
    const message = parsed?.error?.message ?? parsed?.message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  } catch {
    return `Request failed with status ${xhr.status}.`;
  }
  return `Request failed with status ${xhr.status}.`;
}

export type KeyCheck = {
  ok: boolean;
  message: string;
};

export async function checkKey(rawKey: string): Promise<KeyCheck> {
  const apiKey = rawKey.trim();
  if (!apiKey) {
    return { ok: false, message: 'Paste a key first.' };
  }
  if (!apiKey.startsWith('sk-or-')) {
    return { ok: false, message: 'That does not look like an OpenRouter key.' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'HyperGym',
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: 'OpenRouter rejected this key.' };
    }
    if (response.status === 429) {
      return { ok: false, message: 'Too many checks. Wait a moment.' };
    }
    if (!response.ok) {
      return { ok: false, message: `OpenRouter returned ${response.status}.` };
    }

    const payload = await response.json().catch(() => null);
    const data = payload?.data ?? {};
    const label = typeof data.label === 'string' && data.label ? data.label : null;

    return { ok: true, message: label ? `Key works. ${label}` : 'Key works.' };
  } catch {
    return { ok: false, message: 'Could not reach OpenRouter. Check the network.' };
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof OpenRouterError) {
    if (error.status === 401) {
      return 'OpenRouter rejected the key. Tap Check in Settings.';
    }
    if (error.status === 403) {
      return 'Every model refused that request. Try another model in Settings.';
    }
    if (error.status === 402) {
      return 'This key is out of credits for free models today. Try another model in Settings.';
    }
    if (error.status === 429) {
      return 'Free model is busy. Try again in a moment.';
    }
    if (error.status === 408) {
      return 'The model took too long. Try again.';
    }
    if (error.status >= 500) {
      return 'The model is down right now. Try again.';
    }
    if (error.status === 0) {
      return 'No connection to OpenRouter. Check the network.';
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}
