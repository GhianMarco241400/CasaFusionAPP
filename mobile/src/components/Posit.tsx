// src/components/Posit.tsx
import { useRef, type ElementRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ReanimatedSwipeable, {
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2 } from 'lucide-react-native';
import { Order, OrderItem, OrderStatus } from '../types';
import { useLetrasCocina } from '../context/LetrasCocina';

type Modo = 'cocina' | 'delivery';

type Props = {
  order: Order;
  modo: Modo;
  accion: (orderId: string) => void;
  onPressEditar?: () => void;
  onIniciar?: () => void;
  onDelete?: (orderId: string) => void;
  enviando?: boolean;
  soloExtras?: boolean;
};

const AMARILLO = '#FFEB8A';
const AMARILLO_OSCURO = '#F2D96B';
const PAPEL_EXTRAS = '#EAE2F8';
const SOMBRA_EXTRAS = '#DCC8F5';
const TINTA = '#1E1A17';
const ROJO = '#8F1D12';

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
      return { label: 'Preparando', cls: 'bg-[#E8A33D]/30', txt: 'text-[#8A5A10]' };
    case 'READY':
      return { label: 'Listo', cls: 'bg-[#4D7C4D]/25', txt: 'text-[#2F5A2F]' };
    default:
      return { label: status === 'DELIVERED' ? 'Recogido' : status, cls: 'bg-[#2B2420]', txt: 'text-[#F7F2E9]' };
  }
}

