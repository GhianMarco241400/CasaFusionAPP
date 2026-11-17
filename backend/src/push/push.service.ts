// backend/src/push/push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderCanal, OrderDocument } from '../orders/schemas/order.schema';
import { UsersService } from '../users/users.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CANAL_NUEVAS = 'comandas_nuevas';
const CANAL_EDITADAS = 'comandas_editadas';

type TipoComanda = 'nueva' | 'editada';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: string;
  priority: 'high';
  ttl: number;
  tag: string;
  channelId: string;
  data: {
    tipo: TipoComanda;
    orderId: string;
    canal: OrderCanal;
    tableNumber: number;
    url: string;
  };
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async enviarComandaNueva(orden: OrderDocument): Promise<void> {
    await this.enviar(orden, 'nueva');
  }

  async enviarComandaEditada(orden: OrderDocument): Promise<void> {
    await this.enviar(orden, 'editada');
  }

  private async enviar(orden: OrderDocument, tipo: TipoComanda): Promise<void> {
    try {
      const tokens = await this.usersService.findPushTokensByRole('cocina');
      if (tokens.length === 0) return;

      const canal =
        tipo === 'nueva'
          ? { id: CANAL_NUEVAS, sonido: 'comanda_nueva.wav' }
          : { id: CANAL_EDITADAS, sonido: 'comanda_editada.wav' };

      const messages: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        title: tipo === 'nueva' ? 'Nueva comanda' : 'Comanda editada',
        body: this.construirCuerpo(orden, tipo),
        sound: canal.sonido,
        priority: 'high',
        ttl: 600,
        tag: orden._id.toString(),
        channelId: canal.id,
        data: {
          tipo,
          orderId: orden._id.toString(),
          canal: orden.canal,
          tableNumber: orden.tableNumber,
          url: '/cocina',
        },
      }));

      for (let i = 0; i < messages.length; i += 100) {
        await this.enviarLote(messages.slice(i, i + 100));
      }
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la notificación push (${tipo})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private construirCuerpo(orden: OrderDocument, tipo: TipoComanda): string {
    if (tipo === 'nueva') {
      if (orden.canal === 'mesa') return `Mesa ${orden.tableNumber}`;
      const etiqueta = orden.canal === 'delivery' ? 'Delivery' : 'Apartado';
      return `${etiqueta} · ${orden.clienteNombre ?? 'Cliente'}`;
    }

    if (orden.canal === 'mesa') return `Cambios en mesa ${orden.tableNumber}`;
    const etiqueta = orden.canal === 'delivery' ? 'delivery' : 'apartado';
    return `Cambios en ${etiqueta} · ${orden.clienteNombre ?? 'Cliente'}`;
  }

  private async enviarLote(messages: ExpoPushMessage[]): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };

    const accessToken = this.configService.get<string>('EXPO_ACCESS_TOKEN');
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      this.logger.error(
        `Expo Push respondió ${response.status}: ${await response.text()}`,
      );
      return;
    }

    const payload = (await response.json()) as ExpoPushResponse;
    await this.eliminarTokensInvalidos(messages, payload.data ?? []);
  }

  private async eliminarTokensInvalidos(
    messages: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
  ): Promise<void> {
    const tokensInvalidos = tickets
      .map((ticket, index) =>
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
          ? messages[index]?.to
          : undefined,
      )
      .filter((token): token is string => Boolean(token));

    await Promise.all(
      tokensInvalidos.map((token) =>
        this.usersService.removePushTokenByToken(token),
      ),
    );
  }
}
