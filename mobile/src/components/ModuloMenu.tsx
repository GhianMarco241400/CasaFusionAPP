// src/components/ModuloMenu.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  getDishes,
  getEntradas,
  getCategories,
  createDish,
  updateDish,
  deleteDish,
  createEntrada,
  updateEntrada,
  deleteEntrada,
} from '../services/menu';
import { Dish, Entrada } from '../types';
import { ScalePressable } from './ScalePressable';

const COLOR = {
  placeholder: '#B8AC9B',
};

function hapticImpact() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function hapticWarning() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function ModuloMenu() {
  const [itemTipo, setItemTipo] = useState<'fondos' | 'entradas' | 'extras' | 'especiales'>('fondos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Dish | Entrada | null>(null);
  const [aBorrar, setABorrar] = useState<Dish | Entrada | null>(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState('');
  const [errorForm, setErrorForm] = useState('');

  const queryClient = useQueryClient();
  const { data: dishes = [] } = useQuery({ queryKey: ['dishes'], queryFn: getDishes });
  const { data: entradas = [] } = useQuery({ queryKey: ['entradas'], queryFn: getEntradas });
  const { data: categorias = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const fondosId = categorias.find((c) => c.name === 'Fondos')?.id ?? '';
  const extrasId = categorias.find((c) => c.name === 'Extras')?.id ?? '';
  const especialesId = categorias.find((c) => c.name === 'Especiales')?.id ?? '';

  const mutacionBorrar = useMutation({
    mutationFn: async ({ tipo, id }: { tipo: 'fondos' | 'entradas' | 'extras' | 'especiales'; id: string }) => {
      if (tipo === 'entradas') await deleteEntrada(id);
      else await deleteDish(id);
    },
    onSuccess: () => {
      hapticSuccess();
      setABorrar(null);
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      queryClient.invalidateQueries({ queryKey: ['entradas'] });
    },
  });

  function abrirNuevo() {
    hapticImpact();
    setEditando(null);
    setNombre('');
    setPrecio('');
    setImagen('');
    setErrorForm('');
    setModalAbierto(true);
  }

  function abrirEditar(item: Dish | Entrada) {
    hapticImpact();
    setEditando(item);
    setNombre(item.name);
    setPrecio('categoryId' in item ? Number(item.price).toString() : '');
    setImagen('image' in item ? item.image ?? '' : '');
    setErrorForm('');
    setModalAbierto(true);
  }

  function pedirBorrar(item: Dish | Entrada) {
    hapticWarning();
    setABorrar(item);
  }

  async function guardar() {
    const nombreLimpio = nombre.trim();
    const esDish = itemTipo !== 'entradas';
    if (!nombreLimpio) {
      setErrorForm('El nombre es obligatorio');
      return;
    }
    if (esDish) {
      const precioNum = parseFloat(precio);
      if (Number.isNaN(precioNum) || precioNum < 0) {
        setErrorForm('Nombre y precio válidos son obligatorios');
        return;
      }
    }
    try {
      if (editando) {
        if ('categoryId' in editando) {
          await updateDish(editando.id, {
            name: nombreLimpio,
            price: parseFloat(precio),
            categoryId: editando.categoryId,
            image: imagen.trim() || undefined,
          });
        } else {
          await updateEntrada(editando.id, { name: nombreLimpio });
        }
      } else {
        if (esDish) {
          await createDish({
            name: nombreLimpio,
            price: parseFloat(precio),
            categoryId: itemTipo === 'extras' ? extrasId : itemTipo === 'especiales' ? especialesId : fondosId,
            image: imagen.trim() || undefined,
          });
        } else {
          await createEntrada({ name: nombreLimpio });
        }
      }
      hapticSuccess();
      setModalAbierto(false);
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      queryClient.invalidateQueries({ queryKey: ['entradas'] });
    } catch {
      setErrorForm('No se pudo guardar. Revisa la conexión.');
    }
  }

  const esDish = itemTipo !== 'entradas';
  const lista: (Dish | Entrada)[] = itemTipo === 'entradas'
    ? entradas
    : dishes.filter((d) =>
        itemTipo === 'extras'
          ? d.categoryId === extrasId
          : itemTipo === 'especiales'
            ? d.categoryId === especialesId
            : d.categoryId === fondosId
      );

  return (
    <View className="flex-1">
      <View className="flex-row bg-[#2B2420] rounded-full p-1 mb-4">
        {(['fondos', 'entradas', 'extras', 'especiales'] as const).map((opcion) => {
          const activa = itemTipo === opcion;
          return (
            <Pressable
              key={opcion}
              onPress={() => {
                hapticImpact();
                setItemTipo(opcion);
              }}
              className={`flex-1 rounded-full py-2 items-center ${activa ? 'bg-[#6C4FBF]' : ''}`}
            >
              <Text className={`font-bold ${activa ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                {opcion === 'fondos'
                  ? 'Fondos'
                  : opcion === 'entradas'
                    ? 'Entradas'
                    : opcion === 'extras'
                      ? 'Extras'
                      : 'Especiales'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        className="flex-1"
        data={lista}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text className="text-[#8C7F6E] text-base mt-10 text-center">
            Sin {itemTipo === 'fondos'
              ? 'fondos'
              : itemTipo === 'entradas'
                ? 'entradas'
                : itemTipo === 'extras'
                  ? 'extras'
                  : 'especiales'} todavía
          </Text>
        }
        renderItem={({ item }) => {
          const esPlatoItem = 'categoryId' in item;
          const etiqueta = esPlatoItem
            ? `S/ ${item.price.toFixed(2)} · ${categorias.find((c) => c.id === item.categoryId)?.name ?? '—'}`
            : 'Incluida con el plato';
          return (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOut.duration(150)}
              className="bg-[#2B2420] rounded-xl border border-[#3A322B] px-4 py-3 mb-3 flex-row items-center justify-between"
            >
              <ScalePressable onPress={() => abrirEditar(item)} className="flex-1">
                <Text className="text-[#F7F2E9] font-semibold text-base">{item.name}</Text>
                <Text className="text-[#8C7F6E] text-sm mt-0.5">{etiqueta}</Text>
              </ScalePressable>
              <Pressable
                onPress={() => pedirBorrar(item)}
                hitSlop={8}
                className="ml-4 w-9 h-9 rounded-full bg-[#1E1A17] items-center justify-center"
              >
                <Text className="text-[#D4432B] font-bold">✕</Text>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      <View className="pt-3 pb-5">
        <ScalePressable
          onPress={abrirNuevo}
          className="bg-[#D4432B] rounded-full py-4 items-center"
        >
          <Text className="text-[#F7F2E9] font-bold text-base">
            {itemTipo === 'entradas'
              ? '+ Agregar entrada'
              : itemTipo === 'extras'
                ? '+ Agregar extra'
                : itemTipo === 'especiales'
                  ? '+ Agregar especial'
                  : '+ Agregar fondo'}
          </Text>
        </ScalePressable>
      </View>

      <Modal visible={modalAbierto} transparent animationType="none" onRequestClose={() => setModalAbierto(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <Pressable className="flex-1 bg-black/50" onPress={() => setModalAbierto(false)}>
            <Animated.View entering={FadeIn.duration(200)} className="flex-1" />
          </Pressable>
          <Animated.View
            entering={FadeInDown.duration(250)}
            className="bg-[#2B2420] rounded-t-3xl border border-[#3A322B] px-6 pt-6 pb-8"
          >
            <Text className="text-[#F7F2E9] text-lg font-bold mb-4">
              {editando
                ? 'Editar'
                : itemTipo === 'entradas'
                  ? 'Nueva entrada'
                  : itemTipo === 'extras'
                    ? 'Nuevo extra'
                    : itemTipo === 'especiales'
                      ? 'Nuevo especial'
                      : 'Nuevo fondo'}
            </Text>

            <Text className="text-[#8C7F6E] text-sm mb-1">Nombre</Text>
            <TextInput
              className="bg-[#1E1A17] rounded-lg text-[#F7F2E9] text-base px-4 py-3 mb-4"
              placeholder={
                itemTipo === 'entradas'
                  ? 'Ej. Papas fritas'
                  : itemTipo === 'extras'
                    ? 'Ej. Gaseosa Inca Kola'
                    : itemTipo === 'especiales'
                      ? 'Ej. Seco de cabrito'
                      : 'Ej. Lomo Saltado'
              }
              placeholderTextColor={COLOR.placeholder}
              value={nombre}
              onChangeText={setNombre}
            />

            {esDish ? (
              <>
                <Text className="text-[#8C7F6E] text-sm mb-1">Precio (S/)</Text>
                <TextInput
                  className="bg-[#1E1A17] rounded-lg text-[#F7F2E9] text-base px-4 py-3 mb-4"
                  placeholder="0.00"
                  placeholderTextColor={COLOR.placeholder}
                  keyboardType="decimal-pad"
                  value={precio}
                  onChangeText={setPrecio}
                />
              </>
            ) : (
              <View className="bg-[#1E1A17] rounded-lg px-4 py-3 mb-4">
                <Text className="text-[#8C7F6E] text-sm">
                  Incluida con el plato, sin costo extra
                </Text>
              </View>
            )}

            {esDish && (
              <>
                <Text className="text-[#8C7F6E] text-sm mb-1">Imagen (URL) — opcional</Text>
                <TextInput
                  className="bg-[#1E1A17] rounded-lg text-[#F7F2E9] text-base px-4 py-3 mb-2"
                  placeholder="https://..."
                  placeholderTextColor={COLOR.placeholder}
                  value={imagen}
                  onChangeText={setImagen}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {imagen.trim() !== '' && (
                  <View className="mb-4">
                    <Image
                      source={{ uri: imagen.trim() }}
                      className="w-24 h-24 rounded-xl bg-[#1E1A17]"
                      resizeMode="cover"
                    />
                  </View>
                )}
              </>
            )}

            {errorForm !== '' && (
              <Text className="text-[#D4432B] text-sm mb-3">{errorForm}</Text>
            )}

            <ScalePressable onPress={guardar} className="bg-[#D4432B] rounded-full py-4 items-center">
              <Text className="text-[#F7F2E9] font-bold text-base">{editando ? 'Guardar cambios' : 'Agregar'}</Text>
            </ScalePressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={aBorrar !== null} transparent animationType="none" onRequestClose={() => setABorrar(null)}>
        <View className="flex-1 items-center justify-center px-8 bg-black/50">
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="bg-[#2B2420] rounded-2xl border border-[#3A322B] p-6 w-full max-w-sm"
          >
            <Text className="text-[#F7F2E9] font-bold text-lg mb-2">Eliminar {aBorrar?.name ?? ''}?</Text>
            <Text className="text-[#8C7F6E] text-sm mb-5">
              Se desactivará y dejará de aparecer en el menú. Podrás regenerarlo después.
            </Text>
            <View className="flex-row gap-3">
              <ScalePressable
                onPress={() => setABorrar(null)}
                className="flex-1 bg-[#1E1A17] rounded-full py-3 items-center"
              >
                <Text className="text-[#8C7F6E] font-semibold">Cancelar</Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => {
                  if (aBorrar) {
                    mutacionBorrar.mutate({ tipo: itemTipo === 'entradas' ? 'entradas' : itemTipo, id: aBorrar.id });
                  }
                }}
                className="flex-1 bg-[#D4432B] rounded-full py-3 items-center"
              >
                <Text className="text-[#F7F2E9] font-semibold">Eliminar</Text>
              </ScalePressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}