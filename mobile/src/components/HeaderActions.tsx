// src/components/HeaderActions.tsx
import { useEffect, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  Modal,
  Platform,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { useTema } from '../context/TemaContext';
import { alpha } from '../theme/temas';
import { ScalePressable } from './ScalePressable';
import { ModuloMenu } from './ModuloMenu';
import { ComandasPanel } from './ComandasPanel';
import { AjustesLetras } from './AjustesLetras';
import { PanelTemas } from './PanelTemas';
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
  REAPERTURA: { icono: '↩️', texto: 'Cobro revertido', color: '#7A6BC4' },
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
  const { t } = useTema();
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
        className="w-11 h-11 rounded-full items-center justify-center"
        style={{
          backgroundColor: t.pillBg,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <Feather name="bell" size={20} color={t.pillText} />
        {unread > 0 && (
          <View
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
            style={{
              backgroundColor: t.success,
              borderColor: t.background,
              borderWidth: 2,
            }}
          />
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
              className="flex-1"
              style={{ backgroundColor: alpha(t.overlay, 60) }}
            />
          </Pressable>
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute top-20 right-5 w-[88%] max-w-sm max-h-[70%] rounded-2xl overflow-hidden"
            style={{
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              borderWidth: 1,
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
          <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
            <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>
              Cuaderno de avisos
            </Text>
            <Pressable onPress={() => setAbierto(false)} hitSlop={8}>
              <Text className="font-bold" style={{ color: t.textSecondary }}>✕</Text>
            </Pressable>
          </View>
          <View className="h-px" style={{ backgroundColor: t.border }} />

          <ScrollView className="px-4 py-2" style={{ maxHeight: 360 }}>
            {avisos.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-3xl mb-2">🎉</Text>
                <Text className="text-sm" style={{ color: t.textSecondary }}>
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
                      <View
                        className="items-center justify-center rounded-xl mr-1.5 px-4 mb-2 w-20"
                        style={{ backgroundColor: t.primary }}
                      >
                        <Feather name="trash-2" size={18} color={t.onPrimary} />
                        <Text className="text-[10px] font-bold mt-1" style={{ color: t.onPrimary }}>
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
                      className="mb-2 rounded-xl px-3 py-2.5 border"
                      style={{
                        backgroundColor: pendienteVis ? t.surface : alpha(t.surface, 60),
                        borderColor: pendienteVis ? t.border : t.surface,
                        opacity: pendienteVis ? 1 : 0.7,
                      }}
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
                      <Text className="text-[11px]" style={{ color: t.textSecondary }}>
                        {fechaAviso(aviso.createdAt)}
                      </Text>
                    </View>
                    <Text className="text-sm mt-1" style={{ color: t.textPrimary }}>
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

export function HeaderActions() {
  const { user, logout, updateAvatar, removeAvatar } = useAuth();
  const { orders } = useOrders();
  const { t } = useTema();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [gestionAbierto, setGestionAbierto] = useState(false);
  const [comandasAbierto, setComandasAbierto] = useState(false);
  const [letrasAbierto, setLetrasAbierto] = useState(false);
  const [temasAbierto, setTemasAbierto] = useState(false);
  const [avatarCargando, setAvatarCargando] = useState(false);
  const [fotoOpcionesAbierto, setFotoOpcionesAbierto] = useState(false);

  const pedidosActivos = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'IN_PREPARATION'
  ).length;

  function handleOpenMenu() {
    if (avatarCargando) return;
    hapticImpact();
    setMenuAbierto(true);
  }

  function handleCloseMenu() {
    setMenuAbierto(false);
  }

  function handleFotoOpciones() {
    if (avatarCargando) return;
    hapticImpact();
    setMenuAbierto(false);
    setFotoOpcionesAbierto(true);
  }

  function handleCerrarFotoOpciones() {
    setFotoOpcionesAbierto(false);
    setMenuAbierto(true);
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

  function handleTemas() {
    hapticImpact();
    setMenuAbierto(false);
    setTemasAbierto(true);
  }

  async function handleAvatar() {
    if (avatarCargando) return;
    setMenuAbierto(false);
    setFotoOpcionesAbierto(false);
    setAvatarCargando(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        shape: 'oval',
        quality: 1,
      });

      if (result.canceled) return;

      const source = result.assets[0];
      const lado = Math.min(source.width, source.height);
      const contexto = ImageManipulator.manipulate(source.uri).crop({
        originX: Math.max(0, (source.width - lado) / 2),
        originY: Math.max(0, (source.height - lado) / 2),
        width: lado,
        height: lado,
      });
      const rendered = await contexto.resize({ width: 256, height: 256 }).renderAsync();
      const image = await rendered.saveAsync({
        compress: 0.8,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (!image.base64) {
        throw new Error('No se pudo procesar la imagen');
      }

      await updateAvatar(`data:image/jpeg;base64,${image.base64}`);
      hapticImpact();
    } catch {
      Alert.alert('No se pudo cambiar la foto', 'Intenta seleccionar otra imagen.');
    } finally {
      setAvatarCargando(false);
    }
  }

  async function handleRemoveAvatar() {
    if (avatarCargando) return;
    setMenuAbierto(false);
    setFotoOpcionesAbierto(false);
    setAvatarCargando(true);

    try {
      await removeAvatar();
      hapticImpact();
    } catch {
      Alert.alert('No se pudo quitar la foto', 'Intenta nuevamente.');
    } finally {
      setAvatarCargando(false);
    }
  }

  const nombre = user?.name ?? user?.email ?? 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();
  const rol = user?.role ?? 'mesero';

  const items = [
    ...(user?.role === 'admin'
      ? [
          {
            key: 'menu',
            label: 'Gestionar menú del día',
            onPress: handleGestionMenu,
            color: t.textPrimary,
          },
        ]
      : []),
    ...(user?.role === 'mesero' || user?.role === 'delivery' || user?.role === 'admin'
      ? [
          {
            key: 'comandas',
            label: user?.role === 'admin' ? 'Cobros de hoy' : 'Comandas',
            onPress: handleComandas,
            color: t.textPrimary,
          },
        ]
      : []),
    ...(user?.role === 'cocina'
      ? [
          {
            key: 'letras',
            label: 'Ajustar letras',
            onPress: handleLetras,
            color: t.textPrimary,
          },
        ]
      : []),
    {
      key: 'avatar',
      label: 'Foto de perfil',
      onPress: handleFotoOpciones,
      color: t.textPrimary,
    },
    { key: 'temas', label: 'Temas', onPress: handleTemas, color: t.textPrimary },
    { key: 'salir', label: 'Cerrar sesión', onPress: handleLogout, color: t.primary },
  ];

  useEffect(() => {
    if (!gestionAbierto && !comandasAbierto && !letrasAbierto && !temasAbierto && !fotoOpcionesAbierto) {
      return;
    }
    const subs = BackHandler.addEventListener('hardwareBackPress', () => {
      if (fotoOpcionesAbierto) {
        setFotoOpcionesAbierto(false);
        setMenuAbierto(true);
      } else {
        setGestionAbierto(false);
        setComandasAbierto(false);
        setLetrasAbierto(false);
        setTemasAbierto(false);
      }
      return true;
    });
    return () => subs.remove();
  }, [gestionAbierto, comandasAbierto, letrasAbierto, temasAbierto, fotoOpcionesAbierto]);

  return (
    <>
      <View className="absolute top-14 right-6 z-10 flex-row items-center gap-3.5">
        {user?.role === 'admin' && <AvisoBell />}
        {user?.role === 'cocina' && (
          <View
            className="rounded-full px-4 py-2 flex-row items-center gap-2"
            style={{
              backgroundColor: alpha(t.primary, 15),
              borderColor: alpha(t.primary, 40),
              borderWidth: 1,
            }}
          >
            <Text className="font-extrabold text-xl leading-none" style={{ color: t.primary }}>
              {pedidosActivos}
            </Text>
            <Feather name="bell" size={16} color={t.accent} strokeWidth={2} />
          </View>
        )}
        <ScalePressable
          onPress={handleOpenMenu}
          disabled={avatarCargando}
          pressedScale={0.9}
          hitSlop={8}
          innerClassName="flex-1 w-full h-full items-center justify-center"
          className="w-14 h-14 rounded-full overflow-hidden"
          style={{
            backgroundColor: t.pillBg,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          {avatarCargando ? (
            <ActivityIndicator size="small" color={t.pillText} />
          ) : user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: '100%', height: '100%', borderRadius: 999 }}
              resizeMode="cover"
            />
          ) : (
            <Feather name="user" size={24} color={t.pillText} />
          )}
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
            className="flex-1"
            style={{ backgroundColor: alpha(t.overlay, 60) }}
          />

          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute top-20 right-5 w-64 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              borderWidth: 1,
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <View className="px-4 pt-4 pb-3 flex-row items-center gap-3">
              <View
                className="w-11 h-11 rounded-full items-center justify-center overflow-hidden"
                style={{ backgroundColor: t.primary }}
              >
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="font-extrabold text-lg" style={{ color: t.onPrimary }}>
                    {inicial}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="font-semibold leading-tight" numberOfLines={1} style={{ color: t.textPrimary }}>
                  {nombre}
                </Text>
                <View
                  className="self-start mt-1 rounded-full px-2 py-0.5"
                  style={{ backgroundColor: t.chip }}
                >
                  <Text className="text-[11px] font-medium" style={{ color: t.textSecondary }}>
                    {ETIQUETAS_ROL[rol]}
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-px" style={{ backgroundColor: t.border }} />

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
                    {item.label}
                  </Text>
                </ScalePressable>
                {indice < items.length - 1 && (
                  <View className="h-px mx-4" style={{ backgroundColor: t.border }} />
                )}
              </Animated.View>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        visible={fotoOpcionesAbierto}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCerrarFotoOpciones}
      >
        <Pressable className="flex-1" onPress={handleCerrarFotoOpciones}>
          <Animated.View
            entering={FadeIn.duration(180)}
            className="flex-1"
            style={{ backgroundColor: alpha(t.overlay, 85) }}
          />
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute top-20 right-5 w-64 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              borderWidth: 1,
              shadowColor: '#000',
              shadowOpacity: 0.5,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
              <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>
                Foto de perfil
              </Text>
              <ScalePressable
                onPress={handleCerrarFotoOpciones}
                pressedScale={0.9}
                hitSlop={8}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: t.surface }}
                >
                  <Feather name="chevron-left" size={18} color={t.textSecondary} />
                </View>
              </ScalePressable>
            </View>
            <View className="h-px" style={{ backgroundColor: t.border }} />
            <ScalePressable
              onPress={handleAvatar}
              disabled={avatarCargando}
              pressedScale={0.97}
              className="px-4 py-3.5"
              innerClassName="w-full"
            >
              <View className="flex-row items-center gap-3">
                <Feather
                  name={user?.avatar ? 'edit-2' : 'image'}
                  size={18}
                  color={t.textSecondary}
                />
                <Text className="font-semibold" style={{ color: t.textPrimary }}>
                  {user?.avatar ? 'Cambiar foto' : 'Elegir foto'}
                </Text>
              </View>
            </ScalePressable>
            {user?.avatar && (
              <>
                <View className="h-px mx-4" style={{ backgroundColor: t.border }} />
                <ScalePressable
                  onPress={handleRemoveAvatar}
                  disabled={avatarCargando}
                  pressedScale={0.97}
                  className="px-4 py-3.5"
                  innerClassName="w-full"
                >
                  <View className="flex-row items-center gap-3">
                    <Feather name="trash-2" size={18} color={t.primary} />
                    <Text className="font-semibold" style={{ color: t.primary }}>
                      Quitar foto
                    </Text>
                  </View>
                </ScalePressable>
              </>
            )}
          </Animated.View>
        </Pressable>
      </Modal>

      {comandasAbierto && (
        <ComandasPanel
          onClose={() => setComandasAbierto(false)}
          esAdmin={user?.role === 'admin'}
        />
      )}

      {letrasAbierto && <AjustesLetras onClose={() => setLetrasAbierto(false)} />}

      {temasAbierto && <PanelTemas onClose={() => setTemasAbierto(false)} />}

      {gestionAbierto && (
        <View className="absolute inset-0" style={{ zIndex: 50, elevation: 50 }}>
          <Pressable className="flex-1" onPress={() => setGestionAbierto(false)}>
            <View className="flex-1" style={{ backgroundColor: alpha(t.overlay, 85) }} />
          </Pressable>
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="absolute rounded-3xl overflow-hidden"
            style={{
              top: 96,
              bottom: 28,
              left: 22,
              right: 22,
              backgroundColor: t.surfaceElevated,
              borderColor: t.border,
              borderWidth: 1,
            }}
          >
            <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
              <Text className="font-extrabold text-lg" style={{ color: t.textPrimary }}>
                Gestionar menú del día
              </Text>
              <Pressable onPress={() => setGestionAbierto(false)} hitSlop={8}>
                <Text className="font-bold" style={{ color: t.textSecondary }}>✕</Text>
              </Pressable>
            </View>
            <View className="h-px" style={{ backgroundColor: t.border }} />
            <View className="flex-1 px-5 pt-4">
              <ModuloMenu />
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
}