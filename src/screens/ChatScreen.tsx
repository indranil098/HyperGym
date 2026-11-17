import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, radius, space, type } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useAgent } from '../agent/useAgent';
import { MessageBubble } from '../components/MessageBubble';
import { Composer } from '../components/Composer';
import { EmptyState } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Tap } from '../components/Tap';
import { ChatIcon, CloseIcon, ErrorIcon, MenuIcon, PlusIcon } from '../components/icons';
import { ChatSidebar } from '../components/ChatSidebar';
import { useKeyboardInset } from '../lib/keyboard';
import { tap } from '../lib/feedback';

const EXAMPLES = [
  '4 sets bench at 80 kg, 8 reps',
  'Rows, 4 sets, felt heavy',
  'Squatted 100 for 5, 5, 5',
];

export function ChatScreen() {
  const chat = useAppStore(state => state.chat);
  const threads = useAppStore(state => state.threads);
  const activeThreadId = useAppStore(state => state.activeThreadId);
  const newChat = useAppStore(state => state.newChat);
  const openThread = useAppStore(state => state.openThread);
  const deleteThread = useAppStore(state => state.deleteThread);
  const unit = useAppStore(state => state.settings.unit);
  const agent = useAgent();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardInset = useKeyboardInset();
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-scroll only while the reader is already at the bottom, so a streaming
  // reply never yanks them back up out of their own scrollback.
  const nearBottomRef = useRef(true);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
    nearBottomRef.current = distance < 80;
  }, []);

  const stickToBottom = useCallback(() => {
    if (nearBottomRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  useEffect(() => {
    if (!nearBottomRef.current) {
      return;
    }
    const timer = setTimeout(stickToBottom, 90);
    return () => clearTimeout(timer);
  }, [chat, stickToBottom]);

  useEffect(() => {
    if (keyboardInset <= 0) {
      return;
    }
    const timer = setTimeout(stickToBottom, 140);
    return () => clearTimeout(timer);
  }, [keyboardInset, stickToBottom]);

  const send = useCallback(
    (text: string) => {
      void agent.send(text, []);
    },
    [agent],
  );

  const startNew = useCallback(() => {
    agent.cancel();
    newChat();
    setSidebarOpen(false);
  }, [agent, newChat]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScreenHeader
        title="HyperGym"
        action={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
            <Tap
              minSize={44}
              onPress={() => {
                tap();
                startNew();
              }}
              accessibilityLabel="Start a new chat"
            >
              <Icon icon={PlusIcon} size={25} tone="volt" />
            </Tap>
            <Tap
              minSize={44}
              onPress={() => {
                tap();
                setSidebarOpen(true);
              }}
              accessibilityLabel="Open conversations"
            >
              <Icon icon={MenuIcon} size={25} tone="paper" />
            </Tap>
          </View>
        }
      />

      {agent.error ? (
        <View
          style={{
            marginHorizontal: layout.gutter,
            marginBottom: space.xs,
            backgroundColor: color.ink1,
            borderRadius: radius.row,
            paddingVertical: space.xs,
            paddingLeft: space.sm,
            paddingRight: space.xxs,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs,
          }}
        >
          <Icon icon={ErrorIcon} size={20} tone="volt" />
          <Text style={[type.compact, { flex: 1, color: color.paper }]}>{agent.error}</Text>
          <Tap minSize={44} onPress={agent.clearError} accessibilityLabel="Dismiss">
            <Icon icon={CloseIcon} size={16} tone="dim" />
          </Tap>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: space.lg,
          flexGrow: 1,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
      >
        {chat.length === 0 ? (
          <EmptyState
            icon={ChatIcon}
            title="Tell me what you did"
            body="Text or a photo. I draft the workout, you fix what is wrong, and nothing is saved until you tap Log it."
          >
            {EXAMPLES.map(example => (
              <Chip key={example} label={example} onPress={() => send(example)} />
            ))}
          </EmptyState>
        ) : (
          chat.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              unit={unit}
              onAnswer={answer => send(answer)}
            />
          ))
        )}
      </ScrollView>

      <View
        style={{
          paddingBottom:
            keyboardInset > 0
              ? keyboardInset + space.xs
              : insets.bottom + layout.tabBarHeight - layout.dockGap,
        }}
      >
        <Composer
          onSend={(text, images) => void agent.send(text, images)}
          busy={agent.busy}
          onStop={agent.cancel}
          status={agent.status}
        />
      </View>

      <ChatSidebar
        visible={sidebarOpen}
        threads={threads}
        activeThreadId={activeThreadId}
        onClose={() => setSidebarOpen(false)}
        onNew={startNew}
        onDelete={id => {
          agent.cancel();
          deleteThread(id);
        }}
        onPick={id => {
          agent.cancel();
          openThread(id);
          setSidebarOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
