import { useEffect, useState } from 'react';
import { View, Text, Alert, FlatList, Modal, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Order, OrderStatus, MetodoPago } from '../../../../src/types';
import { useOrders } from '../../../../src/context/OrdersContext';
import { ScalePressable } from '../../../../src/components/ScalePressable';
import {
  ArrowLeft,
  Banknote,
  Check,
  ChefHat,
  Package,
  Pencil,
  Receipt,
  Smartphone,
  StickyNote,
  Trash2,
} from 'lucide-react-native';

function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function Steam({ delay, left }: { delay: number; left: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 1900, easing: Easing.out(Easing.ease) })),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, [t, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: t.value > 0.15 && t.value < 0.85 ? 0.65 : 0,
    transform: [{ translateY: -22 * t.value }, { scale: 0.5 + t.value * 0.6 }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top: 2 }, animatedStyle]}>
      <View className="w-3 h-3 rounded-full bg-[#B8AC9B] opacity-50" />
    </Animated.View>
  );
}

function ChefAnimado() {
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [bob]);

  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <View className="w-24 items-center">
      <Steam delay={0} left={10} />
      <Steam delay={500} left={72} />
<Animated.View
        style={bobStyle}
        className="mt-8 w-20 h-20 rounded-full bg-[#2B2420] border-2 border-[#D4432B] items-center justify-center"
      >
        <Animated.View entering={ZoomIn.duration(400)}>
          <ChefHat size={38} color="#F7F2E9" strokeWidth={1.8} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function chipEstado(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pendiente', cls: 'bg-[#D4432B]/20', txt: 'text-[#D4432B]' };
    case 'IN_PREPARATION':
      return { label: 'Preparando', cls: 'bg-[#E8A33D]/20', txt: 'text-[#E8A33D]' };
    case 'READY':
      return { label: 'Listo', cls: 'bg-[#4D7C4D]/25', txt: 'text-[#4D7C4D]' };
    default:
      return { label: status, cls: 'bg-[#2B2420]', txt: 'text-[#8C7F6E]' };
  }
}

function estadoDominante(comandas: Order[]) {
  if (comandas.every((o) => o.status === 'READY')) {
    return {
      label: 'Listo para cobrar',
      fondo: 'bg-[#4D7C4D]',
      texto: 'text-[#F7F2E9]',
    };
  }
  if (comandas.some((o) => o.status === 'PENDING')) {
    return {
      label: 'Pendiente',
      fondo: 'bg-[#D4432B]',
      texto: 'text-[#F7F2E9]',
    };
  }
  return {
    label: 'Preparando',
    fondo: 'bg-[#E8A33D]',
    texto: 'text-[#2B2420]',
  };
}

type ComandaCardProps = {
  order: Order;
  numero: number;
  onEditar: () => void;
  onEliminar: () => void;
  onCobrar?: () => void;
  cobrando?: boolean;
};

