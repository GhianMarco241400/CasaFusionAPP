// src/components/AjustesLetras.tsx
import { Modal, Pressable, Text, View, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useLetrasCocina, FuenteLetras } from '../context/LetrasCocina';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
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
  const { t: tema } = useTema();
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
        <Pressable className="flex-1" style={{ backgroundColor: alpha(tema.overlay, 60) }} onPress={onClose} />

        <Animated.View
          entering={SlideInRight.springify().damping(17).stiffness(180)}
          className="absolute right-0 top-14 w-[58%] rounded-l-3xl overflow-hidden border"
          style={{
            bottom: insets.bottom + 16,
            backgroundColor: tema.surfaceElevated,
            borderColor: tema.border,
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
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: tema.accent }}>
                  <Feather name="type" size={18} color={tema.onAccent} />
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-lg" style={{ color: tema.textPrimary }}>
                    Ajustar letras
                  </Text>
                  <Text className="text-[11px] -mt-0.5" style={{ color: tema.textSecondary }} numberOfLines={1}>
                    Mira tus comandas atrás
                  </Text>
                </View>
              </View>
              <ScalePressable onPress={onClose} pressedScale={0.9} hitSlop={8}>
                <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: tema.surface }}>
                  <Feather name="x" size={18} color={tema.textSecondary} />
                </View>
              </ScalePressable>
            </View>
            <View className="h-px" style={{ backgroundColor: tema.border }} />

            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }}>
              <Text className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: tema.textSecondary }}>
                Así se ve ahora
              </Text>
              <View className="bg-[#FBF7EE] rounded-2xl px-4 py-3 border" style={{ borderColor: tema.border }}>
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

              <Text className="text-xs font-bold uppercase tracking-wide mt-6 mb-2" style={{ color: tema.textSecondary }}>
                Tamaño de las letras
              </Text>
              <View className="flex-row items-center justify-between gap-3 rounded-2xl px-4 py-4 border" style={{ backgroundColor: tema.surface, borderColor: tema.border }}>
                <Pressable
                  onPress={() => disminuir()}
                  disabled={alMinimo}
                  hitSlop={10}
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={({ pressed }) => {
                    if (alMinimo) return { opacity: 0.4, backgroundColor: tema.chip, borderColor: tema.border };
                    if (pressed) return { transform: [{ scale: 0.92 }], backgroundColor: tema.chip, borderColor: tema.border };
                    return { backgroundColor: tema.chip, borderColor: tema.border };
                  }}
                >
                  <Feather name="minus" size={22} color={tema.chipText} />
                  <Text className="font-extrabold text-xs -mt-0.5" style={{ color: tema.chipText }}>A-</Text>
                </Pressable>
                <View className="flex-1 items-center">
                  <Text className="text-[11px] font-bold uppercase" style={{ color: tema.textSecondary }}>
                    Tamaño actual
                  </Text>
                  <Text className="font-extrabold text-2xl" style={{ color: tema.textPrimary }}>
                    {Math.round(escala * 100)}%
                  </Text>
                </View>
                <Pressable
                  onPress={() => aumentar()}
                  disabled={alMaximo}
                  hitSlop={10}
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={({ pressed }) => {
                    if (alMaximo) return { opacity: 0.4, backgroundColor: tema.primary, borderColor: tema.primary };
                    if (pressed) return { transform: [{ scale: 0.92 }], backgroundColor: tema.primary, borderColor: tema.primary };
                    return { backgroundColor: tema.primary, borderColor: tema.primary };
                  }}
                >
                  <Feather name="plus" size={22} color={tema.onPrimary} />
                  <Text className="font-extrabold text-xs -mt-0.5" style={{ color: tema.onPrimary }}>A+</Text>
                </Pressable>
              </View>

              <ScalePressable onPress={restablecer} pressedScale={0.97} className="self-center mt-3">
                <Text className="font-bold text-xs" style={{ color: tema.accent }}>⟲ Restablecer tamaño</Text>
              </ScalePressable>

              <Text className="text-xs font-bold uppercase tracking-wide mt-6 mb-2" style={{ color: tema.textSecondary }}>
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
                      className="rounded-full px-4 py-2 border"
                      style={activa ? { backgroundColor: tema.primary, borderColor: tema.primary } : { backgroundColor: tema.surface, borderColor: tema.border }}
                    >
                      <Text
                        className="font-bold text-sm"
                        style={
                          familiaPara(f)
                            ? { fontFamily: familiaPara(f), color: activa ? tema.onPrimary : tema.textSecondary }
                            : { color: activa ? tema.onPrimary : tema.textSecondary }
                        }
                      >
                        {nombreFuente(f)}
                      </Text>
                    </ScalePressable>
                  );
                })}
              </View>

            </ScrollView>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}