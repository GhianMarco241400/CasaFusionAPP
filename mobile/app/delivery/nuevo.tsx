// app/delivery/nuevo.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  FadeInDown,
  FadeOut,
  ZoomIn,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { getDishes, getEntradas, getCategories } from '../../src/services/menu';
import { Dish, OrderItem } from '../../src/types';
import { EntradaModal, EntradaConfirmResult } from '../../src/components/EntradaModal';
import { PlatoModal } from '../../src/components/PlatoModal';
import { ScalePressable } from '../../src/components/ScalePressable';
import { useAuth } from '../../src/context/AuthContext';
import { useOrders } from '../../src/context/OrdersContext';
import { Plus, Search, Star, X } from 'lucide-react-native';

function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function DishSkeleton() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-36 rounded-xl px-4 py-3 bg-[#332B25]"
    >
      <View className="h-3.5 rounded-full bg-[#3A322B]" />
      <View className="h-3 rounded-full bg-[#3A322B] w-3/5 mt-2" />
      <View className="h-5 w-16 rounded-full bg-[#3A322B] mt-3" />
    </Animated.View>
  );
}

export default function DeliveryNuevoScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [comanda, setComanda] = useState<OrderItem[]>([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [platoSeleccionado, setPlatoSeleccionado] = useState<Dish | null>(null);
  const [entradaEditIndex, setEntradaEditIndex] = useState<number | null>(null);
  const [notaAbierta, setNotaAbierta] = useState<number | null>(null);
  const [platoModalVisible, setPlatoModalVisible] = useState(false);
  const [platoEditar, setPlatoEditar] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [extrasAbierto, setExtrasAbierto] = useState(false);
  const [busquedaExtras, setBusquedaExtras] = useState('');
  const [especialesAbierto, setEspecialesAbierto] = useState(false);
  const { user } = useAuth();
  const { addOrder, updateOrderItems, orders } = useOrders();

  const editOrder = edit ? orders.find((o) => o.id === edit) : undefined;

  useEffect(() => {
    if (edit && editOrder) {
      setComanda(editOrder.items.map((item) => ({ ...item })));
      setClienteNombre(editOrder.clienteNombre ?? '');
      setTelefono(editOrder.telefono ?? '');
      setDireccion(editOrder.direccion ?? '');
    }
  }, [edit, editOrder]);

  const { data: dishes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dishes'],
    queryFn: getDishes,
  });

  const { data: entradas = [] } = useQuery({
    queryKey: ['entradas'],
    queryFn: getEntradas,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  const extrasId = categorias.find((c) => c.name === 'Extras')?.id;
  const especialesId = categorias.find((c) => c.name === 'Especiales')?.id;
  const menuPrincipal = dishes.filter(
    (d) => d.categoryId !== extrasId && d.categoryId !== especialesId,
  );
  const extras = extrasId ? dishes.filter((d) => d.categoryId === extrasId) : [];
  const especiales = especialesId ? dishes.filter((d) => d.categoryId === especialesId) : [];
  const extrasBuscados = extras.filter((e) =>
    e.name.toLowerCase().includes(busquedaExtras.trim().toLowerCase()),
  );
  const cantExtras = comanda.filter((i) => extras.some((e) => e.id === i.dishId)).length;
  const cantEspeciales = comanda.filter((i) => especiales.some((e) => e.id === i.dishId)).length;

  function handleSelectPlato(dish: Dish) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    setPlatoSeleccionado(dish);
  }

  function handleAgregarExtra(dish: Dish) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    setComanda((prev) => [
      ...prev,
      { dishId: dish.id, name: dish.name, quantity: 1, unitPrice: dish.price, paraLlevar: true, esExtra: true },
    ]);
  }

  function handleConfirmEntrada(res: EntradaConfirmResult) {
    if (!platoSeleccionado) return;

    const nuevoItem: OrderItem = {
      dishId: platoSeleccionado.id,
      name: platoSeleccionado.name,
      quantity: 1,
      unitPrice: platoSeleccionado.price,
      entrada: res.entrada,
      entradaPersonalizada: res.entradaPersonalizada,
      paraLlevar: true,
      taperoPrecio: res.taperoPrecio ?? 1,
    };

    setComanda((prev) => [...prev, nuevoItem]);
    setPlatoSeleccionado(null);
  }

  function abrirPlatoNuevo() {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    setPlatoEditar(null);
    setPlatoModalVisible(true);
  }

  function abrirPlatoEditar(index: number) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    setPlatoEditar(index);
    setPlatoModalVisible(true);
  }

  function handleConfirmPlato(
    datos: { name: string; price: number; entrada?: { name: string; price: number }; paraLlevar?: boolean; taperoPrecio?: number }
  ) {
    hapticSuccess();
    const nuevoItem: OrderItem = {
      name: datos.name,
      quantity: 1,
      unitPrice: datos.price,
      entradaPersonalizada: datos.entrada,
      paraLlevar: true,
      taperoPrecio: datos.taperoPrecio ?? 1,
    };
    setComanda((prev) => {
      if (platoEditar === null) return [...prev, nuevoItem];
      return prev.map((item, i) =>
        i === platoEditar ? { ...item, ...nuevoItem, dishId: undefined } : item
      );
    });
    setPlatoModalVisible(false);
  }

  function handleConfirmEntradaEdicion(res: EntradaConfirmResult) {
    if (entradaEditIndex === null) return;
    setComanda((prev) =>
      prev.map((item, i) =>
        i === entradaEditIndex
          ? {
              ...item,
              entrada: res.entrada,
              entradaPersonalizada: res.entradaPersonalizada,
              paraLlevar: item.paraLlevar,
              taperoPrecio: item.taperoPrecio,
            }
          : item
      )
    );
    setEntradaEditIndex(null);
  }

  function handleToggleEmpaque(index: number) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
    setComanda((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              paraLlevar: !item.paraLlevar,
              taperoPrecio: !item.paraLlevar ? (item.taperoPrecio ?? 1) : undefined,
            }
          : item
      )
    );
  }

  function handleChangeNota(index: number, nota: string) {
    setComanda((prev) =>
      prev.map((item, i) => (i === index ? { ...item, notes: nota } : item))
    );
  }

  function handleChangeCantidad(index: number, delta: number) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
    setComanda((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  }

  function handleRemoveItem(index: number) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setComanda((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleEnviarCocina() {
    if (!user || comanda.length === 0 || enviando) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setEnviando(true);
    setErrorEnvio('');
    const enviada = edit
      ? await updateOrderItems(edit, comanda)
      : await addOrder(0, comanda, { canal: 'delivery', clienteNombre, telefono, direccion });
    if (enviada) {
      hapticSuccess();
      setTimeout(() => router.back(), 750);
    } else {
      setEnviando(false);
      setErrorEnvio(
        edit
          ? 'No se pudo guardar la comanda. Ya no está pendiente o revisa la conexión.'
          : 'No se pudo enviar la comanda. Revisa la conexión.'
      );
    }
  }

  const total = comanda.reduce(
    (acc, item) =>
      acc +
      item.unitPrice * item.quantity +
      (item.entrada?.price ?? 0) +
      (item.entradaPersonalizada?.price ?? 0) +
      (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0),
    0
  );
  const cantItems = comanda.reduce((acc, item) => acc + item.quantity, 0);
  const enComandaCustom = comanda.some((item) => !item.dishId);
  const clienteValido = clienteNombre.trim().length > 0;

  const tilePersonalizado = (
    <Animated.View entering={FadeInDown.duration(220)}>
      <ScalePressable onPress={abrirPlatoNuevo} pressedScale={0.95}>
        <View
          className={`w-36 rounded-xl px-4 py-3 border-2 min-h-[104px] ${
            enComandaCustom
              ? 'bg-[#6C4FBF] border-[#6C4FBF]'
              : 'bg-[#EAE2F8] border-dashed border-[#6C4FBF]'
          }`}
        >
          <View className="flex-row items-start">
            <View className="flex-1 pr-1">
              <Text className={`text-sm font-bold ${enComandaCustom ? 'text-[#F7F2E9]' : 'text-[#6C4FBF]'}`}>
                ✚ Personalizado
              </Text>
              <Text className={`text-xs mt-1 ${enComandaCustom ? 'text-[#F7F2E9]/80' : 'text-[#8C7F6E]'}`}>
                Fondo, entrada y precio
              </Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full items-center justify-center ${
                enComandaCustom ? 'bg-[#F7F2E9]' : 'bg-[#6C4FBF]'
              }`}
            >
              <Text
                className={`text-sm font-extrabold leading-none ${
                  enComandaCustom ? 'text-[#6C4FBF]' : 'text-[#F7F2E9]'
                }`}
              >
                {enComandaCustom ? '✓' : '+'}
              </Text>
            </View>
          </View>
        </View>
      </ScalePressable>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#1E1A17] px-6 pt-14"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center mb-4">
        <ScalePressable
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
            router.back();
          }}
          disabled={enviando}
          className="mr-3"
        >
          <View className="w-11 h-11 rounded-full bg-[#2B2420] border border-[#3A322B] items-center justify-center">
            <Text className="text-[#F7F2E9] text-lg font-bold leading-none">←</Text>
          </View>
        </ScalePressable>
        <View className="flex-1">
          <Text className="text-[#F7F2E9] text-2xl font-extrabold">🛵 Delivery</Text>
          <Text className="text-[#8C7F6E] text-sm">
            {edit
              ? 'Editando pedido del cliente'
              : comanda.length === 0
                ? 'Datos del cliente y platos'
                : `${comanda.length} ${comanda.length === 1 ? 'plato' : 'platos'} en pedido`}
          </Text>
        </View>
      </View>

      <View className="rounded-2xl bg-[#2B2420] border border-[#3A322B] p-4 mb-4">
        <Text className="text-[#F7F2E9] text-sm font-bold mb-2.5">Datos del cliente</Text>
        <TextInput
          className="bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3 mb-2.5"
          placeholder="Nombre *"
          placeholderTextColor="#B8AC9B"
          value={clienteNombre}
          onChangeText={setClienteNombre}
        />
        <View className="flex-row gap-2.5">
          <TextInput
            className="flex-1 bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3"
            placeholder="Teléfono"
            placeholderTextColor="#B8AC9B"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />
          <TextInput
            className="flex-[1.6] bg-[#1E1A17] rounded-xl text-[#F7F2E9] text-base px-4 py-3"
            placeholder="Dirección"
            placeholderTextColor="#B8AC9B"
            value={direccion}
            onChangeText={setDireccion}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[#F7F2E9] text-base font-semibold">Menú</Text>
        {!isLoading && !error && dishes.length > 0 && (
          <View className="bg-[#2B2420] border border-[#3A322B] rounded-full px-3 py-1">
            <Text className="text-[#8C7F6E] text-xs font-semibold">{dishes.length} disponibles</Text>
          </View>
        )}
      </View>

      {isLoading && (
        <Animated.View className="flex-row gap-2.5 mb-1" entering={FadeInDown.duration(200)}>
          <DishSkeleton />
          <DishSkeleton />
          <DishSkeleton />
        </Animated.View>
      )}

      {error && (
        <Animated.View entering={FadeInDown.duration(200)} className="rounded-xl bg-[#2B2420] p-4 mb-4">
          <Text className="text-[#D4432B] mb-2">No se pudo cargar el menú</Text>
          <ScalePressable onPress={() => refetch()}>
            <View className="bg-[#D4432B] rounded-lg py-2 px-4 self-start">
              <Text className="text-[#F7F2E9] font-bold text-sm">Reintentar</Text>
            </View>
          </ScalePressable>
        </Animated.View>
      )}

      {!isLoading && !error && (
        <Animated.FlatList
          data={menuPrincipal}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={tilePersonalizado}
          renderItem={({ item, index }) => {
            const yaEnComanda = comanda.some((c) => c.dishId === item.id);
            return (
              <Animated.View entering={FadeInDown.delay(70 + index * 55).duration(220)}>
                <ScalePressable onPress={() => handleSelectPlato(item)} pressedScale={0.95}>
                  <Animated.View
                    layout={LinearTransition.springify().damping(18)}
                    className={`w-36 rounded-xl px-4 py-3 border-2 min-h-[104px] ${
                      yaEnComanda
                        ? 'bg-[#D4432B] border-[#D4432B]'
                        : 'bg-[#F7F2E9] border-[#F7F2E9]'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${yaEnComanda ? 'text-[#F7F2E9]' : 'text-[#2B2420]'}`}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <View
                      className={`flex-row items-center justify-between mt-2.5 rounded-full py-1 px-2 ${
                        yaEnComanda ? 'bg-[#F7F2E9]/20' : 'bg-[#1E1A17]/10'
                      }`}
                    >
                      <Text className={yaEnComanda ? 'text-[#F7F2E9] text-sm' : 'text-[#8C7F6E] text-sm'}>
                        S/ {item.price}
                      </Text>
                      <Animated.View entering={ZoomIn.duration(150)}>
                        <View
                          className={`w-6 h-6 rounded-full items-center justify-center ${
                            yaEnComanda ? 'bg-[#F7F2E9]' : 'bg-[#1E1A17]/20'
                          }`}
                        >
                          <Text
                            className={`text-center font-extrabold text-sm leading-none ${
                              yaEnComanda ? 'text-[#D4432B]' : 'text-[#2B2420]'
                            }`}
                          >
                            {yaEnComanda ? '✓' : '+'}
                          </Text>
                        </View>
                      </Animated.View>
                    </View>
                  </Animated.View>
                </ScalePressable>
              </Animated.View>
            );
          }}
        />
      )}

      {especiales.length > 0 && (
        <ScalePressable
          onPress={() => {
            hapticImpact();
            setEspecialesAbierto((v) => !v);
          }}
          pressedScale={0.97}
          className="mt-2 mb-0"
        >
          <View className="bg-[#E8A33D] rounded-2xl py-3.5 px-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-full bg-[#2B2420]/15 items-center justify-center">
                <Star size={18} color="#2B2420" strokeWidth={2.5} fill="#2B2420" />
              </View>
              <Text className="text-[#2B2420] font-extrabold text-base">Especial</Text>
              <Text className="text-[#2B2420]/60 text-xs">{especiales.length} disponibles</Text>
            </View>
            <View className="bg-[#2B2420]/15 rounded-full px-3 py-1 flex-row items-center gap-1.5">
              <Text className="text-[#2B2420] text-xs font-bold">
                {cantEspeciales > 0
                  ? `${cantEspeciales} en pedido`
                  : especialesAbierto
                    ? 'Ocultar'
                    : 'Ver'}
              </Text>
            </View>
          </View>
        </ScalePressable>
      )}

      {especialesAbierto && especiales.length > 0 && (
        <Animated.FlatList
          entering={FadeInDown.duration(200)}
          data={especiales}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const yaEnComanda = comanda.some((c) => c.dishId === item.id);
            return (
              <Animated.View entering={FadeInDown.duration(160)}>
                <ScalePressable onPress={() => handleSelectPlato(item)} pressedScale={0.95}>
                  <Animated.View
                    layout={LinearTransition.springify().damping(18)}
                    className={`w-36 rounded-xl px-4 py-3 border-2 min-h-[104px] ${
                      yaEnComanda
                        ? 'bg-[#D4432B] border-[#D4432B]'
                        : 'bg-[#FBF1DF] border-[#E8A33D]/60'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${yaEnComanda ? 'text-[#F7F2E9]' : 'text-[#2B2420]'}`}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <View
                      className={`flex-row items-center justify-between mt-2.5 rounded-full py-1 px-2 ${
                        yaEnComanda ? 'bg-[#F7F2E9]/20' : 'bg-[#E8A33D]/20'
                      }`}
                    >
                      <Text className={yaEnComanda ? 'text-[#F7F2E9] text-sm' : 'text-[#2B2420] text-sm'}>
                        S/ {item.price}
                      </Text>
                      <Animated.View entering={ZoomIn.duration(150)}>
                        <View
                          className={`w-6 h-6 rounded-full items-center justify-center ${
                            yaEnComanda ? 'bg-[#F7F2E9]' : 'bg-[#E8A33D]'
                          }`}
                        >
                          <Text
                            className={`text-center font-extrabold text-sm leading-none ${
                              yaEnComanda ? 'text-[#D4432B]' : 'text-[#2B2420]'
                            }`}
                          >
                            {yaEnComanda ? '✓' : '+'}
                          </Text>
                        </View>
                      </Animated.View>
                    </View>
                  </Animated.View>
                </ScalePressable>
              </Animated.View>
            );
          }}
        />
      )}

      {extras.length > 0 && (
        <ScalePressable
          onPress={() => {
            hapticImpact();
            setBusquedaExtras('');
            setExtrasAbierto(true);
          }}
          pressedScale={0.97}
          className="mt-2 mb-0"
        >
          <View className="bg-[#6C4FBF] rounded-2xl py-3.5 px-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-full bg-[#F7F2E9]/20 items-center justify-center">
                <Plus size={18} color="#F7F2E9" strokeWidth={2.5} />
              </View>
              <Text className="text-[#F7F2E9] font-extrabold text-base">Extras</Text>
              <Text className="text-[#F7F2E9]/60 text-xs">{extras.length} disponibles</Text>
            </View>
            <View className="bg-[#F7F2E9]/20 rounded-full px-3 py-1 flex-row items-center gap-1.5">
              <Text className="text-[#F7F2E9] text-xs font-bold">
                {cantExtras > 0 ? `${cantExtras} en comanda` : 'Ver'}
              </Text>
            </View>
          </View>
        </ScalePressable>
      )}

      <View className="flex-row items-center justify-between mt-3 mb-2">
        <Text className="text-[#F7F2E9] text-base font-semibold">Comanda</Text>
        {comanda.length > 0 && (
          <Animated.View
            key={`${total.toFixed(2)}`}
            entering={ZoomIn.duration(200)}
            className="bg-[#D4432B]/15 rounded-full px-3 py-1"
          >
            <Text className="text-[#D4432B] text-xs font-bold">S/ {total.toFixed(2)}</Text>
          </Animated.View>
        )}
      </View>

      <View className={`flex-1 ${comanda.length === 0 ? 'justify-center' : ''}`}>
        {comanda.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(250)}
            className="border-2 border-dashed border-[#3A322B] rounded-3xl px-5 py-7 items-center"
          >
            <View className="w-14 h-14 rounded-2xl bg-[#2B2420] border border-[#3A322B] items-center justify-center mb-3">
              <Text className="text-[#8C7F6E] text-2xl">🛵</Text>
            </View>
            <Text className="text-[#8C7F6E] text-sm mb-1">Pedido vacío</Text>
            <Text className="text-[#B8AC9B] text-xs">Toca un plato del menú para agregarlo</Text>
          </Animated.View>
        ) : (
          <Animated.FlatList
            data={comanda}
            className="flex-1"
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            keyExtractor={(_, i) => i.toString()}
            keyboardShouldPersistTaps="handled"
            layout={LinearTransition.springify().damping(18)}
            renderItem={({ item, index }) => {
              const esCustom = !item.dishId;
              return (
                <Animated.View
                  entering={FadeInDown.duration(220)}
                  exiting={FadeOut.duration(150)}
                  layout={LinearTransition.springify().damping(18)}
                  className="rounded-xl overflow-hidden"
                >
                  <ReanimatedSwipeable
                    overshootRight={false}
                    rightThreshold={40}
                    friction={2}
                    renderRightActions={() => (
                      <View className="bg-[#D4432B] rounded-xl items-center justify-center w-16">
                        <Text className="text-[#F7F2E9] text-xl">🗑</Text>
                      </View>
                    )}
                    onSwipeableOpen={(direction) => {
                      if (direction !== SwipeDirection.LEFT || enviando) return;
                      handleRemoveItem(index);
                    }}
                  >
                    <View
                      className={`rounded-xl px-4 py-3 flex-row items-center border-2 ${
                        esCustom
                          ? 'bg-[#EAE2F8] border-[#EAE2F8]'
                          : 'bg-[#F7F2E9] border-[#F7F2E9]'
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <ScalePressable onPress={() => abrirPlatoEditar(index)} pressedScale={0.98}>
                          <View className="flex-row items-center gap-1">
                            {esCustom && (
                              <View className="bg-[#6C4FBF] rounded px-1.5 py-0.5">
                                <Text className="text-[#F7F2E9] text-[10px] font-bold">PERSO</Text>
                              </View>
                            )}
                            <Text className="text-[#2B2420] font-semibold flex-shrink">{item.name}</Text>
                            <Text className="text-[#8C7F6E] text-xs">✎</Text>
                          </View>
                        </ScalePressable>

                        <ScalePressable
                          onPress={() => {
                            hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
                            setEntradaEditIndex(index);
                          }}
                          pressedScale={0.98}
                        >
                          {item.entrada || item.entradaPersonalizada ? (
                            <View className="mt-0.5">
                              {item.entrada && (
                                <View className="flex-row items-center gap-1.5">
                                  <Text className="text-[#8C7F6E] text-sm">+ {item.entrada.name}</Text>
                                  <View className="bg-[#4D7C4D]/15 rounded-full px-1.5 py-0.5">
                                    <Text className="text-[#4D7C4D] text-[10px] font-bold">
                                      Incluida
                                    </Text>
                                  </View>
                                </View>
                              )}
                              {item.entradaPersonalizada && (
                                <Text className="text-[#6C4FBF] text-sm mt-0.5">
                                  + {item.entradaPersonalizada.name} · S/ {item.entradaPersonalizada.price.toFixed(2)}
                                </Text>
                              )}
                              <Text className="text-[#8C7F6E] text-xs mt-0.5">✎</Text>
                            </View>
                          ) : (
                            <Text className="text-[#8C7F6E] text-xs mt-0.5 underline">
                              Agregar entrada
                            </Text>
                          )}
                        </ScalePressable>

                        <View className="flex-row items-center gap-1.5 mt-1.5">
                          <ScalePressable
                            onPress={() => handleToggleEmpaque(index)}
                            pressedScale={0.9}
                          >
                            <View
                              className={`rounded-full px-2.5 py-1 border ${
                                item.paraLlevar
                                  ? 'bg-[#D4432B] border-[#D4432B]'
                                  : 'bg-transparent border-[#1E1A17]/25'
                              }`}
                            >
                              <Text
                                className={`text-[11px] font-bold ${
                                  item.paraLlevar ? 'text-[#F7F2E9]' : 'text-[#1E1A17]/60'
                                }`}
                              >
                                🥡 Taper · S/ {(item.taperoPrecio ?? 1).toFixed(2)}
                              </Text>
                            </View>
                          </ScalePressable>
                          <ScalePressable
                            onPress={() => handleToggleEmpaque(index)}
                            pressedScale={0.9}
                          >
                            <View
                              className={`rounded-full px-2.5 py-1 border ${
                                !item.paraLlevar
                                  ? 'bg-[#2B2420] border-[#2B2420]'
                                  : 'bg-transparent border-[#1E1A17]/25'
                              }`}
                            >
                              <Text
                                className={`text-[11px] font-bold ${
                                  !item.paraLlevar ? 'text-[#F7F2E9]' : 'text-[#1E1A17]/60'
                                }`}
                              >
                                🍽 Plato
                              </Text>
                            </View>
                          </ScalePressable>
                        </View>

                        {notaAbierta === index ? (
                          <TextInput
                            className="mt-1.5 bg-[#1E1A17]/5 rounded-lg px-3 py-2 text-[#2B2420] text-sm"
                            placeholder="Comentario para la cocina..."
                            placeholderTextColor="#B8AC9B"
                            value={item.notes ?? ''}
                            onChangeText={(text) => handleChangeNota(index, text)}
                            onBlur={() => setNotaAbierta(null)}
                            autoFocus
                          />
                        ) : (
                          <ScalePressable
                            onPress={() => {
                              hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
                              setNotaAbierta(index);
                            }}
                            pressedScale={0.98}
                          >
                            {item.notes ? (
                              <Text className="text-[#4D7C4D] text-xs mt-1 font-semibold">
                                💬 {item.notes}
                              </Text>
                            ) : (
                              <Text className="text-[#B8AC9B] text-xs mt-1.5">
                                💬 Nota para la cocina
                              </Text>
                            )}
                          </ScalePressable>
                        )}
                      </View>

                      <View className="items-end gap-2">
                        <Text className="text-[#2B2420] font-bold text-sm">
                          S/ {item.unitPrice.toFixed(2)}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <ScalePressable
                            onPress={() => handleChangeCantidad(index, -1)}
                            pressedScale={0.85}
                          >
                            <View className="w-7 h-7 rounded-full bg-[#1E1A17]/10 items-center justify-center">
                              <Text className="text-[#2B2420] text-base font-bold leading-none">−</Text>
                            </View>
                          </ScalePressable>
                          <Text className="text-[#2B2420] text-base font-extrabold min-w-[22px] text-center">
                            {item.quantity}
                          </Text>
                          <ScalePressable
                            onPress={() => handleChangeCantidad(index, 1)}
                            pressedScale={0.85}
                          >
                            <View className="w-7 h-7 rounded-full bg-[#D4432B] items-center justify-center">
                              <Text className="text-[#F7F2E9] text-base font-bold leading-none">+</Text>
                            </View>
                          </ScalePressable>
                        </View>
                      </View>
                    </View>
                  </ReanimatedSwipeable>
                </Animated.View>
              );
            }}
          />
        )}
      </View>

      <View className="mt-6 -mx-6 bg-[#2B2420]/70 border-t border-[#3A322B] rounded-t-3xl px-6 pt-5 pb-8">
        <View className="flex-row items-end justify-between mb-4">
          <View>
            <Text className="text-[#8C7F6E] text-xs font-semibold uppercase tracking-wider">Total</Text>
            <Text className="text-[#B8AC9B] text-xs mt-1">
              {comanda.length === 0
                ? 'Comanda vacía'
                : `${cantItems} ${cantItems === 1 ? 'item' : 'items'}`}
            </Text>
          </View>
          <Animated.View key={total.toFixed(2)} entering={ZoomIn.duration(180)}>
            <Text className="text-[#F7F2E9] text-3xl font-extrabold">S/ {total.toFixed(2)}</Text>
          </Animated.View>
        </View>

        {errorEnvio !== '' && (
          <Text className="text-[#D4432B] text-sm text-center mb-3">{errorEnvio}</Text>
        )}

        <ScalePressable
          onPress={handleEnviarCocina}
          disabled={comanda.length === 0 || !clienteValido || enviando}
          pressedScale={0.97}
        >
          <View
            className={`rounded-2xl py-4 items-center ${
              enviando
                ? 'bg-[#4D7C4D]'
                : comanda.length === 0 || !clienteValido
                  ? 'bg-[#2B2420] opacity-60'
                  : 'bg-[#D4432B]'
            }`}
          >
            <Text className="text-[#F7F2E9] text-center font-bold text-base">
              {enviando ? (edit ? '✓ Comanda actualizada' : '✓ Enviado a cocina') : edit ? 'Guardar cambios' : 'Enviar a cocina'}
            </Text>
          </View>
        </ScalePressable>
      </View>

      <EntradaModal
        visible={platoSeleccionado !== null || entradaEditIndex !== null}
        entradas={entradas}
        parallevarDefault={true}
        mostrarParallevar={false}
        inicial={
          entradaEditIndex !== null
            ? {
                entrada: comanda[entradaEditIndex]?.entrada,
                entradaPersonalizada: comanda[entradaEditIndex]?.entradaPersonalizada,
              }
            : undefined
        }
        onClose={() => {
          if (entradaEditIndex !== null) setEntradaEditIndex(null);
          else setPlatoSeleccionado(null);
        }}
        onConfirm={(res) => {
          if (entradaEditIndex !== null) handleConfirmEntradaEdicion(res);
          else handleConfirmEntrada(res);
        }}
      />

      <PlatoModal
        visible={platoModalVisible}
        titulo={platoEditar === null ? 'Nuevo plato personalizado' : 'Editar plato'}
        parallevarDefault={true}
        mostrarParallevar={false}
        inicial={
          platoEditar !== null
            ? {
                name: comanda[platoEditar]?.name ?? '',
                price: comanda[platoEditar]?.unitPrice ?? 0,
                entrada: comanda[platoEditar]?.entradaPersonalizada,
              }
            : undefined
        }
        onClose={() => setPlatoModalVisible(false)}
        onConfirm={handleConfirmPlato}
      />

      <Modal
        visible={extrasAbierto}
        transparent
        animationType="slide"
        onRequestClose={() => setExtrasAbierto(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 justify-end">
            <Pressable
              className="absolute inset-0 bg-black/50"
              onPress={() => setExtrasAbierto(false)}
            />
            <View className="bg-[#1E1A17] border-t border-[#3A322B] rounded-t-3xl h-[55%] pt-5 pb-8 px-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[#F7F2E9] font-extrabold text-lg">Extras</Text>
                <ScalePressable onPress={() => setExtrasAbierto(false)} pressedScale={0.9} hitSlop={8}>
                  <View className="w-9 h-9 rounded-full bg-[#2B2420] items-center justify-center">
                    <X size={16} color="#8C7F6E" />
                  </View>
                </ScalePressable>
              </View>

              <View className="flex-row items-center bg-[#2B2420] border border-[#3A322B] rounded-xl px-3 py-2.5 mb-4 gap-2">
                <Search size={16} color="#8C7F6E" />
                <TextInput
                  className="flex-1 text-[#F7F2E9] text-base"
                  placeholder="Buscar..."
                  placeholderTextColor="#8C7F6E"
                  value={busquedaExtras}
                  onChangeText={setBusquedaExtras}
                  autoCorrect={false}
                />
              </View>

              {extrasBuscados.length === 0 ? (
                <Text className="text-[#8C7F6E] text-sm text-center py-10">Sin resultados</Text>
              ) : (
                <Animated.FlatList
                  data={extrasBuscados}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 10 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <ScalePressable
                      onPress={() => handleAgregarExtra(item)}
                      pressedScale={0.95}
                      className="flex-1 mb-3"
                    >
                      <View className="bg-[#2B2420] border border-[#3A322B] rounded-2xl overflow-hidden">
                        {item.image !== '' && (
                          <Image
                            source={{ uri: item.image }}
                            className="w-full h-24 bg-[#1E1A17]"
                            resizeMode="cover"
                          />
                        )}
                        <View className="px-3 py-2.5">
                          <Text className="text-[#F7F2E9] font-semibold text-sm" numberOfLines={2}>
                            {item.name}
                          </Text>
                          <View className="flex-row items-center justify-between mt-1.5">
                            <Text className="text-[#8C7F6E] text-xs font-semibold">
                              S/ {item.price.toFixed(2)}
                            </Text>
                            <View className="w-6 h-6 rounded-full bg-[#6C4FBF] items-center justify-center">
                              <Plus size={13} color="#F7F2E9" strokeWidth={2.5} />
                            </View>
                          </View>
                        </View>
                      </View>
                    </ScalePressable>
                  )}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}