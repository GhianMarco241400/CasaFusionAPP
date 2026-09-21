// backend/src/orders/dto/create-order.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class EntradaDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

export class OrderItemDto {
  @IsOptional()
  @IsString()
  dishId?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntradaDto)
  @IsNotEmptyObject()
  entrada?: EntradaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntradaDto)
  @IsNotEmptyObject()
  entradaPersonalizada?: EntradaDto;

  @IsOptional()
  @IsBoolean()
  paraLlevar?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taperoPrecio?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  esExtra?: boolean;
}

export class CreateOrderDto {
  @IsInt()
  @Min(0)
  tableNumber: number;

  @IsOptional()
  @IsIn(['mesa', 'apartado', 'delivery'])
  canal?: 'mesa' | 'apartado' | 'delivery';

  @IsOptional()
  @IsString()
  @MinLength(1)
  clienteNombre?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}