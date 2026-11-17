import { useEffect } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { color, radius, space, surface, type } from '../theme';
import { dayLabel, clockLabel } from '../lib/date';
import { curve, duration as motionDuration, spring, useReduceMotion } from '../lib/motion';
import { tap } from '../lib/feedback';
import type { Thread } from '../types';
import { Icon } from './Icon';
import { CloseIcon, PlusIcon, TrashIcon } from './icons';
import { Tap } from './Tap';

type Props = {
  visible: boolean;
  threads: Thread[];
  activeThreadId: string;
  onClose: () => void;
  onPick: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

const WIDTH = Math.min(340, Math.round(Dimensions.get('window').width * 0.86));

function preview(thread: Thread): string {
  const last = [...thread.messages].reverse().find(message => {
    if (message.role === 'user') {
      return message.text.trim().length > 0;
    }
    if (message.kind === 'text') {
      return message.text.trim().length > 0;
    }
    return true;
  });
  if (!last) {
    return 'Empty chat';
  }
  if (last.role === 'user') {
    return last.text.trim() || 'Sent a photo';
  }
  if (last.kind === 'draft') {
    return 'Drafted a workout';
  }
  if (last.kind === 'question') {
    return 'Asked a question';
  }
  if (last.kind === 'action') {
    return 'Prepared a delete';
  }
  return last.text.trim();
}

function stamp(thread: Thread): string {
  const key = new Date(thread.updatedAt);
  const today = new Date();
  const sameDay =
    key.getFullYear() === today.getFullYear() &&
    key.getMonth() === today.getMonth() &&
    key.getDate() === today.getDate();
  if (sameDay) {
    return clockLabel(thread.updatedAt);
  }
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${dayLabel(`${key.getFullYear()}-${pad(key.getMonth() + 1)}-${pad(key.getDate())}`)}`;
}

export function ChatSidebar({
  visible,
  threads,
  activeThreadId,
  onClose,
  onPick,
  onNew,
  onDelete,
}: Props) {
  const reduce = useReduceMotion();
  // 0 = off screen, 1 = open. The drag writes it directly so the panel and
  // the scrim track the finger instead of waiting for release. `grabbed`
  // holds the progress at gesture start so translation (cumulative) never
  // compounds on itself.
  const progress = useSharedValue(0);
  const grabbed = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      progress.value = visible ? 1 : 0;
      return;
    }
    progress.value = visible
      ? withTiming(1, { duration: motionDuration.base, easing: curve.enter })
      : withTiming(0, { duration: motionDuration.exit, easing: curve.exit });
  }, [visible, reduce, progress]);

  const close = () => onClose();

  const pan = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetY([-14, 14])
    .onStart(() => {
      grabbed.value = progress.value;
    })
    .onUpdate(event => {
      progress.value = Math.min(1, Math.max(0, grabbed.value + event.translationX / WIDTH));
    })
    .onEnd(event => {
      const dismiss = event.velocityX > 400 || progress.value < 0.55;
      if (dismiss) {
        runOnJS(close)();
        progress.value = reduce
          ? 0
          : withTiming(0, { duration: motionDuration.exit, easing: curve.exit });
        return;
      }
      progress.value = reduce ? 1 : withSpring(1, spring.lens);
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panel = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [WIDTH, 0]) }],
  }));

  const confirmDelete = (thread: Thread) => {
    Alert.alert('Delete this chat?', thread.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(thread.id);
        },
      },
    ]);
  };

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <Animated.View style={[{ flex: 1 }, scrim]}>
        <Pressable style={{ flex: 1, backgroundColor: color.scrim }} onPress={onClose} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            surface.glass,
            panel,
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: WIDTH,
              borderTopLeftRadius: radius.card,
              borderBottomLeftRadius: radius.card,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              paddingHorizontal: space.md,
              paddingTop: space.xl,
            },
          ]}
        >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.xs,
                marginBottom: space.md,
              }}
            >
              <Text style={[type.title, { fontSize: 21 }]}>Chats</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
                <Tap
                  minSize={44}
                  onPress={() => {
                    tap();
                    onNew();
                  }}
                  accessibilityLabel="Start a new chat"
                  style={{ flexDirection: 'row', gap: space.xxs, paddingHorizontal: space.xs }}
                >
                  <Icon icon={PlusIcon} size={17} tone="volt" />
                  <Text style={[type.label, { color: color.volt, fontSize: 14 }]}>New</Text>
                </Tap>
                <Tap
                  minSize={44}
                  onPress={() => {
                    tap();
                    onClose();
                  }}
                  accessibilityLabel="Close chats"
                >
                  <Icon icon={CloseIcon} size={19} tone="dim" />
                </Tap>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.md }}
            >
              {threads.map(thread => {
                const active = thread.id === activeThreadId;
                return (
                  <View
                    key={thread.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: radius.row,
                      marginBottom: space.xxs,
                      backgroundColor: active ? color.ink2 : 'transparent',
                      overflow: 'hidden',
                    }}
                  >
                    <Tap
                      minSize={0}
                      onPress={() => {
                        tap();
                        onPick(thread.id);
                      }}
                      accessibilityLabel={`Open ${thread.title}`}
                      style={{
                        flex: 1,
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingHorizontal: space.sm,
                        paddingVertical: space.xs,
                        minHeight: 60,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          type.bodyStrong,
                          { fontSize: 15, color: active ? color.paper : color.paperDim },
                        ]}
                      >
                        {thread.title}
                      </Text>
                      <Text style={[type.micro, { marginTop: 1 }]} numberOfLines={1}>
                        {stamp(thread)}
                        {thread.messages.length > 0 ? ` · ${preview(thread)}` : ''}
                      </Text>
                    </Tap>

                    <Tap
                      minSize={0}
                      onPress={() => confirmDelete(thread)}
                      accessibilityLabel={`Delete ${thread.title}`}
                      hitSlop={6}
                      style={{ width: 42, height: 52 }}
                    >
                      <Icon icon={TrashIcon} size={17} tone={active ? 'dim' : 'faint'} />
                    </Tap>
                  </View>
                );
              })}
            </ScrollView>

            <Text style={[type.micro, { paddingBottom: space.sm }]}>
              {threads.length} {threads.length === 1 ? 'chat' : 'chats'} kept on this phone.
            </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
