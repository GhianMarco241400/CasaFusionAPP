// backend/src/orders/orders.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderItem, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  private itemTotal(item: OrderItem): number {
    return (
      item.unitPrice * item.quantity +
      (item.entrada?.price ?? 0) +
      (item.entradaPersonalizada?.price ?? 0) +
      (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0)
    );
  }

  async create(waiterId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    const total = dto.items.reduce((acc, item) => acc + this.itemTotal(item), 0);

    const nuevaOrden = await this.orderModel.create({
      tableNumber: dto.tableNumber,
      canal: dto.canal ?? (dto.tableNumber === 0 ? 'apartado' : 'mesa'),
      waiterId,
      clienteNombre: dto.clienteNombre ?? null,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      status: 'PENDING',
      items: dto.items,
      total,
    });

    return nuevaOrden;
  }

  async findAllActive(): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ status: { $nin: ['DELIVERED', 'COMPLETED'] } })
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByTable(tableNumber: number): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ tableNumber, status: { $nin: ['DELIVERED', 'COMPLETED'] } })
      .sort({ createdAt: 1 })
      .exec();
  }

  async updateItems(
    id: string,
    items: OrderItem[],
    ownerUserId?: string,
  ): Promise<OrderDocument> {
    const orden = await this.orderModel.findById(id).exec();

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (ownerUserId && orden.waiterId !== ownerUserId) {
      throw new ForbiddenException('Solo puedes modificar tus propios pedidos');
    }

    if (orden.status !== 'PENDING') {
      throw new ConflictException('La comanda ya está en preparación');
    }

    const total = items.reduce((acc, item) => acc + this.itemTotal(item), 0);

    orden.items = items;
    orden.total = total;
    orden.edited = true;
    await orden.save();

    return orden;
  }

  async remove(id: string, ownerUserId?: string): Promise<{ deleted: boolean }> {
    const orden = await this.orderModel.findById(id).exec();

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (ownerUserId && orden.waiterId !== ownerUserId) {
      throw new ForbiddenException('Solo puedes eliminar tus propios pedidos');
    }

    if (orden.status !== 'PENDING' && orden.status !== 'IN_PREPARATION') {
      throw new ConflictException('Solo se pueden eliminar comandas en curso');
    }

    await this.orderModel.deleteOne({ _id: id }).exec();
    return { deleted: true };
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderDocument> {
    const orden = await this.orderModel.findByIdAndUpdate(
      id,
      { status, edited: false },
      { returnDocument: 'after' }
    );

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    return orden;
  }
}