// backend/src/reports/schemas/daily-report.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderItem, MetodoPago } from '../../orders/schemas/order.schema';

export type SaleOrder = {
  orderId: string;
  edited: boolean;
  items: OrderItem[];
  total: number;
};

export type Sale = {
  tableNumber: number;
  waiterId: string;
  completedAt: string;
  total: number;
  orders: SaleOrder[];
  canal?: 'mesa' | 'apartado' | 'delivery';
  pagoEstado?: 'PAGADO' | 'PENDIENTE';
  metodoPago?: 'YAPE' | 'EFECTIVO' | null;
  cobradoEn?: string;
  verificadoYape?: boolean;
};

export type IngresoManual = {
  monto: number;
  metodoPago: MetodoPago;
  concepto?: string | null;
  registradoEn: string;
  creadoPor: string;
  canal?: 'mesa' | 'delivery';
  /** Entrada del cuaderno que origino este ingreso, para poder revertirlo. */
  cuadernoId?: string | null;
};

export type ItemTotal = {
  name: string;
  quantity: number;
  total: number;
};

@Schema({ timestamps: true })
export class DailyReport {
  @Prop({ required: true, unique: true })
  date: string;

  @Prop({ type: [Object], default: [] })
  sales: Sale[];

  @Prop({ type: [Object], default: [] })
  ingresosManuales?: IngresoManual[];

  @Prop({ default: 0 })
  numSales: number;

  @Prop({ default: 0 })
  numComandas: number;

  @Prop({ default: 0 })
  totalIngresos: number;

  @Prop({ default: 0 })
  totalPendiente: number;

  @Prop({ default: 0 })
  numPendientes: number;

  @Prop({ default: 0 })
  ticketPromedio: number;

  @Prop({ type: [Object], default: [] })
  itemsTotales: ItemTotal[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type DailyReportDocument = DailyReport &
  Document & { _id: Types.ObjectId };
export const DailyReportSchema = SchemaFactory.createForClass(DailyReport);
