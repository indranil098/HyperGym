import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius } from '../theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: 'low' | 'mid' | 'high';
};

/**
 * A flat black panel. It used to layer a specular sheen, a lit rim and an
 * inner highlight to read as glass; the design has gone fully matte, so this
 * is now just a rounded surface with the app's near-black tint. The `intensity`
 * prop is kept so existing call sites do not need to change.
 */
export function Glass({ children, style, radius: cornerRadius = radius.card }: Props) {
  return <View style={[{ borderRadius: cornerRadius, backgroundColor: color.glass }, style]}>{children}</View>;
}
