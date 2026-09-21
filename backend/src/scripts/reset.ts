// backend/src/scripts/reset.ts
// Limpia la base de datos: borra todo lo operativo (comandas, reportes,
// cuaderno, avisos) pero conserva usuarios, categorías, platos y entradas.
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { DailyReport, DailyReportSchema } from '../reports/schemas/daily-report.schema';
import { CuadernoEntrada, CuadernoEntradaSchema } from '../reports/schemas/cuaderno.schema';
import { Aviso, AvisoSchema } from '../reports/schemas/aviso.schema';

dotenv.config();

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const OrderModel = mongoose.model(Order.name, OrderSchema);
  const DailyReportModel = mongoose.model(DailyReport.name, DailyReportSchema);
  const CuadernoModel = mongoose.model(CuadernoEntrada.name, CuadernoEntradaSchema);
  const AvisoModel = mongoose.model(Aviso.name, AvisoSchema);

  const ordenes = await OrderModel.deleteMany({}).exec();
  const reportes = await DailyReportModel.deleteMany({}).exec();
  const cuaderno = await CuadernoModel.deleteMany({}).exec();
  const avisos = await AvisoModel.deleteMany({}).exec();

  console.log(`Comandas eliminadas: ${ordenes.deletedCount}`);
  console.log(`Reportes diarios eliminados: ${reportes.deletedCount}`);
  console.log(`Cuaderno (fiados/cobros) eliminados: ${cuaderno.deletedCount}`);
  console.log(`Avisos eliminados: ${avisos.deletedCount}`);
  console.log('Conservados: usuarios, categorías, platos y entradas.');

  await mongoose.disconnect();
}

reset();