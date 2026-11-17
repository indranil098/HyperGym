import { useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, Share, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, layout, space, surface, type } from '../theme';
import { MODELS } from '../ai/models';
import { checkKey, type KeyCheck } from '../ai/client';
import { tap } from '../lib/feedback';
import { keyPool, useAppStore } from '../store/useAppStore';
import { APP_NAME, APP_VERSION } from '../releaseInfo';
import type { MotionSetting, ThemeSetting, Unit } from '../types';
import { TextButton } from '../components/Button';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { Tap } from '../components/Tap';
import { CheckIcon } from '../components/icons';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.label, { marginBottom: space.xs }]}>{title}</Text>
      <View style={[surface.card, { paddingHorizontal: space.md, paddingVertical: space.xs }]}>
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: color.lineSoft }} />;
}

/** Up to four keys, one per line. Blank lines and whitespace are dropped. */
function splitKeys(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function SettingsScreen() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const days = useAppStore(state => state.days);
  const routines = useAppStore(state => state.routines);
  const clearChat = useAppStore(state => state.clearChat);
  const wipe = useAppStore(state => state.wipe);
  const update = useAppStore(state => state.update);
  const checkForUpdates = useAppStore(state => state.checkForUpdates);
  const setUpdateSheet = useAppStore(state => state.setUpdateSheet);
  const updateStatus = update.status;
  const updateError = update.error;
  const [reveal, setReveal] = useState(false);
  const [keyDraft, setKeyDraft] = useState(settings.apiKey);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<KeyCheck | null>(null);

  const poolCount = keyPool(settings).length;

  useEffect(() => {
    setKeyDraft(settings.apiKey);
  }, [settings.apiKey]);

  const runCheck = async () => {
    setChecking(true);
    setCheck(null);
    const submitted = keyDraft;
    const result = await checkKey(splitKeys(submitted)[0] ?? '');
    // A second check may have started while this one was in flight; only the
    // newest result may update the field or persist a key.
    if (submitted !== keyDraft) {
      return;
    }
    setCheck(result);
    setChecking(false);
    if (result.ok) {
      updateSettings({ apiKeys: splitKeys(submitted) });
    }
  };

  const exportData = async () => {
    tap();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      days: Object.values(days),
      routines,
    };
    await Share.share({ message: JSON.stringify(payload, null, 2), title: 'HyperGym export' });
  };

  const units: Unit[] = ['kg', 'lb'];
  const themes: { key: ThemeSetting; label: string }[] = [
    { key: 'dark', label: 'Black' },
    { key: 'green', label: 'Green' },
    { key: 'light', label: 'White' },
  ];
  const motions: { key: MotionSetting; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'reduced', label: 'Reduced' },
    { key: 'full', label: 'Full' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: color.ink }}>
      <ScreenHeader title="Settings" meta="Runs on free models only" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: layout.gutter,
          paddingBottom: space.xxxl + layout.tabBarHeight,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="OpenRouter keys">
          <TextInput
            value={keyDraft}
            onChangeText={value => {
              setKeyDraft(value);
              setCheck(null);
            }}
            onBlur={() => updateSettings({ apiKeys: splitKeys(keyDraft) })}
            onSubmitEditing={() => updateSettings({ apiKeys: splitKeys(keyDraft) })}
            placeholder={'sk-or-v1-...\nsk-or-v1-...'}
            placeholderTextColor={color.paperFaint}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            secureTextEntry={!reveal}
            accessibilityLabel="OpenRouter API keys, one per line"
            style={[type.body, { paddingVertical: space.sm, color: color.paper }]}
          />
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
            <Text
              style={[
                type.micro,
                {
                  flex: 1,
                  paddingVertical: space.xs,
                  color: check ? (check.ok ? color.volt : color.paper) : color.paperFaint,
                },
              ]}
            >
              {checking
                ? 'Checking the key'
                : check
                  ? check.message
                  : poolCount > 1
                    ? `${poolCount} keys rotating. Create more at openrouter.ai/keys`
                    : 'Create one at openrouter.ai/keys'}
            </Text>
            <TextButton
              label={checking ? 'Checking' : 'Check'}
              tone="volt"
              disabled={checking}
              onPress={() => void runCheck()}
            />
            <TextButton
              label={reveal ? 'Hide' : 'Show'}
              tone="dim"
              onPress={() => setReveal(value => !value)}
            />
          </View>
        </Section>

        <Section title="Model">
          {MODELS.map((model, index) => (
            <View key={model.id}>
              {index > 0 ? <Divider /> : null}
              <Tap
                minSize={0}
                onPress={() => {
                  tap();
                  updateSettings({ model: model.id });
                }}
                accessibilityLabel={`Use ${model.label}`}
                style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.sm }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{model.label}</Text>
                  <Text style={type.micro}>Free, reads photos</Text>
                </View>
                {settings.model === model.id ? <Icon icon={CheckIcon} size={20} tone="volt" /> : null}
              </Tap>
            </View>
          ))}
        </Section>

        <Section title="Appearance">
          <View style={{ paddingVertical: space.sm, gap: space.xs }}>
            <Text style={type.label}>Theme</Text>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              {themes.map(theme => (
                <Chip
                  key={theme.key}
                  label={theme.label}
                  accent={settings.theme === theme.key}
                  onPress={() => updateSettings({ theme: theme.key })}
                />
              ))}
            </View>
            <Text style={[type.micro, { marginTop: space.xxs }]}>
              Switching theme restarts the screens and drops you back on Chat.
            </Text>
          </View>
        </Section>

        <Section title="Behaviour">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              minHeight: 60,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={type.body}>Auto fallback</Text>
              <Text style={type.micro}>Try the next free model when one is busy</Text>
            </View>
            <Switch
              value={settings.autoFallback}
              onValueChange={value => updateSettings({ autoFallback: value })}
              trackColor={{ false: color.ink3, true: color.volt }}
              thumbColor={color.paper}
              accessibilityLabel="Auto fallback"
            />
          </View>

          <Divider />

          <View style={{ paddingVertical: space.sm, gap: space.xs }}>
            <Text style={[type.label]}>Units</Text>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              {units.map(unit => (
                <Chip
                  key={unit}
                  label={unit}
                  accent={settings.unit === unit}
                  onPress={() => updateSettings({ unit })}
                />
              ))}
            </View>
          </View>

          <Divider />

          <View style={{ paddingVertical: space.sm, gap: space.xs }}>
            <Text style={[type.label]}>Motion</Text>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              {motions.map(motion => (
                <Chip
                  key={motion.key}
                  label={motion.label}
                  accent={settings.motion === motion.key}
                  onPress={() => updateSettings({ motion: motion.key })}
                />
              ))}
            </View>
          </View>
        </Section>

        <Section title="Data">
          <Tap
            minSize={0}
            onPress={() => void exportData()}
            accessibilityLabel="Export as JSON"
            style={{ minHeight: 60, justifyContent: 'center' }}
          >
            <Text style={type.body}>Export as JSON</Text>
            <Text style={type.micro}>Share your log out of the app</Text>
          </Tap>
          <Divider />
          <Tap
            minSize={0}
            onPress={() =>
              Alert.alert('Clear the chat?', 'Your logged workouts stay.', [
                { text: 'Keep', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearChat },
              ])
            }
            accessibilityLabel="Clear chat"
            style={{ minHeight: 60, justifyContent: 'center' }}
          >
            <Text style={type.body}>Clear chat</Text>
            <Text style={type.micro}>Logged workouts stay</Text>
          </Tap>
          <Divider />
          <Tap
            minSize={0}
            onPress={() =>
              Alert.alert(
                'Delete everything?',
                'Every session, routine and message on this phone is removed. There is no undo.',
                [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => void wipe() },
                ],
              )
            }
            accessibilityLabel="Delete everything"
            style={{ minHeight: 60, justifyContent: 'center' }}
          >
            <Text style={type.body}>Delete everything</Text>
            <Text style={type.micro}>Sessions, routines and chat</Text>
          </Tap>
        </Section>

        <Section title="Updates">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              minHeight: 60,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{`v${APP_VERSION}`}</Text>
              <Text style={type.micro}>
                {updateStatus === 'checking'
                  ? 'Checking GitHub releases'
                  : updateStatus === 'error'
                    ? updateError ?? 'Could not reach GitHub releases.'
                    : update.available
                      ? `${update.available.tag} is ready to install`
                      : 'You are on the latest release'}
              </Text>
            </View>
            <TextButton
              label={updateStatus === 'checking' ? 'Checking' : 'Check now'}
              tone="volt"
              disabled={updateStatus === 'checking'}
              onPress={() => {
                tap();
                void checkForUpdates();
              }}
            />
          </View>
          {update.available ? (
            <>
              <Divider />
              <Tap
                minSize={0}
                onPress={() => {
                  tap();
                  setUpdateSheet(true);
                }}
                accessibilityLabel={`View ${update.available.tag} details`}
                style={{ minHeight: 60, justifyContent: 'center' }}
              >
                <Text style={type.body}>View {update.available.tag} details</Text>
                <Text style={type.micro}>Release notes and the APK download</Text>
              </Tap>
            </>
          ) : null}
        </Section>

        <Text style={[type.micro, { paddingBottom: space.lg }]}>
          {APP_NAME} {`v${APP_VERSION}`}. Your key goes to OpenRouter and nowhere else. Photos are
          sent to the model you picked, never stored on a server.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
