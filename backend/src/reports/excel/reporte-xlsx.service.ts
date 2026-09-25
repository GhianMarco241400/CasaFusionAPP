// backend/src/reports/excel/reporte-xlsx.service.ts
import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Sale, IngresoManual } from '../schemas/daily-report.schema';
import { CobroAjeno } from '../schemas/cuaderno.schema';
import { MetodoPago, OrderItem } from '../../orders/schemas/order.schema';
import { totalItem, totalesDe } from '../reporte-totales';

export type PlatoMenuXlsx = {
  name: string;
  price: number;
  categoryId: string | null;
};

export type CategoriaMenuXlsx = { id: string; name: string };

export type EntradaMenuXlsx = { name: string; price: number };

export type DatosReporteXlsx = {
  date: string;
  ventas: Sale[];
  ingresosManuales: IngresoManual[];
  cobrosAjenos: CobroAjeno[];
  platos: PlatoMenuXlsx[];
  categorias: CategoriaMenuXlsx[];
  entradas: EntradaMenuXlsx[];
};

type CanalVenta = 'Mesa' | 'Delivery' | 'Para llevar';

const COLOR_TITULO = 'FFD4432B';
const COLOR_SECCION = 'FF2B2420';
const COLOR_ENTRADA = 'FF4D7C4D';
const COLOR_EXTRA = 'FF6C4FBF';
const COLOR_MANUAL = 'FFE8A33D';
const COLOR_TEXTO = 'FFF7F2E9';
const COLOR_SUAVE = 'FF8C7F6E';
const COLOR_ZEBRA = 'FFF9F5F0';
const COLOR_DATO = 'FF2B2420';

@Injectable()
export class ReporteXlsxService {
  private readonly monedaFmt = 'S/ #,##0.00';

