import { useEffect, useRef } from 'react';
import { Alert, Animated, Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { color, radius, space, surface, type } from '../theme';
import { dayLabel, clockLabel } from '../lib/date';
import { duration as motionDuration, curve, useReduceMotion } from '../lib/motion';
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
  const anim = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: reduce ? motionDuration.instant : 280,
      easing: visible ? curve.enter : curve.exit,
      useNativeDriver: true,
    }).start();
  }, [visible, anim, reduce]);

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
      <Animated.View style={{ flex: 1, opacity: anim }}>
        <Pressable style={{ flex: 1, backgroundColor: color.scrim }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          surface.glass,
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
            transform: [
              {
                translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [WIDTH, 0] }),
              },
            ],
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
    </View>
  );
}
