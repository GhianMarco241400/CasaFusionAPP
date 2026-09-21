// app/mesero/index.tsx
import { View, Text, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Users, Package } from 'lucide-react-native';
import { useOrders } from '../../src/context/OrdersContext';
import { Order } from '../../src/types';
import { ScalePressable } from '../../src/components/ScalePressable';
import Logo from '../../src/components/Logo';
import { TiempoTranscurrido } from '../../src/components/TiempoTranscurrido';

const TOTAL_MESAS = 8;
const mesas = Array.from({ length: TOTAL_MESAS }, (_, i) => i + 1);

const HEX_TEXTO: Record<string, string> = {
  'text-[#F7F2E9]': '#F7F2E9',
  'text-[#2B2420]': '#2B2420',
  'text-[#8C7F6E]': '#8C7F6E',
};

const HEX_SECUNDARIO: Record<string, string> = {
  'text-[#D9E8D9]': '#D9E8D9',
  'text-[#F7DAD3]': '#F7DAD3',
  'text-[#4A3B23]': '#4A3B23',
  'text-[#8C7F6E]': '#8C7F6E',
};

type EstadoDominante = {
  label: string;
  fondo: string;
  texto: string;
  textoSecundario: string;
  mostrarTiempo: boolean;
};

function estadoDominante(comandas: Order[]): EstadoDominante | null {
  if (comandas.length === 0) return null;

  if (comandas.every((o) => o.status === 'READY')) {
    return {
      label: 'Listo para cobrar',
      fondo: 'bg-[#4D7C4D]',
      texto: 'text-[#F7F2E9]',
      textoSecundario: 'text-[#D9E8D9]',
      mostrarTiempo: false,
    };
  }
  if (comandas.some((o) => o.status === 'PENDING')) {
    return {
      label: 'Pendiente',
      fondo: 'bg-[#D4432B]',
      texto: 'text-[#F7F2E9]',
      textoSecundario: 'text-[#F7DAD3]',
      mostrarTiempo: true,
    };
  }
  return {
    label: 'Preparando',
    fondo: 'bg-[#E8A33D]',
    texto: 'text-[#2B2420]',
    textoSecundario: 'text-[#4A3B23]',
    mostrarTiempo: true,
  };
}

export default function MeseroScreen() {
  const { getOrdersForTable } = useOrders();
  const llvComandas = getOrdersForTable(0);
  const estLl = estadoDominante(llvComandas);

  return (
    <View className="flex-1 bg-[#1E1A17] px-6 pt-16">
      <Logo fuente="logo2" altura={44} estilo={{ marginBottom: 20, marginTop: 2 }} />

      <ScalePressable
        onPress={() =>
          router.push(estLl ? `/mesero/mesa/0/estado` : `/mesero/mesa/0`)
        }
        pressedScale={0.97}
      >
        <View
          className={`rounded-full px-4 py-3 flex-row items-center justify-between mb-3 border ${
            estLl
              ? `${estLl.fondo} border-transparent`
              : 'bg-[#2B2420] border-[#3A322B]'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <Package size={18} color="#F7F2E9" strokeWidth={2} />
            <Text className="text-[#F7F2E9] font-bold text-sm">Para llevar</Text>
          </View>
          {estLl ? (
            <View className="flex-row items-center gap-2">
              {estLl.mostrarTiempo && (
                <TiempoTranscurrido
                  comandas={llvComandas}
                  color={HEX_SECUNDARIO[estLl.textoSecundario] ?? '#8C7F6E'}
                  className={`text-xs font-semibold ${estLl.textoSecundario}`}
                />
              )}
              <Text className={`text-xs font-bold ${estLl.texto}`}>{estLl.label}</Text>
            </View>
          ) : (
            <Text className="text-[#8C7F6E] text-xs">Nuevo pedido</Text>
          )}
        </View>
      </ScalePressable>

      <FlatList
        data={mesas}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12 }}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => {
          const comandasMesa = getOrdersForTable(item);
          const est = estadoDominante(comandasMesa);

          return (
            <Pressable
              onPress={() =>
                router.push(est ? `/mesero/mesa/${item}/estado` : `/mesero/mesa/${item}`)
              }
              className={`flex-1 rounded-2xl aspect-square items-center justify-center gap-2 active:opacity-80 ${
                est ? est.fondo : 'bg-[#F7F2E9]'
              }`}
            >
              <Text
                className={
                  est
                    ? `${est.texto} text-4xl font-extrabold`
                    : 'text-[#2B2420] text-4xl font-extrabold'
                }
              >
                {item}
              </Text>
              <Text
                className={
                  est ? `${est.textoSecundario} text-xs` : 'text-[#8C7F6E] text-xs'
                }
              >
                Mesa
              </Text>

              <View className="flex-row items-center justify-center mt-1">
                <Users size={14} color={est ? HEX_TEXTO[est.texto] ?? '#8C7F6E' : '#2B2420'} strokeWidth={2} />
              </View>

              <View className="flex-row items-center gap-1 mt-2">
                {est ? (
                  <>
                    <Users size={14} color={HEX_TEXTO[est.texto] ?? '#8C7F6E'} strokeWidth={2} />
                    <Text className={`${est.texto} text-xs font-bold`}>{est.label}</Text>
                  </>
                ) : (
                  <>
                    <Users size={14} color="#8C7F6E" strokeWidth={2} />
                    <Text className="text-[#8C7F6E] text-xs font-bold">Disponible</Text>
                  </>
                )}
              </View>

              {est?.mostrarTiempo && (
                <TiempoTranscurrido
                  comandas={comandasMesa}
                  color={HEX_SECUNDARIO[est.textoSecundario] ?? '#8C7F6E'}
                  className={`${est.textoSecundario} text-xs font-semibold`}
                  containerClassName="mt-1"
                />
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}