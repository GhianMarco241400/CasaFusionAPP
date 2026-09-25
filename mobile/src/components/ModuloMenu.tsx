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
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
import { ScalePressable } from './ScalePressable';

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
  const { t } = useTema();
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
      <View className="flex-row rounded-full p-1 mb-4" style={{ backgroundColor: t.surface }}>
        {(['fondos', 'entradas', 'extras', 'especiales'] as const).map((opcion) => {
          const activa = itemTipo === opcion;
          return (
            <Pressable
              key={opcion}
              onPress={() => {
                hapticImpact();
                setItemTipo(opcion);
              }}
              className="flex-1 rounded-full py-2 items-center"
              style={activa ? { backgroundColor: t.yape } : undefined}
            >
              <Text
                className="font-bold"
                style={activa ? { color: t.onPrimary } : { color: t.textSecondary }}
              >
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
          <Text className="text-base mt-10 text-center" style={{ color: t.textSecondary }}>
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
              className="rounded-xl border px-4 py-3 mb-3 flex-row items-center justify-between"
              style={{ backgroundColor: t.surface, borderColor: t.border }}
            >
              <ScalePressable onPress={() => abrirEditar(item)} className="flex-1">
                <Text className="font-semibold text-base" style={{ color: t.textPrimary }}>{item.name}</Text>
                <Text className="text-sm mt-0.5" style={{ color: t.textSecondary }}>{etiqueta}</Text>
              </ScalePressable>
              <Pressable
                onPress={() => pedirBorrar(item)}
                hitSlop={8}
                className="ml-4 w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: t.chip }}
              >
                <Text className="font-bold" style={{ color: t.primary }}>✕</Text>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      <View className="pt-3 pb-5">
        <ScalePressable
          onPress={abrirNuevo}
          className="rounded-full py-4 items-center"
          style={{ backgroundColor: t.primary }}
        >
          <Text className="font-bold text-base" style={{ color: t.onPrimary }}>
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
          <Pressable className="flex-1" style={{ backgroundColor: alpha(t.overlay, 50) }} onPress={() => setModalAbierto(false)}>
            <Animated.View entering={FadeIn.duration(200)} className="flex-1" />
          </Pressable>
          <Animated.View
            entering={FadeInDown.duration(250)}
            className="rounded-t-3xl border px-6 pt-6 pb-8"
            style={{ backgroundColor: t.surfaceElevated, borderColor: t.border }}
          >
            <Text className="text-lg font-bold mb-4" style={{ color: t.textPrimary }}>
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

            <Text className="text-sm mb-1" style={{ color: t.textSecondary }}>Nombre</Text>
            <TextInput
              className="rounded-lg text-base px-4 py-3 mb-4"
              style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
              placeholder={
                itemTipo === 'entradas'
                  ? 'Ej. Papas fritas'
                  : itemTipo === 'extras'
                    ? 'Ej. Gaseosa Inca Kola'
                    : itemTipo === 'especiales'
                      ? 'Ej. Seco de cabrito'
                      : 'Ej. Lomo Saltado'
              }
              placeholderTextColor={t.placeholder}
              value={nombre}
              onChangeText={setNombre}
            />

            {esDish ? (
              <>
                <Text className="text-sm mb-1" style={{ color: t.textSecondary }}>Precio (S/)</Text>
                <TextInput
                  className="rounded-lg text-base px-4 py-3 mb-4"
                  style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
                  placeholder="0.00"
                  placeholderTextColor={t.placeholder}
                  keyboardType="decimal-pad"
                  value={precio}
                  onChangeText={setPrecio}
                />
              </>
            ) : (
              <View className="rounded-lg px-4 py-3 mb-4" style={{ backgroundColor: t.inputBg }}>
                <Text className="text-sm" style={{ color: t.textSecondary }}>
                  Incluida con el plato, sin costo extra
                </Text>
              </View>
            )}

            {esDish && (
              <>
                <Text className="text-sm mb-1" style={{ color: t.textSecondary }}>Imagen (URL) — opcional</Text>
                <TextInput
                  className="rounded-lg text-base px-4 py-3 mb-2"
                  style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
                  placeholder="https://..."
                  placeholderTextColor={t.placeholder}
                  value={imagen}
                  onChangeText={setImagen}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {imagen.trim() !== '' && (
                  <View className="mb-4">
                    <Image
                      source={{ uri: imagen.trim() }}
                      className="w-24 h-24 rounded-xl"
                      style={{ backgroundColor: t.chip }}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </>
            )}

            {errorForm !== '' && (
              <Text className="text-sm mb-3" style={{ color: t.primary }}>{errorForm}</Text>
            )}

            <ScalePressable onPress={guardar} className="rounded-full py-4 items-center" style={{ backgroundColor: t.primary }}>
              <Text className="font-bold text-base" style={{ color: t.onPrimary }}>{editando ? 'Guardar cambios' : 'Agregar'}</Text>
            </ScalePressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={aBorrar !== null} transparent animationType="none" onRequestClose={() => setABorrar(null)}>
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: alpha(t.overlay, 50) }}>
          <Animated.View
            entering={FadeInDown.duration(200)}
            className="rounded-2xl border p-6 w-full max-w-sm"
            style={{ backgroundColor: t.surfaceElevated, borderColor: t.border }}
          >
            <Text className="font-bold text-lg mb-2" style={{ color: t.textPrimary }}>Eliminar {aBorrar?.name ?? ''}?</Text>
            <Text className="text-sm mb-5" style={{ color: t.textSecondary }}>
              Se desactivará y dejará de aparecer en el menú. Podrás regenerarlo después.
            </Text>
            <View className="flex-row gap-3">
              <ScalePressable
                onPress={() => setABorrar(null)}
                className="flex-1 rounded-full py-3 items-center"
                style={{ backgroundColor: t.chip }}
              >
                <Text className="font-semibold" style={{ color: t.textSecondary }}>Cancelar</Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => {
                  if (aBorrar) {
                    mutacionBorrar.mutate({ tipo: itemTipo === 'entradas' ? 'entradas' : itemTipo, id: aBorrar.id });
                  }
                }}
                className="flex-1 rounded-full py-3 items-center"
                style={{ backgroundColor: t.primary }}
              >
                <Text className="font-semibold" style={{ color: t.onPrimary }}>Eliminar</Text>
              </ScalePressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}