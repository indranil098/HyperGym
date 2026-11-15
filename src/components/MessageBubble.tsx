import { Animated, Image, Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';
import { useEntrance } from '../lib/motion';
import type { ChatMessage, Unit } from '../types';
import { Chip } from './Chip';
import { ActionCard } from './ActionCard';
import { DraftCard } from './DraftCard';
import { StreamedText } from './StreamedText';

type Props = {
  message: ChatMessage;
  unit: Unit;
  onAnswer: (answer: string) => void;
};

export function MessageBubble({ message, unit, onAnswer }: Props) {
  const entrance = useEntrance();

  if (message.role === 'user') {
    return (
      <Animated.View style={[entrance.style, { alignItems: 'flex-end', marginTop: space.md }]}>
        {message.images.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              gap: space.xs,
              marginBottom: message.text ? space.xs : 0,
            }}
          >
            {message.images.map((uri, index) => (
              <Image
                key={`${message.id}-${index}`}
                source={{ uri }}
                resizeMode="cover"
                style={{
                  width: 138,
                  height: 138,
                  borderRadius: radius.row,
                  backgroundColor: color.ink2,
                }}
                accessibilityLabel="Photo you sent"
              />
            ))}
          </View>
        ) : null}
        {message.text ? (
          <View
            style={{
              backgroundColor: color.ink2,
              borderRadius: radius.card,
              borderTopRightRadius: space.xs,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              maxWidth: '88%',
            }}
          >
            <Text style={type.body} selectable>
              {message.text}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    );
  }

  if (message.kind === 'draft') {
    return (
      <Animated.View style={entrance.style}>
        <DraftCard message={message} unit={unit} />
      </Animated.View>
    );
  }

  if (message.kind === 'action') {
    return (
      <Animated.View style={entrance.style}>
        <ActionCard message={message} />
      </Animated.View>
    );
  }

  if (message.kind === 'question') {
    return (
      <Animated.View style={[entrance.style, { marginTop: space.lg }]}>
        <Text style={[type.bodyStrong, { fontSize: 18 }]}>{message.question}</Text>
        {message.options.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.sm }}>
            {message.options.map(option => (
              <Chip key={option} label={option} onPress={() => onAnswer(option)} />
            ))}
          </View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <View style={{ marginTop: space.lg }}>
      <StreamedText text={message.text} streaming={message.streaming} />
    </View>
  );
}
