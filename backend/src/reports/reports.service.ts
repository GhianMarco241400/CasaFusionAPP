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
  ): Promise<{ report: DailyReportDocument; order: OrderDocument }> {
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

    const reporte = await this.registrarVenta(venta);
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

    return { report: reporte, order: orden };
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
    return {
      ...reporte.toObject(),
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

  async getMisComandas(userId: string): Promise<Sale[]> {
    const reporte = await this.reportModel
      .findOne({ date: this.claveHoy() })
      .exec();

    if (!reporte) {
      return [];
    }

    const ventas = (reporte.sales ?? [])
      .filter(
        (venta) =>
          venta.waiterId === userId && venta.pagoEstado !== 'PENDIENTE',
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

    const [reporte, dishes, categorias, entradas, cobros] = await Promise.all([
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

  private async registrarVenta(venta: Sale): Promise<DailyReportDocument> {
    const date = this.claveHoy();
    const existente = await this.reportModel.findOne({ date }).exec();

    if (!existente) {
      const totales = totalesDe([venta]);
      return this.reportModel.create({
        date,
        sales: [venta],
        numSales: totales.numSales,
        numComandas: totales.numComandas,
        totalIngresos: totales.totalIngresos,
        totalPendiente: totales.totalPendiente,
        numPendientes: totales.numPendientes,
        ticketPromedio: totales.ticketPromedio,
        itemsTotales: this.acumularItems(venta.orders.flatMap((o) => o.items)),
      });
    }

    existente.sales = [...existente.sales, venta];
    const totales = totalesDe(existente.sales, existente.ingresosManuales);
    existente.numSales = totales.numSales;
    existente.numComandas = totales.numComandas;
    existente.totalIngresos = totales.totalIngresos;
    existente.totalPendiente = totales.totalPendiente;
    existente.numPendientes = totales.numPendientes;
    existente.ticketPromedio = totales.ticketPromedio;
    existente.itemsTotales = this.acumularItems(
      existente.sales.flatMap((s) => s.orders).flatMap((o) => o.items),
    );
    await existente.save();
    return existente;
  }

  private async reportePorOrderId(
    orderId: string,
  ): Promise<DailyReportDocument> {
    const reporte = await this.reportModel
      .findOne({ 'sales.orders.orderId': orderId })
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
    const totales = totalesDe(reporte.sales, reporte.ingresosManuales);
    reporte.numSales = totales.numSales;
    reporte.numComandas = totales.numComandas;
    reporte.totalIngresos = totales.totalIngresos;
    reporte.totalPendiente = totales.totalPendiente;
    reporte.numPendientes = totales.numPendientes;
    reporte.ticketPromedio = totales.ticketPromedio;
    await reporte.save();
    return reporte;
  }

  async cobrarFiado(orderId: string, metodoPago: MetodoPago) {
    const reporte = await this.reportePorOrderId(orderId);
    const venta = reporte.sales.find((s) =>
      s.orders.some((o) => o.orderId === orderId),
    );
    if (!venta || venta.pagoEstado !== 'PENDIENTE') {
      throw new ConflictException(
        'Este pedido ya no está pendiente por cobrar',
      );
    }
    const yaCobrado = await this.cuadernoModel
      .exists({ orderId, tipo: 'COBRO' })
      .exec();
    if (yaCobrado) {
      throw new ConflictException('Este fiado ya fue cobrado');
    }
    const ahora = new Date().toISOString();
    await this.aplicarCambioVenta(reporte, orderId, (v) => {
      v.pagoEstado = 'PAGADO';
      v.metodoPago = metodoPago;
      v.cobradoEn = ahora;
    });
    const orden = await this.orderModel.findById(orderId).exec();
    if (orden) {
      orden.pagoEstado = 'PAGADO';
      orden.metodoPago = metodoPago;
      await orden.save();
      this.ordersGateway.emitOrderUpdated(orden);
    }
    await this.cuadernoModel
      .updateOne(
        { orderId },
        {
          tipo: 'COBRO',
          estado: 'COBRADO',
          cobradoMetodo: metodoPago,
          cobradoEn: ahora,
          cobradoFecha: this.claveHoy(),
        },
      )
      .exec();
    await this.avisoModel
      .updateMany(
        { entidadId: orderId, tipo: 'FIADO' },
        { leido: true, resolved: true },
      )
      .exec();
    return reporte;
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

  async eliminarIngresoManual(date: string, indice: number) {
    const reporte = await this.reportModel.findOne({ date }).exec();
    if (!reporte) {
      throw new NotFoundException('Reporte del día no encontrado');
    }
    const manuales = reporte.ingresosManuales ?? [];
    if (!Number.isInteger(indice) || indice < 0 || indice >= manuales.length) {
      throw new NotFoundException('El ingreso manual ya no existe');
    }
    manuales.splice(indice, 1);
    reporte.ingresosManuales = manuales;
    reporte.markModified('ingresosManuales');
    const totales = totalesDe(reporte.sales, reporte.ingresosManuales);
    reporte.numSales = totales.numSales;
    reporte.numComandas = totales.numComandas;
    reporte.totalIngresos = totales.totalIngresos;
    reporte.totalPendiente = totales.totalPendiente;
    reporte.numPendientes = totales.numPendientes;
    reporte.ticketPromedio = totales.ticketPromedio;
    await reporte.save();
    return reporte;
  }

  async eliminarFiadoManual(id: string) {
    const entrada = await this.cuadernoModel
      .findOneAndUpdate(
        { _id: id, tipo: 'FIADO', estado: 'ABIERTO', orderId: null },
        { $set: { estado: 'ELIMINADO' } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!entrada) {
      throw new NotFoundException(
        'El fiado manual ya no existe o ya fue cobrado',
      );
    }
    await this.avisoModel
      .updateMany(
        { entidadId: id, tipo: 'FIADO' },
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
      },
    ];
    const totales = totalesDe(reporte.sales, reporte.ingresosManuales);
    reporte.numSales = totales.numSales;
    reporte.numComandas = totales.numComandas;
    reporte.totalIngresos = totales.totalIngresos;
    reporte.totalPendiente = totales.totalPendiente;
    reporte.numPendientes = totales.numPendientes;
    reporte.ticketPromedio = totales.ticketPromedio;
    await reporte.save();
    return reporte;
  }

  async cobrarFiadoManual(id: string, metodoPago: MetodoPago) {
    const ahora = new Date().toISOString();
    const entrada = await this.cuadernoModel
      .findOneAndUpdate(
        { _id: id, tipo: 'FIADO', estado: 'ABIERTO' },
        {
          $set: {
            estado: 'COBRADO',
            cobradoMetodo: metodoPago,
            cobradoEn: ahora,
            cobradoFecha: this.claveHoy(),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!entrada) {
      throw new NotFoundException('Registro no encontrado o ya cobrado');
    }
    await this.agregarIngresoManual(this.claveHoy(), {
      monto: entrada.monto,
      metodoPago,
      concepto: `Fiado manual cobrado${
        entrada.clienteNombre ? ` · ${entrada.clienteNombre}` : ''
      }`,
      canal: entrada.canalVenta ?? 'mesa',
      creadoPor: 'admin',
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

  async eliminarComanda(orderId: string): Promise<DailyReportDocument> {
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

    const eraDeliveryPendiente =
      venta.canal === 'delivery' && venta.pagoEstado === 'PENDIENTE';

    venta.orders = venta.orders.filter((o) => o.orderId !== orderId);
    if (venta.orders.length === 0) {
      reporte.sales.splice(indiceVenta, 1);
    } else {
      venta.total = venta.orders.reduce((acc, o) => acc + o.total, 0);
    }
    reporte.markModified('sales');

    const totales = totalesDe(reporte.sales, reporte.ingresosManuales);
    reporte.numSales = totales.numSales;
    reporte.numComandas = totales.numComandas;
    reporte.totalIngresos = totales.totalIngresos;
    reporte.totalPendiente = totales.totalPendiente;
    reporte.numPendientes = totales.numPendientes;
    reporte.ticketPromedio = totales.ticketPromedio;
    reporte.itemsTotales = this.acumularItems(
      reporte.sales.flatMap((s) => s.orders).flatMap((o) => o.items),
    );
    await reporte.save();

    if (eraDeliveryPendiente) {
      await this.cuadernoModel
        .updateOne(
          { orderId, tipo: 'FIADO', estado: 'ABIERTO' },
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
