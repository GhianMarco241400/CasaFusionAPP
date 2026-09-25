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
import QrYape from '../../../../src/components/QrYape';
import { useTema } from '../../../../src/context/TemaContext';
import { alpha, TemaTokens } from '../../../../src/theme/temas';
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
  const { t: tema } = useTema();

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
      <View className="w-3 h-3 rounded-full opacity-50" style={{ backgroundColor: tema.placeholder }} />
    </Animated.View>
  );
}

function ChefAnimado() {
  const bob = useSharedValue(0);
  const { t } = useTema();

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
        style={[bobStyle, { backgroundColor: t.surface, borderColor: t.primary }]}
        className="mt-8 w-20 h-20 rounded-full border-2 items-center justify-center"
      >
        <Animated.View entering={ZoomIn.duration(400)}>
          <ChefHat size={38} color={t.textPrimary} strokeWidth={1.8} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function chipEstado(status: OrderStatus, t: TemaTokens) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pendiente', bg: alpha(t.primary, 20), txt: t.primary };
    case 'IN_PREPARATION':
      return { label: 'Preparando', bg: alpha(t.accent, 20), txt: t.accent };
    case 'READY':
      return { label: 'Listo', bg: alpha(t.success, 25), txt: t.success };
    default:
      return { label: status, bg: t.surface, txt: t.textSecondary };
  }
}

function estadoDominante(comandas: Order[], t: TemaTokens) {
  if (comandas.every((o) => o.status === 'READY')) {
    return {
      label: 'Listo para cobrar',
      fondo: t.success,
      texto: t.onPrimary,
    };
  }
  if (comandas.some((o) => o.status === 'PENDING')) {
    return {
      label: 'Pendiente',
      fondo: t.primary,
      texto: t.onPrimary,
    };
  }
  return {
    label: 'Preparando',
    fondo: t.accent,
    texto: t.pillText,
  };
}

type ComandaCardProps = {
  order: Order;
  numero: number;
  onEditar: () => void;
  onEliminar: () => void;
  onCobrar?: () => void;
  onUrgente?: () => void;
  cobrando?: boolean;
};