  async generar(datos: DatosReporteXlsx): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CasaFusion';
    workbook.created = new Date();
    this.hojaResumen(workbook, datos);
    this.hojaDetalle(workbook, datos);
    this.hojaMenu(workbook, datos);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private hojaResumen(workbook: ExcelJS.Workbook, datos: DatosReporteXlsx) {
    const ventas = datos.ventas ?? [];
    const manuales = datos.ingresosManuales ?? [];
    const cobros = datos.cobrosAjenos ?? [];
    const t = totalesDe(ventas, manuales);

    const totalManuales = manuales.reduce((acc, i) => acc + i.monto, 0);
    const ventasCobradas = t.totalIngresos - totalManuales;
    const ventasPendientes = t.totalPendiente;
    const totalCobrosAjenos = cobros.reduce((acc, c) => acc + c.monto, 0);
    const recaudado = t.totalIngresos;
    const totalCobradoDia = recaudado + totalCobrosAjenos;
    const totalVendido = ventasCobradas + ventasPendientes;

    const items = ventas.flatMap((v) =>
      (v.orders ?? []).flatMap((o) => o.items ?? []),
    );
    const articulosVendidos = items.reduce((acc, i) => acc + i.quantity, 0);
    const taperTotal = items.reduce(
      (acc, i) => acc + (i.paraLlevar ? (i.taperoPrecio ?? 1) * i.quantity : 0),
      0,
    );

    const ws = workbook.addWorksheet('Resumen del día');
    ws.columns = [
      { key: 'a', width: 32 },
      { key: 'b', width: 18 },
      { key: 'c', width: 16 },
      { key: 'd', width: 16 },
      { key: 'e', width: 16 },
      { key: 'f', width: 22 },
    ];

    this.titulo(
      ws,
      `REPORTE DE VENTAS · ${this.fechaLegible(datos.date)}`,
      'CasaFusion · Resumen del día',
    );

    this.seccion(ws, 'INDICADORES DEL DÍA', COLOR_SECCION, 'F');
    this.cabecera(ws, ['Indicador', 'Total']);

    const indicadores: Array<[string, number, 'moneda' | 'entero']> = [
      ['Ventas realizadas', t.numSales, 'entero'],
      ['Comandas cerradas', t.numComandas, 'entero'],
      ['Artículos vendidos', articulosVendidos, 'entero'],
      ['Total vendido', totalVendido, 'moneda'],
      ['Ventas cobradas', ventasCobradas, 'moneda'],
      ['Ventas por cobrar', ventasPendientes, 'moneda'],
      ['Ingresos manuales', totalManuales, 'moneda'],
      ['Recaudado del día', recaudado, 'moneda'],
      ['Cobros de fiados anteriores', totalCobrosAjenos, 'moneda'],
      ['Total cobrado del día', totalCobradoDia, 'moneda'],
      ['Ticket promedio', t.ticketPromedio, 'moneda'],
      ['Taperes incluidos', taperTotal, 'moneda'],
    ];
    indicadores.forEach(([label, value, tipo], i) => {
      const fila = ws.addRow([label, value]);
      this.dato(fila, 2, tipo);
      if (label === 'Total cobrado del día' || label === 'Total vendido') {
        fila.font = { bold: true, color: { argb: COLOR_DATO } };
        fila.getCell(1).font = { bold: true, color: { argb: COLOR_DATO } };
      }
      if (i % 2 === 1) this.zebra(fila);
    });

    this.seccion(ws, 'MÉTODOS DE PAGO', COLOR_SECCION, 'F');
    this.cabecera(ws, ['Origen', 'Yape', 'Efectivo', 'Sin método', 'Total']);
    const metodo = (m?: MetodoPago | null) =>
      m === 'YAPE' ? 'yape' : m === 'EFECTIVO' ? 'efectivo' : 'otro';
    const ventasPagadas = ventas.filter((v) => v.pagoEstado !== 'PENDIENTE');
    const porMetodo = (
      origen: Array<{ monto: number; metodoPago?: MetodoPago | null }>,
    ): [number, number, number] => {
      const suma = (m: 'yape' | 'efectivo' | 'otro') =>
        origen
          .filter((o) => metodo(o.metodoPago) === m)
          .reduce((a, o) => a + o.monto, 0);
      return [suma('yape'), suma('efectivo'), suma('otro')];
    };
    const [yapeVentas, efVentas, otrosVentas] = porMetodo(
      ventasPagadas.map((v) => ({ monto: v.total, metodoPago: v.metodoPago })),
    );
    const [yapeManuales, efManuales, otrosManuales] = porMetodo(manuales);
    const [yapeCobros, efCobros, otrosCobros] = porMetodo(
      cobros.map((c) => ({ monto: c.monto, metodoPago: c.metodoPago })),
    );

    const filasPago: Array<[string, number, number, number]> = [
      ['Ventas cobradas', yapeVentas, efVentas, otrosVentas],
      ['Ingresos manuales', yapeManuales, efManuales, otrosManuales],
      ['Cobros de fiados anteriores', yapeCobros, efCobros, otrosCobros],
    ];
    let sumaYape = 0;
    let sumaEf = 0;
    let sumaOtros = 0;
    filasPago.forEach(([label, y, e, o]) => {
      sumaYape += y;
      sumaEf += e;
      sumaOtros += o;
      const fila = ws.addRow([label, y, e, o, y + e + o]);
      this.dato(fila, 2, 'moneda');
      this.dato(fila, 3, 'moneda');
      this.dato(fila, 4, 'moneda');
      this.dato(fila, 5, 'moneda');
    });
    const totalFilaPago = ws.addRow([
      'Total cobrado',
      sumaYape,
      sumaEf,
      sumaOtros,
      sumaYape + sumaEf + sumaOtros,
    ]);
    this.dato(totalFilaPago, 2, 'moneda');
    this.dato(totalFilaPago, 3, 'moneda');
    this.dato(totalFilaPago, 4, 'moneda');
    this.dato(totalFilaPago, 5, 'moneda');
    totalFilaPago.font = { bold: true, color: { argb: COLOR_DATO } };
    totalFilaPago.getCell(1).font = { bold: true, color: { argb: COLOR_DATO } };

    this.seccion(ws, 'VENTAS POR CANAL', COLOR_SECCION, 'F');
    this.cabecera(ws, ['Canal', 'Total vendido', 'Cobrado', 'Por cobrar']);
    const porCanal = new Map<
      CanalVenta,
      { total: number; cobrado: number; pendiente: number }
    >();
    for (const canal of ['Mesa', 'Delivery', 'Para llevar'] as CanalVenta[]) {
      porCanal.set(canal, { total: 0, cobrado: 0, pendiente: 0 });
    }
    for (const v of ventas) {
      const b = porCanal.get(this.canalVenta(v))!;
      b.total += v.total;
      if (v.pagoEstado === 'PENDIENTE') b.pendiente += v.total;
      else b.cobrado += v.total;
    }
    let cTotal = 0;
    let cCob = 0;
    let cPend = 0;
    for (const [canal, v] of porCanal) {
      cTotal += v.total;
      cCob += v.cobrado;
      cPend += v.pendiente;
      const fila = ws.addRow([canal, v.total, v.cobrado, v.pendiente]);
      this.dato(fila, 2, 'moneda');
      this.dato(fila, 3, 'moneda');
      this.dato(fila, 4, 'moneda');
    }
    const totalFilaCanal = ws.addRow(['Total', cTotal, cCob, cPend]);
    this.dato(totalFilaCanal, 2, 'moneda');
    this.dato(totalFilaCanal, 3, 'moneda');
    this.dato(totalFilaCanal, 4, 'moneda');
    totalFilaCanal.font = { bold: true, color: { argb: COLOR_DATO } };
    totalFilaCanal.getCell(1).font = {
      bold: true,
      color: { argb: COLOR_DATO },
    };

    this.seccion(ws, 'INGRESOS MANUALES', COLOR_MANUAL, 'F');
    this.cabecera(ws, [
      'Hora',
      'Concepto',
      'Canal',
      'Método',
      'Monto',
      'Registrado por',
    ]);
    if (manuales.length === 0) {
      ws.addRow(['Sin ingresos manuales este día', '', '', '', '', '']).font = {
        italic: true,
        color: { argb: COLOR_SUAVE },
      };
    } else {
      manuales.forEach((m) => {
        const fila = ws.addRow([
          this.hora(m.registradoEn),
          m.concepto ?? 'Ingreso manual',
          m.canal === 'delivery' ? 'Delivery' : 'Mesa',
          this.metodoPago(m.metodoPago),
          m.monto,
          m.creadoPor ?? '',
        ]);
        this.dato(fila, 5, 'moneda');
      });
      const totalManualesFila = ws.addRow([
        'Total ingresos manuales',
        '',
        '',
        '',
        totalManuales,
        '',
      ]);
      this.dato(totalManualesFila, 5, 'moneda');
      totalManualesFila.font = { bold: true, color: { argb: COLOR_DATO } };
    }

    this.seccion(ws, 'COBROS DE FIADOS ANTERIORES', COLOR_ENTRADA, 'F');
    this.cabecera(ws, [
      'Cliente',
      'Fecha entrega',
      'Hora del cobro',
      'Método',
      'Monto',
      '',
    ]);
    if (cobros.length === 0) {
      ws.addRow(['Sin cobros de fiados anteriores', '', '', '', '', '']).font =
        { italic: true, color: { argb: COLOR_SUAVE } };
    } else {
      cobros.forEach((c) => {
        const fila = ws.addRow([
          c.clienteNombre ?? 'Cliente',
          c.fechaEntrega ?? '—',
          this.hora(c.cobradoEn),
          this.metodoPago(c.metodoPago),
          c.monto,
          '',
        ]);
        this.dato(fila, 5, 'moneda');
      });
      const totalCobrosFila = ws.addRow([
        'Total cobros anteriores',
        '',
        '',
        '',
        totalCobrosAjenos,
        '',
      ]);
      this.dato(totalCobrosFila, 5, 'moneda');
      totalCobrosFila.font = { bold: true, color: { argb: COLOR_DATO } };
    }

    const pendientes = ventas.filter((v) => v.pagoEstado === 'PENDIENTE');
    this.seccion(ws, 'VENTAS POR COBRAR', COLOR_SECCION, 'F');
    this.cabecera(ws, [
      'Referencia',
      'Canal',
      'Comandas',
      'Método',
      'Total',
      '',
    ]);
    if (pendientes.length === 0) {
      ws.addRow(['No hay ventas por cobrar', '', '', '', '', '']).font = {
        italic: true,
        color: { argb: COLOR_SUAVE },
      };
    } else {
      pendientes.forEach((v) => {
        const fila = ws.addRow([
          v.canal === 'mesa' && v.tableNumber > 0
            ? `Mesa ${v.tableNumber}`
            : '—',
          this.canalVenta(v),
          v.orders?.length ?? 0,
          'Por cobrar',
          v.total,
          '',
        ]);
        this.dato(fila, 3, 'entero');
        this.dato(fila, 5, 'moneda');
      });
      const totalPendFila = ws.addRow([
        'Total por cobrar',
        '',
        '',
        '',
        ventasPendientes,
        '',
      ]);
      this.dato(totalPendFila, 5, 'moneda');
      totalPendFila.font = { bold: true, color: { argb: COLOR_DATO } };
    }

    this.pie(
      ws,
      `Detalle por plato en la hoja "Detalle" · Menú en la hoja "Menú"`,
    );
    this.configurarImpresion(ws, 'landscape');
  }

