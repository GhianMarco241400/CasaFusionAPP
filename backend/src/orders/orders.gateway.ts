// backend/src/orders/orders.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OrderDocument } from './schemas/order.schema';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  emitOrderCreated(order: OrderDocument) {
    this.server.emit('order:created', order);
  }

  emitOrderUpdated(order: OrderDocument) {
    this.server.emit('order:updated', order);
  }

  emitOrderDeleted(orderId: string) {
    this.server.emit('order:deleted', { orderId });
  }
}