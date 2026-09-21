// src/components/GraficoDonut.tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

type Props = { mesa: number; delivery: number };

const SEGMENTOS = [
  { clave: 'mesa', label: 'Mesa', color: '#E8A33D' },
  { clave: 'delivery', label: 'Delivery', color: '#6C4FBF' },
] as const;

type Clave = (typeof SEGMENTOS)[number]['clave'];

export function GraficoDonut({ mesa, delivery }: Props) {
  const [seleccion, setSeleccion] = useState<Clave | null>(null);
  const valores: Record<Clave, number> = { mesa, delivery };
  const total = mesa + delivery;

  if (total <= 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-[#8C7F6E] text-sm">Sin ventas el día de hoy</Text>
      </View>
    );
  }

  const R = 72;
  const C = 2 * Math.PI * R;
  const pct = (clave: Clave) => valores[clave] / total;

  const acumulados = SEGMENTOS.reduce<{ clave: Clave; inicio: number; fin: number }[]>(
    (acc, s) => {
      const inicio = acc.length === 0 ? 0 : acc[acc.length - 1].fin;
      const fin = inicio + pct(s.clave) * 360;
      acc.push({ clave: s.clave, inicio, fin });
      return acc;
    },
    []
  );

  const seleccionado = seleccion ? SEGMENTOS.find((s) => s.clave === seleccion) : null;

  return (
    <View>
      <View className="items-center mb-4">
        <Svg width={200} height={200} viewBox="0 0 200 200">
          <Circle cx={100} cy={100} r={R} stroke="#1E1A17" strokeWidth={30} fill="none" />
          {acumulados.map((seg) => {
            const ancho = seg.fin - seg.inicio;
            const dash = (ancho / 360) * C;
            const activo = seleccion === null || seleccion === seg.clave;
            return (
              <Circle
                key={seg.clave}
                cx={100}
                cy={100}
                r={R}
                stroke={SEGMENTOS.find((s) => s.clave === seg.clave)!.color}
                strokeWidth={seleccion === seg.clave ? 38 : activo ? 30 : 18}
                fill="none"
                strokeDasharray={`${dash} ${C - dash}`}
                rotation={-90 + seg.inicio}
                origin="100, 100"
                opacity={activo ? 1 : 0.3}
                onPress={() => {
                  setSeleccion((prev) => (prev === seg.clave ? null : seg.clave));
                }}
              />
            );
          })}
          <SvgText x={100} y={92} textAnchor="middle" fill="#F7F2E9" fontSize={24} fontWeight="800">
            {seleccionado
              ? `S/ ${valores[seleccionado.clave].toFixed(0)}`
              : `S/ ${total.toFixed(0)}`}
          </SvgText>
          <SvgText x={100} y={112} textAnchor="middle" fill="#8C7F6E" fontSize={11}>
            {seleccionado ? `${(pct(seleccionado.clave) * 100).toFixed(0)}%` : 'HOY'}
          </SvgText>
        </Svg>
      </View>

      <View className="flex-row gap-3">
        {SEGMENTOS.map((s) => {
          const activo = seleccion === null || seleccion === s.clave;
          return (
            <Pressable
              key={s.clave}
              onPress={() => setSeleccion((prev) => (prev === s.clave ? null : s.clave))}
              className={`flex-1 rounded-xl px-3 py-2.5 ${
                seleccion === s.clave ? 'border border-white/30 bg-[#2B2420]' : 'bg-[#1E1A17]'
              }`}
            >
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <Text className="text-[#F7F2E9] text-xs font-bold" numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
              <Text className="text-[#F7F2E9] font-extrabold text-base">
                {activo ? `S/ ${valores[s.clave].toFixed(2)}` : '—'}
              </Text>
              <Text className="text-[#8C7F6E] text-xs">{(pct(s.clave) * 100).toFixed(0)}%</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}