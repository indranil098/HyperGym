import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { layout, space, type } from '../theme';

type Props = {
  title: string;
  meta?: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, meta, action }: Props) {
  return (
    <View
      style={{
        paddingHorizontal: layout.gutter,
        paddingTop: space.md,
        paddingBottom: space.sm,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: space.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={type.display} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {title}
        </Text>
        {meta ? <Text style={[type.compact, { marginTop: 2 }]}>{meta}</Text> : null}
      </View>
      {action}
    </View>
  );
}
