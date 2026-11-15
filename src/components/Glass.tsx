import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { color, radius } from '../theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: 'low' | 'mid' | 'high';
  sheen?: boolean;
  rim?: boolean;
  highlight?: boolean;
};

const FILL = {
  low: 0.55,
  mid: 0.8,
  high: 1,
} as const;

const RIM_WIDTH = {
  low: 1,
  mid: 1.25,
  high: 1.6,
} as const;

/**
 * The liquid-glass pane: a translucent body, a light falloff from the top
 * corner, a specular streak, and a bright rim that reads as a lit edge.
 *
 * Gradient stops must use a solid `stopColor` plus numeric `stopOpacity`.
 * Passing an `rgba()` string to `stopColor` renders opaque on Android, which
 * turns every pane into a white slab.
 */
export function Glass({
  children,
  style,
  radius: cornerRadius = radius.card,
  intensity = 'mid',
  sheen = true,
  rim = true,
  highlight = true,
}: Props) {
  const scale = FILL[intensity];
  const uid = useId().replace(/:/g, '');
  const bodyId = `body-${uid}`;
  const sheenId = `sheen-${uid}`;

  return (
    <View style={[{ borderRadius: cornerRadius, backgroundColor: color.glass }, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius, overflow: 'hidden' }]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={bodyId} x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={color.glassLift * scale} />
              <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={color.glassLift * scale * 0.4} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={color.glassSink * scale} />
            </LinearGradient>

            <LinearGradient id={sheenId} x1="0" y1="0" x2="0.42" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={color.glassGlint * scale} />
              <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity={color.glassGlint * scale * 0.18} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${bodyId})`} />
        </Svg>

        {sheen ? (
          <Svg width="100%" height="100%">
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${sheenId})`} />
          </Svg>
        ) : null}
      </View>

      {children}

      {rim ? (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: cornerRadius,
            borderWidth: RIM_WIDTH[intensity],
            borderColor: color.glassRimSoft,
          }}
        />
      ) : null}

      {highlight ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: RIM_WIDTH[intensity] + 0.5,
              left: cornerRadius * 0.5,
              right: cornerRadius * 0.5,
              height: 1,
              backgroundColor: color.glassRim,
              opacity: 0.55,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: RIM_WIDTH[intensity] + 0.5,
              top: cornerRadius * 0.5,
              bottom: cornerRadius * 0.62,
              width: 1,
              backgroundColor: color.glassRim,
              opacity: 0.32,
            }}
          />
        </>
      ) : null}
    </View>
  );
}