function ComandaCard({ order, numero, onEditar, onEliminar, onCobrar, onUrgente, cobrando }: ComandaCardProps) {
  const { t, temaId } = useTema();
  const chip = chipEstado(order.status, t);
  const esParallevar = numero === 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      className={`bg-[#F7F2E9] rounded-xl p-3.5 mb-3 border-[3px] ${
        order.urgente ? '' : temaId === 'claro' ? 'border-[#1E1A17]' : 'border-transparent'
      }`}
      style={
        order.urgente
          ? {
              borderColor: t.primary,
              shadowColor: '#D4432B',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 12,
              elevation: 12,
            }
          : temaId === 'claro'
            ? { borderColor: '#1E1A17' }
            : undefined
      }
    >
      <View className="flex-row items-center justify-between mb-2 gap-2">
        <View className="flex-1 flex-row items-center gap-1.5">
          {esParallevar && <Package size={15} color={t.primary} />}
          <Text className="text-[#2B2420] font-extrabold flex-shrink" numberOfLines={1}>
            {esParallevar ? 'Comanda para llevar' : `Comanda de Mesa ${numero}`}
          </Text>
          {order.urgente && (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: t.primary }}>
              <Text className="text-[10px] font-bold" style={{ color: t.onPrimary }}>🛎️ URGENTE</Text>
            </View>
          )}
          {order.edited && (
            <View className="rounded-full px-2 py-0.5 flex-row items-center gap-0.5" style={{ backgroundColor: t.accent }}>
              <Pencil size={10} color={t.chip} strokeWidth={2.5} />
              <Text className="text-[10px] font-bold" style={{ color: t.chip }}>Editado</Text>
            </View>
          )}
        </View>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: chip.bg }}>
          <Text className="text-[10px] font-bold" style={{ color: chip.txt }}>{chip.label}</Text>
        </View>
      </View>

      {order.items.map((item, i) => (
        <View key={i} className="mb-1">
          <View className="flex-row items-center gap-1">
            {!item.dishId && (
              <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: t.yape }}>
                <Text className="text-[9px] font-bold" style={{ color: t.onPrimary }}>PERSO</Text>
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

      <View className="flex-row items-center justify-between mt-2.5 gap-2 flex-wrap">
        <Text className="text-[#8C7F6E] text-sm font-bold">Total: S/ {order.total.toFixed(2)}</Text>
        {order.status === 'PENDING' && (
          <View className="flex-row gap-2 items-center">
            {onUrgente && (
              <ScalePressable onPress={onUrgente} pressedScale={0.95} className="rounded-lg overflow-hidden">
                <View
                  className={`rounded-lg py-1.5 px-2.5 border ${
                    order.urgente ? '' : 'border-dashed'
                  }`}
                  style={
                    order.urgente
                      ? { backgroundColor: t.primary, borderColor: t.primary }
                      : {
                          backgroundColor: alpha(t.primary, 15),
                          borderColor: alpha(t.primary, 50),
                        }
                  }
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: order.urgente ? t.onPrimary : t.primary }}
                  >
                    🛎️ {order.urgente ? 'Urgente' : 'Marcar urgente'}
                  </Text>
                </View>
              </ScalePressable>
            )}
            <ScalePressable onPress={onEditar} pressedScale={0.95} className="rounded-lg overflow-hidden">
              <View className="rounded-lg py-2 px-4 flex-row items-center gap-1.5" style={{ backgroundColor: t.yape }}>
                <Pencil size={14} color={t.onPrimary} strokeWidth={2.5} />
                <Text className="text-sm font-bold" style={{ color: t.onPrimary }}>Editar</Text>
              </View>
            </ScalePressable>
            <ScalePressable onPress={onEliminar} pressedScale={0.95} className="rounded-lg overflow-hidden">
              <View className="rounded-lg py-2 px-4 items-center justify-center" style={{ backgroundColor: t.primary }}>
                <Trash2 size={16} color={t.onPrimary} />
              </View>
            </ScalePressable>
          </View>
        )}
        {order.status === 'IN_PREPARATION' && onUrgente && (
          <View className="flex-row gap-2">
            <ScalePressable onPress={onUrgente} pressedScale={0.95} className="rounded-lg overflow-hidden">
              <View
                className={`rounded-lg py-1.5 px-2.5 border ${
                  order.urgente ? '' : 'border-dashed'
                }`}
                style={
                  order.urgente
                    ? { backgroundColor: t.primary, borderColor: t.primary }
                    : {
                        backgroundColor: alpha(t.primary, 15),
                        borderColor: alpha(t.primary, 50),
                      }
                }
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: order.urgente ? t.onPrimary : t.primary }}
                >
                  🛎️ {order.urgente ? 'Urgente' : 'Marcar urgente'}
                </Text>
              </View>
            </ScalePressable>
          </View>
        )}
        {order.status === 'READY' && onCobrar && (
          <ScalePressable onPress={onCobrar} pressedScale={0.95} disabled={cobrando} className="rounded-lg overflow-hidden">
            <View className={`rounded-lg py-2 px-4 flex-row items-center gap-1.5 ${cobrando ? 'opacity-70' : ''}`} style={{ backgroundColor: t.success }}>
              <Receipt size={15} color={t.onPrimary} strokeWidth={2.2} />
              <Text className="text-sm font-bold" style={{ color: t.onPrimary }}>Cobrar</Text>
            </View>
          </ScalePressable>
        )}
      </View>
    </Animated.View>
  );
}

type ResumenMesaProps = { comandas: Order[]; total: number };

