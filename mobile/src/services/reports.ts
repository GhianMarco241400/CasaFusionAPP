// src/services/reports.ts
import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { api, BASE_URL, getTokenAsync } from './api';
import { DailyReport, CuadernoDia, CuadernoEntrada, Aviso, MetodoPago, Sale } from '../types';
import { mapReportFromBackend } from './orders';

const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function fechaLocalAYYYYMMDD(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const d = `${fecha.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getReport(date?: string): Promise<DailyReport | null> {
  const ruta = date ? `/reports/${date}` : '/reports';
  const response = await api.get<unknown>(ruta);
  if (!response.data) return null;
  return mapReportFromBackend(response.data as Parameters<typeof mapReportFromBackend>[0]);
}

export type ItemRanking = { name: string; quantity: number; total: number };

export type DiaResumen = {
  date: string;
  total: number;
  mesa: number;
  delivery: number;
  ranking: ItemRanking[];
};

export type ResumenSemana = {
  dias: DiaResumen[];
  rankingSemana: ItemRanking[];
};

export async function getResumenSemana(): Promise<ResumenSemana> {
  const response = await api.get<ResumenSemana>('/reports/week');
  return response.data;
}

export async function getMisComandas(): Promise<Sale[]> {
  const response = await api.get<Array<Sale & { _id: string }>>(
    '/reports/mis-comandas'
  );
  return response.data.map((s) => ({ ...s, id: s._id }));
}

export async function exportarReporteXlsx(date: string): Promise<void> {
  const token = await getTokenAsync();
  const nombre = `reporte-${date}.xlsx`;
  const url = `${BASE_URL}/reports/export/${date}`;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const respuesta = await fetch(url, { headers });
  if (!respuesta.ok) {
    throw new Error(`Error del servidor (${respuesta.status})`);
  }

  if (Platform.OS === 'web') {
    const blob = await respuesta.blob();
    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = objectUrl;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const bytes = await respuesta.bytes();
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  archivo.write(bytes);
  await Sharing.shareAsync(archivo.uri, {
    mimeType: MIME_XLSX,
    dialogTitle: 'Exportar reporte',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
}

export async function getCuaderno(): Promise<CuadernoDia> {
  const response = await api.get<{
    date: string;
    resumen: CuadernoDia['resumen'];
    fiados: Array<CuadernoEntrada & { _id: string }>;
    cobrosHoy: Array<CuadernoEntrada & { _id: string }>;
  }>('/reports/cuaderno');
  const mapear = (entradas: Array<CuadernoEntrada & { _id: string }>): CuadernoEntrada[] =>
    entradas.map((e) => ({ ...e, id: e._id }));
  return {
    date: response.data.date,
    resumen: response.data.resumen,
    fiados: mapear(response.data.fiados),
    cobrosHoy: mapear(response.data.cobrosHoy),
  };
}

export async function cobrarFiado(
  orderId: string,
  metodoPago: MetodoPago,
): Promise<void> {
  await api.post(`/reports/fiado/${orderId}/cobrar`, { metodoPago });
}

export async function cobrarFiadoManual(
  id: string,
  metodoPago: MetodoPago,
): Promise<void> {
  await api.post(`/reports/cuaderno/${id}/cobrar-fiado-manual`, { metodoPago });
}

export async function eliminarIngresoManual(
  date: string,
  indice: number,
): Promise<void> {
  await api.delete(`/reports/ingreso-manual/${date}/${indice}`);
}

export async function eliminarFiadoManual(id: string): Promise<void> {
  await api.delete(`/reports/cuaderno/${id}`);
}

export async function registroManual(input: {
  tipo: 'FIADO' | 'INGRESO';
  canal: 'mesa' | 'delivery';
  monto: number;
  metodoPago?: MetodoPago;
  concepto?: string;
  clienteNombre?: string;
  date?: string;
}): Promise<void> {
  await api.post('/reports/registro-manual', input);
}

export async function getAvisos(): Promise<{
  list: Aviso[];
  unreadCount: number;
}> {
  const response = await api.get<{
    list: Array<Aviso & { _id: string }>;
    unreadCount: number;
  }>('/reports/avisos');
  return {
    list: response.data.list.map((a) => ({ ...a, id: a._id })),
    unreadCount: response.data.unreadCount,
  };
}

export async function marcarAvisosLeidos(): Promise<void> {
  await api.post('/reports/avisos/leer');
}

export async function eliminarAviso(id: string): Promise<void> {
  await api.delete(`/reports/avisos/${id}`);
}

export async function reportarError(desc: string): Promise<void> {
  await api.post('/reports/avisos/error', { desc });
}

export async function eliminarVenta(orderId: string): Promise<void> {
  await api.delete(`/reports/venta/${orderId}`);
}