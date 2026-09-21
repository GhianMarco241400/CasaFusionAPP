// backend/src/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderStatus =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED';

export type OrderCanal = 'mesa' | 'apartado' | 'delivery';
export type PagoEstado = 'PAGADO' | 'PENDIENTE';
export type MetodoPago = 'YAPE' | 'EFECTIVO';

export type OrderItem = {
  dishId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  entrada?: { name: string; price: number };
  entradaPersonalizada?: { name: string; price: number };
  paraLlevar?: boolean;
  taperoPrecio?: number;
  notes?: string;
  esExtra?: boolean;
};

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  tableNumber: number;

  @Prop({
    required: true,
    enum: ['mesa', 'apartado', 'delivery'],
    default: 'mesa',
  })
  canal: OrderCanal;

  @Prop({ required: true })
  waiterId: string;

  @Prop({ type: String, default: null })
  clienteNombre?: string | null;

  @Prop({ type: String, default: null })
  telefono?: string | null;

  @Prop({ type: String, default: null })
  direccion?: string | null;

  @Prop({
    type: String,
    required: false,
    enum: ['PAGADO', 'PENDIENTE'],
  })
  pagoEstado?: PagoEstado;

  @Prop({
    type: String,
    required: false,
    enum: ['YAPE', 'EFECTIVO'],
  })
  metodoPago?: MetodoPago | null;

  @Prop({
    required: true,
    enum: ['PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED', 'COMPLETED'],
    default: 'PENDING',
  })
  status: OrderStatus;

  @Prop({ default: false })
  edited?: boolean;

  @Prop({ required: true })
  items: OrderItem[];

  @Prop({ required: true })
  total: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderDocument = Order & Document & { _id: Types.ObjectId };
export const OrderSchema = SchemaFactory.createForClass(Order);