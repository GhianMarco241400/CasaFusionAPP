// app/mesero/index.tsx
import { View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Package } from 'lucide-react-native';
import { useOrders } from '../../src/context/OrdersContext';
import { useTema } from '../../src/context/TemaContext';
import { TemaTokens } from '../../src/theme/temas';
import { Order } from '../../src/types';
import { ScalePressable } from '../../src/components/ScalePressable';
import { Texto as Text } from '../../src/components/Texto';
import Logo from '../../src/components/Logo';
import { TiempoTranscurrido } from '../../src/components/TiempoTranscurrido';

const TOTAL_MESAS = 8;
const mesas = Array.from({ length: TOTAL_MESAS }, (_, i) => i + 1);

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

function estadoDominante(comandas: Order[], t: TemaTokens): EstadoDominante | null {
  if (comandas.length === 0) return null;

  if (comandas.every((o) => o.status === 'READY')) {
    return {
      label: 'Listo para cobrar',
      fondo: t.success,
      texto: t.onPrimary,
      textoSecundario: 'text-[#D9E8D9]',
      mostrarTiempo: false,
    };
  }
  if (comandas.some((o) => o.status === 'PENDING')) {
    return {
      label: 'Pendiente',
      fondo: t.primary,
      texto: t.onPrimary,
      textoSecundario: 'text-[#F7DAD3]',
      mostrarTiempo: true,
    };
  }
  return {
    label: 'Preparando',
    fondo: t.accent,
    texto: t.pillText,
    textoSecundario: 'text-[#4A3B23]',
    mostrarTiempo: true,
  };
}

export default function MeseroScreen() {
  const { t, temaId } = useTema();
  const insets = useSafeAreaInsets();
  const { getOrdersForTable } = useOrders();
  const llvComandas = getOrdersForTable(0);
  const estLl = estadoDominante(llvComandas, t);

  return (
    <View
      className="flex-1 px-6"
      style={{ backgroundColor: t.background, paddingTop: insets.top + 16 }}
    >
      <Logo fuente="logo2" altura={44} estilo={{ marginBottom: 20, marginTop: 2 }} />

      <ScalePressable
        onPress={() =>
          router.push(estLl ? `/mesero/mesa/0/estado` : `/mesero/mesa/0`)
        }
        pressedScale={0.97}
      >
        <View
          className={`rounded-full px-4 py-3 flex-row items-center justify-between mb-3 border ${
            temaId === 'claro' ? 'border-[#1E1A17]' : estLl ? 'border-transparent' : ''
          }`}
          style={
            estLl
              ? { backgroundColor: estLl.fondo }
              : { backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }
          }
        >
          <View className="flex-row items-center gap-2">
            <Package size={18} color={estLl ? t.onPrimary : t.textPrimary} strokeWidth={2} />
            <Text className="font-bold text-sm" style={{ color: estLl ? t.onPrimary : t.textPrimary }}>
              Para llevar
            </Text>
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
              <Text className="text-xs font-bold" style={{ color: estLl.texto }}>{estLl.label}</Text>
            </View>
          ) : (
            <Text className="text-xs" style={{ color: t.textSecondary }}>Nuevo pedido</Text>
          )}
        </View>
      </ScalePressable>

      <FlatList
        data={mesas}
        numColumns={2}
        style={{ flex: 1 }}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 16 }}
        keyExtractor={(item) => item.toString()}
        renderItem={({ item }) => {
          const comandasMesa = getOrdersForTable(item);
          const est = estadoDominante(comandasMesa, t);

          return (
            <Pressable
              onPress={() =>
                router.push(est ? `/mesero/mesa/${item}/estado` : `/mesero/mesa/${item}`)
              }
              className={`flex-1 rounded-2xl aspect-square items-center justify-center gap-2 active:opacity-80 ${
                temaId === 'claro' ? 'border-[3px] border-[#1E1A17]' : ''
              }`}
              style={est ? { backgroundColor: est.fondo } : { backgroundColor: t.pillBg }}
            >
              <Text
                className="text-4xl font-extrabold"
                style={est ? { color: est.texto } : { color: t.pillText }}
              >
                {item}
              </Text>
              <Text
                className="text-xs"
                style={
                  est
                    ? { color: HEX_SECUNDARIO[est.textoSecundario] ?? t.textSecondary }
                    : { color: t.textSecondary }
                }
              >
                Mesa
              </Text>

              <View className="flex-row items-center justify-center mt-1">
                <Users size={14} color={est ? est.texto : t.pillText} strokeWidth={2} />
              </View>

              <View className="flex-row items-center gap-1 mt-2">
                {est ? (
                  <>
                    <Users size={14} color={est.texto} strokeWidth={2} />
                    <Text className="text-xs font-bold" style={{ color: est.texto }}>{est.label}</Text>
                  </>
                ) : (
                  <>
                    <Users size={14} color={t.textSecondary} strokeWidth={2} />
                    <Text className="text-xs font-bold" style={{ color: t.textSecondary }}>Disponible</Text>
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