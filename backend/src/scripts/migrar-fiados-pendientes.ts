// backend/src/scripts/migrar-fiados-pendientes.ts
//
// Uso:  npm run migrate:fiados        (muestra que haria)
//       npm run migrate:fiados -- --apply   (lo ejecuta)
//
// Que hace: los fiados "por cobrar" ya no viven en el reporte. Viven en el
// cuaderno desde que el delivery (o el admin) los anota, y solo entran al
// reporte cuando el admin confirma el cobro. Este script saca de los reportes
// las ventas PENDIENTE que quedaron de antes del cambio, dejando la deuda solo
// en el cuaderno. Si a alguna venta no le falta la entrada de cuaderno, la crea
// para que la deuda no se pierda.
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import {
  DailyReport,
  DailyReportSchema,
} from '../reports/schemas/daily-report.schema';
import {
  CuadernoEntrada,
  CuadernoEntradaSchema,
} from '../reports/schemas/cuaderno.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { totalesDe } from '../reports/reporte-totales';

dotenv.config();

const APLICAR = process.argv.includes('--apply');

function acumularItems(ventas: { orders?: { items?: unknown[] }[] }[]) {
  return ventas
    .flatMap((s) => s.orders ?? [])
    .flatMap((o) => o.items ?? []) as never[];
}

async function migrar() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const ReporteModel = mongoose.model(DailyReport.name, DailyReportSchema);
  const CuadernoModel = mongoose.model(
    CuadernoEntrada.name,
    CuadernoEntradaSchema,
  );
  const OrderModel = mongoose.model(Order.name, OrderSchema);

  const reportes = await ReporteModel.find({
    'sales.pagoEstado': 'PENDIENTE',
  }).exec();

  console.log(
    `Reportes con ventas por cobrar: ${reportes.length} (modo ${APLICAR ? 'APLICAR' : 'simulación'})`,
  );
  if (reportes.length === 0) {
    console.log('No hay nada que migrar.');
    await mongoose.disconnect();
    return;
  }

  let ventasSacadas = 0;
  let cuadernoCreado = 0;
  let cuadernoExistente = 0;

  for (const reporte of reportes) {
    const ventas = reporte.sales ?? [];
    const pendientes = ventas.filter((v) => v.pagoEstado === 'PENDIENTE');
    const seQuedan = ventas.filter((v) => v.pagoEstado !== 'PENDIENTE');

    for (const venta of pendientes) {
      for (const orden of venta.orders ?? []) {
        const yaEsta = await CuadernoModel.findOne({
          orderId: orden.orderId,
          tipo: 'FIADO',
        }).exec();
        if (yaEsta) {
          cuadernoExistente += 1;
          console.log(
            `  · ${orden.orderId}: ya tiene entrada de cuaderno (${yaEsta.estado}), no se toca`,
          );
          continue;
        }

        // Sin cuaderno: la deuda existe pero nadie la anotó. Se recupera de la
        // orden para no perderla.
        const ordenDoc = await OrderModel.findById(orden.orderId).exec();
        const cliente = ordenDoc?.clienteNombre ?? null;

        console.log(
          `  · ${orden.orderId}: sin entrada de cuaderno, se crea (S/ ${orden.total.toFixed(2)}${
            cliente ? ` · ${cliente}` : ''
          })`,
        );
        if (APLICAR) {
          await CuadernoModel.create({
            tipo: 'FIADO',
            fechaEntrega: reporte.date,
            monto: orden.total,
            clienteNombre: cliente,
            telefono: ordenDoc?.telefono ?? null,
            canal: venta.canal === 'delivery' ? 'delivery' : 'mesa',
            canalVenta: venta.canal === 'delivery' ? 'delivery' : 'mesa',
            orderId: orden.orderId,
            estado: 'ABIERTO',
            creadoPor: venta.waiterId,
          });
        }
        cuadernoCreado += 1;
      }
    }

    ventasSacadas += pendientes.length;
    console.log(
      `  ${reporte.date}: fuera ${pendientes.length} venta(s) por cobrar, quedan ${seQuedan.length}`,
    );

    if (APLICAR) {
      reporte.sales = seQuedan;
      reporte.markModified('sales');
      const totales = totalesDe(seQuedan, reporte.ingresosManuales ?? []);
      reporte.numSales = totales.numSales;
      reporte.numComandas = totales.numComandas;
      reporte.totalIngresos = totales.totalIngresos;
      reporte.totalPendiente = totales.totalPendiente;
      reporte.numPendientes = totales.numPendientes;
      reporte.ticketPromedio = totales.ticketPromedio;
      reporte.itemsTotales = acumularItems(seQuedan);
      await reporte.save();
    }
  }

  console.log('');
  console.log(`Ventas por cobrar sacadas de los reportes: ${ventasSacadas}`);
  console.log(`Entradas de cuaderno creadas: ${cuadernoCreado}`);
  console.log(`Entradas de cuaderno que ya existian: ${cuadernoExistente}`);
  console.log(
    APLICAR
      ? 'Migración aplicada.'
      : 'Simulación solamente. Corre con --apply para aplicar los cambios.',
  );

  await mongoose.disconnect();
}

migrar();
