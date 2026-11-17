import { Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';
import { KG_PER_LB, groupDigits } from '../lib/stats';
import { tap } from '../lib/feedback';
import { useAppStore } from '../store/useAppStore';
import type { Receipt as ReceiptData, Unit } from '../types';
import { CheckCircleIcon, TrendingIcon, UndoIcon } from './icons';
import { Icon } from './Icon';
import { Tap } from './Tap';

type Props = {
  receipt: ReceiptData;
  unit: Unit;
};

export function Receipt({ receipt, unit }: Props) {
  const undoReceipt = useAppStore(state => state.undoReceipt);
  const volume = unit === 'kg' ? receipt.volume : receipt.volume / KG_PER_LB;
  // Receipts saved before PR detection existed have no prs field.
  const prs = receipt.prs ?? [];

  return (
    <View style={{ paddingVertical: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
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

      {prs.length > 0 ? (
        <View
          style={{
            marginTop: space.xs,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: space.xxs,
          }}
        >
          {prs.map(pr => (
            <View
              key={`${pr.name}-${pr.value}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: space.xs,
                paddingVertical: 3,
                borderRadius: radius.pill,
                backgroundColor: color.ink2,
              }}
            >
              <Icon icon={TrendingIcon} size={12} tone="volt" />
              <Text style={[type.micro, { color: color.volt }]}>
                New PR {pr.name} {groupDigits(unit === 'kg' ? pr.value : pr.value / KG_PER_LB, 1)}{' '}
                {unit}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
