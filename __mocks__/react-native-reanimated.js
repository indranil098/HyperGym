/**
 * Jest mock for react-native-reanimated 4.x.
 *
 * The package's own `mock.js` imports the real index, which initialises the
 * react-native-worklets native module and crashes under jest. The suite is
 * logic-only, so this mock just needs to keep animated components rendering
 * as plain components and the animation builders as pass-throughs.
 */
const RN = require('react-native');

const Animated = {
  View: RN.View,
  Text: RN.Text,
  ScrollView: RN.ScrollView,
  FlatList: RN.FlatList,
  Image: RN.Image,
  Pressable: RN.Pressable,
  createAnimatedComponent: Component => Component,
};

const interpolate = (value, input, output) => {
  if (value <= input[0]) {
    return output[0];
  }
  if (value >= input[input.length - 1]) {
    return output[output.length - 1];
  }
  for (let index = 1; index < input.length; index += 1) {
    if (value <= input[index]) {
      const t = (value - input[index - 1]) / (input[index] - input[index - 1]);
      return output[index - 1] + t * (output[index] - output[index - 1]);
    }
  }
  return output[output.length - 1];
};

const useSharedValue = initial => {
  const ref = { value: initial };
  return ref;
};

const useDerivedValue = fn => ({
  get value() {
    return fn();
  },
});

const useAnimatedStyle = fn => fn();
const useAnimatedProps = fn => fn();

module.exports = {
  __esModule: true,
  default: Animated,
  Easing: RN.Easing,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  cancelAnimation: () => {},
  createAnimatedComponent: Animated.createAnimatedComponent,
  interpolate,
  interpolateColor: (value, input, output) => interpolate(value, input, output),
  runOnJS: fn => fn,
  runOnUI: fn => fn,
  useAnimatedGestureHandler: () => ({}),
  useAnimatedKeyboard: () => ({ height: { value: 0 }, state: { value: 0 } }),
  useAnimatedProps,
  useAnimatedScrollHandler: () => ({}),
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion: () => false,
  useSharedValue,
  withDelay: (_delay, animation) => animation,
  withDecay: config => config.velocity ?? 0,
  withRepeat: animation => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withSpring: toValue => toValue,
  withTiming: toValue => toValue,
};
