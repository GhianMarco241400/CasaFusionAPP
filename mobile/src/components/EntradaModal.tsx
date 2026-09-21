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
            <Animated.View entering={FadeIn.duration(180)} className="flex-1 bg-[#130F0C]/90" />
          </Pressable>

          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(190)}
            className="bg-[#2B2420] border-t-2 border-[#3A322B] rounded-t-3xl px-6 pt-6 pb-8"
          >
            <View className="w-12 h-1.5 rounded-full bg-[#3A322B] self-center mb-5" />
            <Text className="text-[#F7F2E9] text-lg font-extrabold mb-1">Elegir entrada</Text>
            <Text className="text-[#8C7F6E] text-sm mb-4">
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
                className={`rounded-xl border-2 px-4 py-3 mb-4 ${
                  draftPersonalizada
                    ? 'bg-[#6C4FBF] border-[#6C4FBF]'
                    : 'bg-[#EAE2F8] border-dashed border-[#6C4FBF]'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text
                      className={`text-sm font-bold ${draftPersonalizada ? 'text-[#F7F2E9]' : 'text-[#6C4FBF]'}`}
                    >
                      ✚ Entrada personalizada
                    </Text>
                    {draftPersonalizada && !mostrarFormPersonalizada && (
                      <Text className="text-[#F7F2E9]/80 text-xs mt-1">
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
                      <View className="w-6 h-6 rounded-full bg-[#F7F2E9] items-center justify-center">
                        <Text className="text-[#6C4FBF] text-xs font-bold leading-none">✕</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center ${
                        draftPersonalizada ? 'bg-[#F7F2E9]' : 'bg-[#6C4FBF]'
                      }`}
                    >
                      <Text
                        className={`text-sm font-extrabold leading-none ${
                          draftPersonalizada ? 'text-[#6C4FBF]' : 'text-[#F7F2E9]'
                        }`}
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
                  className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mb-3"
                  placeholder="Nombre de la entrada extra"
                  placeholderTextColor="#B8AC9B"
                  value={nombreCustom}
                  onChangeText={setNombreCustom}
                />
                <TextInput
                  className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mb-3"
                  placeholder="Precio (S/)"
                  placeholderTextColor="#B8AC9B"
                  keyboardType="decimal-pad"
                  value={precioCustom}
                  onChangeText={setPrecioCustom}
                />
                <ScalePressable
                  onPress={handleAddPersonalizada}
                  pressedScale={0.96}
                  className="bg-[#6C4FBF] rounded-full py-3 mb-2"
                >
                  <Text className="text-[#F7F2E9] text-center font-bold">
                    Agregar entrada extra
                  </Text>
                </ScalePressable>
              </View>
            )}

            <View className="flex-row items-center gap-2 mb-2">
              <View className="flex-1 h-px bg-[#3A322B]" />
              <Text className="text-[#8C7F6E] text-xs font-semibold uppercase tracking-wider">
                Entradas incluidas
              </Text>
              <View className="flex-1 h-px bg-[#3A322B]" />
            </View>

            <ScrollView className="max-h-44 mb-2">
              {entradas.map((entrada, i) => {
                const activa = draftEntrada?.name === entrada.name;
                return (
                  <View key={entrada.id}>
                    {i > 0 && <View className="h-px bg-[#3A322B]" />}
                    <ScalePressable
                      onPress={() => handleSelectFree(entrada)}
                      pressedScale={0.98}
                      className="py-3 flex-row items-center justify-between"
                    >
                      <Text className="text-[#F7F2E9] text-base flex-1 pr-3">{entrada.name}</Text>
                      <View
                        className={`rounded-full px-3 py-1 ${
                          activa ? 'bg-[#4D7C4D]' : 'bg-[#1E1A17]'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${activa ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}
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
              <Text className="text-[#8C7F6E] text-center">Sin entrada</Text>
            </ScalePressable>

            <View className="h-px bg-[#3A322B] my-1" />

            <ScalePressable
              onPress={handleGuardar}
              pressedScale={0.96}
              className="bg-[#D4432B] rounded-full py-3.5 mt-2"
            >
              <Text className="text-[#F7F2E9] text-center font-bold text-base">Guardar</Text>
            </ScalePressable>

            <ScalePressable onPress={close} pressedScale={0.98} className="py-2">
              <Text className="text-[#8C7F6E] text-center">Cancelar</Text>
            </ScalePressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
