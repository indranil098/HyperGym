import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';
import { color, iconSize, iconStroke } from '../theme';

type Tone = 'paper' | 'dim' | 'faint' | 'volt' | 'ink' | 'line';

const TONE: Record<Tone, string> = {
  get paper() {
    return color.paper;
  },
  get dim() {
    return color.paperDim;
  },
  get faint() {
    return color.paperFaint;
  },
  get volt() {
    return color.volt;
  },
  get ink() {
    return color.voltInk;
  },
  get line() {
    return color.line;
  },
};

type Props = {
  icon: ComponentType<LucideProps>;
  size?: number;
  tone?: Tone;
  label?: string;
  stroke?: number;
};

export function Icon({ icon: Glyph, size = iconSize.inline, tone = 'paper', label, stroke = iconStroke }: Props) {
  return (
    <Glyph
      size={size}
      color={TONE[tone]}
      strokeWidth={stroke}
      accessible={Boolean(label)}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no'}
    />
  );
}
