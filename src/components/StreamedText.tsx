import { Animated, Text } from 'react-native';
import { type } from '../theme';
import { useEntrance } from '../lib/motion';
import { SkeletonLines } from './Skeleton';

type Props = {
  text: string;
  streaming?: boolean;
};

function Revealed({ text }: { text: string }) {
  const entrance = useEntrance();

  return (
    <Animated.View style={entrance.style}>
      <Text style={type.body} selectable>
        {text}
      </Text>
    </Animated.View>
  );
}

export function StreamedText({ text, streaming }: Props) {
  if (streaming && text.trim().length === 0) {
    return <SkeletonLines lines={3} />;
  }

  if (text.trim().length === 0) {
    return null;
  }

  return <Revealed text={text} />;
}
