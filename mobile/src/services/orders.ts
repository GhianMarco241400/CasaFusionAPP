// src/services/orders.ts
import { api } from './api';
import {
  Order,
  OrderItem,
  OrderStatus,
  DailyReport,
  Sale,
  OrderCanal,
  PagoEstado,
  MetodoPago,
} from '../types';

type BackendOrder = {
  _id: string;
  tableNumber: number;
  canal?: OrderCanal;
  waiterId: string;
  clienteNombre?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  pagoEstado?: PagoEstado;
  metodoPago?: MetodoPago | null;
  status: OrderStatus;
  edited?: boolean;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
};

type BackendReport = {
  _id: string;
  date: string;
  sales: Array<Sale & { _id: string }>;
  ingresosManuales?: DailyReport['ingresosManuales'];
  numSales: number;
  numComandas: number;
  totalIngresos: number;
  totalPendiente: number;
  numPendientes: number;
  ticketPromedio: number;
  itemsTotales: DailyReport['itemsTotales'];
  cobrosAjenos?: DailyReport['cobrosAjenos'];
  createdAt?: string;
  updatedAt?: string;
};

export function mapReportFromBackend(reporte: BackendReport): DailyReport {
  return {
    id: reporte._id,
    date: reporte.date,
    sales: (reporte.sales ?? []).map((s) => ({ ...s, id: s._id })),
    ingresosManuales: reporte.ingresosManuales ?? [],
    numSales: reporte.numSales ?? 0,
    numComandas: reporte.numComandas ?? 0,
    totalIngresos: reporte.totalIngresos ?? 0,
    totalPendiente: reporte.totalPendiente ?? 0,
    numPendientes: reporte.numPendientes ?? 0,
    ticketPromedio: reporte.ticketPromedio ?? 0,
    itemsTotales: reporte.itemsTotales ?? [],
    cobrosAjenos: reporte.cobrosAjenos ?? [],
    createdAt: reporte.createdAt,
    updatedAt: reporte.updatedAt,
  };
}

export function mapOrderFromBackend(orden: BackendOrder): Order {
  return {
    id: orden._id,
    tableNumber: orden.tableNumber,
    canal: orden.canal,
    waiterId: orden.waiterId,
    clienteNombre: orden.clienteNombre ?? undefined,
    telefono: orden.telefono ?? undefined,
    direccion: orden.direccion ?? undefined,
    pagoEstado: orden.pagoEstado,
    metodoPago: orden.metodoPago ?? undefined,
    status: orden.status,
    edited: orden.edited ?? false,
    items: orden.items,
    total: orden.total,
    createdAt: orden.createdAt,
    updatedAt: orden.updatedAt,
  };
}

export async function getActiveOrders(): Promise<Order[]> {
  const response = await api.get<BackendOrder[]>('/orders');
  return response.data.map(mapOrderFromBackend);
}

export type DatosCliente = {
  canal?: OrderCanal;
  clienteNombre?: string;
  telefono?: string;
  direccion?: string;
};

export async function createOrder(
  tableNumber: number,
  items: OrderItem[],
  cliente?: DatosCliente
): Promise<Order> {
  const response = await api.post<BackendOrder>('/orders', {
    tableNumber,
    items,
    canal: cliente?.canal,
    clienteNombre: cliente?.clienteNombre,
    telefono: cliente?.telefono,
    direccion: cliente?.direccion,
  });
  return mapOrderFromBackend(response.data);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const response = await api.patch<BackendOrder>(`/orders/${orderId}/status`, { status });
  return mapOrderFromBackend(response.data);
}

export async function updateOrderItems(
  orderId: string,
  items: OrderItem[]
): Promise<Order> {
  const response = await api.patch<BackendOrder>(`/orders/${orderId}/items`, { items });
  return mapOrderFromBackend(response.data);
}

export async function deleteOrder(orderId: string): Promise<void> {
  await api.delete(`/orders/${orderId}`);
}

export async function completeTable(
  tableNumber: number,
  metodoPago: MetodoPago,
): Promise<{ report?: DailyReport; orders: Order[] }> {
  const response = await api.post(`/reports/complete-table/${tableNumber}`, { metodoPago });
  return {
    report: response.data?.report ? mapReportFromBackend(response.data.report) : undefined,
    orders: (response.data?.orders ?? []).map(mapOrderFromBackend),
  };
}

export async function completeOrder(
  orderId: string,
  metodoPago: MetodoPago,
): Promise<{ report?: DailyReport; orders: Order[] }> {
  const response = await api.post(`/reports/complete-order/${orderId}`, { metodoPago });
  return {
    report: response.data?.report ? mapReportFromBackend(response.data.report) : undefined,
    orders: (response.data?.order ? [response.data.order] : []).map(mapOrderFromBackend),
  };
}

export async function completeDelivery(
  orderId: string,
  pagoEstado: PagoEstado,
  metodoPago?: MetodoPago,
): Promise<{ report?: DailyReport; orders: Order[] }> {
  const response = await api.post(`/reports/complete-delivery/${orderId}`, {
    pagoEstado,
    metodoPago,
  });
  return {
    report: response.data?.report ? mapReportFromBackend(response.data.report) : undefined,
    orders: (response.data?.order ? [response.data.order] : []).map(mapOrderFromBackend),
  };
}