  private hojaDetalle(workbook: ExcelJS.Workbook, datos: DatosReporteXlsx) {
    const ventas = [...(datos.ventas ?? [])].sort((a, b) =>
      (a.completedAt ?? '').localeCompare(b.completedAt ?? ''),
    );

    const ws = workbook.addWorksheet('Detalle');
    ws.columns = [
      { key: 'hora', width: 8 },
      { key: 'canal', width: 12 },
      { key: 'mesa', width: 8 },
      { key: 'comanda', width: 11 },
      { key: 'plato', width: 30 },
      { key: 'cant', width: 7 },
      { key: 'pu', width: 12 },
      { key: 'entradas', width: 24 },
      { key: 'taper', width: 11 },
      { key: 'total', width: 13 },
      { key: 'estado', width: 12 },
      { key: 'pago', width: 11 },
      { key: 'mesero', width: 20 },
      { key: 'notas', width: 28 },
    ];

    const titulo = ws.addRow([
      `DETALLE DE VENTAS · ${this.fechaLegible(datos.date)}`,
    ]);
    titulo.font = { bold: true, color: { argb: COLOR_TEXTO }, size: 14 };
    titulo.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_TITULO },
    };
    titulo.height = 26;
    ws.mergeCells(`A${titulo.number}:N${titulo.number}`);

    const sub = ws.addRow([
      'CasaFusion · Una fila por plato · comandas y ventas',
    ]);
    sub.font = { italic: true, color: { argb: COLOR_SUAVE } };
    ws.mergeCells(`A${sub.number}:N${sub.number}`);

    const headerRow = ws.addRow([
      'Hora',
      'Canal',
      'Mesa',
      'Comanda',
      'Plato',
      'Cant.',
      'P. unitario',
      'Entradas',
      'Taper',
      'Total',
      'Estado',
      'Pago',
      'Mesero',
      'Notas',
    ]).number;
    this.estiloCabecera(ws, headerRow);

    let cantTotal = 0;
    let totalDetalle = 0;
    const filas: ExcelJS.Row[] = [];

    for (const venta of ventas) {
      const hora = this.hora(venta.completedAt);
      const canal = this.canalVenta(venta);
      const mesa =
        canal === 'Mesa' && venta.tableNumber > 0
          ? String(venta.tableNumber)
          : '—';
      const estado =
        venta.pagoEstado === 'PENDIENTE' ? 'Por cobrar' : 'Cobrado';
      const pago =
        venta.pagoEstado === 'PENDIENTE'
          ? 'Por cobrar'
          : this.metodoPago(venta.metodoPago);
      const hayItems = (venta.orders ?? []).some(
        (o) => (o.items?.length ?? 0) > 0,
      );
      if (!hayItems) {
        const fila = ws.addRow([
          hora,
          canal,
          mesa,
          '—',
          '(venta sin platos)',
          0,
          0,
          '—',
          '—',
          venta.total,
          estado,
          pago,
          venta.waiterId ?? '',
          '',
        ]);
        this.dato(fila, 7, 'moneda');
        this.dato(fila, 10, 'moneda');
        filas.push(fila);
        totalDetalle += venta.total;
        continue;
      }
      for (const orden of venta.orders ?? []) {
        const comanda = orden.orderId
          ? orden.orderId.slice(-6).toUpperCase()
          : '—';
        for (const item of orden.items ?? []) {
          const entradas = this.entradasDe(item);
          const taper = item.paraLlevar
            ? (item.taperoPrecio ?? 1) * item.quantity
            : null;
          const total = totalItem(item);
          const fila = ws.addRow([
            hora,
            canal,
            mesa,
            comanda,
            item.name,
            item.quantity,
            item.unitPrice,
            entradas,
            taper ?? '—',
            total,
            estado,
            pago,
            venta.waiterId ?? '',
            item.notes ?? '',
          ]);
          this.dato(fila, 6, 'entero');
          this.dato(fila, 7, 'moneda');
          if (taper !== null) this.dato(fila, 9, 'moneda');
          this.dato(fila, 10, 'moneda');
          filas.push(fila);
          cantTotal += item.quantity;
          totalDetalle += total;
        }
      }
    }

    if (filas.length === 0) {
      const vacia = ws.addRow([
        'Sin ventas este día',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
      vacia.font = { italic: true, color: { argb: COLOR_SUAVE } };
    } else {
      filas.forEach((fila, i) => {
        if (i % 2 === 1) this.zebra(fila);
        fila.getCell(5).alignment = { wrapText: true, vertical: 'middle' };
        fila.getCell(8).alignment = { wrapText: true, vertical: 'middle' };
        fila.getCell(14).alignment = { wrapText: true, vertical: 'middle' };
      });
    }

    const totalFila = ws.addRow([
      '',
      '',
      '',
      '',
      'TOTAL',
      cantTotal,
      '',
      '',
      '',
      totalDetalle,
      '',
      '',
      '',
      '',
    ]);
    this.dato(totalFila, 6, 'entero');
    this.dato(totalFila, 10, 'moneda');
    totalFila.font = { bold: true, color: { argb: COLOR_DATO } };
    totalFila.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1E7DA' },
      };
      cell.border = { top: { style: 'double', color: { argb: COLOR_DATO } } };
    });

    this.pie(
      ws,
      `Comanda = últimos 6 caracteres del ID · ${ventas.length} ventas · ${ventas.reduce((a, v) => a + (v.orders?.length ?? 0), 0)} comandas`,
      'N',
    );
    this.cuadre(ws, totalDetalle, ventas);
    this.configurarImpresion(ws, 'landscape');
    ws.views = [{ state: 'frozen', ySplit: headerRow }];
    ws.autoFilter = { from: `A${headerRow}`, to: `N${headerRow}` };
    ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
  }

  private hojaMenu(workbook: ExcelJS.Workbook, datos: DatosReporteXlsx) {
    const platos = datos.platos ?? [];
    const categorias = datos.categorias ?? [];
    const entradas = datos.entradas ?? [];
    const mapaCategorias = new Map(categorias.map((c) => [c.id, c.name]));

    const ws = workbook.addWorksheet('Menú');
    ws.columns = [
      { key: 'tipo', width: 12 },
      { key: 'nombre', width: 34 },
      { key: 'categoria', width: 26 },
      { key: 'precio', width: 14 },
    ];

    const titulo = ws.addRow([
      `MENÚ DEL DÍA · ${this.fechaLegible(datos.date)}`,
    ]);
    titulo.font = { bold: true, color: { argb: COLOR_TEXTO }, size: 14 };
    titulo.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_TITULO },
    };
    titulo.height = 26;
    ws.mergeCells(`A${titulo.number}:D${titulo.number}`);

    const sub = ws.addRow(['CasaFusion · Fondos, entradas y extras del día']);
    sub.font = { italic: true, color: { argb: COLOR_SUAVE } };
    ws.mergeCells(`A${sub.number}:D${sub.number}`);

    ws.addRow([]);
    const headerRow = this.cabecera(ws, [
      'Tipo',
      'Nombre',
      'Categoría',
      'Precio',
    ]);

    const porCategoria = new Map<string, PlatoMenuXlsx[]>();
    for (const plato of platos) {
      const clave = plato.categoryId ?? '';
      const lista = porCategoria.get(clave) ?? [];
      lista.push(plato);
      porCategoria.set(clave, lista);
    }

    const imprimirSeccion = (
      tituloSeccion: string,
      color: string,
      tipoPlato: string,
      filas: Array<PlatoMenuXlsx | EntradaMenuXlsx>,
    ) => {
      if (filas.length === 0) return;
      const grupo = ws.addRow([`${tituloSeccion} (${filas.length})`]);
      grupo.font = { bold: true, color: { argb: COLOR_TEXTO } };
      grupo.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color },
      };
      ws.mergeCells(`A${grupo.number}:D${grupo.number}`);
      grupo.height = 20;
      filas.forEach((item, i) => {
        const esPlato = 'categoryId' in item;
        const fila = ws.addRow([
          esPlato ? tipoPlato : 'Entrada',
          item.name,
          esPlato
            ? (mapaCategorias.get(item.categoryId ?? '') ?? 'Sin categoría')
            : 'Acompaña al plato',
          item.price,
        ]);
        fila.getCell(1).alignment = { horizontal: 'center' };
        fila.getCell(4).numFmt = this.monedaFmt;
        fila.getCell(4).alignment = { horizontal: 'center' };
        if (i % 2 === 1) this.zebra(fila);
      });
      ws.addRow([]);
    };

    const fondosId =
      categorias.find((c) => c.name.trim().toLowerCase() === 'fondos')?.id ??
      '';
    const extrasId =
      categorias.find((c) => c.name.trim().toLowerCase() === 'extras')?.id ??
      '';

    const fondos = porCategoria.get(fondosId) ?? [];
    const extras = porCategoria.get(extrasId) ?? [];
    porCategoria.delete(fondosId);
    porCategoria.delete(extrasId);

    imprimirSeccion('FONDOS', COLOR_ENTRADA, 'Fondo', fondos);
    imprimirSeccion(
      'ENTRADAS · acompañan al plato',
      COLOR_MANUAL,
      'Entrada',
      entradas,
    );
    imprimirSeccion('EXTRAS', COLOR_EXTRA, 'Extra', extras);

    const otros: PlatoMenuXlsx[] = [];
    for (const categoria of categorias) {
      const items = porCategoria.get(categoria.id);
      if (items && items.length > 0) {
        otros.push(...items);
        porCategoria.delete(categoria.id);
      }
    }
    for (const items of porCategoria.values()) {
      otros.push(...items);
    }
    otros.sort((a, b) => a.name.localeCompare(b.name));
    imprimirSeccion('OTROS PLATOS', COLOR_SECCION, 'Plato', otros);

    const total = platos.length + entradas.length;
    const pie = ws.addRow([
      `Menú del día · ${total} ${total === 1 ? 'producto' : 'productos'} disponibles`,
    ]);
    pie.font = { italic: true, color: { argb: COLOR_SUAVE } };
    ws.mergeCells(`A${pie.number}:D${pie.number}`);

    this.configurarImpresion(ws, 'portrait');
    ws.views = [{ state: 'frozen', ySplit: headerRow }];
    ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
  }

  private entradasDe(item: OrderItem): string {
    const partes = [item.entrada?.name, item.entradaPersonalizada?.name].filter(
      (n): n is string => Boolean(n),
    );
    return partes.length > 0 ? partes.join(' + ') : '—';
  }

  private canalVenta(venta: Sale): CanalVenta {
    if (venta.canal === 'delivery') return 'Delivery';
    if (venta.canal === 'apartado' || venta.tableNumber === 0)
      return 'Para llevar';
    return 'Mesa';
  }

  private metodoPago(m?: MetodoPago | null): string {
    if (m === 'YAPE') return 'Yape';
    if (m === 'EFECTIVO') return 'Efectivo';
    return '—';
  }

  private hora(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: process.env.TZ_REPORTES ?? 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  private fechaLegible(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private titulo(ws: ExcelJS.Worksheet, titulo: string, subtitulo: string) {
    const filaTitulo = ws.addRow([titulo]);
    filaTitulo.font = { bold: true, color: { argb: COLOR_TEXTO }, size: 14 };
    filaTitulo.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_TITULO },
    };
    filaTitulo.height = 26;
    ws.mergeCells(`A${filaTitulo.number}:F${filaTitulo.number}`);
    const filaSub = ws.addRow([subtitulo]);
    filaSub.font = { italic: true, color: { argb: COLOR_SUAVE } };
    ws.mergeCells(`A${filaSub.number}:F${filaSub.number}`);
  }

  private seccion(
    ws: ExcelJS.Worksheet,
    texto: string,
    color: string,
    hasta: string,
  ) {
    ws.addRow([]);
    const fila = ws.addRow([texto]);
    fila.font = { bold: true, color: { argb: COLOR_TEXTO } };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    fila.height = 20;
    ws.mergeCells(`A${fila.number}:${hasta}${fila.number}`);
  }

  private cabecera(ws: ExcelJS.Worksheet, etiquetas: string[]): number {
    const fila = ws.addRow(etiquetas);
    this.estiloCabecera(ws, fila.number);
    return fila.number;
  }

  private estiloCabecera(ws: ExcelJS.Worksheet, filaNumero: number) {
    ws.getRow(filaNumero).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLOR_TEXTO } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_SECCION },
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF3A322B' } },
        left: { style: 'thin', color: { argb: 'FF3A322B' } },
        bottom: { style: 'thin', color: { argb: 'FF3A322B' } },
        right: { style: 'thin', color: { argb: 'FF3A322B' } },
      };
    });
  }

  private dato(fila: ExcelJS.Row, columna: number, tipo: 'moneda' | 'entero') {
    const cell = fila.getCell(columna);
    cell.numFmt = tipo === 'moneda' ? this.monedaFmt : '0';
    if (tipo === 'entero') cell.alignment = { horizontal: 'center' };
  }

  private zebra(fila: ExcelJS.Row) {
    fila.eachCell((cell) => {
      if (!cell.fill || cell.fill.type === undefined) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLOR_ZEBRA },
        };
      }
    });
  }

  private cuadre(ws: ExcelJS.Worksheet, totalDetalle: number, ventas: Sale[]) {
    const totalVentas = ventas.reduce((a, v) => a + v.total, 0);
    const diff = Math.abs(totalDetalle - totalVentas);
    const texto =
      diff > 0.01
        ? `Aviso: la suma de platos (${totalDetalle.toFixed(2)}) no coincide con el total de ventas (${totalVentas.toFixed(2)}). Revisa los datos del día.`
        : `Cuadre correcto: la suma de platos coincide con el total de ventas.`;
    const fila = ws.addRow([texto]);
    fila.font = {
      italic: true,
      color: { argb: diff > 0.01 ? 'FFB3261E' : COLOR_SUAVE },
    };
    ws.mergeCells(`A${fila.number}:N${fila.number}`);
  }

  private pie(ws: ExcelJS.Worksheet, texto: string, hasta = 'F') {
    ws.addRow([]);
    const fila = ws.addRow([texto]);
    fila.font = { italic: true, color: { argb: COLOR_SUAVE } };
    ws.mergeCells(`A${fila.number}:${hasta}${fila.number}`);
  }

  private configurarImpresion(
    ws: ExcelJS.Worksheet,
    orientacion: 'portrait' | 'landscape',
  ) {
    ws.pageSetup = {
      orientation: orientacion,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    };
  }
}
