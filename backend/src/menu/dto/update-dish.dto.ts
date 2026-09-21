import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDishDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  image?: string;
}