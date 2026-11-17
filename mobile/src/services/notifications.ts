// src/services/notifications.ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Role } from '../types';
import { api } from './api';
import { socketConectado } from './socket';

const CANAL_NUEVAS = 'comandas_nuevas';
const CANAL_EDITADAS = 'comandas_editadas';
const CLAVE_TOKEN = 'pushToken';

let suscripcionToken: Notifications.EventSubscription | null = null;
let rolActual: Role | null = null;

export function configurarNotificaciones(): void {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const enPrimerPlano = socketConectado();
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: !enPrimerPlano,
        shouldSetBadge: false,
      };
    },
  });
}

export async function configurarCanalesAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all([
    Notifications.setNotificationChannelAsync(CANAL_NUEVAS, {
      name: 'Comandas nuevas',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'comanda_nueva.wav',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4432B',
      enableVibrate: true,
      showBadge: true,
    }),
    Notifications.setNotificationChannelAsync(CANAL_EDITADAS, {
      name: 'Comandas editadas',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'comanda_editada.wav',
      vibrationPattern: [0, 180, 180, 180],
      lightColor: '#D4432B',
      enableVibrate: true,
      showBadge: true,
    }),
  ]);
}

export async function registrarPushTokenAsync(role: Role): Promise<void> {
  if (role !== 'cocina' || Platform.OS === 'web') return;

  try {
    await configurarCanalesAsync();

    const { status: actual } = await Notifications.getPermissionsAsync();
    let status = actual;
    if (status !== 'granted') {
      const { status: solicitado } =
        await Notifications.requestPermissionsAsync();
      status = solicitado;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[notifications] No se encontró el projectId de EAS');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    await api.post('/push-tokens', { token, platform });
    await SecureStore.setItemAsync(CLAVE_TOKEN, token);
  } catch (error) {
    console.warn('[notifications] No se pudo registrar el token push', error);
  }
}

export function observarCambiosDeToken(role: Role | null): void {
  rolActual = role;
  if (role !== 'cocina' || suscripcionToken) return;

  suscripcionToken = Notifications.addPushTokenListener(() => {
    if (rolActual === 'cocina') {
      void registrarPushTokenAsync('cocina');
    }
  });
}

export async function desregistrarPushTokenAsync(): Promise<void> {
  const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
  if (!token) return;

  try {
    await api.delete('/push-tokens', { data: { token } });
  } catch (error) {
    console.warn('[notifications] No se pudo eliminar el token push', error);
  } finally {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  }
}
