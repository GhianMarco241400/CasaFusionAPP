import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DishDocument = Dish & Document;

@Schema({ timestamps: true })
export class Dish {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop()
  image: string;

  @Prop({ default: true })
  active: boolean;
}

export const DishSchema = SchemaFactory.createForClass(Dish);