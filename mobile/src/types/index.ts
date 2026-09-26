export type Role = 'admin' | 'mesero' | 'cocina' | 'delivery';

export type OrderCanal = 'mesa' | 'apartado' | 'delivery';
export type PagoEstado = 'PAGADO' | 'PENDIENTE';
export type MetodoPago = 'YAPE' | 'EFECTIVO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  image: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'COMPLETED';

export interface Entrada {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  dishId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  entrada?: { name: string; price: number };
  entradaPersonalizada?: { name: string; price: number };
  paraLlevar?: boolean;
  taperoPrecio?: number;
  notes?: string;
  esExtra?: boolean;
}

export interface Order {
  id: string;
  tableNumber: number;
  canal?: OrderCanal;
  waiterId: string;
  clienteNombre?: string;
  telefono?: string;
  direccion?: string;
  pagoEstado?: PagoEstado | null;
  metodoPago?: MetodoPago;
  status: OrderStatus;
  edited?: boolean; // true si el mesero reenvió una comanda ya enviada
  urgente?: boolean; // true si mesero/delivery la marcó como urgente para la cocina
  items: OrderItem[];
  total: number; // se recalcula según unitPrice + entrada.price de cada item
  createdAt: string;
  updatedAt: string;
}

export interface SaleOrder {
  orderId: string;
  edited: boolean;
  items: OrderItem[];
  total: number;
}

export interface Sale {
  id?: string;
  tableNumber: number;
  waiterId: string;
  completedAt: string;
  total: number;
  canal?: OrderCanal;
  pagoEstado?: PagoEstado;
  metodoPago?: MetodoPago;
  cobradoEn?: string;
  orders: SaleOrder[];
}

export interface IngresoManual {
  monto: number;
  metodoPago: MetodoPago;
  concepto?: string | null;
  registradoEn: string;
  creadoPor: string;
  canal?: 'mesa' | 'delivery';
}

export type CuadernoTipo = 'FIADO' | 'COBRO';
export type CuadernoEstado = 'ABIERTO' | 'COBRADO' | 'ELIMINADO';
export type AvisoTipo = 'FIADO' | 'ERROR' | 'REAPERTURA';

export interface CuadernoEntrada {
  id: string;
  tipo: CuadernoTipo;
  fechaEntrega: string;
  monto: number;
  clienteNombre?: string | null;
  telefono?: string | null;
  motivo?: string | null;
  canal?: OrderCanal | 'manual';
  canalVenta?: 'mesa' | 'delivery' | null;
  orderId?: string | null;
  estado: CuadernoEstado;
  cobradoMetodo?: MetodoPago | null;
  cobradoEn?: string | null;
  cobradoFecha?: string | null;
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Aviso {
  id: string;
  tipo: AvisoTipo;
  desc: string;
  monto?: number;
  entidadId?: string | null;
  creadoPor?: string | null;
  leido: boolean;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface CuadernoDia {
  date: string;
  resumen: {
    numFiados: number;
    fiadosPorCobrar: number;
    numCobrosHoy: number;
    cobrosHoy: number;
  };
  fiados: CuadernoEntrada[];
  cobrosHoy: CuadernoEntrada[];
}

export interface ItemTotal {
  name: string;
  quantity: number;
  total: number;
}

export interface DailyReport {
  id: string;
  date: string;
  sales: Sale[];
  ingresosManuales?: IngresoManual[];
  numSales: number;
  numComandas: number;
  totalIngresos: number;
  totalPendiente: number;
  numPendientes: number;
  ticketPromedio: number;
  itemsTotales: ItemTotal[];
  cobrosAjenos?: Array<{
    monto: number;
    metodoPago?: MetodoPago | null;
    clienteNombre?: string | null;
    fechaEntrega?: string | null;
    orderId?: string | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
}