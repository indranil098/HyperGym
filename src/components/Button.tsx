import type { ComponentType } from 'react';
import { Text } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { color, radius, space, type } from '../theme';
import { tap } from '../lib/feedback';
import { Icon } from './Icon';
import { Tap } from './Tap';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ComponentType<LucideProps>;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, icon, disabled }: Props) {
  return (
    <Tap
      onPress={() => {
        if (!disabled) {
          tap();
          onPress();
        }
      }}
      disabled={disabled}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: 56,
        flexDirection: 'row',
        gap: space.xs,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: disabled ? color.ink3 : color.volt,
      }}
    >
      {icon ? <Icon icon={icon} size={24} tone="ink" /> : null}
      <Text style={[type.bodyStrong, { color: disabled ? color.paperFaint : color.voltInk }]}>{label}</Text>
    </Tap>
  );
}

export function GhostButton({ label, onPress, icon, disabled }: Props) {
  return (
    <Tap
      onPress={() => {
        if (!disabled) {
          tap();
          onPress();
        }
      }}
      disabled={disabled}
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: 56,
        flexDirection: 'row',
        gap: space.xs,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: color.line,
      }}
    >
      {icon ? <Icon icon={icon} size={22} tone="dim" /> : null}
      <Text style={[type.bodyStrong, { color: disabled ? color.paperFaint : color.paper }]}>{label}</Text>
    </Tap>
  );
}

const TEXT_TONE = {
  get paper() {
    return color.paper;
  },
  get dim() {
    return color.paperDim;
  },
  get volt() {
    return color.volt;
  },
};

export function TextButton({
  label,
  onPress,
  tone = 'paper',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'paper' | 'dim' | 'volt';
  disabled?: boolean;
}) {
  return (
    <Tap
      onPress={() => {
        if (!disabled) {
          tap();
          onPress();
        }
      }}
      disabled={disabled}
      accessibilityLabel={label}
      style={{ height: 48, paddingHorizontal: space.xs, flexDirection: 'row', gap: space.xxs }}
    >
      <Text style={[type.label, { color: disabled ? color.paperFaint : TEXT_TONE[tone], fontSize: 15 }]}>
        {label}
      </Text>
    </Tap>
  );
}
