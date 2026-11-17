import { useEffect } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';
import { APP_VERSION } from '../releaseInfo';
import { formatBytes } from '../lib/releases';
import { tap } from '../lib/feedback';
import { useAppStore } from '../store/useAppStore';
import { BottomSheet } from './BottomSheet';
import { TextButton } from './Button';

/**
 * Shown automatically on cold start whenever a newer GitHub release exists:
 * tag, title, publish date, the full release notes, and every asset with its
 * size. "Skip this version" persists until a newer tag appears; "Later" keeps
 * the update in Settings for the rest of this install.
 */
export function UpdateSheet() {
  const available = useAppStore(state => state.update.available);
  const sheetOpen = useAppStore(state => state.update.sheetOpen);
  const setUpdateSheet = useAppStore(state => state.setUpdateSheet);
  const skipUpdate = useAppStore(state => state.skipUpdate);

  // Cold-start check lands while the sheet is closed; pop it open once.
  useEffect(() => {
    if (available && !sheetOpen) {
      setUpdateSheet(true);
    }
  }, [available, sheetOpen, setUpdateSheet]);

  if (!available) {
    return null;
  }

  const published = available.publishedAt
    ? new Date(available.publishedAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <BottomSheet visible={sheetOpen} onClose={() => setUpdateSheet(false)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <Text style={[type.title, { flex: 1 }]}>Update available</Text>
        <View
          style={{
            backgroundColor: color.volt,
            borderRadius: radius.pill,
            paddingHorizontal: space.xs,
            paddingVertical: 3,
          }}
        >
          <Text style={[type.label, { color: color.voltInk, fontSize: 12 }]}>
            {available.tag}
          </Text>
        </View>
      </View>
      <Text style={[type.micro, { marginTop: space.xxs }]}>
        {available.title}
        {published ? ` · ${published}` : ''}
      </Text>

      {available.notes ? (
        <>
          <Text style={[type.label, { marginTop: space.md, marginBottom: space.xxs }]}>
            What's new
          </Text>
          <ScrollView
            style={{ maxHeight: 260 }}
            nestedScrollEnabled
            contentContainerStyle={{ paddingBottom: space.xs }}
          >
            <Text style={type.body} selectable>
              {available.notes}
            </Text>
          </ScrollView>
        </>
      ) : null}

      {available.assets.length > 0 ? (
        <>
          <Text style={[type.label, { marginTop: space.md, marginBottom: space.xxs }]}>
            Downloads
          </Text>
          {available.assets.map(asset => (
            <View
              key={asset.url}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.xs,
                paddingVertical: space.xs,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { fontSize: 15 }]} numberOfLines={1}>
                  {asset.name}
                </Text>
                <Text style={type.micro}>{formatBytes(asset.size)}</Text>
              </View>
              <TextButton
                label="Get"
                tone="volt"
                onPress={() => {
                  tap();
                  void Linking.openURL(asset.url);
                }}
              />
            </View>
          ))}
        </>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          marginTop: space.lg,
        }}
      >
        <TextButton
          label="Skip this version"
          tone="dim"
          onPress={() => {
            tap();
            skipUpdate();
          }}
        />
        <View style={{ flex: 1 }} />
        {available.url ? (
          <TextButton
            label="View on GitHub"
            tone="dim"
            onPress={() => {
              tap();
              void Linking.openURL(available.url);
            }}
          />
        ) : null}
      </View>
      <Text style={[type.micro, { marginTop: space.xs }]}>
        This install is {`v${APP_VERSION}`}. Install the APK above to finish updating.
      </Text>
    </BottomSheet>
  );
}
