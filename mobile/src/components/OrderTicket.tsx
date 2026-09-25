// src/components/OrderTicket.tsx
import { useRef, type ElementRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable, {
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2 } from 'lucide-react-native';
import { Order, OrderItem, Dish, OrderStatus } from '../types';
import { useLetrasCocina } from '../context/LetrasCocina';
import { useTema } from '../context/TemaContext';

type Props = {
  order: Order;
  dishes: Dish[];
  onDelivered: (orderId: string) => void;
  onIniciar?: (orderId: string) => void;
  onCancelar?: (orderId: string) => void;
  onUrgente?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  soloExtras?: boolean;
};

const PAPER = '#FBF7EE';
const PAPER_EXTRAS = '#EAE2F8';
const TINTA = '#2B2420';
const ROJO = '#8F1D12';

const SOMBRA_URGENTE = {
  shadowColor: '#D4432B',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 12,
  elevation: 12,
};

function hapticImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(style).catch(() => {});
}

function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function chipEstado(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pendiente', cls: 'bg-[#D4432B]/20', txt: 'text-[#D4432B]' };
    case 'IN_PREPARATION':
      return { label: 'Preparando', cls: 'bg-[#E8A33D]/25', txt: 'text-[#A86E16]' };
    case 'READY':
      return { label: 'Listo', cls: 'bg-[#4D7C4D]/25', txt: 'text-[#4D7C4D]' };
    default:
      return { label: status, cls: 'bg-[#2B2420]', txt: 'text-[#8C7F6E]' };
  }
}

function BordeRoto({ color }: { color: string }) {
  return (
    <View className="absolute -bottom-1.5 left-1 right-1 flex-row justify-between" pointerEvents="none">
      {Array.from({ length: 15 }, (_, i) => (
        <View
          key={i}
          style={{
            width: 9,
            height: 9,
            backgroundColor: color,
            transform: [{ rotate: i % 2 === 0 ? '-38deg' : '38deg' }],
            marginTop: i % 3 === 0 ? 3 : 0,
          }}
        />
      ))}
    </View>
  );
}

function itemTotal(item: OrderItem): number {
  return (
    item.unitPrice * item.quantity +
    (item.entrada?.price ?? 0) +
    (item.entradaPersonalizada?.price ?? 0) +
    (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0)
  );
}

