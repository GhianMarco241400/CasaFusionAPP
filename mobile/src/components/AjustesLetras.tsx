// src/components/AjustesLetras.tsx
import { Modal, Pressable, Text, View, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useLetrasCocina, FuenteLetras } from '../context/LetrasCocina';
import { ScalePressable } from './ScalePressable';

function nombreFuente(f: FuenteLetras): string {
  if (f === 'serif') return 'Serif';
  if (f === 'mono') return 'Máquina';
  return 'Actual';
}

function familiaPara(fuente: FuenteLetras): string | undefined {
  if (fuente === 'serif') return Platform.select({ ios: 'Georgia', default: 'serif' });
  if (fuente === 'mono') return Platform.select({ ios: 'Menlo', default: 'monospace' });
  return undefined;
}

export function AjustesLetras({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const {
    escala,
    t,
    fuente,
    fuenteValor,
    fuentes,
    alMinimo,
    alMaximo,
    aumentar,
    disminuir,
    restablecer,
    cambiarFuente,
  } = useLetrasCocina();

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
          className="absolute right-0 top-14 w-[58%] rounded-l-3xl overflow-hidden bg-[#1B1714] border border-[#3A322B]"
          style={{
            bottom: insets.bottom + 16,
            zIndex: 60,
            elevation: 60,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
            <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View className="w-10 h-10 rounded-full bg-[#E8A33D] items-center justify-center">
                  <Feather name="type" size={18} color="#1E1A17" />
                </View>
                <View className="flex-1">
                  <Text className="text-[#F7F2E9] font-extrabold text-lg">
                    Ajustar letras
                  </Text>
                  <Text className="text-[#8C7F6E] text-[11px] -mt-0.5" numberOfLines={1}>
                    Mira tus comandas atrás
                  </Text>
                </View>
              </View>
              <ScalePressable onPress={onClose} pressedScale={0.9} hitSlop={8}>
                <View className="w-9 h-9 rounded-full bg-[#2B2420] items-center justify-center">
                  <Feather name="x" size={18} color="#8C7F6E" />
                </View>
              </ScalePressable>
            </View>
            <View className="h-px bg-[#3A322B]" />

            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }}>
              <Text className="text-[#8C7F6E] text-xs font-bold uppercase tracking-wide mb-2">
                Así se ve ahora
              </Text>
              <View className="bg-[#FBF7EE] rounded-2xl px-4 py-3 border border-[#3A322B]">
                <View className="flex-row items-center gap-2 mb-1.5">
                  <View className="bg-[#E8A33D]/30 rounded-full px-2 py-0.5">
                    <Text
                      className="text-[#A86E16] font-bold"
                      style={{ fontSize: t(14), fontFamily: fuenteValor }}
                    >
                      Pendiente
                    </Text>
                  </View>
                  <Text
                    className="text-[#2B2420] font-extrabold flex-shrink"
                    style={{ fontSize: t(30), fontFamily: fuenteValor }}
                  >
                    Mesa 3
                  </Text>
                </View>
                <Text
                  className="text-[#2B2420] font-extrabold"
                  style={{ fontSize: t(24), fontFamily: fuenteValor }}
                >
                  3x Lomo Saltado
                </Text>
                <Text
                  className="text-[#4D7C4D] font-semibold"
                  style={{ fontSize: t(20), fontFamily: fuenteValor }}
                >
                  📝 Sin cebolla
                </Text>
                <View className="flex-row items-end justify-between mt-2.5 pt-2 border-t border-[#2B2420]/15">
                  <Text
                    className="text-[#8C7F6E] font-bold uppercase tracking-wide"
                    style={{ fontSize: t(14), fontFamily: fuenteValor }}
                  >
                    Total
                  </Text>
                  <Text
                    className="text-[#2B2420] font-extrabold"
                    style={{ fontSize: t(24), fontFamily: fuenteValor }}
                  >
                    S/ 48.00
                  </Text>
                </View>
              </View>

              <Text className="text-[#8C7F6E] text-xs font-bold uppercase tracking-wide mt-6 mb-2">
                Tamaño de las letras
              </Text>
              <View className="flex-row items-center justify-between gap-3 bg-[#2B2420] rounded-2xl px-4 py-4 border border-[#3A322B]">
                <Pressable
                  onPress={() => disminuir()}
                  disabled={alMinimo}
                  hitSlop={10}
                  className="w-16 h-16 rounded-full bg-[#1E1A17] border border-[#3A322B] items-center justify-center"
                  style={({ pressed }) => {
                    if (alMinimo) return { opacity: 0.4 };
                    if (pressed) return { transform: [{ scale: 0.92 }] };
                    return null;
                  }}
                >
                  <Feather name="minus" size={22} color="#F7F2E9" />
                  <Text className="text-[#F7F2E9] font-extrabold text-xs -mt-0.5">A-</Text>
                </Pressable>
                <View className="flex-1 items-center">
                  <Text className="text-[#8C7F6E] text-[11px] font-bold uppercase">
                    Tamaño actual
                  </Text>
                  <Text className="text-[#F7F2E9] font-extrabold text-2xl">
                    {Math.round(escala * 100)}%
                  </Text>
                </View>
                <Pressable
                  onPress={() => aumentar()}
                  disabled={alMaximo}
                  hitSlop={10}
                  className="w-16 h-16 rounded-full bg-[#D4432B] border border-[#D4432B] items-center justify-center"
                  style={({ pressed }) => {
                    if (alMaximo) return { opacity: 0.4 };
                    if (pressed) return { transform: [{ scale: 0.92 }] };
                    return null;
                  }}
                >
                  <Feather name="plus" size={22} color="#F7F2E9" />
                  <Text className="text-[#F7F2E9] font-extrabold text-xs -mt-0.5">A+</Text>
                </Pressable>
              </View>

              <ScalePressable onPress={restablecer} pressedScale={0.97} className="self-center mt-3">
                <Text className="text-[#E8A33D] font-bold text-xs">⟲ Restablecer tamaño</Text>
              </ScalePressable>

              <Text className="text-[#8C7F6E] text-xs font-bold uppercase tracking-wide mt-6 mb-2">
                Tipo de letra
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {fuentes.map((f) => {
                  const activa = f === fuente;
                  return (
                    <ScalePressable
                      key={f}
                      onPress={() => cambiarFuente(f)}
                      pressedScale={0.95}
                      className={`rounded-full px-4 py-2 border ${
                        activa
                          ? 'bg-[#D4432B] border-[#D4432B]'
                          : 'bg-[#2B2420] border-[#3A322B]'
                      }`}
                    >
                      <Text
                        className={`font-bold text-sm ${activa ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}
                        style={familiaPara(f) ? { fontFamily: familiaPara(f) } : undefined}
                      >
                        {nombreFuente(f)}
                      </Text>
                    </ScalePressable>
                  );
                })}
              </View>

              <Text className="text-[#8C7F6E] text-[11px] mt-5 leading-snug">
                El tamaño se guarda y se mantiene aunque lleguen comandas nuevas. Solo cambia
                desde aquí.
              </Text>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}