import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { color, layout, radius, space } from '../theme';
import { curve, duration as motionDuration, spring, useReduceMotion } from '../lib/motion';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bottom sheet that arrives on a heavy spring and leaves on a swipe: drag
 * anywhere on the panel, past a third of its height or with a flick, and it
 * dismisses — the panel and scrim track the finger the whole way. Hand-rolled
 * on Reanimated + GestureHandler (the app needs exactly one sheet, so the
 * gorhom dependency would be all wheel and no cart).
 */
export function BottomSheet({ visible, onClose, children, style }: Props) {
  const reduce = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const [height, setHeight] = useState(0);
  const grabbed = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reduce ? 1 : withSpring(1, spring.sheet);
      return;
    }
    progress.value = reduce
      ? 0
      : withTiming(0, { duration: motionDuration.exit, easing: curve.exit });
    if (reduce) {
      setMounted(false);
      return;
    }
    const timer = setTimeout(() => setMounted(false), motionDuration.exit + 40);
    return () => clearTimeout(timer);
  }, [visible, reduce, progress]);

  const close = () => onClose();

  const pan = Gesture.Pan()
    .activeOffsetY(14)
    .failOffsetX([-16, 16])
    .onStart(() => {
      grabbed.value = progress.value;
    })
    .onUpdate(event => {
      progress.value = Math.min(
        1,
        Math.max(0, grabbed.value + event.translationY / Math.max(1, height)),
      );
    })
    .onEnd(event => {
      const dismiss = event.velocityY > 700 || progress.value < 0.6;
      if (dismiss) {
        runOnJS(close)();
        progress.value = reduce
          ? 0
          : withTiming(0, { duration: motionDuration.exit, easing: curve.exit });
        return;
      }
      progress.value = reduce ? 1 : withSpring(1, spring.sheet);
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheet = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [Math.max(height, 10), 0]) },
    ],
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible statusBarTranslucent onRequestClose={onClose}>
      {/* RNGH reconciles in a separate window inside an RN Modal on Android,
          so the root view has to live inside the Modal, not around the app. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, scrim]}>
            <Pressable style={{ flex: 1, backgroundColor: color.scrim }} onPress={onClose} />
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View
              onLayout={event => setHeight(event.nativeEvent.layout.height)}
              style={[
                sheet,
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            >
              <View
                style={[
                  {
                    backgroundColor: color.ink1,
                    borderTopLeftRadius: radius.card,
                    borderTopRightRadius: radius.card,
                    borderTopWidth: 1,
                    borderColor: color.line,
                    padding: layout.cardPad,
                    paddingBottom: space.xl,
                  },
                  style,
                ]}
              >
                <View
                  style={{
                    alignSelf: 'center',
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: color.line,
                    marginBottom: space.xs,
                  }}
                />
                {children}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
