// src/components/ComandasPanel.tsx
import { Pressable, Text, View, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getMisComandas } from '../services/reports';
import { Sale } from '../types';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
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
  const { t } = useTema();
  const metodo = venta.metodoPago ?? null;
  const numComandas = venta.orders.length;
  const numItems = venta.orders.reduce(
    (acc, o) => acc + o.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );

  return (
    <Animated.View
      entering={SlideInRight.delay(indice * 45).duration(260)}
      className="mb-2.5 rounded-2xl border overflow-hidden"
      style={{ backgroundColor: t.surface, borderColor: t.border }}
    >
      <View className="px-3.5 pt-3 pb-2.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: t.surface }}>
              <Feather
                name={venta.canal === 'delivery' ? 'truck' : 'shopping-bag'}
                size={14}
                color={t.textPrimary}
              />
            </View>
            <Text className="font-bold text-sm flex-1" style={{ color: t.textPrimary }}>
              {etiquetaVenta(venta)}
            </Text>
          </View>
          {metodo && (
            <View className="flex-row items-center gap-1 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: alpha(t.success, 15) }}>
              <Feather
                name={metodo === 'YAPE' ? 'smartphone' : 'dollar-sign'}
                size={11}
                color={t.success}
              />
              <Text className="text-[11px] font-bold" style={{ color: t.success }}>
                {metodo === 'YAPE' ? 'Yape' : 'Efectivo'}
              </Text>
            </View>
          )}
        </View>

        <Text className="text-[11px] mt-1.5" style={{ color: t.textSecondary }}>
          {fechaVenta(venta.completedAt)} · {numItems} ítems ·{' '}
          {numComandas} {numComandas === 1 ? 'comanda' : 'comandas'}
        </Text>

        <View className="h-px mt-2.5 mb-1" style={{ backgroundColor: t.border }} />
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            {venta.orders.flatMap((o) => o.items).slice(0, 3).map((item, i) => (
              <Text
                key={i}
                className="text-[11px] leading-tight"
                numberOfLines={1}
                style={{ color: t.textSecondary }}
              >
                {item.quantity}× {item.name}
              </Text>
            ))}
          </View>
          <Text className="font-extrabold" style={{ color: t.textPrimary }}>
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
  const { t } = useTema();
  const { data, isLoading } = useQuery({
    queryKey: ['mis-comandas'],
    queryFn: getMisComandas,
    refetchOnMount: true,
  });

  const comandas = data ?? [];

  return (
    <View className="absolute inset-0" style={{ zIndex: 50, elevation: 50 }}>
      <Pressable className="flex-1" onPress={onClose}>
        <View className="flex-1" style={{ backgroundColor: alpha(t.overlay, 85) }} />
      </Pressable>

      <Animated.View
        entering={SlideInRight.springify().damping(17).stiffness(180)}
        className="absolute right-0 top-14 w-[60%] rounded-l-3xl overflow-hidden border"
        style={{ bottom: insets.bottom + 16, backgroundColor: t.surfaceElevated, borderColor: t.border, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
      >
        <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: t.primary }}>
                <Feather name="file-text" size={18} color={t.onPrimary} />
              </View>
              <View>
                <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>
                  Mis comandas
                </Text>
                <Text className="text-[11px] -mt-0.5" style={{ color: t.textSecondary }}>
                  Registro de ventas cobradas
                </Text>
              </View>
            </View>
            <ScalePressable onPress={onClose} pressedScale={0.9} hitSlop={8}>
              <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: t.surface }}>
                <Feather name="x" size={18} color={t.textSecondary} />
              </View>
            </ScalePressable>
          </View>
          <View className="h-px" style={{ backgroundColor: t.border }} />

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm" style={{ color: t.textSecondary }}>Cargando…</Text>
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
                  <View className="w-14 h-14 rounded-full items-center justify-center mb-3" style={{ backgroundColor: t.surface }}>
                    <Feather name="inbox" size={24} color={t.textSecondary} />
                  </View>
                  <Text className="text-sm text-center" style={{ color: t.textSecondary }}>
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