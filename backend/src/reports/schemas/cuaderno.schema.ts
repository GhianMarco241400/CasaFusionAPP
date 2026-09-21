// backend/src/reports/schemas/cuaderno.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CuadernoTipo = 'FIADO' | 'COBRO';
export type CuadernoEstado = 'ABIERTO' | 'COBRADO' | 'ELIMINADO';

@Schema({ timestamps: true })
export class CuadernoEntrada {
  @Prop({ required: true, enum: ['FIADO', 'COBRO'] })
  tipo: CuadernoTipo;

  @Prop({ required: true })
  fechaEntrega: string;

  @Prop({ required: true })
  monto: number;

  @Prop({ type: String, default: null })
  clienteNombre?: string | null;

  @Prop({ type: String, default: null })
  telefono?: string | null;

  @Prop({ type: String, default: null })
  motivo?: string | null;

  @Prop({
    type: String,
    required: true,
    enum: ['mesa', 'apartado', 'delivery', 'manual'],
    default: 'delivery',
  })
  canal: 'mesa' | 'apartado' | 'delivery' | 'manual';

  @Prop({ type: String, enum: ['mesa', 'delivery'], default: null })
  canalVenta?: 'mesa' | 'delivery' | null;

  @Prop({ type: String, default: null })
  orderId?: string | null;

  @Prop({
    type: String,
    required: true,
    enum: ['ABIERTO', 'COBRADO', 'ELIMINADO'],
    default: 'ABIERTO',
  })
  estado: CuadernoEstado;

  @Prop({ type: String, enum: ['YAPE', 'EFECTIVO'], default: null })
  cobradoMetodo?: 'YAPE' | 'EFECTIVO' | null;

  @Prop({ type: String, default: null })
  cobradoEn?: string | null;

  @Prop({ type: String, default: null })
  cobradoFecha?: string | null;

  @Prop({ required: true })
  creadoPor: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type CuadernoEntradaDocument = CuadernoEntrada &
  Document & { _id: Types.ObjectId };
export const CuadernoEntradaSchema = SchemaFactory.createForClass(CuadernoEntrada);