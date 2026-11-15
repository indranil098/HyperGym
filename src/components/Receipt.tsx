import { Text, View } from 'react-native';
import { color, space, type } from '../theme';
import { KG_PER_LB, groupDigits } from '../lib/stats';
import { tap } from '../lib/feedback';
import { useAppStore } from '../store/useAppStore';
import type { Receipt as ReceiptData, Unit } from '../types';
import { CheckCircleIcon, UndoIcon } from './icons';
import { Icon } from './Icon';
import { Tap } from './Tap';

type Props = {
  receipt: ReceiptData;
  unit: Unit;
};

export function Receipt({ receipt, unit }: Props) {
  const undoReceipt = useAppStore(state => state.undoReceipt);
  const volume = unit === 'kg' ? receipt.volume : receipt.volume / KG_PER_LB;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.sm,
      }}
    >
      <Icon icon={CheckCircleIcon} size={22} tone="volt" label="Logged" />
      <Text style={[type.compact, { flex: 1, color: color.paper }]}>
        Logged {receipt.exerciseCount} {receipt.exerciseCount === 1 ? 'exercise' : 'exercises'},{' '}
        {groupDigits(volume)} {unit}
      </Text>
      <Tap
        minSize={48}
        accessibilityLabel="Undo logging"
        onPress={() => {
          tap();
          undoReceipt(receipt);
        }}
        style={{ flexDirection: 'row', gap: space.xxs, paddingHorizontal: space.xs }}
      >
        <Icon icon={UndoIcon} size={16} tone="dim" />
        <Text style={[type.label, { fontSize: 15 }]}>Undo</Text>
      </Tap>
    </View>
  );
}