function ResumenMesa({ comandas, total }: ResumenMesaProps) {
  const { t, temaId } = useTema();
  const items = comandas.flatMap((o) => o.items);
  const esParallevar = comandas.length > 0 && comandas[0].tableNumber === 0;
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      className={`bg-[#F7F2E9] rounded-2xl overflow-hidden ${
        temaId === 'claro' ? 'border-[3px] border-[#1E1A17]' : ''
      }`}
    >
      <View className="px-4 py-2.5 flex-row items-center justify-between" style={{ backgroundColor: t.success }}>
        <Text className="font-extrabold text-lg" style={{ color: t.onPrimary }}>
          {esParallevar ? 'Resumen del pedido para llevar' : 'Resumen de la mesa'}
        </Text>
        <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: alpha(t.onPrimary, 20) }}>
          <Check size={14} color={t.onPrimary} strokeWidth={3} />
        </View>
      </View>
      <View className="px-4 pt-3 pb-4">
        {items.map((item, i) => (
          <View key={i} className="mb-2">
            <View className="flex-row items-center gap-1">
              {!item.dishId && (
                <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: t.yape }}>
                  <Text className="text-[10px] font-bold" style={{ color: t.onPrimary }}>PERSO</Text>
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
  const { t, temaId } = useTema();
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const mesa = Number(numero);
  const esParallevar = mesa === 0;
  const { getOrdersForTable, deleteOrder, completeTable, completeOrder, setUrgente } = useOrders();
  const comandas = getOrdersForTable(mesa);
  const [completando, setCompletando] = useState(false);
  const [completada, setCompletada] = useState(false);
  const [totalCobrado, setTotalCobrado] = useState(0);
  const [metodoUsado, setMetodoUsado] = useState<MetodoPago | null>(null);
  const [cobro, setCobro] = useState<
    null | { tipo: 'mesa' } | { tipo: 'comanda'; order: Order }
  >(null);
  const [verQr, setVerQr] = useState(false);

  const todasListas = comandas.length > 0 && comandas.every((o) => o.status === 'READY');
  const pendientes = comandas.filter((o) => o.status !== 'READY').length;
  const totalMesa = comandas.reduce((acc, o) => acc + o.total, 0);
  const estPill = comandas.length > 0 ? estadoDominante(comandas, t) : null;
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

  function cerrarCobro() {
    setCobro(null);
    setVerQr(false);
  }

  function completarMesa() {
    if (completando) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setVerQr(false);
    setCobro({ tipo: 'mesa' });
  }

  function cobrarComanda(order: Order) {
    if (completando) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setVerQr(false);
    setCobro({ tipo: 'comanda', order });
  }

  async function registrarCobro(metodo: MetodoPago) {
    if (completando) return;
    const ordenCobrar = cobro?.tipo === 'comanda' ? cobro.order : null;
    const total = ordenCobrar ? ordenCobrar.total : totalMesa;
    cerrarCobro();
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

  // Yape pide ver el QR antes de registrar la venta, para no cerrar la mesa
  // si el cliente todavía no pagó.
  function ejecutarCobro(metodo: MetodoPago) {
    if (completando) return;
    if (metodo === 'YAPE') {
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
      setVerQr(true);
      return;
    }
    registrarCobro(metodo);
  }

  return (
    <View className="flex-1 px-6 pt-14" style={{ backgroundColor: t.background }}>
      <View className="flex-row items-center mb-9">
        <ScalePressable
          onPress={() => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Soft);
            router.back();
          }}
          className="mr-3"
        >
          <View
            className={`w-11 h-11 rounded-full items-center justify-center ${
              temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
            }`}
            style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
          >
            <ArrowLeft size={22} color={t.textPrimary} strokeWidth={2.2} />
          </View>
        </ScalePressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold" style={{ color: t.textPrimary }}>
            {esParallevar ? 'Para llevar' : `Mesa ${numero}`}
          </Text>
          <Text className="text-sm" style={{ color: t.textSecondary }}>
            {comandas.length === 0
              ? 'Sin pedidos en cocina'
              : todasListas
                ? 'Todo listo para cobrar'
                : `${comandas.length} ${comandas.length === 1 ? 'comanda' : 'comandas'} · ${pendientes} en cocina`}
          </Text>
        </View>
        {estPill && (
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: estPill.fondo }}>
            <Text className="text-xs font-bold" style={{ color: estPill.texto }}>{estPill.label}</Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        {comandas.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ChefAnimado />
            <Text className="text-sm mt-2" style={{ color: t.textSecondary }}>No hay comandas en cocina</Text>
            <Text className="text-xs" style={{ color: t.placeholder }}>Envíale un pedido a la cocina</Text>
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
                  onUrgente={
                    item.status === 'PENDING' || item.status === 'IN_PREPARATION'
                      ? () => {
                          hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                          setUrgente(item.id, !item.urgente);
                        }
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
              className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${completando ? 'opacity-70' : ''}`}
              style={{ backgroundColor: t.success }}
            >
              <Check size={18} color={t.onPrimary} strokeWidth={2.5} />
              <Text className="text-center font-bold text-base" style={{ color: t.onPrimary }}>
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
          <View className="rounded-2xl py-4 items-center" style={{ backgroundColor: t.primary }}>
            <Text className="text-center font-bold text-base" style={{ color: t.onPrimary }}>
              + Agregar pedidos
            </Text>
          </View>
        </ScalePressable>
      </View>

      <Modal visible={cobro !== null} transparent animationType="none">
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: alpha(t.overlay, 70) }}>
          {verQr ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              className={`rounded-3xl p-6 w-full max-w-sm items-center ${
                temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
              }`}
              style={{ backgroundColor: t.surfaceElevated, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
            >
              <Text className="text-lg font-extrabold mb-3" style={{ color: t.textPrimary }}>
                Cobro por Yape
              </Text>
              <QrYape monto={cobroTotal} tamano={196} />
              <ScalePressable
                onPress={() => registrarCobro('YAPE')}
                pressedScale={0.97}
                className="w-full rounded-2xl py-4 items-center mt-4"
                style={{ backgroundColor: t.success }}
              >
                <View className="flex-row items-center gap-2">
                  <Check size={18} color={t.onPrimary} strokeWidth={2.4} />
                  <Text className="font-bold text-base" style={{ color: t.onPrimary }}>
                    Ya pagó
                  </Text>
                </View>
              </ScalePressable>
              <ScalePressable onPress={() => setVerQr(false)} pressedScale={0.98} className="w-full py-3">
                <Text className="text-center" style={{ color: t.textSecondary }}>
                  Volver a métodos de pago
                </Text>
              </ScalePressable>
            </Animated.View>
          ) : (
            <View
              className={`rounded-3xl p-6 w-full max-w-sm items-center ${
                temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
              }`}
              style={{ backgroundColor: t.surfaceElevated, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
            >
              <Text className="text-lg font-extrabold mb-1" style={{ color: t.textPrimary }}>
                ¿Cómo pagó el cliente?
              </Text>
              <Text className="text-sm mb-3" style={{ color: t.textSecondary }}>
                S/ {cobroTotal.toFixed(2)} · Se cerrará y entrará al reporte del día
              </Text>
              <ScalePressable
                onPress={() => ejecutarCobro('YAPE')}
                pressedScale={0.97}
                className="w-full mb-3"
              >
                <View className="rounded-2xl py-4 items-center" style={{ backgroundColor: t.yape }}>
                  <View className="flex-row items-center gap-2">
                    <Smartphone size={18} color={t.onPrimary} strokeWidth={2.2} />
                    <Text className="font-bold text-base" style={{ color: t.onPrimary }}>Pagó por Yape</Text>
                  </View>
                  <Text className="text-xs mt-0.5" style={{ color: alpha(t.onPrimary, 80) }}>Muestra el QR de la casa</Text>
                </View>
              </ScalePressable>
              <ScalePressable
                onPress={() => ejecutarCobro('EFECTIVO')}
                pressedScale={0.97}
                className="w-full mb-3"
              >
                <View className="rounded-2xl py-4 items-center" style={{ backgroundColor: t.success }}>
                  <View className="flex-row items-center gap-2">
                    <Banknote size={18} color={t.onPrimary} strokeWidth={2.2} />
                    <Text className="font-bold text-base" style={{ color: t.onPrimary }}>Pagó en efectivo</Text>
                  </View>
                  <Text className="text-xs mt-0.5" style={{ color: alpha(t.onPrimary, 80) }}>Cuenta como recaudado</Text>
                </View>
              </ScalePressable>
              <ScalePressable onPress={cerrarCobro} pressedScale={0.98} className="py-2">
                <Text className="text-center" style={{ color: t.textSecondary }}>Cancelar</Text>
              </ScalePressable>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={completada} transparent animationType="none" onRequestClose={() => router.back()}>
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: alpha(t.overlay, 70) }}>
          <Animated.View
            entering={FadeIn.duration(200)}
            className={`rounded-3xl p-8 w-full max-w-sm items-center ${
              temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
            }`}
            style={{ backgroundColor: t.surfaceElevated, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
          >
            <Animated.View entering={ZoomIn.duration(350)} className="mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: alpha(t.textPrimary, 10) }}
              >
                <Receipt size={34} color={t.accent} strokeWidth={1.8} />
              </View>
            </Animated.View>
            <Text className="text-xl font-extrabold mb-1" style={{ color: t.textPrimary }}>
              {esParallevar ? 'Pedido para llevar completado' : `Mesa ${numero} completada`}
            </Text>
            <Text className="text-sm text-center mb-1" style={{ color: t.textSecondary }}>
              Se guardó en el reporte del día
            </Text>
            <Text className="text-2xl font-extrabold mb-1" style={{ color: t.success }}>
              S/ {totalCobrado.toFixed(2)}
            </Text>
            <View className="flex-row items-center gap-1.5 mb-6">
              {metodoUsado === 'YAPE' && <Smartphone size={13} color={t.textSecondary} strokeWidth={2.2} />}
              {metodoUsado === 'EFECTIVO' && <Banknote size={13} color={t.textSecondary} strokeWidth={2.2} />}
              <Text className="text-xs font-bold" style={{ color: t.textSecondary }}>
                {metodoUsado === 'YAPE' ? 'Pagó por Yape' : metodoUsado === 'EFECTIVO' ? 'Pagó en efectivo' : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => (esParallevar ? setCompletada(false) : router.back())}
              className="w-full rounded-full py-4 items-center active:opacity-80"
              style={{ backgroundColor: t.success }}
            >
              <Text className="font-bold text-base" style={{ color: t.onPrimary }}>Listo</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}