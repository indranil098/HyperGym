export type ModelInfo = {
  id: string;
  label: string;
  short: string;
  vision: boolean;
  tools: boolean;
};

export const MODELS: ModelInfo[] = [
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    label: 'Nemotron 3.5 Super VL',
    short: 'Nemotron',
    vision: true,
    tools: true,
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    label: 'Nemotron 3 Nano Omni',
    short: 'Nano',
    vision: true,
    tools: true,
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    label: 'Dots 3 Note',
    short: 'Dots',
    vision: true,
    tools: true,
  },
  {
    id: 'particle-ai/particle-1:free',
    label: 'Particle 1',
    short: 'Particle',
    vision: true,
    tools: true,
  },
  {
    id: 'inclusionai/ling-3.2-flash:free',
    label: 'Ling 3.2 Flash',
    short: 'Ling',
    vision: true,
    tools: true,
  },
  {
    id: 'google/gemma-4-31b-it:free',
    label: 'Gemma 4 31B',
    short: 'Gemma',
    vision: true,
    tools: true,
  },
];

export const DEFAULT_MODEL = MODELS[0].id;

export function modelInfo(id: string): ModelInfo {
  return MODELS.find(model => model.id === id) ?? MODELS[0];
}

export function modelShort(id: string): string {
  return modelInfo(id).short;
}

export function fallbackChain(primary: string): string[] {
  const known = MODELS.map(model => model.id);
  const first = known.includes(primary) ? primary : DEFAULT_MODEL;
  return [first, ...known.filter(id => id !== first)];
}
