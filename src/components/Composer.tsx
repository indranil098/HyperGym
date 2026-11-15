import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import { color, layout, radius, space, type } from '../theme';
import { tap, warn } from '../lib/feedback';
import type { AttachedImage } from '../types';
import { Icon } from './Icon';
import { CameraIcon, CloseIcon, PhotoIcon, ArrowUpIcon } from './icons';
import { Tap } from './Tap';

type Props = {
  onSend: (text: string, images: AttachedImage[]) => void;
  busy: boolean;
  onStop: () => void;
  status: string;
};

export function Composer({ onSend, busy, onStop, status }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const canSend = text.trim().length > 0 || images.length > 0;

  const submit = () => {
    if (!canSend || busy) {
      return;
    }
    onSend(text, images);
    setText('');
    setImages([]);
    setProblem(null);
  };

  const pick = async (source: 'camera' | 'library') => {
    setSheetOpen(false);
    setProblem(null);
    const options: CameraOptions & ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: true,
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.6,
    };
    try {
      const result =
        source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        setProblem(result.errorMessage ?? 'Could not read that photo.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        return;
      }
      setImages(current =>
        [
          ...current,
          { uri: asset.uri ?? '', base64: asset.base64 as string, mime: asset.type ?? 'image/jpeg' },
        ].slice(0, 3),
      );
    } catch {
      setProblem('Could not open the picker.');
    }
  };

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: color.lineSoft,
        backgroundColor: color.ink,
        paddingHorizontal: layout.gutter,
        paddingTop: space.xs,
        paddingBottom: space.xs,
      }}
    >
      {images.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: space.xs, paddingVertical: space.xs }}>
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`}>
              <Image
                source={{ uri: image.uri }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.row,
                  backgroundColor: color.ink2,
                }}
              />
              <Tap
                minSize={0}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: color.ink3,
                  borderWidth: 1,
                  borderColor: color.line,
                }}
                hitSlop={10}
                onPress={() =>
                  setImages(current => current.filter((_, position) => position !== index))
                }
                accessibilityLabel="Remove photo"
              >
                <Icon icon={CloseIcon} size={14} tone="paper" />
              </Tap>
            </View>
          ))}
        </View>
      ) : null}

      {problem ? (
        <Text style={[type.micro, { paddingBottom: space.xxs, color: color.paperDim }]}>
          {problem}
        </Text>
      ) : null}

      {busy && status ? (
        <Text style={[type.micro, { paddingBottom: space.xxs }]}>{status}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs }}>
        <Tap
          onPress={() => {
            tap();
            setSheetOpen(true);
          }}
          accessibilityLabel="Add a photo"
          style={{ width: 56, height: 56 }}
        >
          <Icon icon={PhotoIcon} size={30} tone="dim" />
        </Tap>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What did you do?"
          placeholderTextColor={color.paperFaint}
          multiline
          accessibilityLabel="Message"
          style={[
            type.body,
            {
              flex: 1,
              minHeight: 56,
              maxHeight: 132,
              paddingTop: space.md,
              paddingBottom: space.md,
              paddingHorizontal: space.xs,
            },
          ]}
        />

        <Tap
          onPress={busy ? onStop : submit}
          disabled={!busy && !canSend}
          accessibilityLabel={busy ? 'Stop' : 'Send'}
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: busy ? color.ink2 : canSend ? color.volt : color.ink2,
            borderWidth: busy ? 1 : 0,
            borderColor: color.line,
          }}
        >
          {busy ? (
            <View
              style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color.paper }}
            />
          ) : (
            <Icon icon={ArrowUpIcon} size={28} tone={canSend ? 'ink' : 'faint'} />
          )}
        </Tap>
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: color.scrim }} onPress={() => setSheetOpen(false)}>
          <View
            style={{
              marginTop: 'auto',
              backgroundColor: color.ink1,
              borderTopLeftRadius: radius.card,
              borderTopRightRadius: radius.card,
              borderTopWidth: 1,
              borderColor: color.line,
              padding: layout.cardPad,
              paddingBottom: space.xl,
              gap: space.xxs,
            }}
          >
            <Text style={[type.label, { marginBottom: space.xs }]}>Add a photo</Text>

            <Tap
              onPress={() => void pick('camera')}
              accessibilityLabel="Take a photo"
              style={{ height: 64, flexDirection: 'row', justifyContent: 'flex-start', gap: space.md }}
            >
              <Icon icon={CameraIcon} size={28} tone="volt" />
              <Text style={type.body}>Take a photo</Text>
            </Tap>

            <Tap
              onPress={() => void pick('library')}
              accessibilityLabel="Choose from gallery"
              style={{ height: 64, flexDirection: 'row', justifyContent: 'flex-start', gap: space.md }}
            >
              <Icon icon={PhotoIcon} size={28} tone="volt" />
              <Text style={type.body}>Choose from gallery</Text>
            </Tap>

            <Tap
              onPress={() => {
                warn();
                setSheetOpen(false);
              }}
              accessibilityLabel="Cancel"
              style={{ height: 56 }}
            >
              <Text style={type.bodyStrong}>Cancel</Text>
            </Tap>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
