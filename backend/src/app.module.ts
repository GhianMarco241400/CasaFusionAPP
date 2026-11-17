// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { ReportsModule } from './reports/reports.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    UsersModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    ReportsModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
