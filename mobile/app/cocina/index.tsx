import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Truck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useOrders } from '../../src/context/OrdersContext';
import { useTema } from '../../src/context/TemaContext';
import { getDishes } from '../../src/services/menu';
import { OrderTicket } from '../../src/components/OrderTicket';
import { Posit } from '../../src/components/Posit';
import Logo from '../../src/components/Logo';
import { Order } from '../../src/types';

function PapelSkeleton() {
  const { t } = useTema();
  return (
    <View className="rounded-t-lg overflow-hidden mb-3 opacity-90" style={{ backgroundColor: t.border }}>
      {Array.from({ length: 7 }, (_, i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.delay(i * 60)}
          className={i % 5 === 0 ? 'rounded-full h-3 w-3/4 my-2 mx-4' : 'rounded-full h-2.5 w-5/6 my-1.5 mx-4'}
          style={{ backgroundColor: t.border }}
        />
      ))}
      <View className="h-7 mx-4 mb-2 rounded" style={{ backgroundColor: t.border }} />
    </View>
  );
}

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type FiltroCocina = 'todos' | 'mesas' | 'delivery';

export default function CocinaScreen() {
  const { t } = useTema();
  const [filtro, setFiltro] = useState<FiltroCocina>('todos');
  const { orders, loading, markReady, markPreparation, markPending, deleteOrder } = useOrders();
  const { data: dishes = [] } = useQuery({ queryKey: ['dishes'], queryFn: getDishes });

  const pedidosActivos = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'IN_PREPARATION'
  );

  const visibles = pedidosActivos
    .filter((o) => {
      if (filtro === 'mesas') return o.canal !== 'delivery';
      if (filtro === 'delivery') return o.canal === 'delivery';
      return true;
    })
    .sort((a, b) => Number(b.urgente ?? false) - Number(a.urgente ?? false));

  const contMesas = pedidosActivos.filter((o) => o.canal !== 'delivery').length;
  const contDelivery = pedidosActivos.filter((o) => o.canal === 'delivery').length;

  function esSoloExtras(o: Order) {
    return o.items.length > 0 && o.items.every((i) => i.esExtra);
  }

  function renderOrden(item: Order) {
    if (item.canal === 'delivery') {
      return (
        <View>
          <Posit
            order={item}
            modo="cocina"
            accion={markReady}
            onIniciar={() => markPreparation(item.id)}
            onCancelar={() => markPending(item.id)}
            onDelete={deleteOrder}
            soloExtras={esSoloExtras(item)}
          />
        </View>
      );
    }
    return (
      <View>
        <OrderTicket
          order={item}
          dishes={dishes}
          soloExtras={esSoloExtras(item)}
          onDelivered={markReady}
          onIniciar={() => markPreparation(item.id)}
          onCancelar={() => markPending(item.id)}
          onDelete={deleteOrder}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 px-6 pt-16" style={{ backgroundColor: t.background }}>
      <View className="mb-3">
        <Logo fuente="logo2" altura={44} />
      </View>
      <View className="flex-row items-center gap-3 mb-5">
        <Text className="text-base flex-1" style={{ color: t.textSecondary }}>
          Desliza a la derecha para listo · a la izquierda para borrar
        </Text>
      </View>

      <View className="flex-row rounded-full p-1 mb-5" style={{ backgroundColor: t.surface }}>
        {(
          [
            { id: 'todos', label: 'Todos' },
            { id: 'mesas', label: `Mesas · ${contMesas}` },
            { id: 'delivery', label: `Delivery · ${contDelivery}` },
          ] as const
        ).map((opcion) => {
          const activa = filtro === opcion.id;
          return (
            <Pressable
              key={opcion.id}
              onPress={() => {
                haptic();
                setFiltro(opcion.id);
              }}
              className="flex-1 py-2 rounded-full items-center flex-row justify-center gap-1.5"
              style={activa ? { backgroundColor: t.primary } : undefined}
            >
              {opcion.id === 'delivery' && (
                <Truck size={14} color={activa ? t.onPrimary : t.textSecondary} strokeWidth={2} />
              )}
              <Text
                className="font-bold text-sm"
                style={{ color: activa ? t.onPrimary : t.textSecondary }}
              >
                {opcion.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View className="gap-0">
          <PapelSkeleton />
          <PapelSkeleton />
        </View>
      ) : visibles.length === 0 ? (
        <Animated.View entering={FadeInDown.springify()} className="items-center justify-center py-24">
          <View className="rounded-xl px-5 py-4 mb-4" style={{ backgroundColor: t.pillBg, transform: [{ rotate: '-3deg' }] }}>
            <Text className="text-2xl" style={{ color: t.pillText }}>🧾</Text>
          </View>
          <Text className="text-xl font-bold" style={{ color: t.textPrimary }}>
            {filtro === 'delivery'
              ? 'Sin pedidos de delivery'
              : filtro === 'mesas'
                ? 'Sin comandas de mesas'
                : 'Todo listo por ahora'}
          </Text>
          <Text className="text-base mt-1 text-center" style={{ color: t.textSecondary }}>
            Las comandas nuevas aparecerán aquí en vivo.
          </Text>
        </Animated.View>
      ) : (
        <Animated.FlatList
          data={visibles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 4 }}
          layout={LinearTransition.springify().damping(18)}
          renderItem={({ item }) => renderOrden(item)}
        />
      )}
    </View>
  );
}