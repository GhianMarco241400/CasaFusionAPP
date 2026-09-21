// src/services/socket.ts
import { io, type Socket } from 'socket.io-client';
import { BASE_URL, getTokenAsync } from './api';
import { mapOrderFromBackend } from './orders';
import { Order } from '../types';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;

  const token = await getTokenAsync();

  socket?.removeAllListeners();
  socket?.disconnect();

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

  if (nuevo.connected) return nuevo;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 8000);
    nuevo.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  return nuevo;
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

export function onOrderDeleted(callback: (orderId: string) => void): void {
  socket?.on('order:deleted', (data: unknown) => {
    const id = (data as { orderId?: string }).orderId;
    if (id) callback(id);
  });
}