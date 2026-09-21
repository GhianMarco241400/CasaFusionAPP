import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EntradaDocument = Entrada & Document;

@Schema({ timestamps: true })
export class Entrada {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  active: boolean;
}

export const EntradaSchema = SchemaFactory.createForClass(Entrada);