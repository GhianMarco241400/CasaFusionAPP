// src/components/TiempoTranscurrido.tsx
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Order } from '../types';

export function pedidoActivoMasAntiguo(comandas: Order[]): Order | null {
  let menor: Order | null = null;
  for (const o of comandas) {
    if (o.status !== 'PENDING' && o.status !== 'IN_PREPARATION') continue;
    if (!menor || new Date(o.createdAt).getTime() < new Date(menor.createdAt).getTime()) {
      menor = o;
    }
  }
  return menor;
}

export function formatearMinSeg(desdeISO: string, ahora: number): string {
  const inicio = new Date(desdeISO).getTime();
  if (Number.isNaN(inicio)) return '--:-- min';
  const ms = Math.max(0, ahora - inicio);
  const totalSeg = Math.floor(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')} min`;
}

type Props = {
  comandas: Order[];
  color?: string;
  className?: string;
  containerClassName?: string;
};

export function TiempoTranscurrido({ comandas, color = '#8C7F6E', className, containerClassName }: Props) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pedido = pedidoActivoMasAntiguo(comandas);
  if (!pedido) return null;

  return (
    <View className={`flex-row items-center gap-1 ${containerClassName ?? ''}`}>
      <Clock size={13} color={color} strokeWidth={2} />
      <Text className={className}>{formatearMinSeg(pedido.createdAt, ahora)}</Text>
    </View>
  );
}