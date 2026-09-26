import ExcelJS from 'exceljs';
import { ReporteXlsxService, DatosReporteXlsx } from './reporte-xlsx.service';
import { Sale } from '../schemas/daily-report.schema';

function ventaBase(overrides: Partial<Sale> = {}): Sale {
  return {
    tableNumber: 4,
    waiterId: 'user-1',
    completedAt: '2026-09-25T20:15:00.000Z',
    total: 60,
    canal: 'mesa',
    pagoEstado: 'PAGADO',
    metodoPago: 'YAPE',
    orders: [
      {
        orderId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
        edited: false,
        total: 60,
        items: [
          {
            name: 'Lomo saltado',
            quantity: 1,
            unitPrice: 55,
            entrada: { name: 'Ensalada', price: 5 },
          },
        ],
      },
    ],
    ...overrides,
  };
}

function datos(overrides: Partial<DatosReporteXlsx> = {}): DatosReporteXlsx {
  return {
    date: '2026-09-25',
    ventas: [ventaBase()],
    ingresosManuales: [],
    cobrosAjenos: [],
    totalPendiente: 0,
    platos: [
      { name: 'Lomo saltado', price: 55, categoryId: 'cat-fondos' },
      { name: 'Causa limeña', price: 18, categoryId: 'cat-extras' },
    ],
    categorias: [
      { id: 'cat-fondos', name: 'Fondos' },
      { id: 'cat-extras', name: 'Extras' },
    ],
    entradas: [{ name: 'Ensalada', price: 5 }],
    ...overrides,
  };
}

describe('ReporteXlsxService', () => {
  let service: ReporteXlsxService;

  beforeEach(() => {
    service = new ReporteXlsxService();
  });

  const leer = async (entrada: DatosReporteXlsx) => {
    const buffer = await service.generar(entrada);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as never);
    return wb;
  };

  const textoCelda = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return v.toString();
    return JSON.stringify(v) ?? '';
  };

  const textos = (ws: ExcelJS.Worksheet): string[] => {
    const salida: string[] = [];
    ws.eachRow((row) => {
      const valores: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        valores[col] = textoCelda(cell.value);
      });
      salida.push(valores.join(' | '));
    });
    return salida;
  };

  const buscarFila = (ws: ExcelJS.Worksheet, etiqueta: string, col = 1) =>
    (ws.getRows(1, ws.rowCount) ?? []).find(
      (row) => textoCelda(row.getCell(col).value).trim() === etiqueta,
    );

  const valor = (
    ws: ExcelJS.Worksheet,
    etiqueta: string,
    columna: number,
    colEtiqueta = 1,
  ) => {
    const fila = buscarFila(ws, etiqueta, colEtiqueta);
    return fila ? fila.getCell(columna).value : undefined;
  };

  it('genera tres hojas y ninguna es el ranking de platos', async () => {
    const wb = await leer(datos());
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Resumen del día',
      'Detalle',
      'Menú',
    ]);
    expect(
      textos(wb.getWorksheet('Resumen del día')!).join('\n'),
    ).not.toContain('PLATOS MÁS VENDIDOS');
  });

  it('el detalle genera una fila por plato y totaliza las líneas', async () => {
    const wb = await leer(
      datos({
        ventas: [
          ventaBase({
            total: 78,
            orders: [
              {
                orderId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
                edited: false,
                total: 78,
                items: [
                  {
                    name: 'Lomo saltado',
                    quantity: 1,
                    unitPrice: 55,
                    entrada: { name: 'Ensalada', price: 5 },
                  },
                  { name: 'Causa limeña', quantity: 2, unitPrice: 9 },
                ],
              },
            ],
          }),
        ],
      }),
    );
    const detalle = wb.getWorksheet('Detalle')!;
    const filas = textos(detalle);
    const conPlato = filas.filter(
      (f) => f.includes('Lomo saltado') || f.includes('Causa limeña'),
    );
    expect(conPlato.length).toBe(2);
    expect(valor(detalle, 'TOTAL', 10, 5)).toBe(78);
    expect(valor(detalle, 'TOTAL', 6, 5)).toBe(3);
  });

  it('el resumen separa vendido, cobrado, por cobrar y total del día', async () => {
    const wb = await leer(
      datos({
        // El pedido por cobrar ya no es una venta del dia: vive en el cuaderno
        // y el reporte lo recibe como totalPendiente.
        ventas: [ventaBase()],
        totalPendiente: 40,
        ingresosManuales: [
          {
            monto: 25,
            metodoPago: 'EFECTIVO',
            concepto: 'Extra por delivery',
            registradoEn: '2026-09-25T22:00:00.000Z',
            creadoPor: 'user-2',
            canal: 'delivery',
          },
        ],
        cobrosAjenos: [
          {
            monto: 30,
            metodoPago: 'YAPE',
            clienteNombre: 'Ana',
            fechaEntrega: '2026-09-20',
            orderId: 'ccc',
            cobradoEn: '2026-09-25T19:00:00.000Z',
          },
        ],
      }),
    );
    const resumen = wb.getWorksheet('Resumen del día')!;
    expect(valor(resumen, 'Total vendido', 2)).toBe(100);
    expect(valor(resumen, 'Ventas cobradas', 2)).toBe(60);
    expect(valor(resumen, 'Ventas por cobrar', 2)).toBe(40);
    expect(valor(resumen, 'Recaudado del día', 2)).toBe(85);
    expect(valor(resumen, 'Total cobrado del día', 2)).toBe(115);
    const contenido = textos(resumen).join('\n');
    expect(contenido).toContain('Extra por delivery');
    expect(contenido).toContain('Ana');
  });

  it('el cuadro de métodos de pago cuadra aunque falte el método de un cobro', async () => {
    const wb = await leer(
      datos({
        ventas: [ventaBase({ metodoPago: null })],
        cobrosAjenos: [
          {
            monto: 30,
            metodoPago: null,
            clienteNombre: 'Ana',
            fechaEntrega: '2026-09-20',
            orderId: 'ccc',
            cobradoEn: '2026-09-25T19:00:00.000Z',
          },
        ],
      }),
    );
    const resumen = wb.getWorksheet('Resumen del día')!;
    expect(valor(resumen, 'Total cobrado', 4)).toBe(90);
    expect(valor(resumen, 'Total cobrado', 5)).toBe(90);
  });

  it('confirma el cuadre cuando la suma de platos coincide con las ventas', async () => {
    const wb = await leer(datos());
    const detalle = textos(wb.getWorksheet('Detalle')!).join('\n');
    expect(detalle).toContain('Cuadre correcto');
    expect(detalle).not.toContain('no coincide');
  });

  it('avisa cuando la suma de platos no cuadra con el total de ventas', async () => {
    const wb = await leer(datos({ ventas: [ventaBase({ total: 999 })] }));
    const detalle = textos(wb.getWorksheet('Detalle')!).join('\n');
    expect(detalle).toContain('no coincide');
  });
});
