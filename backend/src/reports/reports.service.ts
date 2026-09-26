// backend/src/reports/reports.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderItem,
  PagoEstado,
  MetodoPago,
} from '../orders/schemas/order.schema';
import { OrdersGateway } from '../orders/orders.gateway';
import { Dish, DishDocument } from '../menu/schemas/dish.schema';
import { Category, CategoryDocument } from '../menu/schemas/category.schema';
import { Entrada, EntradaDocument } from '../menu/schemas/entrada.schema';
import {
  DailyReport,
  DailyReportDocument,
  ItemTotal,
  Sale,
} from './schemas/daily-report.schema';
import {
  CobroAjeno,
  CuadernoEntrada,
  CuadernoEntradaDocument,
} from './schemas/cuaderno.schema';
import { Aviso, AvisoDocument } from './schemas/aviso.schema';
import { ReporteXlsxService } from './excel/reporte-xlsx.service';
import { totalItem, totalesDe } from './reporte-totales';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Mongo responde con codigo 11000 cuando un indice unico (date) colisiona.
// En el upsert del reporte diario significa que otro cobro se adelanto.
function esClaveDuplicada(error: unknown): boolean {
  const codigo = (error as { code?: number } | null)?.code;
  return codigo === 11000 || codigo === 11001;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(DailyReport.name)
    private reportModel: Model<DailyReportDocument>,
    @InjectModel(Dish.name) private dishModel: Model<DishDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Entrada.name) private entradaModel: Model<EntradaDocument>,
    @InjectModel(CuadernoEntrada.name)
    private cuadernoModel: Model<CuadernoEntradaDocument>,
    @InjectModel(Aviso.name) private avisoModel: Model<AvisoDocument>,
    private ordersGateway: OrdersGateway,
    private reporteXlsx: ReporteXlsxService,
  ) {}

  claveHoy(): string {
    const tz = process.env.TZ_REPORTES ?? 'America/Lima';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private fechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  async completeTable(
    tableNumber: number,
    metodoPago: MetodoPago,
  ): Promise<{ report: DailyReportDocument; orders: OrderDocument[] }> {
    const ordenes = await this.orderModel
      .find({ tableNumber, status: { $nin: ['DELIVERED', 'COMPLETED'] } })
      .sort({ createdAt: 1 })
      .exec();

    if (ordenes.length === 0) {
      throw new NotFoundException('No hay comandas activas en esta mesa');
    }

    if (ordenes.some((o) => o.status !== 'READY')) {
      throw new ConflictException(
        'Hay comandas aún en preparación o pendientes',
      );
    }

    for (const orden of ordenes) {
      orden.status = 'COMPLETED';
      orden.edited = false;
      orden.metodoPago = metodoPago;
      await orden.save();
    }

    const venta: Sale = {
      tableNumber,
      waiterId: ordenes[0].waiterId,
      completedAt: new Date().toISOString(),
      total: ordenes.reduce((acc, o) => acc + o.total, 0),
      canal: tableNumber === 0 ? 'apartado' : 'mesa',
      metodoPago,
      orders: ordenes.map((o) => ({
        orderId: o._id.toString(),
        edited: o.edited ?? false,
        items: o.items,
        total: o.total,
      })),
    };

    const reporte = await this.registrarVenta(venta);

    for (const orden of ordenes) {
      this.ordersGateway.emitOrderUpdated(orden);
    }

    return { report: reporte, orders: ordenes };
  }

  async completeOrder(
    orderId: string,
    metodoPago: MetodoPago,
  ): Promise<{ report: DailyReportDocument; order: OrderDocument }> {
    const orden = await this.orderModel.findById(orderId).exec();

    if (!orden) {
      throw new NotFoundException('Comanda no encontrada');
    }

    if (orden.status !== 'READY') {
      throw new ConflictException('La comanda aún no está lista');
    }

    orden.status = 'COMPLETED';
    orden.edited = false;
    orden.metodoPago = metodoPago;
    await orden.save();

    const venta: Sale = {
      tableNumber: orden.tableNumber,
      waiterId: orden.waiterId,
      completedAt: new Date().toISOString(),
      total: orden.total,
      canal: orden.tableNumber === 0 ? 'apartado' : 'mesa',
      metodoPago,
      orders: [
        {
          orderId: orden._id.toString(),
          edited: orden.edited ?? false,
          items: orden.items,
          total: orden.total,
        },
      ],
    };

    const reporte = await this.registrarVenta(venta);
    this.ordersGateway.emitOrderUpdated(orden);

    return { report: reporte, order: orden };
  }

  async completeOrderDelivery(
    orderId: string,
    pagoEstado: PagoEstado,
    metodoPago?: MetodoPago,
  ): Promise<{ report: DailyReportDocument | null; order: OrderDocument }> {
    const orden = await this.orderModel.findById(orderId).exec();

    if (!orden) {
      throw new NotFoundException('Comanda no encontrada');
    }

    if (orden.canal !== 'delivery') {
      throw new BadRequestException('La comanda no es un pedido de delivery');
    }

    if (orden.status !== 'READY') {
      throw new ConflictException('La comanda aún no está lista');
    }

    if (pagoEstado === 'PENDIENTE' && metodoPago) {
      throw new BadRequestException(
        'Un pedido por cobrar no lleva método de pago',
      );
    }

    orden.status = 'DELIVERED';
    orden.edited = false;
    orden.pagoEstado = pagoEstado;
    orden.metodoPago = pagoEstado === 'PAGADO' ? (metodoPago ?? null) : null;
    await orden.save();

    let reporte: DailyReportDocument | null = null;

    if (pagoEstado === 'PAGADO') {
      const venta: Sale = {
        tableNumber: 0,
        waiterId: orden.waiterId,
        completedAt: new Date().toISOString(),
        total: orden.total,
        canal: 'delivery',
        pagoEstado,
        metodoPago: orden.metodoPago,
        orders: [
          {
            orderId: orden._id.toString(),
            edited: orden.edited ?? false,
            items: orden.items,
            total: orden.total,
          },
        ],
      };
      reporte = await this.registrarVenta(venta);
    }

    this.ordersGateway.emitOrderUpdated(orden);

    if (pagoEstado === 'PENDIENTE') {
      await this.cuadernoModel.create({
        tipo: 'FIADO',
        fechaEntrega: this.claveHoy(),
        monto: orden.total,
        clienteNombre: orden.clienteNombre ?? null,
        telefono: orden.telefono ?? null,
        canal: 'delivery',
        orderId: orden._id.toString(),
        estado: 'ABIERTO',
        creadoPor: orden.waiterId,
      });
      await this.avisoModel.create({
        tipo: 'FIADO',
        desc: `Nuevo fiado por cobrar: S/ ${orden.total.toFixed(2)} · ${
          orden.clienteNombre ?? 'cliente'
        }`,
        monto: orden.total,
        entidadId: orden._id.toString(),
      });
    }

    return { report: reporte ?? null, order: orden };
  }

  async getByDate(
    date: string,
  ): Promise<(DailyReportDocument & { cobrosAjenos: CobroAjeno[] }) | null> {
    if (!FECHA_REGEX.test(date)) {
      throw new BadRequestException('Fecha inválida. Usa formato YYYY-MM-DD');
    }
    const reporte = await this.reportModel.findOne({ date }).exec();
    if (!reporte) {
      return null;
    }
    const cobros = await this.cuadernoModel
      .find({ tipo: 'COBRO', cobradoFecha: date })
      .exec();
    const cobrosAjenos: CobroAjeno[] = cobros
      .filter((e) => e.fechaEntrega && e.fechaEntrega !== date)
      .map((e) => ({
        monto: e.monto,
        metodoPago: e.cobradoMetodo ?? null,
        clienteNombre: e.clienteNombre ?? null,
        fechaEntrega: e.fechaEntrega,
        orderId: e.orderId ?? null,
        cobradoEn: e.cobradoEn ?? null,
      }));
    // Los fiados abiertos ya no viven en el reporte: viven en el cuaderno
    // hasta que el admin confirme el cobro. Por eso "por cobrar" se arma
    // desde ahi y no desde las ventas del dia.
    const [monto, num] = await Promise.all([
      this.cuadernoModel
        .aggregate<{ total: number }>([
          {
            $match: {
              tipo: 'FIADO',
              estado: 'ABIERTO',
              fechaEntrega: date,
            },
          },
          { $group: { _id: null, total: { $sum: '$monto' } } },
        ])
        .exec(),
      this.cuadernoModel
        .countDocuments({
          tipo: 'FIADO',
          estado: 'ABIERTO',
          fechaEntrega: date,
        })
        .exec(),
    ]);
    return {
      ...reporte.toObject(),
      totalPendiente: monto[0]?.total ?? 0,
      numPendientes: num,
      cobrosAjenos,
    } as unknown as DailyReportDocument & {
      cobrosAjenos: CobroAjeno[];
    };
  }

  async sumarioSemana(): Promise<{
    dias: {
      date: string;
      total: number;
      mesa: number;
      delivery: number;
      ranking: ItemTotal[];
    }[];
    rankingSemana: ItemTotal[];
  }> {
    const [anio, mes, dia] = this.claveHoy().split('-').map(Number);
    const hoy = new Date(Date.UTC(anio, mes - 1, dia, 12));
    const desdeLunes = (hoy.getUTCDay() + 6) % 7;

    const fechas: string[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(Date.UTC(anio, mes - 1, dia - desdeLunes + i, 12));
      const y = fecha.getUTCFullYear();
      const m = `${fecha.getUTCMonth() + 1}`.padStart(2, '0');
      const d = `${fecha.getUTCDate()}`.padStart(2, '0');
      fechas.push(`${y}-${m}-${d}`);
    }

    const reportes = await this.reportModel
      .find({ date: { $in: fechas } })
      .exec();
    const porFecha = new Map(reportes.map((r) => [r.date, r]));

    const acumulado = new Map<string, ItemTotal>();
    const dias = fechas.map((date) => {
      const reporte = porFecha.get(date);
      if (!reporte) {
        return { date, total: 0, mesa: 0, delivery: 0, ranking: [] };
      }

      let total = 0;
      let mesa = 0;
      let delivery = 0;
      for (const venta of reporte.sales ?? []) {
        if (venta.pagoEstado === 'PENDIENTE') continue;
        total += venta.total;
        if (venta.canal === 'delivery') delivery += venta.total;
        else mesa += venta.total;
      }
      for (const ingreso of reporte.ingresosManuales ?? []) {
        total += ingreso.monto;
        if (ingreso.canal === 'delivery') delivery += ingreso.monto;
        else mesa += ingreso.monto;
      }

      for (const item of reporte.itemsTotales ?? []) {
        const previo = acumulado.get(item.name) ?? {
          name: item.name,
          quantity: 0,
          total: 0,
        };
        previo.quantity += item.quantity;
        previo.total += item.total;
        acumulado.set(item.name, previo);
      }

      return {
        date,
        total,
        mesa,
        delivery,
        ranking: (reporte.itemsTotales ?? []).slice(0, 5),
      };
    });

    const rankingSemana = Array.from(acumulado.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { dias, rankingSemana };
  }

  async getMisComandas(userId: string, esAdmin = false): Promise<Sale[]> {
    const reporte = await this.reportModel
      .findOne({ date: this.claveHoy() })
      .exec();

    if (!reporte) {
      return [];
    }

    // El admin revisa todo el local; el mesero solo lo suyo. Los fiados
    // pendientes no son cobros reales y quedan fuera en ambos casos.
    const ventas = (reporte.sales ?? [])
      .filter(
        (venta) =>
          venta.pagoEstado !== 'PENDIENTE' &&
          (esAdmin || venta.waiterId === userId),
      )
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

    return ventas;
  }

  async exportarXlsx(
    date: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    if (!FECHA_REGEX.test(date)) {
      throw new BadRequestException('Fecha inválida. Usa formato YYYY-MM-DD');
    }

    const [reporte, dishes, categorias, entradas, cobros, montoPendiente] =
      await Promise.all([
        this.reportModel.findOne({ date }).exec(),
        this.dishModel
          .find({ active: { $ne: false } })
          .sort({ name: 1 })
          .exec(),
        this.categoryModel.find({ active: true }).sort({ name: 1 }).exec(),
        this.entradaModel
          .find({ active: { $ne: false } })
          .sort({ name: 1 })
          .exec(),
        this.cuadernoModel.find({ tipo: 'COBRO', cobradoFecha: date }).exec(),
        this.cuadernoModel
          .aggregate<{ total: number }>([
            {
              $match: { tipo: 'FIADO', estado: 'ABIERTO', fechaEntrega: date },
            },
            { $group: { _id: null, total: { $sum: '$monto' } } },
          ])
          .exec(),
      ]);

    const cobrosAjenos: CobroAjeno[] = cobros
      .filter((e) => e.fechaEntrega && e.fechaEntrega !== date)
      .map((e) => ({
        monto: e.monto,
        metodoPago: e.cobradoMetodo ?? null,
        clienteNombre: e.clienteNombre ?? null,
        fechaEntrega: e.fechaEntrega,
        orderId: e.orderId ?? null,
        cobradoEn: e.cobradoEn ?? null,
      }));

    const buffer = await this.reporteXlsx.generar({
      date,
      ventas: reporte?.sales ?? [],
      ingresosManuales: reporte?.ingresosManuales ?? [],
      cobrosAjenos,
      totalPendiente: montoPendiente[0]?.total ?? 0,
      platos: dishes.map((d) => ({
        name: d.name,
        price: d.price,
        categoryId: d.categoryId ? d.categoryId.toString() : null,
      })),
      categorias: categorias.map((c) => ({
        id: c._id.toString(),
        name: c.name,
      })),
      entradas: entradas.map((e) => ({ name: e.name, price: e.price })),
    });

    return { buffer, filename: `reporte-${date}.xlsx` };
  }

  /**
   * Lectura pura: que ventas contienen al pedido y que comandas comparten ese
   * cobro. Existe para poder validar el fiado ANTES de borrar la venta; si se
   * purgara primero y despues se descubriera que el fiado ya estaba cobrado,
   * el reporte quedaria sin la venta y el cuaderno con el cobro.
   */
  private async ventasQueContienen(orderId: string): Promise<{
    ventas: Sale[];
    ordenesIds: string[];
  }> {
    const reportes = await this.reportModel
      .find({ 'sales.orders.orderId': orderId })
      .sort({ date: -1 })
      .exec();

    const ventas: Sale[] = [];
    const ordenesIds = new Set<string>();

    for (const reporte of reportes) {
      for (const venta of reporte.sales ?? []) {
        if (!(venta.orders ?? []).some((o) => o.orderId === orderId)) {
          continue;
        }
        ventas.push(venta);
        for (const o of venta.orders ?? []) {
          ordenesIds.add(o.orderId);
        }
      }
    }

    return { ventas, ordenesIds: Array.from(ordenesIds) };
  }

  /**
   * Quita la venta que contiene al pedido de TODOS los reportes donde
   * aparezca, no solo del mas reciente. asi una venta duplicada de origen no
   * sobreviva en el reporte de un dia anterior.
   */
  private async purgarVentaDeReportes(orderId: string): Promise<{
    reportes: DailyReportDocument[];
    ordenesIds: string[];
  }> {
    const reportes = await this.reportModel
      .find({ 'sales.orders.orderId': orderId })
      .sort({ date: -1 })
      .exec();

    const tocados: DailyReportDocument[] = [];
    const ordenesIds = new Set<string>();

    for (const reporte of reportes) {
      const ventas = reporte.sales ?? [];
      const ventaRevertida = ventas.find((s) =>
        (s.orders ?? []).some((o) => o.orderId === orderId),
      );
      if (!ventaRevertida) {
        continue;
      }
      // Solo las ordenes de la venta que se revierte. Las demas ventas del dia
      // (otras mesas) deben quedarse intactas.
      for (const o of ventaRevertida.orders ?? []) {
        ordenesIds.add(o.orderId);
      }
      reporte.sales = ventas.filter((s) => s !== ventaRevertida);
      reporte.markModified('sales');
      this.recalcular(reporte);
      await reporte.save();
      tocados.push(reporte);
    }

    return { reportes: tocados, ordenesIds: Array.from(ordenesIds) };
  }

  /**
   * Revierte un cobro de mesa, para llevar o delivery. Devuelve las comandas a
   * cocina o a listo para cobrar, saca la venta del reporte del dia, anula el
   * fiado que abrio un cobro por cobrar y deja aviso de quien lo hizo y por que.
   */
  async reabrirCobro(
    orderId: string,
    motivo: string,
    destino: 'READY' | 'IN_PREPARATION',
    userId: string,
  ): Promise<{ orders: OrderDocument[]; reporte: DailyReportDocument | null }> {
    const orden = await this.orderModel.findById(orderId).exec();

    if (!orden) {
      throw new NotFoundException('Comanda no encontrada');
    }

    const esDelivery = orden.canal === 'delivery';
    const estadoCobrado = esDelivery ? 'DELIVERED' : 'COMPLETED';
    if (orden.status !== estadoCobrado) {
      throw new ConflictException('Esta comanda no está cobrada');
    }

    // Solo lectura: todavia no se toca nada del reporte.
    const { ordenesIds } = await this.ventasQueContienen(orderId);

    // Si el cobro por cobrar ya se pago despues, el dinero esta en el cuaderno
    // como COBRO. Revertir la venta aqui dejaria reporte y cuaderno
    // descuadrados, asi que se frena y lo resuelve el admin desde el cuaderno.
    // Ojo: un cobro confirmado se guarda con tipo COBRO, no FIADO, asi que el
    // filtro va por estado.
    const fiadoCobrado = await this.cuadernoModel
      .findOne({
        orderId: { $in: ordenesIds.length ? ordenesIds : [orderId] },
        estado: 'COBRADO',
      })
      .exec();
    if (fiadoCobrado) {
      throw new ConflictException(
        'El fiado de este pedido ya fue cobrado. Pidele al admin que lo anule desde el cuaderno.',
      );
    }

    const { reportes } = await this.purgarVentaDeReportes(orderId);

    // Un delivery cobrado "por cobrar" tiene ademas una entrada ABIERTA en el
    // cuaderno. Si la venta desaparece del reporte y la deuda no, el local
    // queda debiendo plata que ya no cuenta como venta. Con el flujo nuevo el
    // fiado todavia no tiene venta en ningun reporte, asi que la deuda se
    // busca directamente en el cuaderno y no en las ventas del dia.
    const fiadoAbierto = await this.cuadernoModel
      .findOne({
        orderId: { $in: ordenesIds.length ? ordenesIds : [orderId] },
        tipo: 'FIADO',
        estado: 'ABIERTO',
      })
      .exec();
    if (fiadoAbierto) {
      await this.cuadernoModel
        .updateMany(
          {
            orderId: { $in: ordenesIds.length ? ordenesIds : [orderId] },
            tipo: 'FIADO',
            estado: 'ABIERTO',
          },
          { estado: 'ELIMINADO' },
        )
        .exec();
      await this.avisoModel
        .updateMany(
          {
            entidadId: { $in: ordenesIds.length ? ordenesIds : [orderId] },
            tipo: 'FIADO',
          },
          { leido: true, resolved: true },
        )
        .exec();
    }

    const aReabrir = ordenesIds.length
      ? await this.orderModel.find({ _id: { $in: ordenesIds } }).exec()
      : [orden];

    for (const o of aReabrir) {
      o.status = destino;
      o.metodoPago = null;
      o.pagoEstado = null;
      o.edited = false;
      o.urgente = false;
      // clienteNombre, telefono y direccion se conservan: hacen falta si el
      // pedido vuelve a salir a entrega.
      await o.save();
      this.ordersGateway.emitOrderUpdated(o);
    }

    const total = aReabrir.reduce((acc, o) => acc + o.total, 0);
    const etiqueta = esDelivery
      ? `Delivery${orden.clienteNombre ? ` · ${orden.clienteNombre}` : ''}`
      : orden.tableNumber === 0
        ? 'Pedido para llevar'
        : `Mesa ${orden.tableNumber}`;

    await this.avisoModel.create({
      tipo: 'REAPERTURA',
      desc: `Reapertura de cobro · ${etiqueta} · S/ ${total.toFixed(2)} · ${motivo}`,
      monto: total,
      entidadId: orderId,
      creadoPor: userId,
      leido: false,
      resolved: false,
    });

    return { orders: aReabrir, reporte: reportes[0] ?? null };
  }

  private itemsDeReporte(reporte: DailyReportDocument): OrderItem[] {
    return (reporte.sales ?? [])
      .flatMap((s) => s.orders ?? [])
      .flatMap((o) => o.items ?? []);
  }

  private recalcular(reporte: DailyReportDocument): void {
    const totales = totalesDe(
      reporte.sales ?? [],
      reporte.ingresosManuales ?? [],
    );
    reporte.numSales = totales.numSales;
    reporte.numComandas = totales.numComandas;
    reporte.totalIngresos = totales.totalIngresos;
    reporte.totalPendiente = totales.totalPendiente;
    reporte.numPendientes = totales.numPendientes;
    reporte.ticketPromedio = totales.ticketPromedio;
    reporte.itemsTotales = this.acumularItems(this.itemsDeReporte(reporte));
  }

  /**
   * Recalcula los agregados a partir de una relectura fresca de la base.
   * Se usa justo despues de un $push atomico: leer el documento en memoria
   * podria no ver ventas que otro cobro entro en paralelo.
   */
  private async recalcularDesdeBd(
    date: string,
  ): Promise<DailyReportDocument | null> {
    const reporte = await this.reportModel.findOne({ date }).exec();
    if (!reporte) {
      return null;
    }
    this.recalcular(reporte);
    await this.reportModel
      .updateOne(
        { _id: reporte._id },
        {
          $set: {
            numSales: reporte.numSales,
            numComandas: reporte.numComandas,
            totalIngresos: reporte.totalIngresos,
            totalPendiente: reporte.totalPendiente,
            numPendientes: reporte.numPendientes,
            ticketPromedio: reporte.ticketPromedio,
            itemsTotales: reporte.itemsTotales,
          },
        },
      )
      .exec();
    return reporte;
  }

  private async registrarVenta(
    venta: Sale,
    fecha: string = this.claveHoy(),
  ): Promise<DailyReportDocument> {
    const date = fecha;
    const ordenesIds = (venta.orders ?? [])
      .map((o) => o.orderId)
      .filter((id) => Boolean(id));

    // Un pedido no puede cobrarse dos veces: si ya esta en el reporte del dia,
    // la venta ya existe y hay que rechazar el cobro en vez de duplicarlo.
    if (ordenesIds.length > 0) {
      const repetido = await this.reportModel
        .exists({ date, 'sales.orders.orderId': { $in: ordenesIds } })
        .exec();
      if (repetido) {
        throw new ConflictException('Este pedido ya fue cobrado');
      }
    }

    // $push atomico: el filtro vuelve imposible la carrera entre dos cobros
    // simultaneos, porque solo uno puede cumplirlo. El upsert evita que dos
    // cobros a la vez creen dos documentos para el mismo dia.
    let actualizado: DailyReportDocument | null;
    try {
      actualizado = await this.reportModel
        .findOneAndUpdate(
          {
            date,
            ...(ordenesIds.length > 0
              ? { 'sales.orders.orderId': { $nin: ordenesIds } }
              : {}),
          },
          { $push: { sales: venta } },
          { upsert: true, returnDocument: 'after' },
        )
        .exec();
    } catch (error) {
      if (esClaveDuplicada(error)) {
        throw new ConflictException('Este pedido ya fue cobrado');
      }
      throw error;
    }

    if (!actualizado) {
      throw new ConflictException('Este pedido ya fue cobrado');
    }

    const reporte = await this.recalcularDesdeBd(date);
    if (!reporte) {
      throw new NotFoundException('No se pudo guardar la venta del día');
    }
    return reporte;
  }

  private async reportePorOrderId(
    orderId: string,
  ): Promise<DailyReportDocument> {
    const reporte = await this.reportModel
      .findOne({ 'sales.orders.orderId': orderId })
      .sort({ date: -1 })
      .exec();
    if (!reporte) {
      throw new NotFoundException('No se encontró la venta del pedido');
    }
    return reporte;
  }

  private async aplicarCambioVenta(
    reporte: DailyReportDocument,
    orderId: string,
    cambio: (venta: Sale) => void,
  ): Promise<DailyReportDocument> {
    const venta = reporte.sales.find((s) =>
      s.orders.some((o) => o.orderId === orderId),
    );
    if (!venta) {
      throw new NotFoundException('La venta del pedido ya no existe');
    }
    cambio(venta);
    reporte.markModified('sales');
    this.recalcular(reporte);
    await reporte.save();
    return reporte;
  }

  async cobrarFiado(orderId: string, metodoPago: MetodoPago) {
    const orden = await this.orderModel.findById(orderId).exec();
    if (!orden) {
      throw new NotFoundException('Comanda no encontrada');
    }
    const yaCobrado = await this.cuadernoModel
      .findOne({ orderId, tipo: 'COBRO' })
      .exec();
    if (yaCobrado) {
      throw new ConflictException('Este fiado ya fue cobrado');
    }
    const entrada = await this.cuadernoModel
      .findOne({ orderId, tipo: 'FIADO', estado: 'ABIERTO' })
      .exec();
    if (!entrada) {
      throw new NotFoundException(
        'El fiado de este pedido no está registrado como pendiente en el cuaderno',
      );
    }

    const ahora = new Date().toISOString();
    const fechaRegistro = entrada.fechaEntrega;

    // Cuaderno primero: si no se puede marcar el cobro, no se toca el reporte.
    const cobro = await this.cuadernoModel
      .updateOne(
        { _id: entrada._id, tipo: 'FIADO', estado: 'ABIERTO' },
        {
          tipo: 'COBRO',
          estado: 'COBRADO',
          cobradoMetodo: metodoPago,
          cobradoEn: ahora,
          cobradoFecha: this.claveHoy(),
        },
      )
      .exec();
    if (cobro.modifiedCount !== 1) {
      throw new ConflictException('Este fiado ya fue cobrado');
    }

    // La venta se crea recien al confirmar el cobro, en el reporte del dia en
    // que se creo el fiado. registrarVenta es idempotente por orderId.
    const venta: Sale = {
      tableNumber: 0,
      waiterId: orden.waiterId,
      completedAt: ahora,
      total: orden.total,
      canal: 'delivery',
      pagoEstado: 'PAGADO',
      metodoPago,
      orders: [
        {
          orderId: orden._id.toString(),
          edited: orden.edited ?? false,
          items: orden.items,
          total: orden.total,
        },
      ],
      cobradoEn: ahora,
    };
    const reporte = await this.registrarVenta(venta, fechaRegistro);

    orden.pagoEstado = 'PAGADO';
    orden.metodoPago = metodoPago;
    await orden.save();
    this.ordersGateway.emitOrderUpdated(orden);

    await this.avisoModel
      .updateMany(
        { entidadId: orderId, tipo: 'FIADO' },
        { leido: true, resolved: true },
      )
      .exec();
    return reporte;
  }

  /**
   * Da de baja el cobro de un fiado anotado a mano: la deuda vuelve al cuaderno
   * como ABIERTO y el ingreso que se creo al cobrar sale del reporte del dia
   * en que se creo el fiado.
   */
  async revertirCobroFiadoManual(id: string) {
    const entrada = await this.cuadernoModel
      .findOneAndUpdate(
        { _id: id, tipo: 'COBRO', estado: 'COBRADO' },
        {
          $set: {
            tipo: 'FIADO',
            estado: 'ABIERTO',
            cobradoMetodo: null,
            cobradoEn: null,
            cobradoFecha: null,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!entrada) {
      throw new NotFoundException(
        'El fiado manual ya no existe o no tiene un cobro confirmado',
      );
    }

    const reporte = await this.reportModel
      .findOne({ date: entrada.fechaEntrega })
      .exec();
    if (reporte) {
      const idCuaderno = entrada._id.toString();
      reporte.ingresosManuales = (reporte.ingresosManuales ?? []).filter(
        (i) => i.cuadernoId !== idCuaderno,
      );
      reporte.markModified('ingresosManuales');
      this.recalcular(reporte);
      await reporte.save();
    }

    await this.avisoModel
      .updateMany(
        { entidadId: id, tipo: 'FIADO' },
        { leido: false, resolved: false },
      )
      .exec();

    return { entrada, reporte: reporte ?? null };
  }

  /**
   * Da de baja un cobro ya confirmado. La deuda vuelve al cuaderno como
   * ABIERTO y la venta que se creo al cobrar sale del reporte. El fiado queda
   * otra vez pendiente, con el mismo dia de entrega original.
   */
  async revertirCobroFiado(orderId: string, userId: string) {
    const orden = await this.orderModel.findById(orderId).exec();
    if (!orden) {
      throw new NotFoundException('Comanda no encontrada');
    }
    const entrada = await this.cuadernoModel
      .findOneAndUpdate(
        { orderId, tipo: 'COBRO', estado: 'COBRADO' },
        {
          $set: {
            tipo: 'FIADO',
            estado: 'ABIERTO',
            cobradoMetodo: null,
            cobradoEn: null,
            cobradoFecha: null,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!entrada) {
      throw new NotFoundException(
        'Este pedido no tiene un cobro confirmado para revertir',
      );
    }

    const { reportes } = await this.purgarVentaDeReportes(orderId);

    orden.pagoEstado = 'PENDIENTE';
    orden.metodoPago = null;
    await orden.save();
    this.ordersGateway.emitOrderUpdated(orden);

    await this.avisoModel
      .updateMany(
        { entidadId: orderId, tipo: 'FIADO' },
        { leido: false, resolved: false },
      )
      .exec();

    await this.avisoModel.create({
      tipo: 'REAPERTURA',
      desc: `Reversión de cobro confirmado · Delivery${
        orden.clienteNombre ? ` · ${orden.clienteNombre}` : ''
      } · S/ ${orden.total.toFixed(2)} · vuelve a quedar por cobrar`,
      monto: orden.total,
      entidadId: orderId,
      creadoPor: userId,
      leido: false,
      resolved: false,
    });

    return { orden, reportes };
  }

  async registroManual(input: {
    tipo: 'FIADO' | 'INGRESO';
    canal: 'mesa' | 'delivery';
    monto: number;
    metodoPago?: MetodoPago;
    concepto?: string | null;
    clienteNombre?: string | null;
    date?: string;
    creadoPor: string;
  }): Promise<{
    reporte?: DailyReportDocument;
    entrada?: CuadernoEntradaDocument;
  }> {
    if (input.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }
    if (input.tipo === 'FIADO' && !input.clienteNombre?.trim()) {
      throw new BadRequestException('Indica el cliente del fiado');
    }
    if (input.tipo === 'INGRESO') {
      const date = input.date ?? this.claveHoy();
      if (!FECHA_REGEX.test(date)) {
        throw new BadRequestException('Fecha inválida. Usa formato YYYY-MM-DD');
      }
      if (!input.metodoPago) {
        throw new BadRequestException('Indica el método de pago del ingreso');
      }
      const reporte = await this.agregarIngresoManual(date, {
        monto: input.monto,
        metodoPago: input.metodoPago,
        concepto: input.concepto ?? 'Ingreso manual',
        canal: input.canal,
        creadoPor: input.creadoPor,
      });
      return { reporte };
    }

    const entrada = await this.cuadernoModel.create({
      tipo: 'FIADO',
      fechaEntrega: this.claveHoy(),
      monto: input.monto,
      clienteNombre: input.clienteNombre ?? null,
      canal: 'manual',
      canalVenta: input.canal,
      estado: 'ABIERTO',
      creadoPor: input.creadoPor,
    });
    await this.avisoModel.create({
      tipo: 'FIADO',
      desc: `Fiado manual: S/ ${input.monto.toFixed(2)}${
        input.clienteNombre ? ` · ${input.clienteNombre}` : ''
      }`,
      monto: input.monto,
      entidadId: entrada._id.toString(),
    });
    return { entrada };
  }

  async eliminarIngresoManual(
    date: string,
    indice: number,
    userId?: string | null,
  ) {
    const reporte = await this.reportModel.findOne({ date }).exec();
    if (!reporte) {
      throw new NotFoundException('Reporte del día no encontrado');
    }
    const manuales = reporte.ingresosManuales ?? [];
    if (!Number.isInteger(indice) || indice < 0 || indice >= manuales.length) {
      throw new NotFoundException('El ingreso manual ya no existe');
    }
    const [eliminado] = manuales.splice(indice, 1);
    reporte.ingresosManuales = manuales;
    reporte.markModified('ingresosManuales');
    this.recalcular(reporte);
    await reporte.save();

    // Si el ingreso borrado era el cobro de un fiado manual, la guia de cobros
    // de hoy lo seguiria contando. Se devuelve a ABIERTO, igual que el boton
    // de reversion del cuaderno.
    const idCuaderno = eliminado?.cuadernoId;
    if (idCuaderno) {
      const entrada = await this.cuadernoModel
        .findOneAndUpdate(
          { _id: idCuaderno, tipo: 'COBRO', estado: 'COBRADO' },
          {
            $set: {
              tipo: 'FIADO',
              estado: 'ABIERTO',
              cobradoMetodo: null,
              cobradoEn: null,
              cobradoFecha: null,
            },
          },
          { returnDocument: 'after' },
        )
        .exec();
      if (entrada) {
        await this.avisoModel
          .updateMany(
            { entidadId: idCuaderno, tipo: 'FIADO' },
            { leido: false, resolved: false },
          )
          .exec();
        await this.avisoModel.create({
          tipo: 'REAPERTURA',
          desc: `Cobro deshecho al eliminar el ingreso del reporte · Fiado manual${
            entrada.clienteNombre ? ` · ${entrada.clienteNombre}` : ''
          } · S/ ${entrada.monto.toFixed(2)} · vuelve a quedar por cobrar`,
          monto: entrada.monto,
          entidadId: idCuaderno,
          creadoPor: userId ?? null,
          leido: false,
          resolved: false,
        });
      }
    }

    return reporte;
  }

  async eliminarFiado(id: string) {
    const entrada = await this.cuadernoModel
      .findOneAndUpdate(
        { _id: id, tipo: 'FIADO', estado: 'ABIERTO' },
        { $set: { estado: 'ELIMINADO' } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!entrada) {
      throw new NotFoundException('El fiado ya no existe o ya fue cobrado');
    }
    // El aviso de un fiado de delivery apunta al pedido; el de uno manual, a
    // la propia entrada del cuaderno.
    await this.avisoModel
      .updateMany(
        { entidadId: entrada.orderId ?? id, tipo: 'FIADO' },
        { leido: true, resolved: true },
      )
      .exec();
    return entrada;
  }

  private async agregarIngresoManual(
    date: string,
    datos: {
      monto: number;
      metodoPago: MetodoPago;
      concepto: string;
      canal: 'mesa' | 'delivery';
      creadoPor: string;
      cuadernoId?: string | null;
    },
  ): Promise<DailyReportDocument> {
    let reporte = await this.reportModel.findOne({ date }).exec();
    if (!reporte) {
      reporte = await this.reportModel.create({
        date,
        sales: [],
        ingresosManuales: [],
      });
    }
    reporte.ingresosManuales = [
      ...(reporte.ingresosManuales ?? []),
      {
        monto: datos.monto,
        metodoPago: datos.metodoPago,
        concepto: datos.concepto,
        registradoEn: new Date().toISOString(),
        creadoPor: datos.creadoPor,
        canal: datos.canal,
        cuadernoId: datos.cuadernoId ?? null,
      },
    ];
    this.recalcular(reporte);
    await reporte.save();
    return reporte;
  }

  async cobrarFiadoManual(id: string, metodoPago: MetodoPago) {
    const ahora = new Date().toISOString();
    const hoy = this.claveHoy();
    const entrada = await this.cuadernoModel
      .findOneAndUpdate(
        { _id: id, tipo: 'FIADO', estado: 'ABIERTO' },
        {
          $set: {
            tipo: 'COBRO',
            estado: 'COBRADO',
            cobradoMetodo: metodoPago,
            cobradoEn: ahora,
            cobradoFecha: hoy,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!entrada) {
      throw new NotFoundException('Registro no encontrado o ya cobrado');
    }
    // El ingreso se contabiliza el dia en que se creo el fiado, no el dia del
    // cobro. Si coincide con hoy es un ingreso normal; si no, ese dia queda
    // saldado y hoy solo aparece como referencia en "cobrosAjenos".
    const recibido =
      entrada.fechaEntrega === hoy
        ? ''
        : ` · recibido el ${this.fechaCorta(hoy)}`;
    await this.agregarIngresoManual(entrada.fechaEntrega, {
      monto: entrada.monto,
      metodoPago,
      concepto: `Fiado manual cobrado${
        entrada.clienteNombre ? ` · ${entrada.clienteNombre}` : ''
      }${recibido}`,
      canal: entrada.canalVenta ?? 'mesa',
      creadoPor: 'admin',
      cuadernoId: entrada._id.toString(),
    });
    await this.avisoModel
      .updateMany(
        { entidadId: id, tipo: 'FIADO' },
        { leido: true, resolved: true },
      )
      .exec();
    return entrada;
  }

  async getCuaderno() {
    const [fiados, cobrosHoy] = await Promise.all([
      this.cuadernoModel
        .find({ tipo: 'FIADO', estado: 'ABIERTO' })
        .sort({ createdAt: 1 })
        .exec(),
      this.cuadernoModel
        .find({ tipo: 'COBRO', cobradoFecha: this.claveHoy() })
        .sort({ cobradoEn: 1 })
        .exec(),
    ]);
    return {
      date: this.claveHoy(),
      resumen: {
        numFiados: fiados.length,
        fiadosPorCobrar: fiados.reduce((a, e) => a + e.monto, 0),
        numCobrosHoy: cobrosHoy.length,
        cobrosHoy: cobrosHoy.reduce((a, e) => a + e.monto, 0),
      },
      fiados,
      cobrosHoy,
    };
  }

  async getAvisos() {
    const list = await this.avisoModel
      .find()
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
    const unreadCount = await this.avisoModel
      .countDocuments({ leido: false, resolved: false })
      .exec();
    return { list, unreadCount };
  }

  async marcarAvisosLeidos() {
    const res = await this.avisoModel
      .updateMany({ leido: false }, { leido: true })
      .exec();
    return { modificados: res.modifiedCount };
  }

  async eliminarAviso(id: string) {
    const res = await this.avisoModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('Aviso no encontrado');
    }
    return { eliminado: true };
  }

  async reportarError(desc: string) {
    return this.avisoModel.create({
      tipo: 'ERROR',
      desc,
      leido: false,
      resolved: false,
    });
  }

  async eliminarComanda(
    orderId: string,
    userId?: string | null,
  ): Promise<DailyReportDocument> {
    const reporte = await this.reportePorOrderId(orderId);
    const indiceVenta = reporte.sales.findIndex((s) =>
      s.orders.some((o) => o.orderId === orderId),
    );
    if (indiceVenta === -1) {
      throw new NotFoundException('La venta del pedido ya no existe');
    }
    const venta = reporte.sales[indiceVenta];
    const comanda = venta.orders.find((o) => o.orderId === orderId);
    if (!comanda) {
      throw new NotFoundException('La comanda ya no existe');
    }

    venta.orders = venta.orders.filter((o) => o.orderId !== orderId);
    if (venta.orders.length === 0) {
      reporte.sales.splice(indiceVenta, 1);
    } else {
      venta.total = venta.orders.reduce((acc, o) => acc + o.total, 0);
    }
    reporte.markModified('sales');
    this.recalcular(reporte);
    await reporte.save();

    // El cuaderno manda: si la orden removida tenia un fiado, hay que
    // devolverlo a su estado coherente o la guia de cobros de hoy contaria
    // plata que el reporte ya no tiene.
    const entrada = await this.cuadernoModel.findOne({ orderId }).exec();
    if (entrada) {
      if (entrada.estado === 'COBRADO') {
        // Se borro un cobro confirmado: la deuda vuelve a estar por cobrar.
        await this.cuadernoModel
          .updateOne(
            { _id: entrada._id, tipo: 'COBRO', estado: 'COBRADO' },
            {
              $set: {
                tipo: 'FIADO',
                estado: 'ABIERTO',
                cobradoMetodo: null,
                cobradoEn: null,
                cobradoFecha: null,
              },
            },
          )
          .exec();
        const orden = await this.orderModel.findById(orderId).exec();
        if (orden) {
          orden.pagoEstado = 'PENDIENTE';
          orden.metodoPago = null;
          await orden.save();
          this.ordersGateway.emitOrderUpdated(orden);
        }
        await this.avisoModel
          .updateMany(
            { entidadId: orderId, tipo: 'FIADO' },
            { leido: false, resolved: false },
          )
          .exec();
        await this.avisoModel.create({
          tipo: 'REAPERTURA',
          desc: `Cobro deshecho al eliminar la comanda del reporte · Delivery${
            entrada.clienteNombre ? ` · ${entrada.clienteNombre}` : ''
          } · S/ ${entrada.monto.toFixed(2)} · vuelve a quedar por cobrar`,
          monto: entrada.monto,
          entidadId: orderId,
          creadoPor: userId ?? null,
          leido: false,
          resolved: false,
        });
      } else if (entrada.estado === 'ABIERTO') {
        // El fiado nunca se cobro: la comanda desaparece, la deuda tambien.
        await this.cuadernoModel
          .updateOne(
            { _id: entrada._id, tipo: 'FIADO', estado: 'ABIERTO' },
            { estado: 'ELIMINADO' },
          )
          .exec();
        await this.avisoModel
          .updateMany(
            { entidadId: orderId, tipo: 'FIADO' },
            { leido: true, resolved: true },
          )
          .exec();
      }
    }

    return reporte;
  }

  private acumularItems(items: OrderItem[]): ItemTotal[] {
    const mapa = new Map<string, ItemTotal>();
    for (const item of items) {
      const actual = mapa.get(item.name) ?? {
        name: item.name,
        quantity: 0,
        total: 0,
      };
      actual.quantity += item.quantity;
      actual.total += totalItem(item);
      mapa.set(item.name, actual);
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }
}
