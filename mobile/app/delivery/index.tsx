// app/delivery/index.tsx
import { useState } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { PagoEstado, MetodoPago } from '../../src/types';
import { Posit } from '../../src/components/Posit';
import { ScalePressable } from '../../src/components/ScalePressable';
import QrYape from '../../src/components/QrYape';
import Logo from '../../src/components/Logo';
import { useAuth } from '../../src/context/AuthContext';
import { useOrders } from '../../src/context/OrdersContext';
import { useTema } from '../../src/context/TemaContext';
import { alpha } from '../../src/theme/temas';

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function DeliveryHomeScreen() {
  const { t, temaId } = useTema();
  const { user } = useAuth();
  const { orders, completeDelivery, setUrgente, deleteOrder } = useOrders();
  const [ordenPago, setOrdenPago] = useState<string | null>(null);
  const [verQr, setVerQr] = useState(false);

  const pedidos = orders.filter(
    (o) =>
      o.canal === 'delivery' &&
      (o.waiterId ?? '') === (user?.id ?? '') &&
      (o.status === 'PENDING' || o.status === 'IN_PREPARATION' || o.status === 'READY')
  );

  const pendientes = pedidos.filter((o) => o.status === 'PENDING').length;
  const listos = pedidos.filter((o) => o.status === 'READY').length;
  const preparando = pedidos.length - pendientes - listos;
  const totalPago = pedidos.find((o) => o.id === ordenPago)?.total ?? 0;

  function cerrarCobro() {
    setOrdenPago(null);
    setVerQr(false);
  }

  function abrirCobro(orderId: string) {
    haptic();
    setVerQr(false);
    setOrdenPago(orderId);
  }

  async function cobrar(pagoEstado: PagoEstado, metodoPago?: MetodoPago) {
    if (!ordenPago) return;
    haptic();
    const orderId = ordenPago;
    cerrarCobro();
    await completeDelivery(orderId, pagoEstado, metodoPago);
  }

  return (
    <View className="flex-1 px-6 pt-14" style={{ backgroundColor: t.background }}>
      <View className="mb-1">
        <Logo fuente="logo2" altura={44} />
      </View>

      <Text className="text-sm mb-3" style={{ color: t.textSecondary }}>
        Delivery · Pedidos a domicilio registrados hoy
      </Text>

      <View className="flex-row items-center gap-2 mb-4">
        {[pendientes, preparando, listos].map((val, i) => {
          const etiquetas = ['Pendientes', 'Preparando', 'Listos'];
          const colores = [t.primary, t.accent, '#7FB37F'];
          return (
            <View
              key={i}
              className={`flex-1 rounded-2xl py-3 items-center ${
                temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''
              }`}
              style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border, borderWidth: temaId === 'claro' ? 2 : 1 }}
            >
              <Text className="text-2xl font-extrabold" style={{ color: colores[i] }}>{val}</Text>
              <Text className="text-xs" style={{ color: t.textSecondary }}>{etiquetas[i]}</Text>
            </View>
          );
        })}
      </View>

      <ScalePressable onPress={() => router.push('/delivery/nuevo')} pressedScale={0.97} className="mb-5">
        <View className="rounded-2xl py-4 items-center" style={{ backgroundColor: t.primary }}>
          <Text className="font-bold text-base" style={{ color: t.onPrimary }}>+ Nuevo pedido</Text>
        </View>
      </ScalePressable>

      {pedidos.length === 0 ? (
        <Animated.View
          entering={FadeInDown.duration(250)}
          className="rounded-3xl px-5 py-10 items-center mt-6 border-2 border-dashed"
          style={{ borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
        >
          <View
            className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${
              temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''
            }`}
            style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border, borderWidth: temaId === 'claro' ? 2 : 1 }}
          >
            <Text className="text-3xl" style={{ color: t.textSecondary }}>🛵</Text>
          </View>
          <Text className="text-sm mb-1" style={{ color: t.textSecondary }}>Aún no hay pedidos</Text>
          <Text className="text-xs text-center" style={{ color: t.placeholder }}>
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
                accion={(orderId) => abrirCobro(orderId)}
                onPressEditar={() => router.push(`/delivery/nuevo?edit=${item.id}`)}
                onDelete={deleteOrder}
                onUrgente={(orderId) => {
                  haptic();
                  setUrgente(orderId, !item.urgente);
                }}
                soloExtras={item.items.length > 0 && item.items.every((i) => i.esExtra)}
              />
            </View>
          )}
        />
      )}

      <Modal visible={ordenPago !== null} transparent animationType="none">
        <View className="flex-1 justify-center px-8">
          {verQr ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              className={`rounded-3xl p-6 items-center ${temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''}`}
              style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border, borderWidth: temaId === 'claro' ? 2 : 1 }}
            >
              <Text className="text-lg font-extrabold mb-3" style={{ color: t.textPrimary }}>
                Cobro por Yape
              </Text>
              <QrYape monto={totalPago} tamano={196} />
              <ScalePressable
                onPress={() => cobrar('PAGADO', 'YAPE')}
                pressedScale={0.97}
                className="w-full rounded-2xl py-4 items-center mt-4"
                style={{ backgroundColor: t.success }}
              >
                <Text className="font-bold text-base" style={{ color: t.onPrimary }}>Ya pagó</Text>
              </ScalePressable>
              <ScalePressable onPress={() => setVerQr(false)} pressedScale={0.98} className="w-full py-3">
                <Text className="text-center" style={{ color: t.textSecondary }}>
                  Volver a métodos de pago
                </Text>
              </ScalePressable>
            </Animated.View>
          ) : (
            <View
              className={`rounded-3xl p-6 ${temaId === 'claro' ? 'border-2 border-[#1E1A17]' : ''}`}
              style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border, borderWidth: temaId === 'claro' ? 2 : 1 }}
            >
              <Text className="text-lg font-extrabold mb-1" style={{ color: t.textPrimary }}>
                ¿Cómo cobró el cliente?
              </Text>
              <Text className="text-sm mb-4" style={{ color: t.textSecondary }}>
                S/ {totalPago.toFixed(2)} · Se cerrará el pedido y entrará al reporte del día.
              </Text>
              <ScalePressable onPress={() => setVerQr(true)} pressedScale={0.97}>
                <View className="rounded-2xl py-4 items-center mb-3" style={{ backgroundColor: t.yape }}>
                  <Text className="font-bold text-base" style={{ color: t.onPrimary }}>📱 Pagó por Yape</Text>
                  <Text className="text-xs mt-0.5" style={{ color: alpha(t.onPrimary, 80) }}>
                    Muestra el QR de la casa
                  </Text>
                </View>
              </ScalePressable>
              <ScalePressable onPress={() => cobrar('PAGADO', 'EFECTIVO')} pressedScale={0.97}>
                <View className="rounded-2xl py-4 items-center mb-3" style={{ backgroundColor: t.success }}>
                  <Text className="font-bold text-base" style={{ color: t.onPrimary }}>💵 Pagó en efectivo</Text>
                  <Text className="text-xs mt-0.5" style={{ color: alpha(t.onPrimary, 80) }}>
                    Cuenta como recaudado
                  </Text>
                </View>
              </ScalePressable>
              <ScalePressable onPress={() => cobrar('PENDIENTE')} pressedScale={0.97}>
                <View className="rounded-2xl py-4 items-center mb-2" style={{ backgroundColor: t.accent }}>
                  <Text className="font-bold text-base" style={{ color: t.pillText }}>📅 Lo cobra otro día</Text>
                  <Text className="text-xs mt-0.5" style={{ color: alpha(t.pillText, 70) }}>
                    Queda como pendiente (fiado)
                  </Text>
                </View>
              </ScalePressable>
              <ScalePressable onPress={cerrarCobro} pressedScale={0.98} className="py-2">
                <Text className="text-center" style={{ color: t.textSecondary }}>Cancelar</Text>
              </ScalePressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}