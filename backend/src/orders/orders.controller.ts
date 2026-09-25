// backend/src/orders/orders.controller.ts
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderItemsDto } from './dto/update-order-items.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateUrgenteDto } from './dto/update-urgente.dto';
import { JwtAuthGuard, JwtUser } from '../auth/guards/jwt-auth.guard';

function verificarRol(user: JwtUser, rolesPermitidos: string[]) {
  if (!rolesPermitidos.includes(user.role)) {
    throw new ForbiddenException('No tienes permisos para esta acción');
  }
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private ordersGateway: OrdersGateway,
  ) {}

  @Post()
  async create(@Request() req: { user: JwtUser }, @Body() dto: CreateOrderDto) {
    verificarRol(req.user, ['mesero', 'delivery', 'admin']);
    const orden = await this.ordersService.create(req.user.userId, dto);
    this.ordersGateway.emitOrderCreated(orden);
    return orden;
  }

  @Get()
  findAll() {
    return this.ordersService.findAllActive();
  }

  @Get('table/:numero')
  findByTable(@Param('numero', ParseIntPipe) numero: number) {
    return this.ordersService.findByTable(numero);
  }

  @Patch(':id/items')
  async updateItems(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemsDto,
  ) {
    verificarRol(req.user, ['mesero', 'delivery', 'admin']);
    const owner =
      req.user.role === 'delivery' ? req.user.userId : undefined;
    const orden = await this.ordersService.updateItems(id, dto.items, owner);
    this.ordersGateway.emitOrderUpdated(orden);
    return orden;
  }

  @Delete(':id')
  async remove(@Request() req: { user: JwtUser }, @Param('id') id: string) {
    verificarRol(req.user, ['mesero', 'delivery', 'admin', 'cocina']);
    const owner =
      req.user.role === 'delivery' ? req.user.userId : undefined;
    const res = await this.ordersService.remove(id, owner);
    this.ordersGateway.emitOrderDeleted(id);
    return res;
  }

  @Patch(':id/urgente')
  async updateUrgente(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateUrgenteDto,
  ) {
    verificarRol(req.user, ['mesero', 'delivery']);
    const orden = await this.ordersService.setUrgente(id, dto.urgente);
    this.ordersGateway.emitOrderUpdated(orden);
    return orden;
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    verificarRol(req.user, ['cocina', 'admin']);
    const orden = await this.ordersService.updateStatus(id, dto.status);
    this.ordersGateway.emitOrderUpdated(orden);
    return orden;
  }
}