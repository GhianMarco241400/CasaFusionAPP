// src/components/ModalReabrirCobro.tsx
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Receipt, RotateCcw, Utensils } from 'lucide-react-native';

import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
import { MetodoPago } from '../types';
import { DestinoReapertura } from '../services/orders';
import { ScalePressable } from './ScalePressable';

const MOTIVOS_REAPERTURA = [
  'Cobré otra mesa',
  'Monto o método mal',
  'El cliente no pagó',
  'Otro',
] as const;

function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  Haptics.impactAsync(style).catch(() => {});
}

function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/**
 * Overlay absoluto (no usa <Modal> a proposito: en la pantalla de mesa vive
 * dentro del modal de exito, y anidar modales en Android da problemas).
 * Quien lo usa decide el contenedor.
 */
export function ModalReabrirCobro({
  visible,
  etiqueta,
  total,
  metodo,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  etiqueta: string;
  total: number;
  metodo?: MetodoPago | null;
  onClose: () => void;
  onConfirm: (motivo: string, destino: DestinoReapertura) => Promise<boolean>;
}) {
  const { t, temaId } = useTema();
  const [motivoChip, setMotivoChip] = useState<string | null>(null);
  const [motivoTexto, setMotivoTexto] = useState('');
  const [destino, setDestino] = useState<DestinoReapertura>('READY');
  const [reabriendo, setReabriendo] = useState(false);

  if (!visible) {
    return null;
  }

  function cerrar() {
    if (reabriendo) return;
    setMotivoChip(null);
    setMotivoTexto('');
    setDestino('READY');
    onClose();
  }

  async function confirmar() {
    if (reabriendo) return;
    const motivo = motivoTexto.trim() || motivoChip;
    if (!motivo) {
      Alert.alert('Elige un motivo', 'Selecciona un motivo o escribe uno.');
      return;
    }
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    setReabriendo(true);
    const ok = await onConfirm(motivo, destino);
    setReabriendo(false);
    if (!ok) {
      Alert.alert('No se pudo reabrir', 'Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    hapticSuccess();
    setMotivoChip(null);
    setMotivoTexto('');
    setDestino('READY');
    onClose();
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 100,
          elevation: 100,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: alpha(t.overlay, 88),
        },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} />

      <Animated.View
        entering={FadeIn.duration(200)}
        className={`rounded-3xl p-6 w-full max-w-sm ${
          temaId === 'claro' ? 'border-2 border-[#1E1A17]' : 'border'
        }`}
        style={{
          backgroundColor: t.surfaceElevated,
          borderColor: temaId === 'claro' ? '#1E1A17' : t.border,
        }}
      >
        <Text className="text-lg font-extrabold mb-1" style={{ color: t.textPrimary }}>
          Reabrir cobro
        </Text>
        <Text className="text-xs mb-4" style={{ color: t.textSecondary }}>
          {etiqueta} · S/ {total.toFixed(2)} · {metodo === 'YAPE' ? 'Yape' : 'Efectivo'}
        </Text>

        <Text className="text-xs font-bold uppercase mb-2" style={{ color: t.textSecondary }}>
          ¿Por qué?
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {MOTIVOS_REAPERTURA.map((motivo) => {
            const elegido = motivoChip === motivo;
            return (
              <ScalePressable key={motivo} onPress={() => setMotivoChip(motivo)} pressedScale={0.95}>
                <View
                  className="rounded-full px-3 py-2 border"
                  style={{
                    backgroundColor: elegido ? t.primary : alpha(t.primary, 10),
                    borderColor: t.primary,
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: elegido ? t.onPrimary : t.primary }}
                  >
                    {motivo}
                  </Text>
                </View>
              </ScalePressable>
            );
          })}
        </View>

        <TextInput
          className="rounded-xl text-base px-4 py-3"
          style={{
            backgroundColor: t.inputBg,
            color: t.textPrimary,
            borderWidth: 1,
            borderColor: t.border,
          }}
          placeholder="O escribe el motivo (opcional)"
          placeholderTextColor={t.placeholder}
          value={motivoTexto}
          onChangeText={setMotivoTexto}
          maxLength={200}
        />

        <Text className="text-xs font-bold uppercase mt-4 mb-2" style={{ color: t.textSecondary }}>
          ¿Qué sigue?
        </Text>
        <View className="flex-row gap-2 mb-4">
          <ScalePressable onPress={() => setDestino('READY')} pressedScale={0.95} className="flex-1">
            <View
              className="rounded-xl py-3 items-center border"
              style={{
                backgroundColor: destino === 'READY' ? t.success : 'transparent',
                borderColor: destino === 'READY' ? t.success : t.border,
              }}
            >
              <Receipt
                size={16}
                color={destino === 'READY' ? t.onPrimary : t.textPrimary}
                strokeWidth={2}
              />
              <Text
                className="text-xs font-bold mt-0.5"
                style={{ color: destino === 'READY' ? t.onPrimary : t.textPrimary }}
              >
                Volver a cobrar
              </Text>
            </View>
          </ScalePressable>
          <ScalePressable
            onPress={() => setDestino('IN_PREPARATION')}
            pressedScale={0.95}
            className="flex-1"
          >
            <View
              className="rounded-xl py-3 items-center border"
              style={{
                backgroundColor: destino === 'IN_PREPARATION' ? t.primary : 'transparent',
                borderColor: destino === 'IN_PREPARATION' ? t.primary : t.border,
              }}
            >
              <Utensils
                size={16}
                color={destino === 'IN_PREPARATION' ? t.onPrimary : t.textPrimary}
                strokeWidth={2}
              />
              <Text
                className="text-xs font-bold mt-0.5"
                style={{ color: destino === 'IN_PREPARATION' ? t.onPrimary : t.textPrimary }}
              >
                Volver a cocina
              </Text>
            </View>
          </ScalePressable>
        </View>

        <ScalePressable
          onPress={confirmar}
          pressedScale={0.97}
          className="w-full"
          disabled={reabriendo}
        >
          <View
            className={`rounded-full py-4 items-center ${reabriendo ? 'opacity-70' : ''}`}
            style={{ backgroundColor: t.primary }}
          >
            <View className="flex-row items-center gap-2">
              <RotateCcw size={17} color={t.onPrimary} strokeWidth={2.4} />
              <Text className="font-bold text-base" style={{ color: t.onPrimary }}>
                {reabriendo ? 'Abriendo...' : 'Reabrir cobro'}
              </Text>
            </View>
          </View>
        </ScalePressable>
        <ScalePressable onPress={cerrar} pressedScale={0.98} className="w-full py-3">
          <Text className="text-center text-sm" style={{ color: t.textSecondary }}>
            Volver
          </Text>
        </ScalePressable>
      </Animated.View>
    </View>
  );
}
