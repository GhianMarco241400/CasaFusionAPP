// src/components/QrYape.tsx
// QR de Yape de la empresa. Va embebido en la app (assets/yape-qr.png) para que
// funcione sin internet. El fondo blanco es obligatorio: con el tema oscuro el QR
// no escanea si se apoya sobre un fondo oscuro.
import { View, Text, Image } from 'react-native';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';

const ASPECTO = 719 / 721;

type QrYapeProps = {
  monto: number;
  tamano?: number;
};

export default function QrYape({ monto, tamano = 200 }: QrYapeProps) {
  const { t } = useTema();

  return (
    <View className="w-full items-center">
      <View className="items-center rounded-2xl px-4 pt-3 pb-2" style={{ backgroundColor: '#FFFFFF' }}>
        <Text className="text-xs font-bold mb-1" style={{ color: '#5E1668' }}>
          Yape CasaFusion
        </Text>
        <Text className="text-2xl font-extrabold mb-1" style={{ color: '#2B2420' }}>
          S/ {monto.toFixed(2)}
        </Text>
        <Image
          source={require('../../assets/yape-qr.png')}
          style={{ width: tamano, height: Math.round(tamano / ASPECTO) }}
          resizeMode="contain"
        />
        <Text className="text-[10px] mt-1 text-center" style={{ color: '#8C7F6E' }}>
          El cliente ingresa el monto en su app de Yape
        </Text>
      </View>
      <View
        className="mt-2 px-3 py-1.5 rounded-full flex-row items-center gap-1.5"
        style={{ backgroundColor: alpha(t.yape, 16) }}
      >
        <Text className="text-[11px] font-semibold" style={{ color: t.yape }}>
          Pide al cliente que escanee con la cámara de su Yape
        </Text>
      </View>
    </View>
  );
}
