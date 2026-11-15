import { Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';
import { tap } from '../lib/feedback';
import { Tap } from './Tap';

type Props = {
  label: string;
  onPress?: () => void;
  accent?: boolean;
};

export function Chip({ label, onPress, accent = false }: Props) {
  const body = (
    <Text
      style={[
        type.compact,
        {
          color: accent ? color.voltInk : color.paper,
          fontFamily: type.label.fontFamily,
          fontSize: 15,
        },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  if (!onPress) {
    return (
      <View
        style={{
          minHeight: 44,
          justifyContent: 'center',
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          backgroundColor: accent ? color.volt : color.ink2,
          borderWidth: 1,
          borderColor: accent ? color.volt : color.line,
        }}
      >
        {body}
      </View>
    );
  }

  return (
    <Tap
      onPress={() => {
        tap();
        onPress();
      }}
      minSize={44}
      accessibilityLabel={label}
      style={{
        minWidth: 56,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: accent ? color.volt : color.ink2,
        borderWidth: 1,
        borderColor: accent ? color.volt : color.line,
      }}
    >
      {body}
    </Tap>
  );
}
