// app/delivery/index.tsx
import { useState } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { PagoEstado, MetodoPago } from '../../src/types';
import { Posit } from '../../src/components/Posit';
import { ScalePressable } from '../../src/components/ScalePressable';
import Logo from '../../src/components/Logo';
import { useAuth } from '../../src/context/AuthContext';
import { useOrders } from '../../src/context/OrdersContext';

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function DeliveryHomeScreen() {
  const { user } = useAuth();
  const { orders, completeDelivery } = useOrders();
  const [ordenPago, setOrdenPago] = useState<string | null>(null);

  const pedidos = orders.filter(
    (o) =>
      o.canal === 'delivery' &&
      (o.waiterId ?? '') === (user?.id ?? '') &&
      (o.status === 'PENDING' || o.status === 'IN_PREPARATION' || o.status === 'READY')
  );

  const pendientes = pedidos.filter((o) => o.status === 'PENDING').length;
  const listos = pedidos.filter((o) => o.status === 'READY').length;
  const preparando = pedidos.length - pendientes - listos;

  async function cobrar(pagoEstado: PagoEstado, metodoPago?: MetodoPago) {
    if (!ordenPago) return;
    haptic();
    const orderId = ordenPago;
    setOrdenPago(null);
    await completeDelivery(orderId, pagoEstado, metodoPago);
  }

  return (
    <View className="flex-1 bg-[#1E1A17] px-6 pt-14">
      <View className="mb-1">
        <Logo fuente="logo2" altura={44} />
      </View>

      <Text className="text-[#8C7F6E] text-sm mb-3">
        Delivery · Pedidos a domicilio registrados hoy
      </Text>

      <View className="flex-row items-center gap-2 mb-4">
        {[pendientes, preparando, listos].map((val, i) => {
          const etiquetas = ['Pendientes', 'Preparando', 'Listos'];
          const colores = ['text-[#D4432B]', 'text-[#E8A33D]', 'text-[#7FB37F]'];
          return (
            <View
              key={i}
              className="flex-1 bg-[#2B2420] border border-[#3A322B] rounded-2xl py-3 items-center"
            >
              <Text className={`text-2xl font-extrabold ${colores[i]}`}>{val}</Text>
              <Text className="text-[#8C7F6E] text-xs">{etiquetas[i]}</Text>
            </View>
          );
        })}
      </View>

      <ScalePressable onPress={() => router.push('/delivery/nuevo')} pressedScale={0.97} className="mb-5">
        <View className="bg-[#D4432B] rounded-2xl py-4 items-center">
          <Text className="text-[#F7F2E9] font-bold text-base">+ Nuevo pedido</Text>
        </View>
      </ScalePressable>

      {pedidos.length === 0 ? (
        <Animated.View
          entering={FadeInDown.duration(250)}
          className="border-2 border-dashed border-[#3A322B] rounded-3xl px-5 py-10 items-center mt-6"
        >
          <View className="w-16 h-16 rounded-2xl bg-[#2B2420] border border-[#3A322B] items-center justify-center mb-3">
            <Text className="text-[#8C7F6E] text-3xl">🛵</Text>
          </View>
          <Text className="text-[#8C7F6E] text-sm mb-1">Aún no hay pedidos</Text>
          <Text className="text-[#B8AC9B] text-xs text-center">
            Toca "Nuevo pedido" para registrar uno
          </Text>
        </Animated.View>
      ) : (
        <Animated.FlatList
          data={pedidos}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 16 }}
          keyExtractor={(o) => o.id}
          layout={LinearTransition.springify().damping(18)}
          renderItem={({ item }) => (
            <View>
              <Posit
                order={item}
                modo="delivery"
                enviando={false}
                accion={(orderId) => setOrdenPago(orderId)}
                onPressEditar={() => router.push(`/delivery/nuevo?edit=${item.id}`)}
                soloExtras={item.items.length > 0 && item.items.every((i) => i.esExtra)}
              />
            </View>
          )}
        />
      )}

      <Modal visible={ordenPago !== null} transparent animationType="none">
        <View className="flex-1 justify-center px-8">
          <View className="rounded-3xl bg-[#2B2420] border border-[#3A322B] p-6">
            <Text className="text-[#F7F2E9] text-lg font-extrabold mb-1">¿Cómo cobró el cliente?</Text>
            <Text className="text-[#8C7F6E] text-sm mb-4">
              Se cerrará el pedido y entrará al reporte del día.
            </Text>
            <ScalePressable onPress={() => cobrar('PAGADO', 'YAPE')} pressedScale={0.97}>
              <View className="bg-[#6C4FBF] rounded-2xl py-4 items-center mb-3">
                <Text className="text-[#F7F2E9] font-bold text-base">📱 Pagó por Yape</Text>
                <Text className="text-[#F7F2E9]/80 text-xs mt-0.5">Cuenta como recaudado</Text>
              </View>
            </ScalePressable>
            <ScalePressable onPress={() => cobrar('PAGADO', 'EFECTIVO')} pressedScale={0.97}>
              <View className="bg-[#4D7C4D] rounded-2xl py-4 items-center mb-3">
                <Text className="text-[#F7F2E9] font-bold text-base">💵 Pagó en efectivo</Text>
                <Text className="text-[#F7F2E9]/80 text-xs mt-0.5">Cuenta como recaudado</Text>
              </View>
            </ScalePressable>
            <ScalePressable onPress={() => cobrar('PENDIENTE')} pressedScale={0.97}>
              <View className="bg-[#E8A33D] rounded-2xl py-4 items-center mb-2">
                <Text className="text-[#2B2420] font-bold text-base">📅 Lo cobra otro día</Text>
                <Text className="text-[#2B2420]/70 text-xs mt-0.5">Queda como pendiente (fiado)</Text>
              </View>
            </ScalePressable>
            <ScalePressable onPress={() => setOrdenPago(null)} pressedScale={0.98} className="py-2">
              <Text className="text-[#8C7F6E] text-center">Cancelar</Text>
            </ScalePressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}