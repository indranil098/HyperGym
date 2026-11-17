import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { color, space, type } from '../theme';
import { tap } from '../lib/feedback';
import { Icon } from './Icon';
import { MinusIcon, PlusIcon } from './icons';
import { Tap } from './Tap';

type Props = {
  value?: number;
  onChange: (value: number | undefined) => void;
  assumed?: boolean;
  suffix?: string;
  step?: number;
  compact?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
};

function format(value?: number): string {
  if (value === undefined) {
    return '--';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function NumericStepper({
  value,
  onChange,
  assumed,
  suffix,
  step = 1,
  compact = false,
  placeholder = '--',
  accessibilityLabel = 'Value',
}: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const valueRef = useRef<number | undefined>(value);
  valueRef.current = value;

  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  // Hold-to-repeat must die with the component, otherwise an interval that
  // started on a set row keeps writing to the store after that row unmounts.
  useEffect(() => clearTimers, []);

  const bump = (direction: number) => {
    const next = Math.max(0, (valueRef.current ?? 0) + direction * step);
    const rounded = Math.round(next * 10) / 10;
    valueRef.current = rounded;
    onChange(rounded === 0 ? undefined : rounded);
  };

  const startHold = (direction: number) => {
    tap();
    bump(direction);
    clearTimers();
    holdRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => bump(direction), 90);
    }, 380);
  };

  const beginEdit = () => {
    // Seed the field with the current value. Committing an untouched edit must
    // be a no-op, not a wipe.
    setText(valueRef.current === undefined ? '' : `${valueRef.current}`);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const parsed = Number.parseFloat(text.replace(',', '.').replace(/[^0-9.]/g, ''));
    if (text.trim() === '' || !Number.isFinite(parsed)) {
      // Empty means "clear", but only when the user actually emptied it.
      if (valueRef.current !== undefined) {
        valueRef.current = undefined;
        onChange(undefined);
      }
      return;
    }
    const rounded = Math.round(parsed * 10) / 10;
    if (rounded === valueRef.current) {
      return;
    }
    valueRef.current = rounded;
    onChange(rounded);
  };

  const buttonSize = compact ? 30 : 44;
  const valueWidth = compact ? 30 : 56;
  const numberStyle = compact
    ? { ...type.bodyStrong, fontVariant: ['tabular-nums'] as const, textAlign: 'center' as const }
    : { ...type.numeralSm, textAlign: 'center' as const };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Tap
        minSize={0}
        hitSlop={compact ? 12 : 8}
        style={{ width: buttonSize, height: 44 }}
        onPressIn={() => startHold(-1)}
        onPressOut={clearTimers}
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
      >
        <Icon icon={MinusIcon} size={compact ? 16 : 18} tone="dim" />
      </Tap>

      <View
        style={{
          width: valueWidth,
          alignItems: 'center',
          borderBottomWidth: assumed && value !== undefined ? 1 : 0,
          borderStyle: 'dotted',
          borderColor: color.volt,
        }}
      >
        {editing ? (
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            selectTextOnFocus
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={commit}
            onBlur={commit}
            accessibilityLabel={`Type ${accessibilityLabel}`}
            style={[numberStyle, { width: valueWidth + 6, padding: 0, margin: 0, color: color.paper }]}
          />
        ) : (
          <Tap
            minSize={0}
            style={{ width: valueWidth, height: 44 }}
            onPress={beginEdit}
            accessibilityLabel={`${accessibilityLabel}, currently ${format(value)}. Tap to type.`}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[numberStyle, { color: value === undefined ? color.paperFaint : color.paper }]}
            >
              {value === undefined ? placeholder : format(value)}
            </Text>
          </Tap>
        )}
      </View>

      <Tap
        minSize={0}
        hitSlop={compact ? 12 : 8}
        style={{ width: buttonSize, height: 44 }}
        onPressIn={() => startHold(1)}
        onPressOut={clearTimers}
        accessibilityLabel={`Increase ${accessibilityLabel}`}
      >
        <Icon icon={PlusIcon} size={compact ? 16 : 18} tone="dim" />
      </Tap>

      {suffix ? (
        <Text style={[type.label, { marginLeft: space.xxs, minWidth: 22 }]}>{suffix}</Text>
      ) : null}
    </View>
  );
}
