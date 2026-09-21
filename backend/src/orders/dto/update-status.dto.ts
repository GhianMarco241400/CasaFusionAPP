// backend/src/orders/dto/update-status.dto.ts
import { IsIn } from 'class-validator';
import type { OrderStatus } from '../schemas/order.schema';

const ESTADOS: OrderStatus[] = [
  'PENDING',
  'IN_PREPARATION',
  'READY',
  'DELIVERED',
  'COMPLETED',
];

export class UpdateStatusDto {
  @IsIn(ESTADOS, { message: 'Estado de orden inválido' })
  status: OrderStatus;
}