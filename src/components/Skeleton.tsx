import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '../theme';
import { usePulse } from '../lib/motion';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 14, radius = 7, style }: Props) {
  const pulse = usePulse(true);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: color.ink3,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.95] }),
        },
        style,
      ]}
    />
  );
}

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths: (`${number}%`)[] = ['100%', '84%', '56%'];

  return (
    <>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={widths[index % widths.length]}
          height={14}
          style={{ marginBottom: index === lines - 1 ? 0 : 8 }}
        />
      ))}
    </>
  );
}
