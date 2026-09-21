// backend/src/scripts/seed-menu.ts
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Category, CategorySchema } from '../menu/schemas/category.schema';
import { Dish, DishSchema } from '../menu/schemas/dish.schema';
import { Entrada, EntradaSchema } from '../menu/schemas/entrada.schema';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const CategoryModel = mongoose.model(Category.name, CategorySchema);
  const DishModel = mongoose.model(Dish.name, DishSchema);
  const EntradaModel = mongoose.model(Entrada.name, EntradaSchema);

  const categorias = [
    { key: 'entradas', nombre: 'Entradas', descripcion: 'Platos de entrada' },
    { key: 'fondos', nombre: 'Fondos', descripcion: 'Platos principales' },
    { key: 'extras', nombre: 'Extras', descripcion: 'Platos y gaseosas extras' },
    { key: 'especiales', nombre: 'Especiales', descripcion: 'Platos especiales' },
  ];

  const categoriaIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const cat of categorias) {
    const existente = await CategoryModel.findOne({ name: cat.nombre });
    const doc = existente
      ? existente
      : await CategoryModel.create({ name: cat.nombre, description: cat.descripcion, active: true });
    categoriaIds[cat.key] = doc._id;
  }

  const platos = [
    { name: 'Lomo Saltado', price: 11, categoryId: categoriaIds.fondos },
    { name: 'Ensalada rusa', price: 10, categoryId: categoriaIds.fondos },
    { name: 'Olluquito', price: 10, categoryId: categoriaIds.fondos },
  ];

  for (const plato of platos) {
    await DishModel.updateOne(
      { name: plato.name },
      { $set: { ...plato, active: true } },
      { upsert: true },
    );
  }
  console.log(`Categorías aseguradas (${categorias.length})`);
  console.log(`Platos asegurados (${platos.length})`);

  const entradas = [
    { name: 'Papas fritas', price: 5 },
    { name: 'Arroz', price: 3 },
    { name: 'Ensalada', price: 4 },
  ];

  for (const entrada of entradas) {
    await EntradaModel.updateOne(
      { name: entrada.name },
      { $set: { ...entrada, active: true } },
      { upsert: true },
    );
  }
  console.log(`Entradas aseguradas (${entradas.length})`);

  await mongoose.disconnect();
}

seed();