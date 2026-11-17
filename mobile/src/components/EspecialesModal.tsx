// src/components/EspecialesModal.tsx
import { Image, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Star, X } from 'lucide-react-native';
import { Dish, OrderItem } from '../types';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
import { ScalePressable } from './ScalePressable';
import { Texto as Text } from './Texto';

type Props = {
  visible: boolean;
  onClose: () => void;
  especiales: Dish[];
  comanda: OrderItem[];
  onSelect: (dish: Dish) => void;
};

export function EspecialesModal({ visible, onClose, especiales, comanda, onSelect }: Props) {
  const { t, temaId } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
        <View
          className={`rounded-t-3xl h-[55%] pt-5 px-5 ${
            temaId === 'claro' ? 'border-t-2 border-[#1E1A17]' : 'border-t'
          }`}
          style={{
            backgroundColor: t.surfaceElevated,
            borderTopColor: temaId === 'claro' ? '#1E1A17' : t.border,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>
                Especiales
              </Text>
              <Text className="text-xs" style={{ color: t.textSecondary }}>
                {especiales.length} disponibles
              </Text>
            </View>
            <ScalePressable onPress={onClose} pressedScale={0.9} hitSlop={8}>
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''
                }`}
                style={{ backgroundColor: t.surface }}
              >
                <X size={16} color={t.textSecondary} />
              </View>
            </ScalePressable>
          </View>

          <Animated.FlatList
            data={especiales}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const yaEnComanda = comanda.some((c) => c.dishId === item.id);
              return (
                <Pressable
                  onPress={() => {
                    onClose();
                    onSelect(item);
                  }}
                  style={{ width: '48%' }}
                >
                  <View
                    className={`rounded-2xl overflow-hidden ${
                      temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
                    }`}
                    style={{
                      backgroundColor: yaEnComanda ? t.primary : alpha(t.accent, 8),
                      borderColor: yaEnComanda
                        ? t.primary
                        : temaId === 'claro'
                          ? '#1E1A17'
                          : alpha(t.accent, 45),
                    }}
                  >
                    {item.image !== '' ? (
                      <Image
                        source={{ uri: item.image }}
                        className="w-full h-28"
                        style={{ backgroundColor: t.background }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className="w-full h-28 items-center justify-center"
                        style={{ backgroundColor: alpha(t.textSecondary, 12) }}
                      >
                        <Star size={26} color={alpha(t.textSecondary, 45)} strokeWidth={1.8} />
                      </View>
                    )}
                    <View className="px-3 py-2.5">
                      <View style={{ minHeight: 40 }}>
                        <Text
                          className="font-semibold text-sm leading-snug"
                          style={{ color: yaEnComanda ? t.onPrimary : t.textPrimary }}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between mt-1.5">
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: yaEnComanda ? alpha(t.onPrimary, 85) : t.textSecondary }}
                        >
                          S/ {item.price.toFixed(2)}
                        </Text>
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center"
                          style={{ backgroundColor: yaEnComanda ? t.onPrimary : t.accent }}
                        >
                          <Text
                            className="text-center font-extrabold text-sm leading-none"
                            style={{ color: yaEnComanda ? t.primary : t.onPrimary }}
                          >
                            {yaEnComanda ? '✓' : '+'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
