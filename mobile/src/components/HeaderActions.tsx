// src/components/HeaderActions.tsx
import { type RefObject } from 'react';
import { useEffect, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  Modal,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { ScalePressable } from './ScalePressable';
import { ModuloMenu } from './ModuloMenu';
import { ComandasPanel } from './ComandasPanel';
import { AjustesLetras } from './AjustesLetras';
import { Role, AvisoTipo } from '../types';
import { getAvisos, marcarAvisosLeidos, eliminarAviso } from '../services/reports';

function hapticImpact() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function hapticWarning() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

const ETIQUETAS_ROL: Record<Role, string> = {
  admin: 'Administradora',
  mesero: 'Mesero',
  cocina: 'Cocina',
  delivery: 'Delivery',
};

const ETIQUETA_AVISO: Record<AvisoTipo, { icono: string; texto: string; color: string }> = {
  FIADO: { icono: '⏳', texto: 'Fiado por cobrar', color: '#E8A33D' },
  ERROR: { icono: '⚠️', texto: 'Error de registro', color: '#D4432B' },
};

function fechaAviso(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function AvisoBell() {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);

  const { data } = useQuery({
    queryKey: ['avisos'],
    queryFn: getAvisos,
    refetchInterval: 15000,
  });

  const unread = data?.unreadCount ?? 0;
  const avisos = data?.list ?? [];

  function abrirAvisos() {
    hapticImpact();
    setAbierto(true);
    marcarAvisosLeidos()
      .catch(() => {})
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: ['avisos'] });
      });
  }

  return (
    <>
      <ScalePressable
        onPress={abrirAvisos}
        pressedScale={0.9}
        hitSlop={8}
        className="w-11 h-11 rounded-full bg-[#F7F2E9] items-center justify-center"
        style={{ shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
      >
        <Feather name="bell" size={20} color="#2B2420" />
        {unread > 0 && (
          <View className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#4D7C4D] border-2 border-[#1E1A17]" />
        )}
      </ScalePressable>

      <Modal
        visible={abierto}
        transparent
        animationType="none"
        onRequestClose={() => setAbierto(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Pressable className="flex-1" onPress={() => setAbierto(false)}>
            <Animated.View
              entering={FadeIn.duration(180)}
              className="flex-1 bg-[#130F0C]/60"
            />
          </Pressable>
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute top-20 right-5 w-[88%] max-w-sm max-h-[70%] bg-[#2B2420] rounded-2xl overflow-hidden border border-[#3A322B]"
            style={{ shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
          >
          <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
            <Text className="text-[#F7F2E9] font-extrabold text-lg">
              Cuaderno de avisos
            </Text>
            <Pressable onPress={() => setAbierto(false)} hitSlop={8}>
              <Text className="text-[#8C7F6E] font-bold">✕</Text>
            </Pressable>
          </View>
          <View className="h-px bg-[#3A322B]" />

          <ScrollView className="px-4 py-2" style={{ maxHeight: 360 }}>
            {avisos.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-3xl mb-2">🎉</Text>
                <Text className="text-[#8C7F6E] text-sm">
                  Todo en orden por ahora
                </Text>
              </View>
            ) : (
              avisos.map((aviso, indice) => {
                const etiqueta = ETIQUETA_AVISO[aviso.tipo];
                const pendienteVis = !aviso.leido || !aviso.resolved;
                return (
                  <ReanimatedSwipeable
                    key={aviso.id}
                    renderRightActions={() => (
                      <View className="bg-[#D4432B] items-center justify-center rounded-xl mr-1.5 px-4 mb-2 w-20">
                        <Feather name="trash-2" size={18} color="#F7F2E9" />
                        <Text className="text-[#F7F2E9] text-[10px] font-bold mt-1">
                          Eliminar
                        </Text>
                      </View>
                    )}
                    overshootRight={false}
                    friction={2}
                    onSwipeableOpen={(direction) => {
                      if (direction !== SwipeDirection.LEFT) return;
                      eliminarAviso(aviso.id)
                        .catch(() => {})
                        .finally(() => {
                          queryClient.invalidateQueries({ queryKey: ['avisos'] });
                        });
                    }}
                  >
                    <Animated.View
                      entering={FadeInDown.delay(indice * 40).duration(220)}
                      className={`mb-2 rounded-xl px-3 py-2.5 border ${
                        pendienteVis
                          ? 'bg-[#1E1A17] border-[#3A322B]'
                          : 'bg-[#1E1A17]/60 border-[#2B2420] opacity-70'
                      }`}
                    >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2 flex-1">
                        <Text className="text-base">{etiqueta.icono}</Text>
                        <Text
                          className="text-[10px] font-bold rounded-full px-2 py-0.5"
                          style={{ color: etiqueta.color, backgroundColor: `${etiqueta.color}22` }}
                        >
                          {etiqueta.texto}
                        </Text>
                      </View>
                      <Text className="text-[#8C7F6E] text-[11px]">
                        {fechaAviso(aviso.createdAt)}
                      </Text>
                    </View>
                    <Text className="text-[#F7F2E9] text-sm mt-1">
                      {aviso.desc}
                    </Text>
                    </Animated.View>
                  </ReanimatedSwipeable>
                );
              })
            )}
          </ScrollView>
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

export function HeaderActions({
  blurTargetRef,
}: {
  blurTargetRef: RefObject<View | null>;
}) {
  const { user, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [gestionAbierto, setGestionAbierto] = useState(false);
  const [comandasAbierto, setComandasAbierto] = useState(false);
  const [letrasAbierto, setLetrasAbierto] = useState(false);

  function handleOpenMenu() {
    hapticImpact();
    setMenuAbierto(true);
  }

  function handleCloseMenu() {
    setMenuAbierto(false);
  }

  function handleLogout() {
    hapticWarning();
    setMenuAbierto(false);
    logout();
    router.replace('/');
  }

  function handleGestionMenu() {
    hapticImpact();
    setMenuAbierto(false);
    setGestionAbierto(true);
  }

  function handleComandas() {
    hapticImpact();
    setMenuAbierto(false);
    setComandasAbierto(true);
  }

  function handleLetras() {
    hapticImpact();
    setMenuAbierto(false);
    setLetrasAbierto(true);
  }

  const nombre = user?.name ?? user?.email ?? 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();
  const rol = user?.role ?? 'mesero';

  const items = [
    ...(user?.role === 'admin'
      ? [{ key: 'menu', label: 'Gestionar menú del día', onPress: handleGestionMenu, color: '#F7F2E9' }]
      : []),
    ...(user?.role === 'mesero' || user?.role === 'delivery'
      ? [{ key: 'comandas', label: 'Comandas', onPress: handleComandas, color: '#F7F2E9' }]
      : []),
    ...(user?.role === 'cocina'
      ? [{ key: 'letras', label: 'Ajustar letras', onPress: handleLetras, color: '#F7F2E9' }]
      : []),
    { key: 'salir', label: 'Cerrar sesión', onPress: handleLogout, color: '#D4432B' },
  ];

  useEffect(() => {
    if (!gestionAbierto && !comandasAbierto && !letrasAbierto) return;
    const subs = BackHandler.addEventListener('hardwareBackPress', () => {
      setGestionAbierto(false);
      setComandasAbierto(false);
      setLetrasAbierto(false);
      return true;
    });
    return () => subs.remove();
  }, [gestionAbierto, comandasAbierto, letrasAbierto]);

  return (
    <>
      <View className="absolute top-14 right-6 z-10 flex-row items-center gap-3.5">
        {user?.role === 'admin' && <AvisoBell />}
        <ScalePressable
          onPress={handleOpenMenu}
          pressedScale={0.9}
          hitSlop={8}
          innerClassName="flex-1 w-full h-full items-center justify-center"
          className="w-11 h-11 rounded-full bg-[#F7F2E9]"
          style={{ shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
        >
          <Feather name="user" size={20} color="#2B2420" />
        </ScalePressable>
      </View>

      <Modal
        visible={menuAbierto}
        transparent
        animationType="none"
        onRequestClose={handleCloseMenu}
      >
        <Pressable className="flex-1" onPress={handleCloseMenu}>
          <Animated.View
            entering={FadeIn.duration(180)}
            className="flex-1 bg-[#130F0C]/60"
          />

          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute top-20 right-5 w-64 bg-[#2B2420] rounded-2xl overflow-hidden border border-[#3A322B]"
            style={{ shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
          >
            <View className="px-4 pt-4 pb-3 flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-full bg-[#D4432B] items-center justify-center">
                <Text className="text-[#F7F2E9] font-extrabold text-lg">{inicial}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[#F7F2E9] font-semibold leading-tight" numberOfLines={1}>
                  {nombre}
                </Text>
                <View className="self-start mt-1 bg-[#1E1A17] rounded-full px-2 py-0.5">
                  <Text className="text-[#8C7F6E] text-[11px] font-medium">
                    {ETIQUETAS_ROL[rol]}
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-px bg-[#3A322B]" />

            {items.map((item, indice) => (
              <Animated.View
                key={item.key}
                entering={FadeInDown.delay(160 + indice * 55).duration(220)}
              >
                <ScalePressable
                  onPress={item.onPress}
                  pressedScale={0.97}
                  className="px-4 py-3.5"
                >
                  <Text className="font-semibold" style={{ color: item.color }}>
                    {item.key === 'menu' ? '🍽️  ' : item.key === 'comandas' ? '🧾  ' : item.key === 'letras' ? '🔠  ' : '  '}
                    {item.label}
                  </Text>
                </ScalePressable>
                {item.key === 'menu' && <View className="h-px bg-[#3A322B] mx-4" />}
              </Animated.View>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      {comandasAbierto && (
        <ComandasPanel
          onClose={() => setComandasAbierto(false)}
        />
      )}

      {letrasAbierto && <AjustesLetras onClose={() => setLetrasAbierto(false)} />}

      {gestionAbierto && (
        <View className="absolute inset-0" style={{ zIndex: 50, elevation: 50 }}>
          <Pressable className="flex-1" onPress={() => setGestionAbierto(false)}>
            <View className="flex-1 bg-[#130F0C]/85" />
          </Pressable>
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute rounded-3xl overflow-hidden bg-[#1B1714] border border-[#3A322B]"
            style={{ top: 96, bottom: 28, left: 22, right: 22 }}
          >
            <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
              <Text className="text-[#F7F2E9] font-extrabold text-lg">Gestionar menú del día</Text>
              <Pressable onPress={() => setGestionAbierto(false)} hitSlop={8}>
                <Text className="text-[#8C7F6E] font-bold">✕</Text>
              </Pressable>
            </View>
            <View className="h-px bg-[#3A322B]" />
            <View className="flex-1 px-5 pt-4">
              <ModuloMenu />
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
}