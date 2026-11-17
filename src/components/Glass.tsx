import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  LiquidGlassView,
  useGlassSupport,
  type GlassPresetName,
} from 'react-native-liquid-glassmorphism';
import { color, radius as themeRadius } from '../theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: 'low' | 'mid' | 'high';
  /** A tuned material from the glass library; explicit props still win. */
  preset?: GlassPresetName;
  /** React to touch with a specular highlight (ignored on matte fallback). */
  interactive?: boolean;
};

const INTENSITY = { low: 45, mid: 65, high: 80 } as const;

/**
 * The one glass choke point. On devices that can render it — iOS 26+, or
 * Android 13+ where the library runs its AGSL refraction shader, or any tier
 * with real backdrop blur — this is tinted liquid glass. Everywhere else it is
 * the app's matte panel, so low-end devices look exactly as they did before.
 */
export function Glass({
  children,
  style,
  radius: cornerRadius = themeRadius.card,
  intensity,
  preset,
  interactive,
}: Props) {
  const caps = useGlassSupport();

  if (!caps.supportsBlur) {
    return (
      <View style={[{ borderRadius: cornerRadius, backgroundColor: color.glass }, style]}>
        {children}
      </View>
    );
  }

  return (
    <LiquidGlassView
      preset={preset}
      variant="regular"
      intensity={intensity ? INTENSITY[intensity] : undefined}
      tintColor={color.glass}
      borderRadius={cornerRadius}
      interactive={interactive}
      accessibilityMode="auto"
      style={[{ backgroundColor: 'transparent' }, style]}
    >
      {children}
    </LiquidGlassView>
  );
}
