// backend/src/reports/reporte-totales.ts
import { Sale, IngresoManual } from './schemas/daily-report.schema';
import { OrderItem } from '../orders/schemas/order.schema';

export function totalItem(item: OrderItem): number {
  return (
    item.unitPrice * item.quantity +
    (item.entrada?.price ?? 0) +
    (item.entradaPersonalizada?.price ?? 0) +
    (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0)
  );
}

export function totalesDe(
  sales: Sale[],
  ingresosManuales: IngresoManual[] = [],
) {
  const numSales = sales.length;
  const numComandas = sales.reduce(
    (acc, s) => acc + (s.orders?.length ?? 0),
    0,
  );
  const ventasConfirmadas = sales
    .filter((s) => s.pagoEstado !== 'PENDIENTE')
    .reduce((acc, s) => acc + s.total, 0);
  const totalManuales = ingresosManuales.reduce((acc, i) => acc + i.monto, 0);
  const totalIngresos = ventasConfirmadas + totalManuales;
  const totalPendiente = sales
    .filter((s) => s.pagoEstado === 'PENDIENTE')
    .reduce((acc, s) => acc + s.total, 0);
  const numPendientes = sales.filter(
    (s) => s.pagoEstado === 'PENDIENTE',
  ).length;
  const ticketPromedio =
    numSales > 0
      ? Math.round(((ventasConfirmadas + totalPendiente) / numSales) * 100) /
        100
      : 0;
  return {
    numSales,
    numComandas,
    totalIngresos,
    totalPendiente,
    numPendientes,
    ticketPromedio,
  };
}
