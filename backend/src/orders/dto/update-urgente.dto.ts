// backend/src/orders/dto/update-urgente.dto.ts
import { IsBoolean } from 'class-validator';

export class UpdateUrgenteDto {
  @IsBoolean()
  urgente: boolean;
}