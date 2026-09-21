// backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Dish, DishSchema } from '../menu/schemas/dish.schema';
import { Category, CategorySchema } from '../menu/schemas/category.schema';
import { Entrada, EntradaSchema } from '../menu/schemas/entrada.schema';
import { DailyReport, DailyReportSchema } from './schemas/daily-report.schema';
import {
  CuadernoEntrada,
  CuadernoEntradaSchema,
} from './schemas/cuaderno.schema';
import { Aviso, AvisoSchema } from './schemas/aviso.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Dish.name, schema: DishSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Entrada.name, schema: EntradaSchema },
      { name: DailyReport.name, schema: DailyReportSchema },
      { name: CuadernoEntrada.name, schema: CuadernoEntradaSchema },
      { name: Aviso.name, schema: AvisoSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    OrdersModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}