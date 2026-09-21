// src/components/PlatoModal.tsx
import { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ScalePressable } from './ScalePressable';
import { ParaLlevarCheck, TAPERO_DEFAULT } from './ParaLlevarCheck';

export type PlatoDatos = {
  name: string;
  price: number;
  entrada?: { name: string; price: number };
  paraLlevar?: boolean;
  taperoPrecio?: number;
};

type Props = {
  visible: boolean;
  titulo: string;
  inicial?: PlatoDatos;
  parallevarDefault?: boolean;
  mostrarParallevar?: boolean;
  onClose: () => void;
  onConfirm: (datos: PlatoDatos) => void;
};

function haptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function PlatoModal({
  visible,
  titulo,
  inicial,
  parallevarDefault = false,
  mostrarParallevar = true,
  onClose,
  onConfirm,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [nombreEntrada, setNombreEntrada] = useState('');
  const [precioEntrada, setPrecioEntrada] = useState('');
  const [parallevar, setParallevar] = useState(false);
  const [taperoTexto, setTaperoTexto] = useState('1');

  useEffect(() => {
    if (visible) {
      setNombre(inicial?.name ?? '');
      setPrecio(inicial ? String(inicial.price) : '');
      setNombreEntrada(inicial?.entrada?.name ?? '');
      setPrecioEntrada(inicial?.entrada ? String(inicial.entrada.price) : '');
      setParallevar(inicial?.paraLlevar ?? parallevarDefault);
      setTaperoTexto(inicial?.taperoPrecio ? String(inicial.taperoPrecio) : '1');
    }
  }, [visible, inicial, parallevarDefault]);

  function close() {
    haptic();
    onClose();
  }

  function handleConfirm() {
    const precioNum = parseFloat(precio);
    const platoValido = nombre.trim().length > 0 && !isNaN(precioNum) && precioNum > 0;
    const nombreEntradaOk = nombreEntrada.trim();
    const precioEntradaNum = parseFloat(precioEntrada);
    const entradaValida = nombreEntradaOk.length > 0 && !isNaN(precioEntradaNum) && precioEntradaNum > 0;

    if (!platoValido && !entradaValida) return;

    haptic();
    onConfirm(
      platoValido
        ? {
            name: nombre.trim(),
            price: precioNum,
            entrada: entradaValida
              ? { name: nombreEntradaOk, price: precioEntradaNum }
              : undefined,
            paraLlevar: parallevar || undefined,
            taperoPrecio: parallevar ? parseFloat(taperoTexto) || TAPERO_DEFAULT : undefined,
          }
        : {
            name: nombreEntradaOk,
            price: precioEntradaNum,
            entrada: undefined,
            paraLlevar: parallevar || undefined,
            taperoPrecio: parallevar ? parseFloat(taperoTexto) || TAPERO_DEFAULT : undefined,
          }
    );
    setNombre('');
    setPrecio('');
    setNombreEntrada('');
    setPrecioEntrada('');
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-end">
          <Pressable className="flex-1" onPress={close}>
            <Animated.View entering={FadeIn.duration(180)} className="flex-1 bg-[#130F0C]/90" />
          </Pressable>

          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(190)}
            className="bg-[#2B2420] border-t-2 border-[#3A322B] rounded-t-3xl px-6 pt-6 pb-8"
          >
            <View className="w-12 h-1.5 rounded-full bg-[#3A322B] self-center mb-5" />
            <Text className="text-[#F7F2E9] text-lg font-extrabold mb-4">{titulo}</Text>

            <TextInput
              className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mb-3"
              placeholder="Nombre del plato"
              placeholderTextColor="#B8AC9B"
              value={nombre}
              onChangeText={setNombre}
            />
            <TextInput
              className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mb-3"
              placeholder="Precio (S/)"
              placeholderTextColor="#B8AC9B"
              keyboardType="decimal-pad"
              value={precio}
              onChangeText={setPrecio}
            />

            {mostrarParallevar && (
              <ParaLlevarCheck
                activo={parallevar}
                taperoTexto={taperoTexto}
                onToggle={() => setParallevar((v) => !v)}
                onTaperoChange={setTaperoTexto}
              />
            )}

            <View className="flex-row items-center gap-2 my-1">
              <View className="flex-1 h-px bg-[#3A322B]" />
              <Text className="text-[#8C7F6E] text-xs font-semibold uppercase tracking-wider">
                Entrada (opcional)
              </Text>
              <View className="flex-1 h-px bg-[#3A322B]" />
            </View>

            <TextInput
              className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mt-3 mb-3"
              placeholder="Nombre de la entrada"
              placeholderTextColor="#B8AC9B"
              value={nombreEntrada}
              onChangeText={setNombreEntrada}
            />
            <TextInput
              className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mb-4"
              placeholder="Precio de la entrada (S/)"
              placeholderTextColor="#B8AC9B"
              keyboardType="decimal-pad"
              value={precioEntrada}
              onChangeText={setPrecioEntrada}
            />

            <ScalePressable
              onPress={handleConfirm}
              pressedScale={0.96}
              disabled={
                !(
                  (nombre.trim().length > 0 && !isNaN(parseFloat(precio)) && parseFloat(precio) > 0) ||
                  (nombreEntrada.trim().length > 0 && !isNaN(parseFloat(precioEntrada)) && parseFloat(precioEntrada) > 0)
                )
              }
              className="bg-[#6C4FBF] rounded-full py-3 mb-2"
            >
              <Text className="text-[#F7F2E9] text-center font-bold text-base">
                {inicial ? 'Guardar cambios' : 'Agregar a comanda'}
              </Text>
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