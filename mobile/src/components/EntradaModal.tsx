import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Entrada } from '../types';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
import { ScalePressable } from './ScalePressable';
import { ParaLlevarCheck, TAPERO_DEFAULT } from './ParaLlevarCheck';

export type EntradaConfirmResult = {
  entrada?: { name: string; price: number };
  entradaPersonalizada?: { name: string; price: number };
  paraLlevar?: boolean;
  taperoPrecio?: number;
};

type Props = {
  visible: boolean;
  entradas: Entrada[];
  inicial?: EntradaConfirmResult;
  parallevarDefault?: boolean;
  mostrarParallevar?: boolean;
  onClose: () => void;
  onConfirm: (res: EntradaConfirmResult) => void;
};

function haptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function EntradaModal({
  visible,
  entradas,
  inicial,
  parallevarDefault = false,
  mostrarParallevar = true,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTema();
  const [draftEntrada, setDraftEntrada] = useState<{ name: string; price: number } | undefined>(
    undefined
  );
  const [draftPersonalizada, setDraftPersonalizada] = useState<
    { name: string; price: number } | undefined
  >(undefined);
  const [mostrarFormPersonalizada, setMostrarFormPersonalizada] = useState(false);
  const [nombreCustom, setNombreCustom] = useState('');
  const [precioCustom, setPrecioCustom] = useState('');
  const [parallevar, setParallevar] = useState(false);
  const [taperoTexto, setTaperoTexto] = useState('1');

  useEffect(() => {
    if (visible) {
      setDraftEntrada(inicial?.entrada);
      setDraftPersonalizada(inicial?.entradaPersonalizada);
      setMostrarFormPersonalizada(false);
      setNombreCustom('');
      setPrecioCustom('');
      setParallevar(inicial?.paraLlevar ?? parallevarDefault);
      setTaperoTexto(inicial?.taperoPrecio ? String(inicial.taperoPrecio) : '1');
    }
  }, [visible, inicial, parallevarDefault]);

  function close() {
    haptic();
    onClose();
  }

  function handleGuardar() {
    haptic();
    onConfirm({
      entrada: draftEntrada,
      entradaPersonalizada: draftPersonalizada,
      paraLlevar: parallevar || undefined,
      taperoPrecio: parallevar ? parseFloat(taperoTexto) || TAPERO_DEFAULT : undefined,
    });
  }

  function handleSelectFree(entrada: Entrada) {
    haptic();
    if (draftEntrada?.name === entrada.name) {
      setDraftEntrada(undefined);
    } else {
      setDraftEntrada({ name: entrada.name, price: 0 });
    }
  }

  function handleAddPersonalizada() {
    const precio = parseFloat(precioCustom);
    if (!nombreCustom.trim() || isNaN(precio) || precio <= 0) return;
    haptic();
    setDraftPersonalizada({ name: nombreCustom.trim(), price: precio });
    setNombreCustom('');
    setPrecioCustom('');
    setMostrarFormPersonalizada(false);
  }

  function handleRemovePersonalizada() {
    haptic();
    setDraftPersonalizada(undefined);
  }

  function handleSinEntrada() {
    haptic();
    setDraftEntrada(undefined);
    setDraftPersonalizada(undefined);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          <Pressable className="flex-1" onPress={close}>
            <Animated.View entering={FadeIn.duration(180)} className="flex-1" style={{ backgroundColor: alpha(t.overlay, 90) }} />
          </Pressable>

          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(190)}
            className="border-t-2 rounded-t-3xl px-6 pt-6 pb-8"
            style={{ backgroundColor: t.surfaceElevated, borderTopColor: t.border }}
          >
            <View className="w-12 h-1.5 rounded-full self-center mb-5" style={{ backgroundColor: t.border }} />
            <Text className="text-lg font-extrabold mb-1" style={{ color: t.textPrimary }}>Elegir entrada</Text>
            <Text className="text-sm mb-4" style={{ color: t.textSecondary }}>
              Cada plato incluye un acompañamiento.
            </Text>

            {mostrarParallevar && (
              <ParaLlevarCheck
                activo={parallevar}
                taperoTexto={taperoTexto}
                onToggle={() => setParallevar((v) => !v)}
                onTaperoChange={setTaperoTexto}
              />
            )}

            <ScalePressable
              onPress={() => {
                haptic();
                setMostrarFormPersonalizada(!mostrarFormPersonalizada);
              }}
              pressedScale={0.98}
            >
              <View
                className={`rounded-xl border-2 px-4 py-3 mb-4 ${draftPersonalizada ? '' : 'border-dashed'}`}
                style={
                  draftPersonalizada
                    ? { backgroundColor: t.yape, borderColor: t.yape }
                    : { backgroundColor: t.extrasSheet, borderColor: t.yape }
                }
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text
                      className="text-sm font-bold"
                      style={draftPersonalizada ? { color: t.onPrimary } : { color: t.yape }}
                    >
                      ✚ Entrada personalizada
                    </Text>
                    {draftPersonalizada && !mostrarFormPersonalizada && (
                      <Text className="text-xs mt-1" style={{ color: alpha(t.onPrimary, 80) }}>
                        {draftPersonalizada.name} · S/ {draftPersonalizada.price.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  {draftPersonalizada && !mostrarFormPersonalizada ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemovePersonalizada();
                      }}
                      hitSlop={8}
                    >
                      <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: t.onPrimary }}>
                        <Text className="text-xs font-bold leading-none" style={{ color: t.yape }}>✕</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={draftPersonalizada ? { backgroundColor: t.onPrimary } : { backgroundColor: t.yape }}
                    >
                      <Text
                        className="text-sm font-extrabold leading-none"
                        style={draftPersonalizada ? { color: t.yape } : { color: t.onPrimary }}
                      >
                        {draftPersonalizada ? '✓' : '+'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScalePressable>

            {mostrarFormPersonalizada && (
              <View className="mb-4">
                <TextInput
                  className="rounded-xl text-base px-4 py-3 mb-3"
                  style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
                  placeholder="Nombre de la entrada extra"
                  placeholderTextColor={t.placeholder}
                  value={nombreCustom}
                  onChangeText={setNombreCustom}
                />
                <TextInput
                  className="rounded-xl text-base px-4 py-3 mb-3"
                  style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
                  placeholder="Precio (S/)"
                  placeholderTextColor={t.placeholder}
                  keyboardType="decimal-pad"
                  value={precioCustom}
                  onChangeText={setPrecioCustom}
                />
                <ScalePressable
                  onPress={handleAddPersonalizada}
                  pressedScale={0.96}
                  className="rounded-full py-3 mb-2"
                  style={{ backgroundColor: t.yape }}
                >
                  <Text className="text-center font-bold" style={{ color: t.onPrimary }}>
                    Agregar entrada extra
                  </Text>
                </ScalePressable>
              </View>
            )}

            <View className="flex-row items-center gap-2 mb-2">
              <View className="flex-1 h-px" style={{ backgroundColor: t.border }} />
              <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>
                Entradas incluidas
              </Text>
              <View className="flex-1 h-px" style={{ backgroundColor: t.border }} />
            </View>

            <ScrollView className="max-h-44 mb-2">
              {entradas.map((entrada, i) => {
                const activa = draftEntrada?.name === entrada.name;
                return (
                  <View key={entrada.id}>
                    {i > 0 && <View className="h-px" style={{ backgroundColor: t.border }} />}
                    <ScalePressable
                      onPress={() => handleSelectFree(entrada)}
                      pressedScale={0.98}
                      className="py-3 flex-row items-center justify-between"
                    >
                      <Text className="text-base flex-1 pr-3" style={{ color: t.textPrimary }}>{entrada.name}</Text>
                      <View
                        className="rounded-full px-3 py-1"
                        style={activa ? { backgroundColor: t.success } : { backgroundColor: t.chip }}
                      >
                        <Text
                          className="text-sm font-semibold"
                          style={activa ? { color: t.onPrimary } : { color: t.textSecondary }}
                        >
                          {activa ? '✓ Incluida' : 'Incluida'}
                        </Text>
                      </View>
                    </ScalePressable>
                  </View>
                );
              })}
            </ScrollView>

            <ScalePressable onPress={handleSinEntrada} pressedScale={0.98} className="py-2 mb-1">
              <Text className="text-center" style={{ color: t.textSecondary }}>Sin entrada</Text>
            </ScalePressable>

            <View className="h-px my-1" style={{ backgroundColor: t.border }} />

            <ScalePressable
              onPress={handleGuardar}
              pressedScale={0.96}
              className="rounded-full py-3.5 mt-2"
              style={{ backgroundColor: t.primary }}
            >
              <Text className="text-center font-bold text-base" style={{ color: t.onPrimary }}>Guardar</Text>
            </ScalePressable>

            <ScalePressable onPress={close} pressedScale={0.98} className="py-2">
              <Text className="text-center" style={{ color: t.textSecondary }}>Cancelar</Text>
            </ScalePressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
