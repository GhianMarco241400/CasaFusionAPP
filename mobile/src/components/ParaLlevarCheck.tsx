import { View, Text, TextInput, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
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
  return (
    <View className="mb-4">
      <ScalePressable onPress={() => { haptic(); onToggle(); }} pressedScale={0.98}>
        <View
          className={`rounded-xl border-2 px-4 py-3 flex-row items-center ${
            activo ? 'bg-[#D4432B] border-[#D4432B]' : 'bg-[#1E1A17] border-[#3A322B]'
          }`}
        >
          <Text className="text-base mr-2">🥡</Text>
          <Text className={`flex-1 font-bold text-sm ${activo ? 'text-[#F7F2E9]' : 'text-[#F7F2E9]'}`}>
            Para llevar
          </Text>
          <View
            className={`w-6 h-6 rounded-full items-center justify-center ${
              activo ? 'bg-[#F7F2E9]' : 'bg-[#2B2420] border border-[#3A322B]'
            }`}
          >
            <Text className={`text-xs font-bold leading-none ${activo ? 'text-[#D4432B]' : 'text-[#8C7F6E]'}`}>
              {activo ? '✓' : ''}
            </Text>
          </View>
        </View>
      </ScalePressable>

      {activo && (
        <View className="flex-row items-center justify-end mt-2 gap-2">
          <Text className="text-[#F7F2E9] text-sm">Tapero +S/</Text>
          <TextInput
            className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-3 py-2 w-20 text-center"
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor="#8C7F6E"
            value={taperoTexto}
            onChangeText={onTaperoChange}
          />
        </View>
      )}
    </View>
  );
}