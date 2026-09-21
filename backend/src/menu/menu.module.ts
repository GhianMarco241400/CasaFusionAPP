// backend/src/menu/menu.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Dish, DishSchema } from './schemas/dish.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Entrada, EntradaSchema } from './schemas/entrada.schema';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Dish.name, schema: DishSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Entrada.name, schema: EntradaSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [MenuService],
  controllers: [MenuController],
})
export class MenuModule {}