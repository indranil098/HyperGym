import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { hit } from '../theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  minSize?: number;
};

export function Tap({ children, style, minSize = hit.min, disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={8}
      {...rest}
      style={({ pressed }) => [
        {
          minWidth: minSize,
          minHeight: minSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
        pressed && !disabled ? { opacity: 0.72, transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}
