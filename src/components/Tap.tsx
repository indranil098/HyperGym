import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import {
  createAnimatedComponent,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { hit } from '../theme';
import { spring, useReduceMotion } from '../lib/motion';

const AnimatedPressable = createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  minSize?: number;
};

/**
 * The app-wide press primitive: every touchable scales to 0.97 and dims on
 * press, springing back on release. Reduce motion snaps instead of springing.
 */
export function Tap({ children, style, minSize = hit.min, disabled, ...rest }: Props) {
  const reduce = useReduceMotion();
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(pressed.value, [0, 1], [1, 0.72]),
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
  }));

  const engage = (down: boolean) => {
    if (reduce) {
      pressed.value = down ? 1 : 0;
      return;
    }
    pressed.value = withSpring(down ? 1 : 0, spring.press);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={8}
      {...rest}
      onPressIn={event => {
        engage(true);
        rest.onPressIn?.(event);
      }}
      onPressOut={event => {
        engage(false);
        rest.onPressOut?.(event);
      }}
      style={[
        {
          minWidth: minSize,
          minHeight: minSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
        animated,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
