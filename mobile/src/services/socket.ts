// src/services/socket.ts
import { io, type Socket } from 'socket.io-client';
import { BASE_URL, getTokenAsync } from './api';
import { mapOrderFromBackend } from './orders';
import { Order } from '../types';

let socket: Socket | null = null;

function esperarConexion(s: Socket): Promise<Socket> {
  if (s.connected) return Promise.resolve(s);
  return new Promise<Socket>((resolve) => {
    const timeout = setTimeout(() => resolve(s), 8000);
    s.once('connect', () => {
      clearTimeout(timeout);
      resolve(s);
    });
  });
}

export async function connectSocket(): Promise<Socket> {
  if (socket) {
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
    return esperarConexion(socket);
  }

  const token = await getTokenAsync();

  const nuevo = io(BASE_URL, {
    transports: ['websocket'],
    auth: { token: token ?? undefined },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });
  socket = nuevo;

  return esperarConexion(nuevo);
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

export function onOrderCreated(callback: (order: Order) => void): void {
  socket?.on('order:created', (data: unknown) => {
    callback(mapOrderFromBackend(data as Parameters<typeof mapOrderFromBackend>[0]));
  });
}

export function onOrderUpdated(callback: (order: Order) => void): void {
  socket?.on('order:updated', (data: unknown) => {
    callback(mapOrderFromBackend(data as Parameters<typeof mapOrderFromBackend>[0]));
  });
}

export function onSocketConnect(callback: () => void): void {
  socket?.on('connect', callback);
}

export function onOrderDeleted(callback: (orderId: string) => void): void {
  socket?.on('order:deleted', (data: unknown) => {
    const id = (data as { orderId?: string }).orderId;
    if (id) callback(id);
  });
}