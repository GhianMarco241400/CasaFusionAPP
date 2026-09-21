import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { User, UserSchema } from '../users/schemas/user.schema';

type SeedUser = { name: string; email: string; password: string; role: string };

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const UserModel = mongoose.model(User.name, UserSchema);

  const raw = process.env.SEED_USERS;
  if (!raw) {
    console.error('SEED_USERS no esta definido en backend/.env');
    await mongoose.disconnect();
    process.exit(1);
  }

  let usuarios: SeedUser[];
  try {
    usuarios = JSON.parse(raw) as SeedUser[];
  } catch (err) {
    console.error('SEED_USERS no es JSON valido:', (err as Error).message);
    await mongoose.disconnect();
    process.exit(1);
  }

  const emails = usuarios.map((u) => u.email.toLowerCase());

  for (const datos of usuarios) {
    const email = datos.email.toLowerCase();
    const passwordHasheada = await bcrypt.hash(datos.password, 10);
    await UserModel.updateOne(
      { email },
      { $set: { name: datos.name, email, password: passwordHasheada, role: datos.role, active: true } },
      { upsert: true },
    );
    console.log('Usuario asegurado:', email);
  }

  const eliminados = await UserModel.deleteMany({ email: { $nin: emails } }).exec();
  console.log(`Usuarios anteriores eliminados: ${eliminados.deletedCount}`);

  const total = await UserModel.countDocuments().exec();
  console.log(`Total de usuarios en la BD: ${total}`);

  await mongoose.disconnect();
}

seed();