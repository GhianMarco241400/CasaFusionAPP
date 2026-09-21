import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Order, OrderItem, DailyReport, PagoEstado, MetodoPago } from '../types';
import {
  getActiveOrders,
  createOrder,
  updateOrderStatus,
  updateOrderItems as apiUpdateOrderItems,
  deleteOrder as apiDeleteOrder,
  completeTable as apiCompleteTable,
  completeOrder as apiCompleteOrder,
  completeDelivery as apiCompleteDelivery,
  DatosCliente,
} from '../services/orders';
import {
  connectSocket,
  disconnectSocket,
  onOrderCreated,
  onOrderUpdated,
  onOrderDeleted,
} from '../services/socket';
import { reportarError } from '../services/reports';
import { useAuth } from './AuthContext';

type OrdersContextType = {
  orders: Order[];
  loading: boolean;
  addOrder: (tableNumber: number, items: OrderItem[], cliente?: DatosCliente) => Promise<boolean>;
  updateOrderItems: (orderId: string, items: OrderItem[]) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  markReady: (orderId: string) => void;
  markPreparation: (orderId: string) => void;
  completeTable: (tableNumber: number, metodoPago: MetodoPago) => Promise<DailyReport | null>;
  completeOrder: (orderId: string, metodoPago: MetodoPago) => Promise<DailyReport | null>;
  completeDelivery: (orderId: string, pagoEstado: PagoEstado, metodoPago?: MetodoPago) => Promise<DailyReport | null>;
  getActiveOrderForTable: (tableNumber: number) => Order | undefined;
  getOrdersForTable: (tableNumber: number) => Order[];
};

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

function agregarOActualizar(prev: Order[], orden: Order): Order[] {
  const existe = prev.some((o) => o.id === orden.id);
  if (!existe) return [...prev, orden];
  return prev.map((o) => (o.id === orden.id ? orden : o));
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    let activo = true;
    setLoading(true);
    getActiveOrders()
      .then((data) => {
        if (activo) setOrders(data);
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setLoading(false);
      });

    async function suscribirseAlSocket() {
      try {
        await connectSocket();
      } catch {
        return;
      }
      if (!activo) return;
      onOrderCreated((orden) => {
        if (activo) setOrders((prev) => agregarOActualizar(prev, orden));
      });
      onOrderUpdated((orden) => {
        if (activo) setOrders((prev) => agregarOActualizar(prev, orden));
      });
      onOrderDeleted((orderId) => {
        if (activo) setOrders((prev) => prev.filter((o) => o.id !== orderId));
      });
    }
    suscribirseAlSocket();

    return () => {
      activo = false;
      disconnectSocket();
    };
  }, [user]);

  async function addOrder(
    tableNumber: number,
    items: OrderItem[],
    cliente?: DatosCliente,
  ): Promise<boolean> {
    try {
      const orden = await createOrder(tableNumber, items, cliente);
      setOrders((prev) => agregarOActualizar(prev, orden));
      return true;
    } catch {
      reportarError('No se pudo enviar la comanda a cocina').catch(() => {});
      return false;
    }
  }

  function markReady(orderId: string) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: 'READY' as const } : order
      )
    );
    updateOrderStatus(orderId, 'READY').catch(() => {});
  }

  function markPreparation(orderId: string) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: 'IN_PREPARATION' as const }
          : order
      )
    );
    updateOrderStatus(orderId, 'IN_PREPARATION').catch(() => {});
  }

  async function completeTable(
    tableNumber: number,
    metodoPago: MetodoPago,
  ): Promise<DailyReport | null> {
    try {
      const { report, orders: completadas } = await apiCompleteTable(
        tableNumber,
        metodoPago,
      );
      const ids = new Set(completadas.map((o) => o.id));
      setOrders((prev) =>
        prev.map((order) =>
          ids.has(order.id)
            ? { ...order, status: 'COMPLETED' as const, metodoPago }
            : order
        )
      );
      return report ?? null;
    } catch {
      reportarError(`No se pudo cobrar la mesa ${tableNumber}`).catch(() => {});
      return null;
    }
  }

  async function completeOrder(
    orderId: string,
    metodoPago: MetodoPago,
  ): Promise<DailyReport | null> {
    try {
      const { report, orders: completadas } = await apiCompleteOrder(
        orderId,
        metodoPago,
      );
      const ids = new Set(completadas.map((o) => o.id));
      setOrders((prev) =>
        prev.map((order) =>
          ids.has(order.id)
            ? { ...order, status: 'COMPLETED' as const, metodoPago }
            : order
        )
      );
      return report ?? null;
    } catch {
      reportarError('No se pudo cerrar la comanda y cobrarla').catch(() => {});
      return null;
    }
  }

  async function completeDelivery(
    orderId: string,
    pagoEstado: PagoEstado,
    metodoPago?: MetodoPago,
  ): Promise<DailyReport | null> {
    try {
      const { report, orders: completadas } = await apiCompleteDelivery(
        orderId,
        pagoEstado,
        metodoPago,
      );
      const ids = new Set(completadas.map((o) => o.id));
      setOrders((prev) =>
        prev.map((order) =>
          ids.has(order.id)
            ? {
                ...order,
                status: 'DELIVERED' as const,
                pagoEstado,
                metodoPago: pagoEstado === 'PAGADO' ? metodoPago : undefined,
              }
            : order
        )
      );
      return report ?? null;
    } catch {
      reportarError('No se pudo cerrar el pedido de delivery').catch(() => {});
      return null;
    }
  }

  async function updateOrderItems(orderId: string, items: OrderItem[]): Promise<boolean> {
    try {
      const orden = await apiUpdateOrderItems(orderId, items);
      setOrders((prev) => agregarOActualizar(prev, orden));
      return true;
    } catch {
      reportarError('No se pudo guardar los cambios de la comanda').catch(
        () => {}
      );
      return false;
    }
  }

  async function deleteOrder(orderId: string): Promise<boolean> {
    try {
      await apiDeleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      return true;
    } catch {
      reportarError('No se pudo eliminar la comanda').catch(() => {});
      return false;
    }
  }

function esAptoTabla(order: Order, tableNumber: number) {
  return (
    order.tableNumber === tableNumber &&
    order.canal !== 'delivery' &&
    order.status !== 'DELIVERED' &&
    order.status !== 'COMPLETED'
  );
}

function getActiveOrderForTable(tableNumber: number) {
  return orders.find((order) => esAptoTabla(order, tableNumber));
}

function getOrdersForTable(tableNumber: number) {
  return orders.filter((order) => esAptoTabla(order, tableNumber));
}

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        addOrder,
        updateOrderItems,
        deleteOrder,
        markReady,
        markPreparation,
        completeTable,
        completeOrder,
        completeDelivery,
        getActiveOrderForTable,
        getOrdersForTable,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders debe usarse dentro de un OrdersProvider');
  }
  return context;
}