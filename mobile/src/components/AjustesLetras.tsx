// src/components/AjustesLetras.tsx
import { Modal, Pressable, Text, View, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useLetrasCocina, FuenteLetras } from '../context/LetrasCocina';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
import { ScalePressable } from './ScalePressable';
import { Texto } from './Texto';

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

function BotonTamano({
  onPress,
  disabled,
  icono,
  etiqueta,
}: {
  onPress: () => void;
  disabled: boolean;
  icono: 'minus' | 'plus';
  etiqueta: string;
}) {
  const { t: tema } = useTema();
  // El color va en un View hijo con style estático: si se deja en el
  // style-funcional del Pressable, en Modo Crema el círculo puede no pintarse
  // y el texto claro queda sobre el fondo blanco de la tarjeta.
  const activo = !disabled;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={10}>
      <View
        className="w-14 h-14 rounded-full items-center justify-center border"
        style={{
          backgroundColor: activo ? tema.textPrimary : tema.surface,
          borderColor: activo ? tema.textPrimary : tema.border,
        }}
      >
        <Feather name={icono} size={22} color={activo ? tema.surface : tema.textSecondary} />
        <Texto className="font-extrabold text-xs -mt-0.5" style={{ color: activo ? tema.surface : tema.textSecondary }}>
          {etiqueta}
        </Texto>
      </View>
    </Pressable>
  );
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
          className="absolute right-0 top-14 w-[88%] rounded-l-3xl overflow-hidden border"
          style={{
            bottom: insets.bottom + 16,
            maxWidth: 380,
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
                  <Texto className="font-extrabold text-lg" style={{ color: tema.textPrimary }}>
                    Ajustar letras
                  </Texto>
                  <Texto className="text-[11px] -mt-0.5" numberOfLines={1} style={{ color: tema.textSecondary }}>
                    Mira tus comandas atrás
                  </Texto>
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
              <Texto className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: tema.textSecondary }}>
                Así se ve ahora
              </Texto>
              <View className="bg-[#FBF7EE] rounded-2xl px-4 py-3 border" style={{ borderColor: tema.border }}>
                <View className="flex-row items-center gap-2 mb-1.5">
                    <View className="bg-[#E8A33D]/30 rounded-full px-2 py-0.5 shrink">
                    <Text
                      className="text-[#A86E16] font-bold"
                      numberOfLines={1}
                      style={{ fontSize: t(14), fontFamily: fuenteValor }}
                    >
                      Pendiente
                    </Text>
                  </View>
                  <Text
                    className="text-[#2B2420] font-extrabold flex-shrink"
                    numberOfLines={1}
                    style={{ fontSize: t(30), fontFamily: fuenteValor }}
                  >
                    Mesa 3
                  </Text>
                </View>
                <Text
                  className="text-[#2B2420] font-extrabold"
                  numberOfLines={2}
                  style={{ fontSize: t(24), fontFamily: fuenteValor }}
                >
                  3x Lomo Saltado
                </Text>
                <Text
                  className="text-[#4D7C4D] font-semibold"
                  numberOfLines={1}
                  style={{ fontSize: t(20), fontFamily: fuenteValor }}
                >
                  📝 Sin cebolla
                </Text>
                <View className="flex-row items-end justify-between mt-2.5 pt-2 border-t border-[#2B2420]/15">
                  <Text
                    className="text-[#8C7F6E] font-bold uppercase tracking-wide shrink"
                    numberOfLines={1}
                    style={{ fontSize: t(14), fontFamily: fuenteValor }}
                  >
                    Total
                  </Text>
                  <Text
                    className="text-[#2B2420] font-extrabold ml-2"
                    numberOfLines={1}
                    style={{ fontSize: t(24), fontFamily: fuenteValor }}
                  >
                    S/ 48.00
                  </Text>
                </View>
              </View>

              <Texto className="text-xs font-bold uppercase tracking-wide mt-6 mb-2" style={{ color: tema.textSecondary }}>
                Tamaño de las letras
              </Texto>
              <View className="flex-row items-center justify-between gap-2 rounded-2xl px-3 py-4 border" style={{ backgroundColor: tema.surface, borderColor: tema.border }}>
                <BotonTamano
                  onPress={() => disminuir()}
                  disabled={alMinimo}
                  icono="minus"
                  etiqueta="A-"
                />
                <View className="flex-1 items-center" style={{ minWidth: 0 }}>
                  <Texto className="text-[11px] font-bold uppercase" numberOfLines={1} style={{ color: tema.textSecondary }}>
                    Tamaño actual
                  </Texto>
                  <Texto className="font-extrabold text-2xl" numberOfLines={1} style={{ color: tema.textPrimary }}>
                    {Math.round(escala * 100)}%
                  </Texto>
                </View>
                <BotonTamano
                  onPress={() => aumentar()}
                  disabled={alMaximo}
                  icono="plus"
                  etiqueta="A+"
                />
              </View>

              <ScalePressable onPress={() => restablecer()} pressedScale={0.97} className="self-center mt-3">
                <Texto className="font-bold text-xs" style={{ color: tema.accent }}>⟲ Restablecer tamaño</Texto>
              </ScalePressable>

              <Texto className="text-xs font-bold uppercase tracking-wide mt-6 mb-2" style={{ color: tema.textSecondary }}>
                Tipo de letra
              </Texto>
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
                      <Texto
                        className="font-bold text-sm"
                        numberOfLines={1}
                        style={
                          familiaPara(f)
                            ? { fontFamily: familiaPara(f), color: activa ? tema.onPrimary : tema.textSecondary }
                            : { color: activa ? tema.onPrimary : tema.textSecondary }
                        }
                      >
                        {nombreFuente(f)}
                      </Texto>
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