function ContenidoHojita({
  order,
  dishes,
  onIniciar,
  onCancelar,
  onUrgente,
  soloExtras,
}: {
  order: Order;
  dishes: Dish[];
  onIniciar?: (orderId: string) => void;
  onCancelar?: (orderId: string) => void;
  onUrgente?: (orderId: string) => void;
  soloExtras?: boolean;
}) {
  const chip = chipEstado(order.status);
  const esParallevar = order.tableNumber === 0;
  const items = soloExtras ? order.items.filter((i) => i.esExtra) : order.items;
  const total = soloExtras
    ? items.reduce((acc, it) => acc + itemTotal(it), 0)
    : order.total;
  const esHojaExtras = soloExtras;
  const { t, fuenteValor } = useLetrasCocina(); 

  return (
    <View className="relative px-4 py-3">
      <View className="pointer-events-none absolute left-5 right-0 top-3 bottom-3 justify-evenly">
        {Array.from({ length: 12 }, (_, i) => (
          <View
            key={i}
            style={{ backgroundColor: esHojaExtras ? '#D9C6FB' : '#D8CBB8', opacity: 0.7 }}
            className="h-px"
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between mb-1.5 gap-2">
        <View className="flex-row items-center gap-1.5 flex-wrap flex-shrink">
          {esHojaExtras && (
            <View className="bg-[#6C4FBF] rounded px-1.5 py-0.5">
              <Text
                className="text-[#F7F2E9] font-extrabold"
                style={{ fontSize: t(14) }}
              >
                EXTRA
              </Text>
            </View>
          )}
          <Text
            className="text-[#2B2420] font-extrabold flex-shrink"
            style={{ fontSize: t(30), fontFamily: fuenteValor }}
          >
            {esParallevar ? '🥡 Para llevar' : `Mesa ${order.tableNumber}`}
          </Text>
          {order.urgente && (
            <View className="bg-[#D4432B] rounded-full px-2 py-0.5">
              <Text
                className="text-[#F7F2E9] font-extrabold"
                style={{ fontSize: t(14), fontFamily: fuenteValor }}
              >
                🛎️ URGENTE
              </Text>
            </View>
          )}
          {order.edited && (
            <View className="bg-[#E8A33D] rounded-full px-2 py-0.5">
              <Text
                className="text-[#1E1A17] font-bold"
                style={{ fontSize: t(14), fontFamily: fuenteValor }}
              >
                ✏️ Editado
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-1.5">
          {order.status === 'PENDING' && onIniciar && (
            <Pressable
              onPress={() => onIniciar(order.id)}
              className="rounded-full px-2 py-1 border border-dashed border-[#A86E16]/70 bg-[#E8A33D]/25"
            >
              <Text
                className="text-[#A86E16] font-bold"
                style={{ fontSize: t(16), fontFamily: fuenteValor }}
              >
                👨‍🍳 Cocinar
              </Text>
            </Pressable>
          )}
          {order.status === 'IN_PREPARATION' && onCancelar && (
            <Pressable
              onPress={() => onCancelar(order.id)}
              className="rounded-full px-2 py-1 border border-dashed border-[#A86E16]/70 bg-[#E8A33D]/20"
            >
              <Text
                className="text-[#A86E16] font-bold"
                style={{ fontSize: t(16), fontFamily: fuenteValor }}
              >
                ↩️ Cancelar
              </Text>
            </Pressable>
          )}
          {onUrgente && (order.status === 'PENDING' || order.status === 'IN_PREPARATION') && (
            <Pressable
              onPress={() => onUrgente(order.id)}
              className={`rounded-full px-2 py-1 ${
                order.urgente
                  ? 'bg-[#D4432B]'
                  : 'border border-dashed border-[#D4432B]/70 bg-[#D4432B]/15'
              }`}
            >
              <Text
                className={`font-bold ${order.urgente ? 'text-[#F7F2E9]' : 'text-[#D4432B]'}`}
                style={{ fontSize: t(16), fontFamily: fuenteValor }}
              >
                🛎️ Urgente
              </Text>
            </Pressable>
          )}
          <View className={`rounded-full px-2 py-1 ${chip.cls}`}>
            <Text
              className={`font-bold ${chip.txt}`}
              style={{ fontSize: t(16), fontFamily: fuenteValor }}
            >
              {chip.label}
            </Text>
          </View>
        </View>
      </View>

      {items.map((item, i) => (
        <View key={i} className="mb-1">
          <View className="flex-row items-center gap-1">
            {!item.dishId && (
              <View className="bg-[#6C4FBF] rounded px-1.5 py-0.5">
                <Text
                  className="text-[#F7F2E9] font-bold"
                  style={{ fontSize: t(14), fontFamily: fuenteValor }}
                >
                  PERSO
                </Text>
              </View>
            )}
            <Text
              className={`${item.esExtra ? 'text-[#6C4FBF] font-extrabold' : 'text-[#2B2420]'} flex-shrink`}
              style={{ fontSize: t(24), fontFamily: fuenteValor }}
            >
              <Text className="font-extrabold">{item.quantity}x </Text>
              {item.name}
            </Text>
            {item.paraLlevar && (
              <Text
                className="text-[#D4432B] font-extrabold"
                style={{ fontSize: t(18), fontFamily: fuenteValor }}
              >
                🥡
              </Text>
            )}
          </View>
          {item.entrada && (
            <Text
              className="text-[#8C7F6E]"
              style={{ fontSize: t(20), fontFamily: fuenteValor }}
            >
              + {item.entrada.name}
            </Text>
          )}
          {item.entradaPersonalizada && (
            <Text
              className="text-[#6C4FBF]"
              style={{ fontSize: t(20), fontFamily: fuenteValor }}
            >
              + {item.entradaPersonalizada.name}
            </Text>
          )}
          {item.paraLlevar && (
            <Text
              className="text-[#D4432B] font-bold"
              style={{ fontSize: t(16), fontFamily: fuenteValor }}
            >
              PARA LLEVAR · taper +S/ {(item.taperoPrecio ?? 1).toFixed(2)}
            </Text>
          )}
          {item.notes && (
            <Text
              className="text-[#4D7C4D] font-semibold"
              style={{ fontSize: t(20), fontFamily: fuenteValor }}
            >
              📝 {item.notes}
            </Text>
          )}
        </View>
      ))}

      <View className="flex-row items-end justify-between mt-2.5">
        <View>
          <Text
            className="text-[#8C7F6E] uppercase tracking-wide"
            style={{ fontSize: t(16), fontFamily: fuenteValor }}
          >
            Total
          </Text>
          <Text
            className="text-[#2B2420] font-extrabold"
            style={{ fontSize: t(24), fontFamily: fuenteValor }}
          >
            S/ {total.toFixed(2)}
          </Text>
        </View>
        <View
          className="px-2 py-0.5 border-2 border-[#D4432B]"
          style={{ transform: [{ rotate: '-8deg' }] }}
        >
          <Text
            className="text-[#D4432B] font-extrabold tracking-widest"
            style={{ fontSize: t(16), fontFamily: fuenteValor }}
          >
            {esHojaExtras
              ? '✓ EXTRA'
              : esParallevar
                ? '✓ PARA LLEVAR'
                : '✓ COMANDA'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function OrderTicket({ order, dishes, onDelivered, onIniciar, onCancelar, onUrgente, onDelete, soloExtras }: Props) {
  const tear = useSharedValue(0);
  const rasgoRef = useRef(false);
  const swipeableRef = useRef<ElementRef<typeof ReanimatedSwipeable>>(null);
  const esHojaExtras = soloExtras;
  const papel = esHojaExtras ? PAPER_EXTRAS : PAPER;
  const { t, fuenteValor } = useLetrasCocina();
  const { temaId } = useTema();
  const puedeBorrar =
    Boolean(onDelete) &&
    (order.status === 'PENDING' || order.status === 'IN_PREPARATION');

  const overlayAnim = useAnimatedStyle(() => ({
    opacity: tear.value,
    transform: [
      { translateY: -30 * tear.value },
      { rotate: `${-2.5 * tear.value}deg` },
    ],
  }));

  const baseAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: 18 * tear.value },
      { rotate: `${2.5 * tear.value}deg` },
    ],
  }));

  const tornLineAnim = useAnimatedStyle(() => ({ opacity: tear.value }));

  function renderLeftActions() {
    return (
      <View className="bg-[#4D7C4D] flex-1 items-center justify-center rounded-lg">
        <Text
          className="text-[#F7F2E9] font-extrabold"
          style={{ fontSize: t(30), fontFamily: fuenteValor }}
        >
          Listo ✓
        </Text>
      </View>
    );
  }

  function renderRightActions() {
    return (
      <Pressable
        onPress={borrar}
        className="bg-[#8F1D12] flex-1 items-center justify-center rounded-lg px-4"
      >
        <Trash2 size={t(34)} color="#F7F2E9" strokeWidth={2.5} />
        <Text
          className="text-[#F7F2E9] font-extrabold"
          style={{ fontSize: t(24), fontFamily: fuenteValor }}
        >
          Borrar
        </Text>
      </Pressable>
    );
  }

  function borrar() {
    if (!onDelete) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(order.id);
    swipeableRef.current?.close();
  }

  function rasgar() {
    if (rasgoRef.current) return;
    rasgoRef.current = true;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    tear.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    setTimeout(() => {
      hapticSuccess();
      onDelivered(order.id);
    }, 440);
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={puedeBorrar ? renderRightActions : undefined}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.RIGHT) rasgar();
      }}
    >
      <View
        className={`relative mb-4 border-[3px] rounded-lg ${
          order.urgente
            ? 'border-[#D4432B]'
            : temaId === 'claro'
              ? 'border-[#1E1A17]'
              : 'border-transparent'
        }`}
        style={order.urgente ? SOMBRA_URGENTE : undefined}
      >
        <View className="absolute inset-0 rounded-lg" style={{ backgroundColor: papel }}>
          <View className="flex-1 items-center justify-center px-6">
            <Text
              className="text-[#2B2420] font-extrabold opacity-20"
              style={{ fontSize: t(24), fontFamily: fuenteValor }}
            >
              Listo ✓
            </Text>
          </View>
        </View>

        <Animated.View
          style={[baseAnim]}
          className="relative rounded-t-lg overflow-hidden"
        >
          <View style={{ backgroundColor: papel }}>
            <ContenidoHojita
              order={order}
              dishes={dishes}
              onIniciar={onIniciar}
              onCancelar={onCancelar}
              onUrgente={onUrgente}
              soloExtras={soloExtras}
            />
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[overlayAnim, { height: '52%' }]}
          className="absolute left-0 right-0 top-0 overflow-hidden rounded-t-lg"
        >
          <View style={{ backgroundColor: papel }}>
            <ContenidoHojita
              order={order}
              dishes={dishes}
              onIniciar={onIniciar}
              onCancelar={onCancelar}
              onUrgente={onUrgente}
              soloExtras={soloExtras}
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[tornLineAnim, { top: '52%' }]}
          className="absolute left-1 right-1 flex-row justify-between"
          pointerEvents="none"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <View
              key={i}
              style={{
                width: 6,
                height: 6,
                marginTop: i % 2 === 0 ? 1 : 0,
                backgroundColor: '#C9BBA6',
                transform: [{ rotate: i % 2 === 0 ? '40deg' : '-40deg' }],
              }}
            />
          ))}
        </Animated.View>

        <BordeRoto color={papel} />
      </View>
    </ReanimatedSwipeable>
  );
}