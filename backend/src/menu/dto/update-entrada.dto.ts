import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateEntradaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}