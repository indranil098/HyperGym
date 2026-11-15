import { Text, View } from 'react-native';
import { color, layout, space, surface, type } from '../theme';
import { describeDelete } from '../agent/actions';
import { tap } from '../lib/feedback';
import { useAppStore } from '../store/useAppStore';
import type { AssistantAction } from '../types';
import { GhostButton, PrimaryButton } from './Button';
import { Icon } from './Icon';
import { TrashIcon } from './icons';

export function ActionCard({ message }: { message: AssistantAction }) {
  const applyAction = useAppStore(state => state.applyAction);
  const cancelAction = useAppStore(state => state.cancelAction);

  const title = describeDelete(message.action);

  if (message.status === 'applied') {
    return (
      <View style={{ paddingVertical: space.sm }}>
        <Text style={type.micro}>
          {title.replace('Delete', 'Deleted')}. Log it again if that was wrong.
        </Text>
      </View>
    );
  }

  if (message.status === 'cancelled') {
    return (
      <View style={{ paddingVertical: space.sm }}>
        <Text style={type.micro}>Kept. Nothing was deleted.</Text>
      </View>
    );
  }

  return (
    <View style={[surface.card, { padding: layout.cardPad, marginTop: space.md }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.sm }}>
          <Icon icon={TrashIcon} size={18} tone="volt" />
          <Text style={[type.bodyStrong, { flex: 1, fontSize: 18 }]}>{title}</Text>
        </View>

        {message.action.names.map((name, index) => (
          <View
            key={`${name}-${index}`}
            style={{
              paddingVertical: space.xs,
              borderTopWidth: index === 0 ? 0 : 1,
              borderColor: color.lineSoft,
            }}
          >
            <Text style={type.body}>{name}</Text>
          </View>
        ))}

        <Text style={[type.micro, { marginTop: space.sm }]}>
          This removes it from your log for good.
        </Text>

        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          <GhostButton
            label="Keep"
            onPress={() => {
              tap();
              cancelAction(message.id);
            }}
          />
          <PrimaryButton
            label="Delete"
            icon={TrashIcon}
            onPress={() => {
              tap();
              applyAction(message.id);
            }}
          />
        </View>
    </View>
  );
}
