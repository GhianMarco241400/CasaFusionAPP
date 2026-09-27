// src/components/PanelTemas.tsx
import { Modal, Pressable, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTema } from '../context/TemaContext';
import { TEMAS, TemaId } from '../theme/temas';
import { ScalePressable } from './ScalePressable';

const DESCRIPCION: Record<TemaId, string> = {
  actual: 'expreso, un tema elegante',
  claro: 'Crema, más luminoso',
};

const ICONO: Record<TemaId, string> = {
  actual: '☕',
  claro: '🍰',
};

const NOMBRE: Record<TemaId, string> = {
  actual: 'Modo Expreso',
  claro: 'Modo Crema',
};

export function PanelTemas({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { temaId, t, setTemaId } = useTema();

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ zIndex: 50, elevation: 50 }}>
        <Pressable className="flex-1 bg-[#130F0C]/60" onPress={onClose} />

        <Animated.View
          entering={SlideInRight.springify().damping(17).stiffness(180)}
          className="absolute right-0 top-14 rounded-l-3xl overflow-hidden"
          style={{
            width: '58%',
            bottom: insets.bottom + 16,
            zIndex: 60,
            elevation: 60,
            backgroundColor: t.surfaceElevated,
            borderColor: t.border,
            borderWidth: 1,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
            <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: t.accent }}
                >
                  <Feather name="droplet" size={18} color={t.onAccent} />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-extrabold text-lg"
                    style={{ color: t.textPrimary }}
                  >
                    Temas
                  </Text>
                  <Text
                    className="text-[11px] -mt-0.5"
                    numberOfLines={1}
                    style={{ color: t.textSecondary }}
                  >
                    Modo visual de la app
                  </Text>
                </View>
              </View>
              <ScalePressable onPress={onClose} pressedScale={0.9} hitSlop={8}>
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: t.surface }}
                >
                  <Feather name="x" size={18} color={t.textSecondary} />
                </View>
              </ScalePressable>
            </View>
            <View className="h-px" style={{ backgroundColor: t.border }} />

            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }}>
              <Text
                className="text-xs font-bold uppercase tracking-wide mb-2"
                style={{ color: t.textSecondary }}
              >
                Elige un modo
              </Text>

              {(Object.keys(TEMAS) as TemaId[]).map((modo) => {
                const activo = modo === temaId;
                const paleta = TEMAS[modo];
                return (
                  <ScalePressable
                    key={modo}
                    onPress={() => setTemaId(modo)}
                    pressedScale={0.97}
                    className="mb-2"
                  >
                    <View
                      className="rounded-2xl px-3 py-3.5 border-2"
                      style={{
                        backgroundColor: paleta.surface,
                        borderColor: activo ? t.primary : paleta.border,
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View className="flex-row items-center gap-2 flex-1 pr-1">
                          <Text className="text-base">{ICONO[modo]}</Text>
                          <Text
                            className="font-extrabold text-sm flex-shrink"
                            numberOfLines={1}
                            style={{ color: paleta.textPrimary }}
                          >
                            {NOMBRE[modo]}
                          </Text>
                        </View>
                        {activo && (
                          <View
                            className="rounded-full px-2 py-0.5 flex-row items-center gap-1"
                            style={{ backgroundColor: alphaPrimario(paleta.primary) }}
                          >
                            <Feather name="check" size={11} color={paleta.primary} />
                            <Text
                              className="text-[10px] font-extrabold"
                              style={{ color: paleta.primary }}
                            >
                              Activo
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-1.5 mb-2.5">
                        <View
                          className="flex-1 rounded-full h-6 border"
                          style={{ backgroundColor: paleta.background, borderColor: paleta.border }}
                        />
                        <View
                          className="flex-1 rounded-full h-6 border"
                          style={{ backgroundColor: paleta.surface, borderColor: paleta.border }}
                        />
                        <View className="w-8 rounded-full h-6" style={{ backgroundColor: paleta.primary }} />
                        <View className="w-8 rounded-full h-6" style={{ backgroundColor: paleta.accent }} />
                      </View>

                      <Text
                        className="text-[11px] leading-snug"
                        style={{ color: paleta.textSecondary }}
                      >
                        {DESCRIPCION[modo]}
                      </Text>
                    </View>
                  </ScalePressable>
                );
              })}

              <Text
                className="text-[11px] mt-3 leading-snug"
                style={{ color: t.textSecondary }}
              >
               
              </Text>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function alphaPrimario(hex: string): string {
  const limpio = hex.slice(1);
  return `#${limpio}22`;
}