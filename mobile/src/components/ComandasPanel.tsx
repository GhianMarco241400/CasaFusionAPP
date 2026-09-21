// src/components/ComandasPanel.tsx
import { Pressable, Text, View, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getMisComandas } from '../services/reports';
import { Sale } from '../types';
import { ScalePressable } from './ScalePressable';

const FORMATO_FECHA = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
} as const;

function fechaVenta(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', FORMATO_FECHA);
}

function etiquetaVenta(venta: Sale): string {
  if (venta.canal === 'delivery') return 'Delivery';
  if (venta.tableNumber === 0) return 'Para llevar';
  return `Mesa ${venta.tableNumber}`;
}

function DetalleVenta({ venta, indice }: { venta: Sale; indice: number }) {
  const metodo = venta.metodoPago ?? null;
  const numComandas = venta.orders.length;
  const numItems = venta.orders.reduce(
    (acc, o) => acc + o.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );

  return (
    <Animated.View
      entering={SlideInRight.delay(indice * 45).duration(260)}
      className="mb-2.5 rounded-2xl bg-[#1E1A17] border border-[#3A322B] overflow-hidden"
    >
      <View className="px-3.5 pt-3 pb-2.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-8 h-8 rounded-full bg-[#2B2420] items-center justify-center">
              <Feather
                name={venta.canal === 'delivery' ? 'truck' : 'shopping-bag'}
                size={14}
                color="#F7F2E9"
              />
            </View>
            <Text className="text-[#F7F2E9] font-bold text-sm flex-1">
              {etiquetaVenta(venta)}
            </Text>
          </View>
          {metodo && (
            <View className="flex-row items-center gap-1 self-start bg-[#4D7C4D]/15 rounded-full px-2.5 py-1">
              <Feather
                name={metodo === 'YAPE' ? 'smartphone' : 'dollar-sign'}
                size={11}
                color="#4D7C4D"
              />
              <Text className="text-[#4D7C4D] text-[11px] font-bold">
                {metodo === 'YAPE' ? 'Yape' : 'Efectivo'}
              </Text>
            </View>
          )}
        </View>

        <Text className="text-[#8C7F6E] text-[11px] mt-1.5">
          {fechaVenta(venta.completedAt)} · {numItems} ítems ·{' '}
          {numComandas} {numComandas === 1 ? 'comanda' : 'comandas'}
        </Text>

        <View className="h-px bg-[#3A322B] mt-2.5 mb-1" />
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            {venta.orders.flatMap((o) => o.items).slice(0, 3).map((item, i) => (
              <Text
                key={i}
                className="text-[#8C7F6E] text-[11px] leading-tight"
                numberOfLines={1}
              >
                {item.quantity}× {item.name}
              </Text>
            ))}
          </View>
          <Text className="text-[#F7F2E9] font-extrabold">
            S/ {venta.total.toFixed(2)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function ComandasPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({
    queryKey: ['mis-comandas'],
    queryFn: getMisComandas,
    refetchOnMount: true,
  });

  const comandas = data ?? [];

  return (
    <View className="absolute inset-0" style={{ zIndex: 50, elevation: 50 }}>
      <Pressable className="flex-1" onPress={onClose}>
        <View className="flex-1 bg-[#130F0C]/85" />
      </Pressable>

      <Animated.View
        entering={SlideInRight.springify().damping(17).stiffness(180)}
        className="absolute right-0 top-14 w-[60%] rounded-l-3xl overflow-hidden bg-[#1B1714] border border-[#3A322B]"
        style={{ bottom: insets.bottom + 16, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
      >
        <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-[#D4432B] items-center justify-center">
                <Feather name="file-text" size={18} color="#F7F2E9" />
              </View>
              <View>
                <Text className="text-[#F7F2E9] font-extrabold text-lg">
                  Mis comandas
                </Text>
                <Text className="text-[#8C7F6E] text-[11px] -mt-0.5">
                  Registro de ventas cobradas
                </Text>
              </View>
            </View>
            <ScalePressable onPress={onClose} pressedScale={0.9} hitSlop={8}>
              <View className="w-9 h-9 rounded-full bg-[#2B2420] items-center justify-center">
                <Feather name="x" size={18} color="#8C7F6E" />
              </View>
            </ScalePressable>
          </View>
          <View className="h-px bg-[#3A322B]" />

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-[#8C7F6E] text-sm">Cargando…</Text>
            </View>
          ) : (
            <FlatList
              data={comandas}
              keyExtractor={(item) => item.id ?? item.orders[0].orderId}
              renderItem={({ item, index }) => (
                <DetalleVenta venta={item} indice={index} />
              )}
              contentContainerStyle={{ padding: 14, paddingBottom: 16 }}
              ListEmptyComponent={
                <View className="items-center py-16 px-6">
                  <View className="w-14 h-14 rounded-full bg-[#2B2420] items-center justify-center mb-3">
                    <Feather name="inbox" size={24} color="#8C7F6E" />
                  </View>
                  <Text className="text-[#8C7F6E] text-sm text-center">
                    Aún no tienes comandas cobradas
                  </Text>
                </View>
              }
            />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}