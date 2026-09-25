import { View, Text, TextInput, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTema } from '../context/TemaContext';
import { ScalePressable } from './ScalePressable';

export const TAPERO_DEFAULT = 1;

type Props = {
  activo: boolean;
  taperoTexto: string;
  onToggle: () => void;
  onTaperoChange: (texto: string) => void;
};

function haptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function ParaLlevarCheck({ activo, taperoTexto, onToggle, onTaperoChange }: Props) {
  const { t } = useTema();

  return (
    <View className="mb-4">
      <ScalePressable onPress={() => { haptic(); onToggle(); }} pressedScale={0.98}>
        <View
          className="rounded-xl border-2 px-4 py-3 flex-row items-center"
          style={{
            backgroundColor: activo ? t.primary : t.surface,
            borderColor: activo ? t.primary : t.border,
          }}
        >
          <Text className="text-base mr-2">🥡</Text>
          <Text
            className="flex-1 font-bold text-sm"
            style={{ color: activo ? t.onPrimary : t.textPrimary }}
          >
            Para llevar
          </Text>
          <View
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{
              backgroundColor: activo ? t.onPrimary : 'transparent',
              borderColor: activo ? t.onPrimary : t.border,
              borderWidth: activo ? 0 : 1,
            }}
          >
            <Text
              className="text-xs font-bold leading-none"
              style={{ color: activo ? t.primary : t.textSecondary }}
            >
              {activo ? '✓' : ''}
            </Text>
          </View>
        </View>
      </ScalePressable>

      {activo && (
        <View className="flex-row items-center justify-end mt-2 gap-2">
          <Text className="text-sm" style={{ color: t.textPrimary }}>
            Taper +S/
          </Text>
          <TextInput
            className="rounded-xl text-base px-3 py-2 w-20 text-center"
            style={{ backgroundColor: t.surface, color: t.textPrimary, borderColor: t.border, borderWidth: 1 }}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor={t.textSecondary}
            value={taperoTexto}
            onChangeText={onTaperoChange}
          />
        </View>
      )}
    </View>
  );
}