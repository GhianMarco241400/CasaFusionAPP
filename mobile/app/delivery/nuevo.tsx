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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDishes, getEntradas, getCategories } from '../../src/services/menu';
import { Dish, OrderItem } from '../../src/types';
import { EntradaModal, EntradaConfirmResult } from '../../src/components/EntradaModal';
import { PlatoModal } from '../../src/components/PlatoModal';
import { ScalePressable } from '../../src/components/ScalePressable';
import { useAuth } from '../../src/context/AuthContext';
import { useOrders } from '../../src/context/OrdersContext';
import { useTema } from '../../src/context/TemaContext';
import { alpha } from '../../src/theme/temas';
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
  const { t } = useTema();

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        { backgroundColor: t.border, borderColor: t.border },
      ]}
      className="w-36 rounded-xl px-4 py-3 border"
    >
      <View className="h-3.5 rounded-full" style={{ backgroundColor: t.border }} />
      <View className="h-3 rounded-full w-3/5 mt-2" style={{ backgroundColor: t.border }} />
      <View className="h-5 w-16 rounded-full mt-3" style={{ backgroundColor: t.border }} />
    </Animated.View>
  );
}

export default function DeliveryNuevoScreen() {
  const { t, temaId } = useTema();
  const insets = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const [comanda, setComanda] = useState<OrderItem[]>([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [datosAbierto, setDatosAbierto] = useState(true);
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
            enComandaCustom ? '' : 'border-dashed'
          }`}
          style={
            enComandaCustom
              ? { backgroundColor: t.yape, borderColor: t.yape }
              : { backgroundColor: t.extrasSheet, borderColor: t.yape }
          }
        >
          <View className="flex-row items-start">
            <View className="flex-1 pr-1">
              <Text
                className="text-sm font-bold"
                style={{ color: enComandaCustom ? t.onPrimary : t.yape }}
              >
                ✚ Personalizado
              </Text>
              <Text
                className="text-xs mt-1"
                style={{ color: enComandaCustom ? alpha(t.onPrimary, 80) : t.textSecondary }}
              >
                Fondo, entrada y precio
              </Text>
            </View>
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: enComandaCustom ? t.onPrimary : t.yape }}
            >
              <Text
                className="text-sm font-extrabold leading-none"
                style={{ color: enComandaCustom ? t.yape : t.onPrimary }}
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
      className="flex-1 px-6"
      style={{ backgroundColor: t.background, paddingTop: insets.top + 12 }}
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
          <View
            className={`w-11 h-11 rounded-full items-center justify-center ${
              temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
            }`}
            style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
          >
            <Text className="text-lg font-bold leading-none" style={{ color: t.textPrimary }}>←</Text>
          </View>
        </ScalePressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold" style={{ color: t.textPrimary }}>🛵 Delivery</Text>
          <Text className="text-sm" style={{ color: t.textSecondary }}>
            {edit
              ? 'Editando pedido del cliente'
              : comanda.length === 0
                ? 'Datos del cliente y platos'
                : `${comanda.length} ${comanda.length === 1 ? 'plato' : 'platos'} en pedido`}
          </Text>
        </View>
      </View>

      <View
        className={`rounded-2xl mb-4 ${temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'}`}
        style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
      >
        {!datosAbierto ? (
          <ScalePressable
            onPress={() => {
              hapticImpact(Haptics.ImpactFeedbackStyle.Light);
              setDatosAbierto(true);
            }}
            pressedScale={0.99}
            className="flex-row items-center gap-2.5 px-4 py-3"
            innerClassName="flex-1"
          >
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: alpha(t.primary, clienteValido ? 15 : 30) }}
            >
              <Text className="text-sm" style={{ color: t.primary }}>🛵</Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-bold"
                style={{ color: clienteValido ? t.textPrimary : t.primary }}
                numberOfLines={1}
              >
                {clienteValido ? clienteNombre : 'Agregar nombre del cliente *'}
              </Text>
              {(telefono || direccion) && (
                <Text className="text-xs" style={{ color: t.textSecondary }} numberOfLines={1}>
                  {[telefono, direccion].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            <Text className="text-sm font-bold" style={{ color: t.textSecondary }}>✎</Text>
          </ScalePressable>
        ) : (
          <View className="p-4">
            <View className="flex-row items-center justify-between mb-2.5">
              <ScalePressable
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  setDatosAbierto(false);
                }}
                pressedScale={0.99}
              >
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm font-bold" style={{ color: t.textPrimary }}>Datos del cliente</Text>
                  <Text className="text-xs" style={{ color: t.textSecondary }}>▾</Text>
                </View>
              </ScalePressable>
            </View>
            <TextInput
              className="rounded-xl text-base px-4 py-3 mb-2.5"
              style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
              placeholder="Nombre *"
              placeholderTextColor={t.placeholder}
              value={clienteNombre}
              onChangeText={setClienteNombre}
            />
            <View className="flex-row gap-2.5">
              <TextInput
                className="flex-1 rounded-xl text-base px-4 py-3"
                style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
                placeholder="Teléfono"
                placeholderTextColor={t.placeholder}
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />
              <TextInput
                className="flex-[1.6] rounded-xl text-base px-4 py-3"
                style={{ backgroundColor: t.inputBg, color: t.textPrimary }}
                placeholder="Dirección"
                placeholderTextColor={t.placeholder}
                value={direccion}
                onChangeText={setDireccion}
              />
            </View>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-semibold" style={{ color: t.textPrimary }}>Menú</Text>
        {!isLoading && !error && dishes.length > 0 && (
          <View
            className={`${temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'} rounded-full px-3 py-1`}
            style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
          >
            <Text className="text-xs font-semibold" style={{ color: t.textSecondary }}>{dishes.length} disponibles</Text>
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
        <Animated.View entering={FadeInDown.duration(200)} className="rounded-xl p-4 mb-4" style={{ backgroundColor: t.surface }}>
          <Text className="mb-2" style={{ color: t.primary }}>No se pudo cargar el menú</Text>
          <ScalePressable onPress={() => refetch()}>
            <View className="rounded-lg py-2 px-4 self-start" style={{ backgroundColor: t.primary }}>
              <Text className="font-bold text-sm" style={{ color: t.onPrimary }}>Reintentar</Text>
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
                    className="w-36 rounded-xl px-4 py-3 border-2 min-h-[104px]"
                    style={
                      yaEnComanda
                        ? { backgroundColor: t.primary, borderColor: t.primary }
                        : { backgroundColor: t.pillBg, borderColor: temaId === 'claro' ? '#1E1A17' : '#E9E0D2' }
                    }
                  >
                    <Text
                      className="font-semibold"
                      style={{ color: yaEnComanda ? t.onPrimary : t.pillText }}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <View
                      className="flex-row items-center justify-between mt-2.5 rounded-full py-1 px-2"
                      style={{
                        backgroundColor: yaEnComanda
                          ? alpha(t.onPrimary, 20)
                          : alpha(t.chip, 7),
                      }}
                    >
                      <Text className="text-sm" style={{ color: yaEnComanda ? t.onPrimary : t.textSecondary }}>
                        S/ {item.price}
                      </Text>
                      <Animated.View entering={ZoomIn.duration(150)}>
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: yaEnComanda ? t.onPrimary : alpha(t.chip, 20),
                          }}
                        >
                          <Text
                            className="text-center font-extrabold text-sm leading-none"
                            style={{ color: yaEnComanda ? t.primary : t.pillText }}
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
            setEspecialesAbierto(true);
          }}
          pressedScale={0.97}
          className="mt-2 mb-0"
        >
          <View className="rounded-2xl py-3.5 px-4 flex-row items-center justify-between" style={{ backgroundColor: t.accent }}>
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: alpha(t.pillText, 15) }}
              >
                <Star size={18} color={t.pillText} strokeWidth={2.5} fill={t.pillText} />
              </View>
              <Text className="font-extrabold text-base" style={{ color: t.pillText }}>Especial</Text>
              <Text className="text-xs" style={{ color: alpha(t.pillText, 60) }}>{especiales.length} disponibles</Text>
            </View>
            <View className="rounded-full px-3 py-1 flex-row items-center gap-1.5" style={{ backgroundColor: alpha(t.pillText, 15) }}>
              <Text className="text-xs font-bold" style={{ color: t.pillText }}>
                {cantEspeciales > 0 ? `${cantEspeciales} en pedido` : 'Ver'}
              </Text>
            </View>
          </View>
        </ScalePressable>
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
          <View className="rounded-2xl py-3.5 px-4 flex-row items-center justify-between" style={{ backgroundColor: t.yape }}>
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: alpha(t.onPrimary, 20) }}
              >
                <Plus size={18} color={t.onPrimary} strokeWidth={2.5} />
              </View>
              <Text className="font-extrabold text-base" style={{ color: t.onPrimary }}>Extras</Text>
              <Text className="text-xs" style={{ color: alpha(t.onPrimary, 60) }}>{extras.length} disponibles</Text>
            </View>
            <View className="rounded-full px-3 py-1 flex-row items-center gap-1.5" style={{ backgroundColor: alpha(t.onPrimary, 20) }}>
              <Text className="text-xs font-bold" style={{ color: t.onPrimary }}>
                {cantExtras > 0 ? `${cantExtras} en comanda` : 'Ver'}
              </Text>
            </View>
          </View>
        </ScalePressable>
      )}

      <View className="flex-row items-center justify-between mt-3 mb-2">
        <Text className="text-base font-semibold" style={{ color: t.textPrimary }}>Comanda</Text>
        {comanda.length > 0 && (
          <Animated.View
            key={`${total.toFixed(2)}`}
            entering={ZoomIn.duration(200)}
            className="border rounded-full px-3 py-1"
            style={{
              backgroundColor: alpha(t.primary, 15),
              borderColor: alpha(t.primary, 20),
            }}
          >
            <Text className="text-xs font-bold" style={{ color: t.primary }}>S/ {total.toFixed(2)}</Text>
          </Animated.View>
        )}
      </View>

      <View className={`flex-1 ${comanda.length === 0 ? 'justify-center' : ''}`}>
        {comanda.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(250)}
            className="border-2 border-dashed rounded-3xl px-5 py-7 items-center"
            style={{ borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
          >
            <View
              className={`w-14 h-14 rounded-2xl items-center justify-center mb-3 ${
                temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
              }`}
              style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
            >
              <Text className="text-2xl" style={{ color: t.textSecondary }}>🛵</Text>
            </View>
            <Text className="text-sm mb-1" style={{ color: t.textSecondary }}>Pedido vacío</Text>
            <Text className="text-xs" style={{ color: t.placeholder }}>Toca un plato del menú para agregarlo</Text>
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
                      <View className="rounded-xl items-center justify-center w-16" style={{ backgroundColor: t.primary }}>
                        <Text className="text-xl" style={{ color: t.onPrimary }}>🗑</Text>
                      </View>
                    )}
                    onSwipeableOpen={(direction) => {
                      if (direction !== SwipeDirection.LEFT || enviando) return;
                      handleRemoveItem(index);
                    }}
                  >
                    <View
                      className="rounded-xl px-4 py-3 flex-row items-center border-2"
                      style={
                        temaId === 'claro'
                          ? {
                              backgroundColor: esCustom ? t.extrasSheet : t.pillBg,
                              borderColor: '#1E1A17',
                            }
                          : esCustom
                            ? { backgroundColor: t.extrasSheet, borderColor: t.extrasSheet }
                            : { backgroundColor: t.pillBg, borderColor: t.pillBg }
                      }
                    >
                      <View className="flex-1 pr-2">
                        <ScalePressable onPress={() => abrirPlatoEditar(index)} pressedScale={0.98}>
                          <View className="flex-row items-center gap-1">
                            {esCustom && (
                              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: t.yape }}>
                                <Text className="text-[10px] font-bold" style={{ color: t.onPrimary }}>PERSO</Text>
                              </View>
                            )}
                            <Text className="font-semibold flex-shrink" style={{ color: t.pillText }}>{item.name}</Text>
                            <Text className="text-xs" style={{ color: t.textSecondary }}>✎</Text>
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
                                  <Text className="text-sm" style={{ color: t.textSecondary }}>+ {item.entrada.name}</Text>
                                  <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: alpha(t.success, 15) }}>
                                    <Text className="text-[10px] font-bold" style={{ color: t.success }}>
                                      Incluida
                                    </Text>
                                  </View>
                                </View>
                              )}
                              {item.entradaPersonalizada && (
                                <Text className="text-sm mt-0.5" style={{ color: t.yape }}>
                                  + {item.entradaPersonalizada.name} · S/ {item.entradaPersonalizada.price.toFixed(2)}
                                </Text>
                              )}
                              <Text className="text-xs mt-0.5" style={{ color: t.textSecondary }}>✎</Text>
                            </View>
                          ) : (
                            <Text className="text-xs mt-0.5 underline" style={{ color: t.textSecondary }}>
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
                              className="rounded-full px-2.5 py-1 border"
                              style={
                                item.paraLlevar
                                  ? { backgroundColor: t.primary, borderColor: t.primary }
                                  : { backgroundColor: 'transparent', borderColor: temaId === 'claro' ? '#1E1A17' : alpha(t.chip, 25) }
                              }
                            >
                              <Text
                                className="text-[11px] font-bold"
                                style={{ color: item.paraLlevar ? t.onPrimary : alpha(t.chip, 60) }}
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
                              className="rounded-full px-2.5 py-1 border"
                              style={
                                !item.paraLlevar
                                  ? { backgroundColor: t.chip, borderColor: t.chip }
                                  : { backgroundColor: 'transparent', borderColor: temaId === 'claro' ? '#1E1A17' : alpha(t.chip, 25) }
                              }
                            >
                              <Text
                                className="text-[11px] font-bold"
                                style={{ color: !item.paraLlevar ? t.onPrimary : alpha(t.chip, 60) }}
                              >
                                🍽 Plato
                              </Text>
                            </View>
                          </ScalePressable>
                        </View>

                        {notaAbierta === index ? (
                          <TextInput
                            className="mt-1.5 rounded-lg px-3 py-2 text-sm"
                            style={{ backgroundColor: alpha(t.chip, 5), color: t.pillText }}
                            placeholder="Comentario para la cocina..."
                            placeholderTextColor={t.placeholder}
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
                              <Text className="text-xs mt-1 font-semibold" style={{ color: t.success }}>
                                💬 {item.notes}
                              </Text>
                            ) : (
                              <Text className="text-xs mt-1.5" style={{ color: t.placeholder }}>
                                💬 Nota para la cocina
                              </Text>
                            )}
                          </ScalePressable>
                        )}
                      </View>

                      <View className="items-end gap-2">
                        <Text className="font-bold text-sm" style={{ color: t.pillText }}>
                          S/ {item.unitPrice.toFixed(2)}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <ScalePressable
                            onPress={() => handleChangeCantidad(index, -1)}
                            pressedScale={0.85}
                          >
                            <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: alpha(t.chip, 10) }}>
                              <Text className="text-base font-bold leading-none" style={{ color: t.pillText }}>−</Text>
                            </View>
                          </ScalePressable>
                          <Text className="text-base font-extrabold min-w-[22px] text-center" style={{ color: t.pillText }}>
                            {item.quantity}
                          </Text>
                          <ScalePressable
                            onPress={() => handleChangeCantidad(index, 1)}
                            pressedScale={0.85}
                          >
                            <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: t.primary }}>
                              <Text className="text-base font-bold leading-none" style={{ color: t.onPrimary }}>+</Text>
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

      <View
        className={`mt-4 -mx-6 rounded-t-3xl px-6 pt-3 ${
          temaId === 'claro' ? 'border-t-2' : 'border-t'
        }`}
        style={{
          backgroundColor: alpha(t.surface, 70),
          borderTopColor: temaId === 'claro' ? '#1E1A17' : t.border,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {errorEnvio !== '' && (
          <Text className="text-sm text-center mb-2" style={{ color: t.primary }}>{errorEnvio}</Text>
        )}

        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Total</Text>
            <Animated.View key={total.toFixed(2)} entering={ZoomIn.duration(180)}>
              <Text className="text-2xl font-extrabold" style={{ color: t.textPrimary }}>S/ {total.toFixed(2)}</Text>
            </Animated.View>
            <Text className="text-xs" style={{ color: t.placeholder }}>
              {comanda.length === 0
                ? 'Comanda vacía'
                : `${cantItems} ${cantItems === 1 ? 'item' : 'items'}`}
            </Text>
          </View>

          <ScalePressable
            onPress={handleEnviarCocina}
            disabled={comanda.length === 0 || !clienteValido || enviando}
            pressedScale={0.97}
            className="flex-[1.6]"
          >
            <View
              className={`rounded-2xl py-3 items-center ${
                (comanda.length === 0 || !clienteValido) && !enviando ? 'opacity-60 border-2' : ''
              }`}
              style={{
                backgroundColor: enviando
                  ? t.success
                  : comanda.length === 0 || !clienteValido
                    ? temaId === 'claro'
                      ? t.pillBg
                      : t.surface
                    : t.primary,
                borderColor:
                  (comanda.length === 0 || !clienteValido) && !enviando
                    ? temaId === 'claro'
                      ? '#1E1A17'
                      : t.border
                    : undefined,
              }}
            >
              <Text
                className="text-center font-bold text-base"
                style={{
                  color:
                    temaId === 'claro' && (comanda.length === 0 || !clienteValido)
                      ? t.pillText
                      : t.onPrimary,
                }}
              >
                {enviando ? (edit ? '✓ Comanda actualizada' : '✓ Enviado a cocina') : edit ? 'Guardar cambios' : 'Enviar a cocina'}
              </Text>
            </View>
          </ScalePressable>
        </View>
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
            <View
              className={`rounded-t-3xl h-[55%] pt-5 px-5 ${
                temaId === 'claro' ? 'border-t-2 border-[#1E1A17]' : 'border-t'
              }`}
              style={{
                backgroundColor: t.surfaceElevated,
                borderTopColor: temaId === 'claro' ? '#1E1A17' : t.border,
                paddingBottom: insets.bottom + 16,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>Extras</Text>
                <ScalePressable onPress={() => setExtrasAbierto(false)} pressedScale={0.9} hitSlop={8}>
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''
                    }`}
                    style={{ backgroundColor: t.surface }}
                  >
                    <X size={16} color={t.textSecondary} />
                  </View>
                </ScalePressable>
              </View>

              <View
                className={`flex-row items-center rounded-xl px-3 py-2.5 mb-4 gap-2 ${
                  temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
                }`}
                style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
              >
                <Search size={16} color={t.textSecondary} />
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: t.textPrimary }}
                  placeholder="Buscar..."
                  placeholderTextColor={t.textSecondary}
                  value={busquedaExtras}
                  onChangeText={setBusquedaExtras}
                  autoCorrect={false}
                />
              </View>

              {extrasBuscados.length === 0 ? (
                <Text className="text-sm text-center py-10" style={{ color: t.textSecondary }}>Sin resultados</Text>
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
                      <View
                        className={`rounded-2xl overflow-hidden ${
                          temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
                        }`}
                        style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
                      >
                        {item.image !== '' && (
                          <Image
                            source={{ uri: item.image }}
                            className="w-full h-24"
                            style={{ backgroundColor: t.background }}
                            resizeMode="cover"
                          />
                        )}
                        <View className="px-3 py-2.5">
                          <Text className="font-semibold text-sm" style={{ color: t.textPrimary }} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <View className="flex-row items-center justify-between mt-1.5">
                            <Text className="text-xs font-semibold" style={{ color: t.textSecondary }}>
                              S/ {item.price.toFixed(2)}
                            </Text>
                            <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: t.yape }}>
                              <Plus size={13} color={t.onPrimary} strokeWidth={2.5} />
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

      <Modal
        visible={especialesAbierto}
        transparent
        animationType="slide"
        onRequestClose={() => setEspecialesAbierto(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => setEspecialesAbierto(false)}
          />
          <View
            className={`rounded-t-3xl h-[55%] pt-5 px-5 ${
              temaId === 'claro' ? 'border-t-2 border-[#1E1A17]' : 'border-t'
            }`}
            style={{
              backgroundColor: t.surfaceElevated,
              borderTopColor: temaId === 'claro' ? '#1E1A17' : t.border,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2.5">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: alpha(t.pillText, 15) }}
                >
                  <Star size={17} color={t.pillText} strokeWidth={2.5} fill={t.pillText} />
                </View>
                <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>Especiales</Text>
                <Text className="text-xs" style={{ color: t.textSecondary }}>{especiales.length} disponibles</Text>
              </View>
              <ScalePressable onPress={() => setEspecialesAbierto(false)} pressedScale={0.9} hitSlop={8}>
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center ${
                    temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''
                  }`}
                  style={{ backgroundColor: t.surface }}
                >
                  <X size={16} color={t.textSecondary} />
                </View>
              </ScalePressable>
            </View>

            <Animated.FlatList
              data={especiales}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const yaEnComanda = comanda.some((c) => c.dishId === item.id);
                return (
                  <ScalePressable
                    onPress={() => {
                      setEspecialesAbierto(false);
                      handleSelectPlato(item);
                    }}
                    pressedScale={0.95}
                    className="flex-1 mb-3"
                  >
                    <View
                      className={`rounded-2xl overflow-hidden ${
                        temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
                      }`}
                      style={{
                        backgroundColor: yaEnComanda ? t.primary : alpha(t.accent, 8),
                        borderColor: yaEnComanda ? t.primary : temaId === 'claro' ? '#1E1A17' : alpha(t.accent, 45),
                      }}
                    >
                      {item.image !== '' && (
                        <Image
                          source={{ uri: item.image }}
                          className="w-full h-24"
                          style={{ backgroundColor: t.background }}
                          resizeMode="cover"
                        />
                      )}
                      <View className="px-3 py-2.5">
                        <Text
                          className="font-semibold text-sm"
                          style={{ color: yaEnComanda ? t.onPrimary : t.textPrimary }}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        <View className="flex-row items-center justify-between mt-1.5">
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: yaEnComanda ? alpha(t.onPrimary, 85) : t.textSecondary }}
                          >
                            S/ {item.price.toFixed(2)}
                          </Text>
                          <View
                            className="w-6 h-6 rounded-full items-center justify-center"
                            style={{ backgroundColor: yaEnComanda ? t.onPrimary : t.accent }}
                          >
                            <Text
                              className="text-center font-extrabold text-sm leading-none"
                              style={{ color: yaEnComanda ? t.primary : t.onPrimary }}
                            >
                              {yaEnComanda ? '✓' : '+'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </ScalePressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}