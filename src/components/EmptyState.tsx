import type { ComponentType, ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { color, space, type } from '../theme';
import { useEntrance } from '../lib/motion';
import { Icon } from './Icon';

type Props = {
  icon: ComponentType<LucideProps>;
  title: string;
  body?: string;
  children?: ReactNode;
};

export function EmptyState({ icon, title, body, children }: Props) {
  const entrance = useEntrance();

  return (
    <Animated.View style={[entrance.style, { alignItems: 'center', paddingTop: space.xxl, paddingHorizontal: space.lg }]}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 26,
          backgroundColor: color.ink1,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.lg,
        }}
      >
        <Icon icon={icon} size={36} tone="volt" />
      </View>
      <Text style={[type.title, { textAlign: 'center' }]}>{title}</Text>
      {body ? (
        <Text style={[type.compact, { textAlign: 'center', marginTop: space.xs, maxWidth: 300 }]}>
          {body}
        </Text>
      ) : null}
      {children ? (
        <View style={{ marginTop: space.lg, gap: space.xs, alignItems: 'stretch', width: '100%', maxWidth: 320 }}>
          {children}
        </View>
      ) : null}
    </Animated.View>
  );
}