function horaLima(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function itemTotal(item: OrderItem): number {
  return (
    item.unitPrice * item.quantity +
    (item.entrada?.price ?? 0) +
    (item.entradaPersonalizada?.price ?? 0) +
    (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0)
  );
}

function ContenidoPosit({
  order,
  mostrarIniciar,
  onIniciar,
  soloExtras,
  grande,
}: {
  order: Order;
  mostrarIniciar: boolean;
  onIniciar?: () => void;
  soloExtras?: boolean;
  grande?: boolean;
}) {
  const chip = chipEstado(order.status);
  const cliente = order.clienteNombre ?? 'Pedido sin nombre';
  const esHojaExtras = soloExtras;
  const { t, fuenteValor } = useLetrasCocina();
  const fs = (grandeN: number, chicoN: number) => t(grande ? grandeN : chicoN);
  const fam = fuenteValor;
  const items = esHojaExtras ? order.items.filter((i) => i.esExtra) : order.items;
  const taperos = items.reduce(
    (acc, it) =>
      acc + (it.paraLlevar ? (it.taperoPrecio ?? 1) * it.quantity : 0),
    0
  );
  const total = esHojaExtras
    ? items.reduce((acc, it) => acc + itemTotal(it), 0)
    : order.total;
  const fondo = esHojaExtras ? PAPEL_EXTRAS : AMARILLO;

  return (
    <Animated.View entering={FadeInDown.duration(240)}>
      <View style={{ backgroundColor: fondo }} className="px-4 pt-4 pb-5">
        <View
          className="absolute left-1/2 -top-2.5 -translate-x-1/2"
          style={{
            width: 74,
            height: 22,
            backgroundColor: 'rgba(216, 203, 184, 0.55)',
            transform: [{ rotate: '-1deg' }],
          }}
          pointerEvents="none"
        />

        <View className="flex-row items-start justify-between mb-1.5">
          <View className="flex-1 pr-2">
            <View className="flex-row items-center gap-1.5">
              {esHojaExtras && (
                <View className="bg-[#6C4FBF] rounded px-1.5 py-0.5">
                  <Text
                    className="text-[#F7F2E9] font-extrabold"
                    style={{ fontSize: fs(14, 10), fontFamily: fam }}
              >
                EXTRA
              </Text>
            </View>
          )}
          <Text
                className="text-[#1E1A17] font-extrabold leading-tight"
                style={{ fontSize: fs(24, 18), fontFamily: fam }}
              >
                🛵 {cliente}
              </Text>
            </View>
            <Text
              className="text-[#1E1A17]/60 font-semibold mt-0.5"
              style={{ fontSize: fs(16, 12), fontFamily: fam }}
            >
              {order.canal ? 'Delivery' : ''} · {horaLima(order.createdAt)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            {mostrarIniciar && onIniciar && (
              <Pressable
                onPress={() => {
                  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
                  onIniciar();
                }}
                className="rounded-full px-2 py-1 border border-dashed border-[#B87E1E] bg-[#E8A33D]/35"
              >
                <Text
                  className="text-[#8A5A10] font-bold"
                  style={{ fontSize: fs(16, 10), fontFamily: fam }}
                >
                  👨‍🍳 Cocinar
                </Text>
              </Pressable>
            )}
            <View className={`rounded-full px-2 py-1 ${chip.cls}`}>
              <Text
                className={`font-bold ${chip.txt}`}
                style={{ fontSize: fs(16, 11), fontFamily: fam }}
              >
                {chip.label}
              </Text>
            </View>
          </View>
        </View>

        {(order.telefono || order.direccion) && (
          <View className="mb-2">
            {order.telefono ? (
              <Text
                className="text-[#1E1A17] font-semibold"
                style={{ fontSize: fs(16, 12), fontFamily: fam }}
              >
                📞 {order.telefono}
              </Text>
            ) : null}
            {order.direccion ? (
              <Text
                className="text-[#1E1A17] mt-0.5"
                style={{ fontSize: fs(16, 12), fontFamily: fam }}
                numberOfLines={2}
              >
                📍 {order.direccion}
              </Text>
            ) : null}
          </View>
        )}

        <View className="h-px bg-[#1E1A17]/15 mb-2" />

        {items.map((item, i) => (
          <View key={i} className="mb-1.5">
            <View className="flex-row items-center gap-1.5">
              <Text
                className="text-[#1E1A17] flex-shrink"
                style={{ fontSize: fs(20, 16), fontFamily: fam }}
              >
                <Text className="font-extrabold">{item.quantity}x </Text>
                {item.name}
              </Text>
              <View
                className={`rounded-full px-1.5 py-0.5 ${
                  item.paraLlevar ? 'bg-[#D4432B]/20' : 'bg-[#1E1A17]/10'
                }`}
              >
                <Text
                  className={`font-bold ${
                    item.paraLlevar ? 'text-[#C93E26]' : 'text-[#1E1A17]/70'
                  }`}
                  style={{ fontSize: fs(14, 10), fontFamily: fam }}
                >
                  {item.paraLlevar ? `🥡 taper +S/ ${(item.taperoPrecio ?? 1).toFixed(2)}` : '🍽 en plato'}
                </Text>
              </View>
            </View>
            {item.entrada && (
              <Text
                className="text-[#1E1A17]/60"
                style={{ fontSize: fs(18, 14), fontFamily: fam }}
              >
                + {item.entrada.name}
              </Text>
            )}
            {item.entradaPersonalizada && (
              <Text
                className="text-[#1E1A17]/60"
                style={{ fontSize: fs(18, 14), fontFamily: fam }}
              >
                + {item.entradaPersonalizada.name} · S/ {item.entradaPersonalizada.price.toFixed(2)}
              </Text>
            )}
            {item.notes ? (
              <Text
                className="text-[#3F6E3F] font-semibold"
                style={{ fontSize: fs(18, 14), fontFamily: fam }}
              >
                📝 {item.notes}
              </Text>
            ) : null}
          </View>
        ))}

        <View className="flex-row items-end justify-between mt-1.5">
          <Text
            className="text-[#1E1A17]/60 uppercase tracking-wide"
            style={{ fontSize: fs(14, 10), fontFamily: fam }}
          >
            {esHojaExtras
              ? 'Extras de la comanda'
              : taperos > 0
                ? `Incluye tapero +S/ ${taperos.toFixed(2)}`
                : 'Total a cobrar'}
          </Text>
          <Text
            className="text-[#1E1A17] font-extrabold"
            style={{ fontSize: fs(24, 18), fontFamily: fam }}
          >
            S/ {total.toFixed(2)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function Posit({ order, modo, accion, onPressEditar, onIniciar, onDelete, enviando, soloExtras }: Props) {
  const confirmado = useSharedValue(0);
  const hechoRef = useRef(false);
  const swipeableRef = useRef<ElementRef<typeof ReanimatedSwipeable>>(null);
  const esHojaExtras = soloExtras;
  const sombraFondo = esHojaExtras ? SOMBRA_EXTRAS : AMARILLO_OSCURO;
  const { t, fuenteValor } = useLetrasCocina();

  const fondoAnim = useAnimatedStyle(() => ({
    opacity: confirmado.value,
  }));

  const esCocina = modo === 'cocina';
  const grande = esCocina;
  const accionCercana = esCocina
    ? 'Listo ✓'
    : order.status === 'READY'
      ? 'Recogido ✓'
      : null;
  const mostrarIniciar =
    esCocina && order.status === 'PENDING' && Boolean(onIniciar);
  const puedeBorrar =
    Boolean(onDelete) &&
    (order.status === 'PENDING' || order.status === 'IN_PREPARATION');

  function borrar() {
    if (!onDelete) return;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(order.id);
    swipeableRef.current?.close();
  }

  function ejecutar() {
    if (hechoRef.current || enviando) return;
    hechoRef.current = true;
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    confirmado.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    setTimeout(() => {
      hapticSuccess();
      accion(order.id);
    }, 320);
  }

  const esTapEditable =
    onPressEditar && order.status === 'PENDING' && modo === 'delivery';

  const rotacion =
    order.id.charCodeAt(order.id.length - 1) % 2 === 0 ? '-1.2deg' : '1deg';

  const contenido = (
    <View className="mb-4" style={{ transform: [{ rotate: rotacion }] }}>
      <View className="rounded-sm overflow-hidden relative">
        <View className="absolute inset-0" style={{ backgroundColor: sombraFondo }} />
        <Animated.View style={[fondoAnim]} className="absolute inset-0 items-center justify-center">
          <Text
            className="text-[#F7F2E9] font-extrabold"
            style={{ fontSize: grande ? t(30) : t(18), fontFamily: grande ? fuenteValor : undefined }}
          >
            {modo === 'cocina' ? 'Listo ✓' : 'Recogido ✓'}
          </Text>
        </Animated.View>
        <View className="relative">
          <ContenidoPosit
            order={order}
            mostrarIniciar={mostrarIniciar}
            onIniciar={onIniciar}
            soloExtras={soloExtras}
            grande={grande}
          />
        </View>
      </View>
    </View>
  );

  if (esTapEditable) {
    return (
      <Pressable onPress={onPressEditar}>
        {contenido}
      </Pressable>
    );
  }

  if (!accionCercana) {
    return contenido;
  }

  function renderLeftActions() {
    return (
      <View className="bg-[#4D7C4D] flex-1 items-center justify-center rounded-sm">
          <Text
            className="text-[#F7F2E9] font-extrabold"
            style={{ fontSize: grande ? t(30) : 16,  }}
          >
            {accionCercana}
          </Text>
      </View>
    );
  }

  function renderRightActions() {
    return (
      <Pressable
        onPress={borrar}
        className="bg-[#8F1D12] flex-1 items-center justify-center rounded-sm px-4"
      >
        <Trash2 size={grande ? t(34) : t(20)} color="#F7F2E9" strokeWidth={2.5} />
        <Text
          className="text-[#F7F2E9] font-extrabold"
          style={{ fontSize: grande ? t(24) : t(16), fontFamily: grande ? fuenteValor : undefined }}
        >
          Borrar
        </Text>
      </Pressable>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={puedeBorrar ? renderRightActions : undefined}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      enabled={!enviando}
      onSwipeableOpen={(direction) => {
        if (direction !== SwipeDirection.RIGHT) return;
        ejecutar();
        swipeableRef.current?.close();
      }}
    >
      {contenido}
    </ReanimatedSwipeable>
  );
}