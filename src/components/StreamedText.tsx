import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { type } from '../theme';
import { useEntrance, useReduceMotion } from '../lib/motion';
import { SkeletonLines } from './Skeleton';

type Props = {
  text: string;
  streaming?: boolean;
};

const WORDS_PER_BEAT = 3;
/** Cadence floor so short replies do not rush. */
const BEAT_MS = 30;
/** Long replies scale their beat so the wave never outstays its welcome. */
const MAX_REVEAL_MS = 1600;

/**
 * Losslessly cut text into groups of words plus whatever whitespace followed
 * them, so rejoining the chunks reproduces the original string exactly —
 * newlines and double spaces included.
 */
function chunkText(text: string): string[] {
  const tokens = text.split(/(\s+)/);
  const chunks: string[] = [];
  let current = '';
  let words = 0;
  for (const token of tokens) {
    if (token.length === 0) {
      continue;
    }
    current += token;
    if (!/^\s+$/.test(token)) {
      words += 1;
      if (words >= WORDS_PER_BEAT) {
        chunks.push(current);
        current = '';
        words = 0;
      }
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

/** One wave-front chunk: fades up softly as it arrives. */
function FlowChunk({ text }: { text: string }) {
  const lit = useSharedValue(0);

  useEffect(() => {
    lit.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
  }, [lit]);

  const style = useAnimatedStyle(() => ({
    opacity: lit.value,
  }));

  return <Animated.Text style={[type.body, style]}>{text}</Animated.Text>;
}

function Revealed({ text, animate }: { text: string; animate: boolean }) {
  const reduce = useReduceMotion();
  const chunks = useMemo(() => chunkText(text), [text]);
  const playWave = animate && !reduce;
  const [visible, setVisible] = useState(playWave ? 0 : chunks.length);

  useEffect(() => {
    if (!playWave) {
      setVisible(chunks.length);
      return;
    }
    setVisible(0);
    const beat = Math.min(90, Math.max(BEAT_MS, MAX_REVEAL_MS / Math.max(1, chunks.length)));
    const timer = setInterval(() => {
      setVisible(current => {
        if (current >= chunks.length) {
          clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, beat);
    return () => clearInterval(timer);
  }, [chunks, playWave]);

  if (!playWave) {
    return <Faded text={text} />;
  }

  if (visible >= chunks.length) {
    return (
      <Text style={type.body} selectable>
        {text}
      </Text>
    );
  }

  return (
    <Text style={type.body}>
      {chunks.slice(0, visible).map((chunk, index) => (
        <FlowChunk key={`${index}-${chunk.length}`} text={chunk} />
      ))}
    </Text>
  );
}

/** Text that was already there — scrolling back, rehydration — fades in whole. */
function Faded({ text }: { text: string }) {
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

  // A reply that streamed in gets the flowing wave; text that was already
  // there (scrolling back, rehydration) just fades in as one piece.
  return <Revealed text={text} animate={Boolean(streaming)} />;
}
