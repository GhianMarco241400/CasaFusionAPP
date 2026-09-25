// src/components/GraficoSemana.tsx
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTema } from '../context/TemaContext';
import { DiaResumen, fechaLocalAYYYYMMDD } from '../services/reports';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const COLOR = { verde: '#7FB37F', rojo: '#D4432B', amarillo: '#E8A33D' };

function fechaCorta(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type Props = { dias: DiaResumen[] };

export function GraficoSemana({ dias }: Props) {
  const { t, temaId } = useTema();
  const [ancho, setAncho] = useState(320);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const alto = 170;
  const padT = 14;
  const padB = 20;
  const padX = 12;
  const innerW = ancho - padX * 2;
  const innerH = alto - padT - padB;
  const maxVal = Math.max(1, ...dias.map((d) => d.total));
  const hoy = fechaLocalAYYYYMMDD(new Date());

  const pts = dias.map((d, i) => ({
    x: padX + (innerW / 6) * i,
    y: padT + innerH - (d.total / maxVal) * innerH,
    d,
    i,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`;

  const deltas = dias.map((d, i) => {
    if (d.total === 0) return { tipo: 'vacio' as const };
    const previo = i === 0 ? 0 : dias[i - 1].total;
    if (previo <= 0) return { tipo: 'arriba' as const, color: COLOR.verde };
    const diff = d.total - previo;
    const pct = Math.round((diff / previo) * 100);
    return diff >= 0
      ? { tipo: 'arriba' as const, color: COLOR.verde, pct }
      : { tipo: 'abajo' as const, color: COLOR.rojo, pct };
  });

  const diaSeleccionado = seleccion !== null ? dias[seleccion] : null;

  return (
    <View onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}>
      <View>
        <Svg width={ancho} height={alto}>
          <Defs>
            <LinearGradient id="fondoArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLOR.amarillo} stopOpacity={0.35} />
              <Stop offset="1" stopColor={COLOR.amarillo} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {[0, 0.5, 1].map((f, i) => {
            const y = padT + innerH - f * innerH;
            return (
              <Line
                key={i}
                x1={padX}
                y1={y}
                x2={ancho - padX}
                y2={y}
                stroke={t.border}
                strokeWidth={1}
                strokeDasharray="4 5"
              />
            );
          })}

          <Path d={areaPath} fill="url(#fondoArea)" />
          <Path
            d={linePath}
            stroke={COLOR.amarillo}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {pts.map((p) => {
            const esHoy = hoy === p.d.date;
            const esSel = seleccion === p.i;
            return (
              <Circle
                key={p.i}
                cx={p.x}
                cy={p.y}
                r={esHoy || esSel ? 5.5 : 3.5}
                fill={esSel ? t.textPrimary : esHoy ? COLOR.rojo : COLOR.amarillo}
                stroke={esSel ? t.yape : 'none'}
                strokeWidth={2}
              />
            );
          })}

          {pts.map((p) => (
            <SvgText
              key={p.i}
              x={p.x}
              y={alto - 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="700"
              fill={hoy === p.d.date ? t.textPrimary : t.textSecondary}
            >
              {DIAS[p.i]}
            </SvgText>
          ))}
        </Svg>

        {pts.map((p) => (
          <Pressable
            key={`t-${p.i}`}
            onPress={() => setSeleccion((prev) => (prev === p.i ? null : p.i))}
            style={{
              position: 'absolute',
              left: p.x - 16,
              top: padT - 6,
              width: 32,
              height: innerH + 28,
            }}
          />
        ))}
      </View>

      <View style={{ height: 18, width: ancho }} className="relative mt-1">
        {deltas.map((de, i) => {
          if (de.tipo === 'vacio') return null;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pts[i].x - (innerW / 7) / 2,
                width: innerW / 7,
                alignItems: 'center',
              }}
            >
              {de.tipo === 'arriba' ? (
                <View className="flex-row items-center gap-0.5">
                  <TrendingUp size={11} color={de.color} strokeWidth={2.5} />
                  <Text style={{ color: de.color }} className="text-[11px] font-bold">
                    {de.pct ?? ''}%
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center gap-0.5">
                  <TrendingDown size={11} color={de.color} strokeWidth={2.5} />
                  <Text style={{ color: de.color }} className="text-[11px] font-bold">
                    {de.pct ?? ''}%
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {diaSeleccionado && (
        <View
        className={`mt-3 rounded-2xl px-4 py-3 ${temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'}`}
        style={{ backgroundColor: t.surface, borderColor: temaId === 'claro' ? '#1E1A17' : t.border }}
      >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-extrabold text-sm" style={{ color: t.textPrimary }}>
              {fechaCorta(diaSeleccionado.date)}
            </Text>
            <Text className="font-extrabold" style={{ color: t.success }}>
              S/ {diaSeleccionado.total.toFixed(2)}
            </Text>
          </View>
              <View className="flex-row gap-2">
                {(
                  [
                    { label: 'Mesa', valor: diaSeleccionado.mesa, color: '#E8A33D' },
                    { label: 'Delivery', valor: diaSeleccionado.delivery, color: '#6C4FBF' },
                  ] as const
                ).map((f) => (
              <View key={f.label} className="flex-1">
                <View className="flex-row items-center gap-1 mb-0.5">
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  <Text className="text-[11px]" style={{ color: t.textSecondary }}>{f.label}</Text>
                </View>
                <Text className="font-bold text-sm" style={{ color: t.textPrimary }}>
                  S/ {f.valor.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}