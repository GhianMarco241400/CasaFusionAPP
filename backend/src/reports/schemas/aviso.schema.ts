// backend/src/reports/schemas/aviso.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvisoTipo = 'FIADO' | 'ERROR' | 'REAPERTURA';

@Schema({ timestamps: true })
export class Aviso {
  @Prop({ required: true, enum: ['FIADO', 'ERROR', 'REAPERTURA'] })
  tipo: AvisoTipo;

  @Prop({ required: true })
  desc: string;

  @Prop({ type: Number, default: 0 })
  monto?: number;

  @Prop({ type: String, default: null })
  entidadId?: string | null;

  @Prop({ type: String, default: null })
  creadoPor?: string | null;

  @Prop({ default: false })
  leido: boolean;

  @Prop({ default: false })
  resolved: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type AvisoDocument = Aviso & Document & { _id: Types.ObjectId };
export const AvisoSchema = SchemaFactory.createForClass(Aviso);
