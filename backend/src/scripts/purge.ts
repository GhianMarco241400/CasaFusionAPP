import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Dish, DishSchema } from '../menu/schemas/dish.schema';
import { Entrada, EntradaSchema } from '../menu/schemas/entrada.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

dotenv.config();

const DIAS = Number(process.env.PURGE_DAYS ?? 7);

async function purge() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const DishModel = mongoose.model(Dish.name, DishSchema);
  const EntradaModel = mongoose.model(Entrada.name, EntradaSchema);
  const OrderModel = mongoose.model(Order.name, OrderSchema);

  const corte = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000);

  const platosEliminados = await DishModel.deleteMany({ active: false }).exec();
  const entradasEliminadas = await EntradaModel.deleteMany({ active: false }).exec();
  const ordenesEliminadas = await OrderModel.deleteMany({
    status: 'DELIVERED',
    updatedAt: { $lt: corte },
  }).exec();

  console.log(`Platos desactivados eliminados: ${platosEliminados.deletedCount}`);
  console.log(`Entradas desactivadas eliminadas: ${entradasEliminadas.deletedCount}`);
  console.log(`Órdenes entregadas hace más de ${DIAS} días eliminadas: ${ordenesEliminadas.deletedCount}`);

  await mongoose.disconnect();
}

purge();