function ComandaCard({ order, numero, onEditar, onEliminar, onCobrar, cobrando }: ComandaCardProps) {
  const chip = chipEstado(order.status);
  const esParallevar = numero === 0;

  return (
    <Animated.View entering={FadeInDown.duration(250)} className="bg-[#F7F2E9] rounded-xl p-3.5 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          {esParallevar && <Package size={15} color="#D4432B" />}
          <Text className="text-[#2B2420] font-extrabold">
            {esParallevar ? 'Comanda para llevar' : `Comanda de Mesa ${numero}`}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          {order.edited && (
            <View className="bg-[#E8A33D] rounded-full px-2 py-0.5 flex-row items-center gap-0.5">
              <Pencil size={10} color="#1E1A17" strokeWidth={2.5} />
              <Text className="text-[#1E1A17] text-[10px] font-bold">Editado</Text>
            </View>
          )}
          <View className={`rounded-full px-2 py-0.5 ${chip.cls}`}>
            <Text className={`text-[10px] font-bold ${chip.txt}`}>{chip.label}</Text>
          </View>
        </View>
      </View>

      {order.items.map((item, i) => (
        <View key={i} className="mb-1">
          <View className="flex-row items-center gap-1">
            {!item.dishId && (
              <View className="bg-[#6C4FBF] rounded px-1.5 py-0.5">
                <Text className="text-[#F7F2E9] text-[9px] font-bold">PERSO</Text>
              </View>
            )}
            <Text className="text-[#2B2420] flex-shrink">
              {item.quantity}x {item.name}
            </Text>
          </View>
          {item.entrada && (
            <Text className="text-[#8C7F6E] text-sm">+ {item.entrada.name}</Text>
          )}
          {item.entradaPersonalizada && (
            <Text className="text-[#6C4FBF] text-sm">
              + {item.entradaPersonalizada.name} (S/ {item.entradaPersonalizada.price.toFixed(2)})
            </Text>
          )}
          {item.paraLlevar && (
            <View className="flex-row items-center gap-1">
              <Package size={13} color="#D4432B" />
              <Text className="text-[#D4432B] text-sm font-semibold">
                Para llevar · +S/ {(item.taperoPrecio ?? 1).toFixed(2)}
              </Text>
            </View>
          )}
          {item.notes && (
            <View className="flex-row items-center gap-1">
              <StickyNote size={13} color="#4D7C4D" />
              <Text className="text-[#4D7C4D] text-sm font-semibold">{item.notes}</Text>
            </View>
          )}
        </View>
      ))}

      <View className="flex-row items-center justify-between mt-2.5">
        <Text className="text-[#8C7F6E] text-sm font-bold">Total: S/ {order.total.toFixed(2)}</Text>
        {order.status === 'PENDING' && (
          <View className="flex-row gap-2">
            <ScalePressable onPress={onEditar} pressedScale={0.95} className="rounded-lg overflow-hidden">
              <View className="bg-[#6C4FBF] rounded-lg py-2 px-4 flex-row items-center gap-1.5">
                <Pencil size={14} color="#F7F2E9" strokeWidth={2.5} />
                <Text className="text-[#F7F2E9] text-sm font-bold">Editar</Text>
              </View>
            </ScalePressable>
            <ScalePressable onPress={onEliminar} pressedScale={0.95} className="rounded-lg overflow-hidden">
              <View className="bg-[#D4432B] rounded-lg py-2 px-4 items-center justify-center">
                <Trash2 size={16} color="#F7F2E9" />
              </View>
            </ScalePressable>
          </View>
        )}
        {order.status === 'READY' && onCobrar && (
          <ScalePressable onPress={onCobrar} pressedScale={0.95} disabled={cobrando} className="rounded-lg overflow-hidden">
            <View className={`bg-[#4D7C4D] rounded-lg py-2 px-4 flex-row items-center gap-1.5 ${cobrando ? 'opacity-70' : ''}`}>
              <Receipt size={15} color="#F7F2E9" strokeWidth={2.2} />
              <Text className="text-[#F7F2E9] text-sm font-bold">Cobrar</Text>
            </View>
          </ScalePressable>
        )}
      </View>
    </Animated.View>
  );
}

type ResumenMesaProps = { comandas: Order[]; total: number };

