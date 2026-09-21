import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Bell, Truck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useOrders } from '../../src/context/OrdersContext';
import { getDishes } from '../../src/services/menu';
import { OrderTicket } from '../../src/components/OrderTicket';
import { Posit } from '../../src/components/Posit';
import Logo from '../../src/components/Logo';
import { Order } from '../../src/types';

function PapelSkeleton() {
  return (
    <View className="bg-[#332B25] rounded-t-lg overflow-hidden mb-3 opacity-90">
      {Array.from({ length: 7 }, (_, i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.delay(i * 60)}
          className={i % 5 === 0 ? 'rounded-full h-3 w-3/4 my-2 mx-4' : 'rounded-full h-2.5 w-5/6 my-1.5 mx-4'}
          style={{ backgroundColor: '#3A322B' }}
        />
      ))}
      <View className="h-7 mx-4 mb-2 rounded" style={{ backgroundColor: '#3A322B' }} />
    </View>
  );
}

function haptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type FiltroCocina = 'todos' | 'mesas' | 'delivery';

export default function CocinaScreen() {
  const [filtro, setFiltro] = useState<FiltroCocina>('todos');
  const { orders, loading, markReady, markPreparation, deleteOrder } = useOrders();
  const { data: dishes = [] } = useQuery({ queryKey: ['dishes'], queryFn: getDishes });

  const pedidosActivos = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'IN_PREPARATION'
  );

  const visibles = pedidosActivos.filter((o) => {
    if (filtro === 'mesas') return o.canal !== 'delivery';
    if (filtro === 'delivery') return o.canal === 'delivery';
    return true;
  });

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
          onDelete={deleteOrder}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1E1A17] px-6 pt-16">
      <View className="mb-3">
        <Logo fuente="logo2" altura={44} />
      </View>
      <View className="flex-row items-center gap-3 mb-5">
        <Text className="text-[#8C7F6E] text-base flex-1">
          Desliza a la derecha para listo · a la izquierda para borrar
        </Text>
        <View className="bg-[#D4432B]/15 border border-[#D4432B]/40 rounded-full px-4 py-2 flex-row items-center gap-2">
          <Text className="text-[#D4432B] font-extrabold text-xl leading-none">
            {pedidosActivos.length}
          </Text>
          <Bell size={16} color="#E8A33D" strokeWidth={2} />
        </View>
      </View>

      <View className="flex-row bg-[#2B2420] rounded-full p-1 mb-5">
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
              className={`flex-1 py-2 rounded-full items-center flex-row justify-center gap-1.5 ${activa ? 'bg-[#D4432B]' : ''}`}
            >
              {opcion.id === 'delivery' && (
                <Truck size={14} color={activa ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2} />
              )}
              <Text
                className={`font-bold text-sm ${activa ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}
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
          <View className="bg-[#F7F2E9] rounded-xl px-5 py-4 mb-4" style={{ transform: [{ rotate: '-3deg' }] }}>
            <Text className="text-[#2B2420] text-2xl">🧾</Text>
          </View>
          <Text className="text-[#F7F2E9] text-xl font-bold">
            {filtro === 'delivery'
              ? 'Sin pedidos de delivery'
              : filtro === 'mesas'
                ? 'Sin comandas de mesas'
                : 'Todo listo por ahora'}
          </Text>
          <Text className="text-[#8C7F6E] text-base mt-1 text-center">
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