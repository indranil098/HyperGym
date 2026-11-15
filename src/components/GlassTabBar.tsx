import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { color, layout, radius, space, type } from '../theme';
import { tap } from '../lib/feedback';
import { useReduceMotion } from '../lib/motion';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { ChatIcon, DumbbellIcon, ListIcon, SettingsIcon } from './icons';

const GLYPHS = {
  Chat: ChatIcon,
  Log: DumbbellIcon,
  Routines: ListIcon,
  Settings: SettingsIcon,
} as const;

const LABELS = {
  Chat: 'Chat',
  Log: 'Log',
  Routines: 'Routines',
  Settings: 'Settings',
} as const;

const BAR_HEIGHT = layout.tabBarPill;
const ICON_SIZE = 23;
const LENS_INSET = 5;

/**
 * Floating glass tab bar. The whole bar is one pane of liquid glass hovering
 * over the screen; inside it a tinted lens slides between cells so the active
 * tab reads as a filled meniscus rather than a rectangle riding on top.
 */
export function GlassTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const reduce = useReduceMotion();
  const slide = useRef(new Animated.Value(state.index)).current;
  const [track, setTrack] = useState(0);
  const count = state.routes.length;
  const cell = count > 0 ? track / count : 0;
  const lensWidth = Math.max(0, cell - LENS_INSET * 2);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: state.index,
      duration: reduce ? 0 : 340,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [state.index, slide, reduce]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: layout.gutter,
        paddingTop: space.xs,
        paddingBottom: Math.max(insets.bottom, space.xs) + layout.tabBarFloat,
        backgroundColor: 'transparent',
      }}
    >
      <Glass
        radius={BAR_HEIGHT / 2}
        intensity="high"
        style={{
          height: BAR_HEIGHT,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
          elevation: 16,
        }}
      >
        <View
          style={{ flex: 1, flexDirection: 'row' }}
          onLayout={event => setTrack(event.nativeEvent.layout.width)}
        >
          {lensWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: LENS_INSET,
                bottom: LENS_INSET,
                left: LENS_INSET,
                width: lensWidth,
                borderRadius: radius.pill,
                backgroundColor: color.paper,
                opacity: 0.1,
                borderWidth: 1,
                borderColor: color.glassRim,
                transform: [
                  {
                    translateX: slide.interpolate({
                      inputRange: [0, Math.max(1, count - 1)],
                      outputRange: [0, cell * Math.max(1, count - 1)],
                    }),
                  },
                ],
              }}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const glyph = GLYPHS[route.name as keyof typeof GLYPHS] ?? ChatIcon;
            const label = LABELS[route.name as keyof typeof LABELS] ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                tap();
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
              >
                <Icon
                  icon={glyph}
                  size={ICON_SIZE}
                  tone={focused ? 'volt' : 'faint'}
                  stroke={focused ? 2.1 : 1.75}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    type.micro,
                    {
                      fontSize: 10,
                      lineHeight: 12,
                      color: focused ? color.volt : color.paperFaint,
                      fontFamily: type.label.fontFamily,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}