function ResumenMesa({ comandas, total }: ResumenMesaProps) {
  const items = comandas.flatMap((o) => o.items);
  const esParallevar = comandas.length > 0 && comandas[0].tableNumber === 0;
  return (
    <Animated.View entering={FadeInDown.duration(250)} className="bg-[#F7F2E9] rounded-2xl overflow-hidden">
      <View className="bg-[#4D7C4D] px-4 py-2.5 flex-row items-center justify-between">
        <Text className="text-[#F7F2E9] font-extrabold text-lg">
          {esParallevar ? 'Resumen del pedido para llevar' : 'Resumen de la mesa'}
        </Text>
        <View className="w-6 h-6 rounded-full bg-[#F7F2E9]/20 items-center justify-center">
          <Check size={14} color="#F7F2E9" strokeWidth={3} />
        </View>
      </View>
      <View className="px-4 pt-3 pb-4">
        {items.map((item, i) => (
          <View key={i} className="mb-2">
            <View className="flex-row items-center gap-1">
              {!item.dishId && (
                <View className="bg-[#6C4FBF] rounded px-1.5 py-0.5">
                  <Text className="text-[#F7F2E9] text-[10px] font-bold">PERSO</Text>
                </View>
              )}
              <Text className="text-[#2B2420] font-semibold flex-1 flex-shrink" numberOfLines={2}>
                {item.quantity}x {item.name}
              </Text>
              <Text className="text-[#2B2420] font-bold">
                S/ {(
                  item.unitPrice * item.quantity +
                  (item.entrada?.price ?? 0) +
                  (item.entradaPersonalizada?.price ?? 0) +
                  (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0)
                ).toFixed(2)}
              </Text>
            </View>
            {item.entrada && (
              <Text className="text-[#8C7F6E] text-sm pl-1">+ {item.entrada.name}</Text>
            )}
            {item.entradaPersonalizada && (
              <Text className="text-[#6C4FBF] text-sm pl-1">
                + {item.entradaPersonalizada.name} (S/ {item.entradaPersonalizada.price.toFixed(2)})
              </Text>
            )}
            {item.paraLlevar && (
              <View className="flex-row items-center gap-1 pl-1">
                <Package size={12} color="#D4432B" />
                <Text className="text-[#D4432B] text-xs font-semibold">
                  Para llevar · +S/ {(item.taperoPrecio ?? 1).toFixed(2)}
                </Text>
              </View>
            )}
            {item.notes && (
              <View className="flex-row items-center gap-1 pl-1">
                <StickyNote size={12} color="#4D7C4D" />
                <Text className="text-[#4D7C4D] text-sm font-semibold">{item.notes}</Text>
              </View>
            )}
          </View>
        ))}
        <View className="h-px bg-[#D8CBB8] my-3" />
        <View className="flex-row items-center justify-between">
          <Text className="text-[#8C7F6E] text-sm font-bold">
            {comandas.length} comanda{comandas.length === 1 ? '' : 's'}
          </Text>
          <Text className="text-[#2B2420] font-extrabold text-2xl">S/ {total.toFixed(2)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function EstadoMesaScreen() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const mesa = Number(numero);
  const esParallevar = mesa === 0;
  const { getOrdersForTable, deleteOrder, completeTable, completeOrder } = useOrders();
  const comandas = getOrdersForTable(mesa);
  const [completando, setCompletando] = useState(false);
  const [completada, setCompletada] = useState(false);
  const [totalCobrado, setTotalCobrado] = useState(0);
  const [metodoUsado, setMetodoUsado] = useState<MetodoPago | null>(null);
  const [cobro, setCobro] = useState<
    null | { tipo: 'mesa' } | { tipo: 'comanda'; order: Order }
  >(null);

  const todasListas = comandas.length > 0 && comandas.every((o) => o.status === 'READY');
  const pendientes = comandas.filter((o) => o.status !== 'READY').length;
  const totalMesa = comandas.reduce((acc, o) => acc + o.total, 0);
  const estPill = comandas.length > 0 ? estadoDominante(comandas) : null;
  const cobroTotal = cobro?.tipo === 'comanda' ? cobro.order.total : totalMesa;

  function confirmarEliminar(orderId: string) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Eliminar comanda', '¿Eliminar esta comanda para siempre?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const eliminada = await deleteOrder(orderId);
          if (!eliminada) {
            Alert.alert('Error', 'No se pudo eliminar la comanda. Ya no está pendiente.');
          }
        },
      },
    ]);
  }

  function completarMesa() {
    if (completando) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setCobro({ tipo: 'mesa' });
  }

  function cobrarComanda(order: Order) {
    if (completando) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setCobro({ tipo: 'comanda', order });
  }

  async function ejecutarCobro(metodo: MetodoPago) {
    if (completando) return;
    const ordenCobrar = cobro?.tipo === 'comanda' ? cobro.order : null;
    const total = ordenCobrar ? ordenCobrar.total : totalMesa;
    setCobro(null);
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setTotalCobrado(total);
    setMetodoUsado(metodo);
    setCompletando(true);
    const reporte = ordenCobrar
      ? await completeOrder(ordenCobrar.id, metodo)
      : await completeTable(mesa, metodo);
    setCompletando(false);
    if (!reporte) {
      Alert.alert(
        'Error',
        'No se pudo completar el pedido. Verifica que esté listo.'
      );
      return;
    }
    hapticSuccess();
    setCompletada(true);
  }

  return (
    <View className="flex-1 bg-[#1E1A17] px-6 pt-14">
      <View className="flex-row items-center mb-4">
        <ScalePressable
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
            router.back();
          }}
          className="mr-3"
        >
          <View className="w-11 h-11 rounded-full bg-[#2B2420] border border-[#3A322B] items-center justify-center">
            <ArrowLeft size={22} color="#F7F2E9" strokeWidth={2.2} />
          </View>
        </ScalePressable>
        <View className="flex-1">
          <Text className="text-[#F7F2E9] text-2xl font-extrabold">
            {esParallevar ? 'Para llevar' : `Mesa ${numero}`}
          </Text>
          <Text className="text-[#8C7F6E] text-sm">
            {comandas.length === 0
              ? 'Sin pedidos en cocina'
              : todasListas
                ? 'Todo listo para cobrar'
                : `${comandas.length} ${comandas.length === 1 ? 'comanda' : 'comandas'} · ${pendientes} en cocina`}
          </Text>
        </View>
        {estPill && (
          <View className={`rounded-full px-3 py-1 ${estPill.fondo}`}>
            <Text className={`${estPill.texto} text-xs font-bold`}>{estPill.label}</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        {comandas.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ChefAnimado />
            <Text className="text-[#8C7F6E] text-sm mt-2">No hay comandas en cocina</Text>
            <Text className="text-[#B8AC9B] text-xs">Envíale un pedido a la cocina</Text>
          </View>
        ) : todasListas && !esParallevar ? (
          <FlatList
            data={[0]}
            keyExtractor={() => 'resumen'}
            showsVerticalScrollIndicator={false}
            renderItem={() => <ResumenMesa comandas={comandas} total={totalMesa} />}
          />
        ) : (
          <View className="flex-row items-start gap-3 flex-1">
            <ChefAnimado />
            <FlatList
              className="flex-1"
              data={comandas}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ComandaCard
                  order={item}
                  numero={mesa}
                  onEditar={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/mesero/mesa/${mesa}?edit=${item.id}`);
                  }}
                  onEliminar={() => confirmarEliminar(item.id)}
                  onCobrar={
                    esParallevar && item.status === 'READY'
                      ? () => cobrarComanda(item)
                      : undefined
                  }
                  cobrando={completando}
                />
              )}
            />
          </View>
        )}
      </View>

      <View className="pt-2 pb-8">
        {todasListas && !esParallevar && (
          <ScalePressable onPress={completarMesa} pressedScale={0.97} className="mb-3">
            <View
              className={`bg-[#4D7C4D] rounded-2xl py-4 items-center flex-row justify-center gap-2 ${completando ? 'opacity-70' : ''}`}
            >
              <Check size={18} color="#F7F2E9" strokeWidth={2.5} />
              <Text className="text-[#F7F2E9] text-center font-bold text-base">
                {completando ? 'Guardando...' : 'Comanda completada'}
              </Text>
            </View>
          </ScalePressable>
        )}
        <ScalePressable
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/mesero/mesa/${mesa}`);
          }}
          pressedScale={0.97}
        >
          <View className="bg-[#D4432B] rounded-2xl py-4 items-center">
            <Text className="text-[#F7F2E9] text-center font-bold text-base">
              + Agregar pedidos
            </Text>
          </View>
        </ScalePressable>
      </View>

      <Modal visible={cobro !== null} transparent animationType="none">
        <View className="flex-1 items-center justify-center px-8 bg-[#130F0C]/70">
          <View className="rounded-3xl bg-[#2B2420] border border-[#3A322B] p-6 w-full max-w-sm items-center">
            <Text className="text-[#F7F2E9] text-lg font-extrabold mb-1">
              ¿Cómo pagó el cliente?
            </Text>
            <Text className="text-[#8C7F6E] text-sm mb-3">
              S/ {cobroTotal.toFixed(2)} · Se cerrará y entrará al reporte del día
            </Text>
            <ScalePressable
              onPress={() => ejecutarCobro('YAPE')}
              pressedScale={0.97}
              className="w-full mb-3"
            >
              <View className="bg-[#6C4FBF] rounded-2xl py-4 items-center">
                <View className="flex-row items-center gap-2">
                  <Smartphone size={18} color="#F7F2E9" strokeWidth={2.2} />
                  <Text className="text-[#F7F2E9] font-bold text-base">Pagó por Yape</Text>
                </View>
                <Text className="text-[#F7F2E9]/80 text-xs mt-0.5">Cuenta como recaudado</Text>
              </View>
            </ScalePressable>
            <ScalePressable
              onPress={() => ejecutarCobro('EFECTIVO')}
              pressedScale={0.97}
              className="w-full mb-3"
            >
              <View className="bg-[#4D7C4D] rounded-2xl py-4 items-center">
                <View className="flex-row items-center gap-2">
                  <Banknote size={18} color="#F7F2E9" strokeWidth={2.2} />
                  <Text className="text-[#F7F2E9] font-bold text-base">Pagó en efectivo</Text>
                </View>
                <Text className="text-[#F7F2E9]/80 text-xs mt-0.5">Cuenta como recaudado</Text>
              </View>
            </ScalePressable>
            <ScalePressable onPress={() => setCobro(null)} pressedScale={0.98} className="py-2">
              <Text className="text-[#8C7F6E] text-center">Cancelar</Text>
            </ScalePressable>
          </View>
        </View>
      </Modal>

      <Modal visible={completada} transparent animationType="none" onRequestClose={() => router.back()}>
        <View className="flex-1 items-center justify-center px-8 bg-[#130F0C]/70">
          <Animated.View
            entering={FadeIn.duration(200)}
            className="bg-[#2B2420] rounded-3xl border border-[#3A322B] p-8 w-full max-w-sm items-center"
          >
            <Animated.View entering={ZoomIn.duration(350)} className="mb-4">
              <View className="w-16 h-16 rounded-full bg-[#F7F2E9]/10 items-center justify-center">
                <Receipt size={34} color="#E8A33D" strokeWidth={1.8} />
              </View>
            </Animated.View>
            <Text className="text-[#F7F2E9] text-xl font-extrabold mb-1">
              {esParallevar ? 'Pedido para llevar completado' : `Mesa ${numero} completada`}
            </Text>
            <Text className="text-[#8C7F6E] text-sm text-center mb-1">
              Se guardó en el reporte del día
            </Text>
            <Text className="text-[#4D7C4D] text-2xl font-extrabold mb-1">
              S/ {totalCobrado.toFixed(2)}
            </Text>
            <View className="flex-row items-center gap-1.5 mb-6">
              {metodoUsado === 'YAPE' && <Smartphone size={13} color="#8C7F6E" strokeWidth={2.2} />}
              {metodoUsado === 'EFECTIVO' && <Banknote size={13} color="#8C7F6E" strokeWidth={2.2} />}
              <Text className="text-[#8C7F6E] text-xs font-bold">
                {metodoUsado === 'YAPE' ? 'Pagó por Yape' : metodoUsado === 'EFECTIVO' ? 'Pagó en efectivo' : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => (esParallevar ? setCompletada(false) : router.back())}
              className="w-full bg-[#4D7C4D] rounded-full py-4 items-center active:opacity-80"
            >
              <Text className="text-[#F7F2E9] font-bold text-base">Listo</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}