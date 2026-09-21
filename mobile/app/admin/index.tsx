import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  FlatList,
  SectionList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  BarChart3,
  Trophy,
  Truck,
  ShoppingBag,
  Utensils,
  Smartphone,
  Banknote,
  Phone,
  Package,
  PenLine,
  Check,
  Search,
  Clock,
  Hourglass,
  NotebookText,
  Receipt,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react-native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Sale, MetodoPago, OrderItem } from '../../src/types';
import { ScalePressable } from '../../src/components/ScalePressable';
import { GraficoDonut } from '../../src/components/GraficoDonut';
import { GraficoSemana } from '../../src/components/GraficoSemana';
import Logo from '../../src/components/Logo';
import {
  getReport,
  fechaLocalAYYYYMMDD,
  exportarReporteXlsx,
  getResumenSemana,
  getCuaderno,
  cobrarFiado,
  cobrarFiadoManual,
  registroManual,
  eliminarVenta,
  eliminarIngresoManual,
  eliminarFiadoManual,
} from '../../src/services/reports';

const COLOR = {
  fondo: '#1E1A17',
  superficie: '#F7F2E9',
  marron: '#2B2420',
  muted: '#8C7F6E',
  borde: '#D8CBB8',
  placeholder: '#B8AC9B',
  primario: '#D4432B',
  verde: '#4D7C4D',
};

function hapticImpact() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function hapticSuccess() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function hapticWarning() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

function TarjetaDato({
  label,
  valor,
  color,
}: {
  label: React.ReactNode;
  valor: string;
  color: string;
}) {
  return (
    <View className="flex-1 bg-[#2B2420] rounded-2xl border border-[#3A322B] px-4 py-3">
      <View className="flex-row items-center gap-1.5 mb-0.5">
        {typeof label === 'string' ? (
          <Text className="text-[#8C7F6E] text-xs">{label}</Text>
        ) : (
          label
        )}
      </View>
      <Text className={`text-xl font-extrabold ${color}`}>{valor}</Text>
    </View>
  );
}

function FilaRanking({
  rank,
  name,
  cantidad,
  total,
}: {
  rank: number;
  name: string;
  cantidad: number;
  total: number;
}) {
  return (
    <View className="flex-row items-center py-2">
      <Text className="text-[#D4432B] font-extrabold w-6">{rank}</Text>
      <Text className="text-[#F7F2E9] font-semibold flex-shrink flex-1">{name}</Text>
      <Text className="text-[#8C7F6E] text-xs font-bold mr-2">{cantidad}x</Text>
      <Text className="text-[#4D7C4D] font-extrabold">S/ {total.toFixed(2)}</Text>
    </View>
  );
}

type FilaReporte = {
  tipo: 'venta';
  key: string;
  hora: string;
  tapero: number;
  total: number;
  nComandas: number;
  canal?: 'delivery' | 'apartado' | 'mesa';
  fiado?: boolean;
  metodo?: MetodoPago;
  venta: Sale;
};

type SeccionReporte = {
  title: React.ReactNode;
  grupo?: boolean;
  subtotal?: number;
  pendientes?: number;
  data: FilaReporte[];
};

function horaLima(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function taperoVenta(sale: Sale): number {
  return sale.orders.reduce(
    (acc, o) =>
      acc +
      o.items.reduce(
        (sum, it) => sum + (it.paraLlevar ? (it.taperoPrecio ?? 1) * it.quantity : 0),
        0,
      ),
    0,
  );
}

function totalItemFila(item: OrderItem): number {
  return (
    item.unitPrice * item.quantity +
    (item.entrada?.price ?? 0) +
    (item.entradaPersonalizada?.price ?? 0) +
    (item.paraLlevar ? (item.taperoPrecio ?? 1) * item.quantity : 0)
  );
}

function salesYape(sales: Sale[]): number {
  return sales
    .filter((s) => s.metodoPago === 'YAPE')
    .reduce((acc, s) => acc + s.total, 0);
}

function salesEfectivo(sales: Sale[]): number {
  return sales
    .filter((s) => s.metodoPago === 'EFECTIVO')
    .reduce((acc, s) => acc + s.total, 0);
}

function fechaCortaDia(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const texto = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaHoraEntrada(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function subtotalesPorGrupo(ventas: Sale[]) {
  const mesas = new Map<number, { subtotal: number; pendientes: number }>();
  let deliveries = { subtotal: 0, pendientes: 0 };
  let entregas = { subtotal: 0 };

  for (const v of ventas) {
    if (v.canal === 'delivery') {
      deliveries.subtotal += v.total;
      if (v.pagoEstado === 'PENDIENTE') deliveries.pendientes += 1;
    } else if (v.tableNumber === 0) {
      entregas.subtotal += v.total;
    } else {
      const cur = mesas.get(v.tableNumber) ?? { subtotal: 0, pendientes: 0 };
      cur.subtotal += v.total;
      if (v.pagoEstado === 'PENDIENTE') cur.pendientes += 1;
      mesas.set(v.tableNumber, cur);
    }
  }

  return { mesas, deliveries, entregas };
}

function seccionesReporte(sales: Sale[], baseSales?: Sale[]): SeccionReporte[] {
  const secciones: SeccionReporte[] = [];
  const totales = subtotalesPorGrupo(baseSales ?? sales);

  const grupos = new Map<number, FilaReporte[]>();
  const entregas: FilaReporte[] = [];
  const deliveries: FilaReporte[] = [];

  for (const venta of sales) {
    const fila: FilaReporte = {
      tipo: 'venta',
      key: venta.id ?? `${venta.tableNumber}-${venta.completedAt}-${entregas.length + deliveries.length}`,
      hora: horaLima(venta.completedAt),
      tapero: taperoVenta(venta),
      total: venta.total,
      nComandas: venta.orders.length,
      canal: venta.canal,
      fiado: venta.pagoEstado === 'PENDIENTE',
      metodo: venta.metodoPago,
      venta,
    };

    if (venta.canal === 'delivery') {
      deliveries.push(fila);
      continue;
    }

    if (venta.tableNumber === 0) {
      entregas.push(fila);
      continue;
    }

    const filas = grupos.get(venta.tableNumber) ?? [];
    filas.push(fila);
    grupos.set(venta.tableNumber, filas);
  }

  const numeros = [...grupos.keys()].sort((a, b) => a - b);
  numeros.forEach((n) => {
    const filas = grupos.get(n)!;
    const base = totales.mesas.get(n) ?? { subtotal: 0, pendientes: 0 };
    secciones.push({
      title: `Mesas ${n}`,
      grupo: true,
      subtotal: base.subtotal,
      pendientes: base.pendientes,
      data: filas,
    });
  });

  if (deliveries.length > 0) {
    secciones.push({
      title: (
        <View className="flex-row items-center gap-1.5">
          <Truck size={14} color="#6C4FBF" strokeWidth={2.5} />
          <Text className="text-[#F7F2E9] font-extrabold text-base">Delivery</Text>
        </View>
      ),
      grupo: true,
      subtotal: totales.deliveries.subtotal,
      pendientes: totales.deliveries.pendientes,
      data: deliveries,
    });
  }

  if (entregas.length > 0) {
    secciones.push({
      title: (
        <View className="flex-row items-center gap-1.5">
          <ShoppingBag size={14} color="#E8A33D" strokeWidth={2.5} />
          <Text className="text-[#F7F2E9] font-extrabold text-base">Para llevar</Text>
        </View>
      ),
      grupo: true,
      subtotal: totales.entregas.subtotal,
      data: entregas,
    });
  }

  return secciones;
}

export default function AdminScreen() {
  const [seccion, setSeccion] = useState<'resumen' | 'reporte' | 'cuaderno'>('resumen');
  const [vistaResumen, setVistaResumen] = useState<'graficas' | 'ranking'>('graficas');
  const [fechaReporte, setFechaReporte] = useState(() => fechaLocalAYYYYMMDD(new Date()));
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [fechaCalendario, setFechaCalendario] = useState(() => new Date());
  const [cobroModal, setCobroModal] = useState<{
    id: string;
    orderId?: string | null;
    monto: number;
    nombre: string;
  } | null>(null);
  const [errorCobro, setErrorCobro] = useState('');
  const [modalManual, setModalManual] = useState(false);
  const [tipoManual, setTipoManual] = useState<'FIADO' | 'INGRESO'>('FIADO');
  const [canalManual, setCanalManual] = useState<'mesa' | 'delivery'>('mesa');
  const [montoManual, setMontoManual] = useState('');
  const [metodoManual, setMetodoManual] = useState<'YAPE' | 'EFECTIVO'>('YAPE');
  const [conceptoManual, setConceptoManual] = useState('');
  const [clienteManual, setClienteManual] = useState('');
  const [fechaManual, setFechaManual] = useState(() => fechaLocalAYYYYMMDD(new Date()));
  const [pickerManualAbierto, setPickerManualAbierto] = useState(false);
  const [fechaCalendarioManual, setFechaCalendarioManual] = useState(() => new Date());
  const [errorManual, setErrorManual] = useState('');
  const [guardandoManual, setGuardandoManual] = useState(false);
  const [filtroReporte, setFiltroReporte] = useState({
    orden: 'antiguos' as 'recientes' | 'antiguos',
    metodo: 'todos' as 'todos' | 'YAPE' | 'EFECTIVO',
    canal: 'todos' as 'todos' | 'mesas' | 'delivery',
  });
  const [filtroPanelAbierto, setFiltroPanelAbierto] = useState(false);
  const [detalleVenta, setDetalleVenta] = useState<Sale | null>(null);
  const [eliminarConfirm, setEliminarConfirm] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [eliminandoIngresoIdx, setEliminandoIngresoIdx] = useState<number | null>(null);
  const [eliminandoFiadoId, setEliminandoFiadoId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const reporteQuery = useQuery({
    queryKey: ['report', fechaReporte],
    queryFn: () => getReport(fechaReporte),
    enabled: seccion === 'reporte',
  });

  const resumenQuery = useQuery({
    queryKey: ['resumenSemana'],
    queryFn: getResumenSemana,
  });

  const cuadernoQuery = useQuery({
    queryKey: ['cuaderno'],
    queryFn: getCuaderno,
    enabled: seccion === 'cuaderno',
  });

  function refrescarCuaderno() {
    queryClient.invalidateQueries({ queryKey: ['cuaderno'] });
    queryClient.invalidateQueries({ queryKey: ['report', fechaReporte] });
    queryClient.invalidateQueries({ queryKey: ['resumenSemana'] });
    queryClient.invalidateQueries({ queryKey: ['avisos'] });
  }

  function cerrarCobroModal() {
    setErrorCobro('');
    setCobroModal(null);
  }

  async function ejecutarCobro(metodo: 'YAPE' | 'EFECTIVO') {
    if (!cobroModal) return;
    setErrorCobro('');
    try {
      if (cobroModal.orderId) {
        await cobrarFiado(cobroModal.orderId, metodo);
      } else {
        await cobrarFiadoManual(cobroModal.id, metodo);
      }
      hapticSuccess();
      cerrarCobroModal();
      refrescarCuaderno();
      queryClient.invalidateQueries({ queryKey: ['report'] });
    } catch {
      hapticWarning();
      setErrorCobro('No se pudo registrar el cobro. Revisa la conexión.');
    }
  }

  async function guardarRegistroManual() {
    const monto = parseFloat(montoManual);
    if (Number.isNaN(monto) || monto <= 0) {
      setErrorManual('Ingresa un monto mayor a cero');
      return;
    }
    if (tipoManual === 'FIADO' && !clienteManual.trim()) {
      setErrorManual('Ingresa el nombre del cliente');
      return;
    }
    if (tipoManual === 'INGRESO' && !conceptoManual.trim()) {
      setErrorManual('Ingresa un concepto para el ingreso');
      return;
    }
    setGuardandoManual(true);
    setErrorManual('');
    try {
      await registroManual({
        tipo: tipoManual,
        canal: canalManual,
        monto,
        metodoPago: tipoManual === 'INGRESO' ? metodoManual : undefined,
        concepto: tipoManual === 'INGRESO' ? conceptoManual.trim() : undefined,
        clienteNombre: tipoManual === 'FIADO' ? clienteManual.trim() : undefined,
        date: tipoManual === 'INGRESO' ? fechaManual : undefined,
      });
      hapticSuccess();
      setModalManual(false);
      setMontoManual('');
      setConceptoManual('');
      setClienteManual('');
      refrescarCuaderno();
      if (tipoManual === 'INGRESO') {
        queryClient.invalidateQueries({ queryKey: ['report', fechaManual] });
      }
    } catch {
      hapticWarning();
      setErrorManual('No se pudo registrar. Revisa la conexión.');
    } finally {
      setGuardandoManual(false);
    }
  }

  function abrirDetalleVenta(venta: Sale) {
    hapticImpact();
    setEliminarConfirm(null);
    setErrorEliminar('');
    setDetalleVenta(venta);
  }

  function cerrarDetalleVenta() {
    setErrorEliminar('');
    setEliminarConfirm(null);
    setDetalleVenta(null);
  }

  async function ejecutarEliminarComanda(orderId: string) {
    setEliminando(orderId);
    setErrorEliminar('');
    try {
      await eliminarVenta(orderId);
      hapticSuccess();
      cerrarDetalleVenta();
      refrescarCuaderno();
    } catch {
      hapticWarning();
      setEliminarConfirm(null);
      setErrorEliminar('No se pudo eliminar la comanda. Revisa la conexión.');
    } finally {
      setEliminando(null);
    }
  }

  function confirmarEliminarIngresoManual(idx: number) {
    hapticImpact();
    const ingreso = ingresosManuales[idx];
    if (!ingreso) return;
    Alert.alert('Eliminar ingreso manual', `${ingreso.concepto} · S/ ${ingreso.monto.toFixed(2)}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => ejecutarEliminarIngresoManual(idx) },
    ]);
  }

  async function ejecutarEliminarIngresoManual(idx: number) {
    setEliminandoIngresoIdx(idx);
    setErrorEliminar('');
    try {
      await eliminarIngresoManual(fechaReporte, idx);
      hapticSuccess();
      refrescarCuaderno();
      queryClient.invalidateQueries({ queryKey: ['report'] });
    } catch {
      hapticWarning();
      setErrorEliminar('No se pudo eliminar el ingreso. Revisa la conexión.');
    } finally {
      setEliminandoIngresoIdx(null);
    }
  }

  function confirmarEliminarFiadoManual(id: string) {
    hapticImpact();
    const fiado = fiadosCuaderno.find((f) => f.id === id);
    if (!fiado) return;
    Alert.alert(
      'Eliminar fiado',
      `${fiado.clienteNombre ?? 'Fiado'} · S/ ${fiado.monto.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => ejecutarEliminarFiadoManual(id) },
      ],
    );
  }

  async function ejecutarEliminarFiadoManual(id: string) {
    setEliminandoFiadoId(id);
    setErrorEliminar('');
    try {
      await eliminarFiadoManual(id);
      hapticSuccess();
      refrescarCuaderno();
    } catch {
      hapticWarning();
      setErrorEliminar('No se pudo eliminar el fiado. Revisa la conexión.');
    } finally {
      setEliminandoFiadoId(null);
    }
  }

  const mutacionExportar = useMutation({
    mutationFn: () => exportarReporteXlsx(fechaReporte),
    onSuccess: () => hapticSuccess(),
    onError: () => hapticWarning(),
  });

  function cambiarReporte(delta: number) {
    const [y, m, d] = fechaReporte.split('-').map(Number);
    const fecha = new Date(y, m - 1, d + delta);
    setFechaReporte(fechaLocalAYYYYMMDD(fecha));
    hapticImpact();
  }

  function abrirCalendario() {
    hapticImpact();
    const [y, m, d] = fechaReporte.split('-').map(Number);
    setFechaCalendario(new Date(y, m - 1, d));
    setPickerAbierto(true);
  }

  function formatearFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  const estaMismoDia = fechaReporte === fechaLocalAYYYYMMDD(new Date());

  const titulo =
    seccion === 'resumen'
      ? 'Resumen de la semana'
      : seccion === 'reporte'
        ? 'Reporte de ventas'
        : 'Cuaderno';

  const subtitulo =
    seccion === 'resumen'
      ? 'Ventas por canal y tendencia diaria'
      : seccion === 'reporte'
        ? 'Resumen del día y ventas cerradas'
        : 'Fiados, cobros y registros manuales del día';

  const totalSemana = (resumenQuery.data?.dias ?? []).reduce((a, d) => a + d.total, 0);
  const hoyDia = (resumenQuery.data?.dias ?? []).find(
    (d) => d.date === fechaLocalAYYYYMMDD(new Date())
  );

  const cuaderno = cuadernoQuery.data;
  const fiadosCuaderno = cuaderno?.fiados ?? [];
  const cobrosHoy = cuaderno?.cobrosHoy ?? [];
  const totalFiados = fiadosCuaderno.reduce((s, e) => s + e.monto, 0);
  const totalCobrosHoy = cobrosHoy.reduce((s, e) => s + e.monto, 0);
  const cobrosYapeHoy = cobrosHoy
    .filter((e) => e.cobradoMetodo === 'YAPE')
    .reduce((s, e) => s + e.monto, 0);
  const cobrosEfectivoHoy = cobrosHoy
    .filter((e) => e.cobradoMetodo === 'EFECTIVO')
    .reduce((s, e) => s + e.monto, 0);

  function etiquetaMetodo(metodo?: MetodoPago | null) {
    if (metodo === 'YAPE') {
      return {
        icono: <Smartphone size={12} color="#6C4FBF" strokeWidth={2.5} />,
        texto: 'Yape',
        color: '#6C4FBF',
      };
    }
    return {
      icono: <Banknote size={12} color="#4D7C4D" strokeWidth={2.5} />,
      texto: 'Efectivo',
      color: '#4D7C4D',
    };
  }

  const reporteSales = reporteQuery.data?.sales ?? [];
  const ventasVisibles = reporteSales
    .filter((s) => {
      if (filtroReporte.metodo !== 'todos' && s.metodoPago !== filtroReporte.metodo) {
        return false;
      }
      if (filtroReporte.canal === 'mesas' && s.canal === 'delivery') return false;
      if (filtroReporte.canal === 'delivery' && s.canal !== 'delivery') return false;
      return true;
    })
    .sort((a, b) =>
      filtroReporte.orden === 'antiguos'
        ? new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        : new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

  const ingresosManuales = reporteQuery.data?.ingresosManuales ?? [];
  const manualesYape = ingresosManuales
    .filter((i) => i.metodoPago === 'YAPE')
    .reduce((a, i) => a + i.monto, 0);
  const manualesEfectivo = ingresosManuales
    .filter((i) => i.metodoPago === 'EFECTIVO')
    .reduce((a, i) => a + i.monto, 0);

  return (
    <View className="flex-1 bg-[#1E1A17] px-6 pt-16">
      <Logo fuente="logo2" altura={44} estilo={{ marginTop: 2, marginBottom: 12 }} />
      <Text className="text-[#F7F2E9] text-2xl font-extrabold mb-1">{titulo}</Text>
      <Text className="text-[#8C7F6E] text-sm mb-6">{subtitulo}</Text>

      <View className="flex-row gap-2 mb-6">
        <View className="flex-row flex-1 bg-[#2B2420] rounded-full p-1">
          {(['resumen', 'reporte', 'cuaderno'] as const).map((opcion) => {
            const activa = seccion === opcion;
            return (
              <Pressable
                key={opcion}
                onPress={() => {
                  hapticImpact();
                  setSeccion(opcion);
                }}
                className={`flex-1 py-2 rounded-full items-center ${activa ? 'bg-[#D4432B]' : ''}`}
              >
                <Text className={`font-bold text-xs ${activa ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                  {opcion === 'resumen' ? 'Resumen' : opcion === 'reporte' ? 'Reporte' : 'Cuaderno'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {seccion === 'resumen' ? (
        resumenQuery.data ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="flex-row bg-[#2B2420] rounded-full p-1 mb-4">
              {(['graficas', 'ranking'] as const).map((v) => {
                const activa = vistaResumen === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => {
                      hapticImpact();
                      setVistaResumen(v);
                    }}
                    className={`flex-1 py-2 rounded-full items-center ${activa ? 'bg-[#6C4FBF]' : ''}`}
                  >
                    <View className="flex-row items-center gap-1.5">
                      {v === 'graficas' ? (
                        <BarChart3 size={15} color={activa ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                      ) : (
                        <Trophy size={15} color={activa ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                      )}
                      <Text className={`font-bold text-sm ${activa ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                        {v === 'graficas' ? 'Gráficas' : 'Ranking'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {vistaResumen === 'graficas' ? (
              <>
                <View className="flex-row gap-3 mb-4">
                  <TarjetaDato
                    label="Total semana"
                    valor={`S/ ${totalSemana.toFixed(2)}`}
                    color="text-[#E8A33D]"
                  />
                  <TarjetaDato
                    label="Hoy"
                    valor={hoyDia ? `S/ ${hoyDia.total.toFixed(2)}` : 'S/ 0.00'}
                    color="text-[#4D7C4D]"
                  />
                </View>

                <View className="bg-[#2B2420] rounded-2xl border border-[#3A322B] px-4 py-4 mb-4">
                  <Text className="text-[#F7F2E9] font-extrabold text-base mb-1">
                    Mesa · Delivery
                  </Text>
                  <Text className="text-[#8C7F6E] text-xs mb-4">
                    Ventas de hoy por canal · el "para llevar" cuenta como mesa · toca un segmento para verlo
                  </Text>
                  <GraficoDonut
                    mesa={hoyDia?.mesa ?? 0}
                    delivery={hoyDia?.delivery ?? 0}
                  />
                </View>

                <View className="bg-[#2B2420] rounded-2xl border border-[#3A322B] px-4 py-4 mb-4">
                  <Text className="text-[#F7F2E9] font-extrabold text-base mb-1">
                    Subida / Caída de ventas por día
                  </Text>
                  <Text className="text-[#8C7F6E] text-xs mb-4">
                    Lunes a domingo · comparación contra el día anterior
                  </Text>
                  <GraficoSemana dias={resumenQuery.data.dias} />
                </View>
              </>
            ) : (
              <>
                <View className="bg-[#2B2420] rounded-2xl border border-[#3A322B] px-4 py-4 mb-4">
                  <View className="flex-row items-center gap-2">
                    <Trophy size={16} color="#E8A33D" strokeWidth={2.5} />
                    <Text className="text-[#F7F2E9] font-extrabold text-base">
                      Platos más vendidos de la semana
                    </Text>
                  </View>
                  {resumenQuery.data.rankingSemana.length === 0 ? (
                    <Text className="text-[#8C7F6E] text-sm py-2">Sin ventas esta semana</Text>
                  ) : (
                    resumenQuery.data.rankingSemana.map((it, i) => (
                      <FilaRanking
                        key={it.name}
                        rank={i + 1}
                        name={it.name}
                        cantidad={it.quantity}
                        total={it.total}
                      />
                    ))
                  )}
                </View>

                <Text className="text-[#F7F2E9] font-extrabold text-base mb-3">
                  Ranking por día
                </Text>
                {resumenQuery.data.dias.map((d) => (
                  <View key={d.date} className="bg-[#2B2420] rounded-2xl border border-[#3A322B] px-4 py-3 mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-[#F7F2E9] font-bold text-sm">{fechaCortaDia(d.date)}</Text>
                      {d.total > 0 ? (
                        <Text className="text-[#4D7C4D] font-extrabold">S/ {d.total.toFixed(2)}</Text>
                      ) : (
                        <Text className="text-[#3A322B] text-xs font-bold">Sin ventas</Text>
                      )}
                    </View>
                    {d.total > 0 &&
                      d.ranking.map((it, i) => (
                        <FilaRanking
                          key={`${d.date}-${it.name}`}
                          rank={i + 1}
                          name={it.name}
                          cantidad={it.quantity}
                          total={it.total}
                        />
                      ))}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-[#8C7F6E] text-sm">Cargando resumen...</Text>
          </View>
        )
      ) : seccion === 'cuaderno' ? (
        <View className="flex-1">
          {cuadernoQuery.isLoading ? (
            <Text className="text-[#8C7F6E] text-sm">Cargando cuaderno...</Text>
          ) : !cuaderno ? (
            <View className="flex-1 items-center justify-center gap-2">
              <NotebookText size={44} color="#8C7F6E" strokeWidth={1.5} />
              <Text className="text-[#F7F2E9] font-bold text-lg">Sin movimientos</Text>
              <Text className="text-[#8C7F6E] text-sm text-center">
                Aún no hay fiados anotados.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {cobrosHoy.length > 0 && (
                <View className="bg-[#6C4FBF]/15 border border-[#6C4FBF]/40 rounded-2xl px-4 py-3 mb-4">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <Clock size={14} color="#B79BE8" strokeWidth={2.5} />
                    <Text className="text-[#B79BE8] font-extrabold text-sm">
                      Cobros de hoy (guía)
                    </Text>
                  </View>
                  <Text className="text-[#8C7F6E] text-[11px] mb-2">
                    Este dinero ya quedó contabilizado en el reporte del día del fiado · aquí solo como guía del método cobrado
                  </Text>
                  <View className="flex-row gap-2 mb-2">
                    <View className="flex-row items-center gap-1 rounded-full bg-[#6C4FBF]/20 px-3 py-1">
                      <Smartphone size={12} color="#B79BE8" strokeWidth={2.5} />
                      <Text className="text-xs font-bold" style={{ color: '#B79BE8' }}>Yape</Text>
                      <Text className="text-xs font-extrabold text-[#F7F2E9]">
                        S/ {cobrosYapeHoy.toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 rounded-full bg-[#4D7C4D]/20 px-3 py-1">
                      <Banknote size={12} color="#7FB58A" strokeWidth={2.5} />
                      <Text className="text-xs font-bold" style={{ color: '#7FB58A' }}>Efectivo</Text>
                      <Text className="text-xs font-extrabold text-[#F7F2E9]">
                        S/ {cobrosEfectivoHoy.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  {cobrosHoy.map((e) => {
                    const metodo = etiquetaMetodo(e.cobradoMetodo);
                    return (
                      <View key={e.id} className="flex-row items-center justify-between py-1">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-[#F7F2E9] text-sm font-semibold">
                              {e.clienteNombre}
                            </Text>
                            <View
                              className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                              style={{ backgroundColor: `${metodo.color}25` }}
                            >
                              {metodo.icono}
                              <Text className="text-[10px] font-bold" style={{ color: metodo.color }}>
                                {metodo.texto}
                              </Text>
                            </View>
                          </View>
                          {e.fechaEntrega && e.fechaEntrega !== fechaLocalAYYYYMMDD(new Date()) && (
                            <Text className="text-[#8C7F6E] text-[10px] mt-0.5">
                              del fiado del {fechaCortaDia(e.fechaEntrega)}
                            </Text>
                          )}
                        </View>
                        <Text className="text-[#8C7F6E] text-xs mr-2">
                          {e.cobradoEn ? horaLima(e.cobradoEn) : ''}
                        </Text>
                        <Text className="text-[#B79BE8] font-extrabold">
                          S/ {e.monto.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View className="flex-row gap-3 mb-4">
                <TarjetaDato
                  label="⏳ Fiados por cobrar"
                  valor={`S/ ${totalFiados.toFixed(2)}`}
                  color="text-[#E8A33D]"
                />
                <TarjetaDato
                  label={
                    <View className="flex-row items-center gap-1.5">
                      <Banknote size={13} color="#4D7C4D" strokeWidth={2.5} />
                      <Text className="text-[#8C7F6E] text-xs">Efectivo de hoy</Text>
                    </View>
                  }
                  valor={`S/ ${cobrosEfectivoHoy.toFixed(2)}`}
                  color="text-[#4D7C4D]"
                />
              </View>
              <View className="flex-row gap-3 mb-5">
                <TarjetaDato
                  label={
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={13} color="#B79BE8" strokeWidth={2.5} />
                      <Text className="text-[#8C7F6E] text-xs">Cobros de hoy</Text>
                    </View>
                  }
                  valor={`S/ ${totalCobrosHoy.toFixed(2)}`}
                  color="text-[#B79BE8]"
                />
                <TarjetaDato
                  label="Entradas"
                  valor={`${cuaderno.fiados.length + cuaderno.cobrosHoy.length}`}
                  color="text-[#F7F2E9]"
                />
              </View>

              <ScalePressable
                onPress={() => {
                  hapticImpact();
                  setTipoManual('FIADO');
                  setCanalManual('mesa');
                  setMontoManual('');
                  setClienteManual('');
                  setConceptoManual('');
                  setFechaManual(fechaLocalAYYYYMMDD(new Date()));
                  setErrorManual('');
                  setModalManual(true);
                }}
                className="bg-[#6C4FBF] rounded-full items-center mb-5"
                innerClassName="w-full py-3.5 items-center justify-center"
              >
                <Text className="text-[#F7F2E9] font-bold text-base">＋ Agregar manualmente</Text>
              </ScalePressable>

              <Text className="text-[#F7F2E9] font-extrabold text-base mb-3">
                ⏳ Fiados por cobrar
              </Text>
              {fiadosCuaderno.length === 0 ? (
                <Text className="text-[#8C7F6E] text-sm text-center py-8">
                  Sin fiados por cobrar.
                </Text>
              ) : (
                fiadosCuaderno.map((e) => (
                  <View key={e.id} className="bg-[#2B2420] rounded-2xl border border-[#3A322B] px-4 py-3 mb-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[#F7F2E9] font-bold text-base flex-1">
                        {e.clienteNombre}
                      </Text>
                      <Text className="text-[#E8A33D] font-extrabold">
                        S/ {e.monto.toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <Clock size={12} color="#8C7F6E" strokeWidth={2.5} />
                      <Text className="text-[#8C7F6E] text-xs">
                        Enviado {fechaHoraEntrada(e.createdAt)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <Package size={12} color="#8C7F6E" strokeWidth={2.5} />
                      <Text className="text-[#8C7F6E] text-xs">
                        entrega {fechaCortaDia(e.fechaEntrega)}
                      </Text>
                    </View>
                    {e.telefono ? (
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Phone size={12} color="#8C7F6E" strokeWidth={2.5} />
                        <Text className="text-[#8C7F6E] text-xs">{e.telefono}</Text>
                      </View>
                    ) : null}
                    {e.canal === 'manual' && (
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <View className="flex-row items-center gap-1">
                          <PenLine size={12} color="#6C4FBF" strokeWidth={2.5} />
                          <Text className="text-[#6C4FBF] text-xs font-bold">
                            Registrado manualmente
                          </Text>
                        </View>
                        <View
                          className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                          style={
                            e.canalVenta === 'delivery'
                              ? { backgroundColor: '#6C4FBF33' }
                              : { backgroundColor: '#E8A33D25' }
                          }
                        >
                          {e.canalVenta === 'delivery' ? (
                            <Truck size={12} color="#B79BE8" strokeWidth={2.5} />
                          ) : (
                            <Utensils size={12} color="#E8A33D" strokeWidth={2.5} />
                          )}
                          <Text
                            className="text-[10px] font-bold"
                            style={
                              e.canalVenta === 'delivery'
                                ? { color: '#B79BE8' }
                                : { color: '#E8A33D' }
                            }
                          >
                            {e.canalVenta === 'delivery' ? 'Delivery' : 'Mesa'}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View className="flex-row gap-2 mt-3">
                      {e.canal === 'manual' && (
                        <ScalePressable
                          onPress={() => confirmarEliminarFiadoManual(e.id)}
                          disabled={eliminandoFiadoId === e.id}
                          pressedScale={0.95}
className="bg-[#4D2B2B]/40 rounded-full"
                            innerClassName="w-full px-3.5 py-2 items-center justify-center"
                          >
                          {eliminandoFiadoId === e.id ? (
                            <ActivityIndicator size={14} color="#D4432B" />
                          ) : (
                            <Trash2 size={14} color="#D4432B" strokeWidth={2.5} />
                          )}
                        </ScalePressable>
                      )}
                      <ScalePressable
                        onPress={() => {
                          hapticImpact();
                          setErrorCobro('');
                          setCobroModal({
                            id: e.id,
                            orderId: e.orderId,
                            monto: e.monto,
                            nombre: e.clienteNombre ?? 'Cliente',
                          });
                        }}
                        pressedScale={0.95}
                        className="bg-[#4D7C4D] rounded-full"
                        innerClassName="w-full px-4 py-2 items-center justify-center"
                      >
                        <View className="flex-row items-center gap-1.5">
                          <Banknote size={12} color="#F7F2E9" strokeWidth={2.5} />
                          <Text className="text-[#F7F2E9] font-bold text-xs">Cobrar</Text>
                        </View>
                      </ScalePressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      ) : (
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-4">
            <ScalePressable
              onPress={() => cambiarReporte(-1)}
              pressedScale={0.9}
              className="w-11 h-11 rounded-full bg-[#2B2420] border border-[#3A322B] items-center justify-center"
              innerClassName="flex-1 w-full h-full items-center justify-center"
            >
              <Text className="text-[#F7F2E9] text-lg font-bold leading-none">‹</Text>
            </ScalePressable>

            <Pressable onPress={abrirCalendario} className="items-center">
              <Text className="text-[#F7F2E9] font-extrabold text-base">
                {formatearFecha(fechaReporte)}
              </Text>
              <Text className="text-[#D4432B] text-xs font-bold mt-0.5">
                {estaMismoDia ? 'HOY · toca para elegir' : 'Histórico · toca para elegir'}
              </Text>
            </Pressable>

            <ScalePressable
              onPress={() => cambiarReporte(1)}
              pressedScale={0.9}
              className="w-11 h-11 rounded-full bg-[#2B2420] border border-[#3A322B] items-center justify-center"
              innerClassName="flex-1 w-full h-full items-center justify-center"
            >
              <Text className="text-[#F7F2E9] text-lg font-bold leading-none">›</Text>
            </ScalePressable>
          </View>

          <ScalePressable
            onPress={() => mutacionExportar.mutate()}
            disabled={mutacionExportar.isPending}
            pressedScale={0.97}
            className="mb-4 mt-2 bg-[#217346] rounded-2xl flex-row items-center justify-center border border-[#2F8F55]"
            innerClassName="w-full flex-row items-center justify-center gap-2.5 px-4 py-3"
          >
            {mutacionExportar.isPending ? (
              <ActivityIndicator color="#F7F2E9" size="small" />
            ) : (
              <>
                <FileSpreadsheet size={16} color="#F7F2E9" strokeWidth={2.2} />
                <Text className="text-[#F7F2E9] font-extrabold text-sm">Exportar Excel</Text>
              </>
            )}
          </ScalePressable>
          {mutacionExportar.isError && (
            <Text className="text-[#D4432B] text-xs text-center mb-2">
              No se pudo exportar. Revisa la conexión.
            </Text>
          )}

          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => {
                hapticImpact();
                setFiltroPanelAbierto(true);
              }}
              className="border border-[#3A322B] bg-[#2B2420] rounded-full px-5 py-1.5"
            >
              <View className="flex-row items-center gap-1.5">
                <Search size={12} color="#8C7F6E" strokeWidth={2.5} />
                <Text className="text-[#8C7F6E] text-xs font-bold">Filtrar</Text>
              </View>
            </Pressable>
            <Text className="text-[#8C7F6E] text-xs">Cuadre de pagos del día</Text>
          </View>

          {reporteQuery.isLoading ? (
            <Text className="text-[#8C7F6E] text-sm">Cargando reporte...</Text>
          ) : !reporteQuery.data ? (
            <View className="flex-1 items-center justify-center gap-2">
              <BarChart3 size={44} color="#8C7F6E" strokeWidth={1.5} />
              <Text className="text-[#F7F2E9] font-bold text-lg">Sin ventas este día</Text>
              <Text className="text-[#8C7F6E] text-sm text-center">
                Las ventas cerradas aparecerán aquí.
              </Text>
            </View>
          ) : (
            <SectionList
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              sections={seccionesReporte(ventasVisibles, reporteSales)}
              keyExtractor={(item) => item.key}
              ItemSeparatorComponent={() => <View className="h-px bg-[#3A322B] mx-4" />}
              SectionSeparatorComponent={() => <View className="h-5" />}
              ListHeaderComponent={
                <>
                  {reporteQuery.data.numPendientes > 0 && (
                    <View className="bg-[#E8A33D]/15 border border-[#E8A33D]/40 rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                      <Hourglass size={12} color="#E8A33D" strokeWidth={2.5} />
                      <Text className="text-[#E8A33D] font-bold text-sm">
                        {reporteQuery.data.numPendientes}{' '}
                        {reporteQuery.data.numPendientes === 1 ? 'pedido' : 'pedidos'} por cobrar
                      </Text>
                    </View>
                      <Text className="text-[#E8A33D] text-lg font-extrabold">
                        +S/ {reporteQuery.data.totalPendiente.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {(reporteQuery.data.cobrosAjenos?.length ?? 0) > 0 && (() => {
                    const ajenos = reporteQuery.data.cobrosAjenos!;
                    const totalAjenos = ajenos.reduce((a, c) => a + c.monto, 0);
                    const yapeAjenos = ajenos
                      .filter((c) => c.metodoPago === 'YAPE')
                      .reduce((a, c) => a + c.monto, 0);
                    const efectivoAjenos = ajenos
                      .filter((c) => c.metodoPago === 'EFECTIVO')
                      .reduce((a, c) => a + c.monto, 0);
                    return (
                      <View className="bg-[#6C4FBF]/15 border border-[#6C4FBF]/40 rounded-2xl px-4 py-3 mb-4">
                        <View className="flex-row items-center gap-1.5 mb-1">
                        <Receipt size={14} color="#B79BE8" strokeWidth={2.5} />
                        <Text className="text-[#B79BE8] font-bold text-sm">
                          Cobros recibidos hoy de fiados de otros días
                        </Text>
                      </View>
                        <Text className="text-[#8C7F6E] text-[11px] mb-2">
                          Este dinero NO es de este día · ya quedó contabilizado en el reporte del día del fiado
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-2">
                          {yapeAjenos > 0 && (
                            <View className="flex-row items-center gap-1 rounded-full bg-[#6C4FBF]/20 px-3 py-1">
                              <Smartphone size={12} color="#B79BE8" strokeWidth={2.5} />
                              <Text className="text-xs font-bold" style={{ color: '#B79BE8' }}>Yape</Text>
                              <Text className="text-xs font-extrabold text-[#F7F2E9]">
                                S/ {yapeAjenos.toFixed(2)}
                              </Text>
                            </View>
                          )}
                          {efectivoAjenos > 0 && (
                            <View className="flex-row items-center gap-1 rounded-full bg-[#4D7C4D]/20 px-3 py-1">
                              <Banknote size={12} color="#7FB58A" strokeWidth={2.5} />
                              <Text className="text-xs font-bold" style={{ color: '#7FB58A' }}>Efectivo</Text>
                              <Text className="text-xs font-extrabold text-[#F7F2E9]">
                                S/ {efectivoAjenos.toFixed(2)}
                              </Text>
                            </View>
                          )}
                          <Text className="text-[#8C7F6E] text-xs font-bold">
                            {ajenos.length} cobro{ajenos.length === 1 ? '' : 's'} · Total S/ {totalAjenos.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                  {ingresosManuales.length > 0 && (
                    <View className="bg-[#E8A33D]/10 border border-[#E8A33D]/30 rounded-2xl px-4 py-3 mb-4">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <PenLine size={14} color="#E8A33D" strokeWidth={2.5} />
                        <Text className="text-[#E8A33D] font-bold text-sm">Ingresos manuales</Text>
                      </View>
                      <Text className="text-[#8C7F6E] text-[11px] mb-2">
                        Ajustes y cuadres registrados a mano para este día
                      </Text>
                      {ingresosManuales.map((i, idx) => (
                        <View key={idx} className="flex-row items-center justify-between py-1">
                          <View className="flex-1 flex-row items-center gap-2">
                            <Text className="text-[#F7F2E9] text-sm font-semibold flex-shrink">
                              {i.concepto}
                            </Text>
                            <View
                              className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                              style={
                                i.metodoPago === 'YAPE'
                                  ? { backgroundColor: '#6C4FBF33' }
                                  : { backgroundColor: '#4D7C4D33' }
                              }
                            >
                              {i.metodoPago === 'YAPE' ? (
                                <Smartphone size={11} color="#B79BE8" strokeWidth={2.5} />
                              ) : (
                                <Banknote size={11} color="#7FB58A" strokeWidth={2.5} />
                              )}
                              <Text
                                className="text-[10px] font-bold"
                                style={
                                  i.metodoPago === 'YAPE'
                                    ? { color: '#B79BE8' }
                                    : { color: '#7FB58A' }
                                }
                              >
                                {i.metodoPago === 'YAPE' ? 'Yape' : 'Efectivo'}
                                {i.canal === 'delivery' ? ' · Delivery' : ' · Mesa'}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[#E8A33D] font-extrabold mr-1">
                            +S/ {i.monto.toFixed(2)}
                          </Text>
                          <Pressable
                            onPress={() =>
                              confirmarEliminarIngresoManual(idx)
                            }
                            disabled={eliminandoIngresoIdx === idx}
                            className="p-1.5"
                            hitSlop={8}
                          >
                            {eliminandoIngresoIdx === idx ? (
                              <ActivityIndicator size={14} color="#E8A33D" />
                            ) : (
                              <Trash2 size={15} color="#B84D4D" strokeWidth={2.5} />
                            )}
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                  <View className="flex-row gap-3 mb-3">
                    <TarjetaDato
                      label="Recaudado"
                      valor={`S/ ${reporteQuery.data.totalIngresos.toFixed(2)}`}
                      color="text-[#4D7C4D]"
                    />
                    <TarjetaDato
                      label="Ventas cerradas"
                      valor={`${reporteQuery.data.numSales}`}
                      color="text-[#F7F2E9]"
                    />
                  </View>
                  <View className="flex-row gap-3 mb-3">
                    <TarjetaDato
                      label={
                        <View className="flex-row items-center gap-1.5">
                          <Smartphone size={13} color="#B79BE8" strokeWidth={2.5} />
                          <Text className="text-[#8C7F6E] text-xs">Yape</Text>
                        </View>
                      }
                      valor={`S/ ${(salesYape(reporteQuery.data.sales) + manualesYape).toFixed(2)}`}
                      color="text-[#B79BE8]"
                    />
                    <TarjetaDato
                      label={
                        <View className="flex-row items-center gap-1.5">
                          <Banknote size={13} color="#7FB37F" strokeWidth={2.5} />
                          <Text className="text-[#8C7F6E] text-xs">Efectivo</Text>
                        </View>
                      }
                      valor={`S/ ${(salesEfectivo(reporteQuery.data.sales) + manualesEfectivo).toFixed(2)}`}
                      color="text-[#7FB37F]"
                    />
                  </View>
                  <View className="flex-row gap-3 mb-5">
                    <TarjetaDato
                      label="Comandas"
                      valor={`${reporteQuery.data.numComandas}`}
                      color="text-[#F7F2E9]"
                    />
                    <TarjetaDato
                      label="Ticket promedio"
                      valor={`S/ ${reporteQuery.data.ticketPromedio.toFixed(2)}`}
                      color="text-[#E8A33D]"
                    />
                  </View>
                </>
              }
              renderSectionHeader={({ section }) =>
                section.grupo ? (
                  <View className="flex-row items-center justify-between rounded-2xl border border-[#3A322B] bg-[#2B2420] px-4 py-3">
                    <View className="flex-row items-center gap-2 flex-1">
                      {typeof section.title === 'string' ? (
                        <Text className="text-[#F7F2E9] font-extrabold text-base">{section.title}</Text>
                      ) : (
                        section.title
                      )}
                      {section.pendientes ? (
                        <View className="bg-[#E8A33D]/20 rounded-full px-2 py-0.5">
                          <Text className="text-[#E8A33D] text-[11px] font-bold">
                            {section.pendientes} por cobrar
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {section.subtotal !== undefined && (
                      <Text className="text-[#8C7F6E] text-sm font-bold">
                        {section.data.length} pedidos · S/ {section.subtotal.toFixed(2)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text className="text-[#F7F2E9] font-extrabold text-lg">{section.title}</Text>
                )
              }
              renderItem={({ item }) => (
                <ScalePressable
                  onPress={() => abrirDetalleVenta(item.venta)}
                  pressedScale={0.98}
                  className="flex-row items-center justify-between"
                  innerClassName="flex-1 w-full flex-row items-center justify-between px-4 py-3"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[#F7F2E9] font-bold text-sm">{item.hora}</Text>
                      {item.tapero > 0 && (
                        <View className="bg-[#1E1A17] rounded-full px-2 py-0.5 flex-row items-center gap-1">
                          <ShoppingBag size={11} color="#E8A33D" strokeWidth={2.5} />
                          <Text className="text-xs font-semibold text-[#E8A33D]">
                            tapero +S/ {item.tapero.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      {item.fiado ? (
                        <View className="rounded-full bg-[#E8A33D]/20 px-2 py-0.5 flex-row items-center gap-1">
                          <Hourglass size={11} color="#E8A33D" strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold text-[#E8A33D]">fiado</Text>
                        </View>
                      ) : item.metodo === 'YAPE' ? (
                        <View className="rounded-full bg-[#6C4FBF]/25 px-2 py-0.5 flex-row items-center gap-1">
                          <Smartphone size={11} color="#B79BE8" strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold text-[#B79BE8]">Yape</Text>
                        </View>
                      ) : item.metodo === 'EFECTIVO' ? (
                        <View className="rounded-full bg-[#4D7C4D]/20 px-2 py-0.5 flex-row items-center gap-1">
                          <Banknote size={11} color="#7FB37F" strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold text-[#7FB37F]">Efectivo</Text>
                        </View>
                      ) : (
                        <View className="rounded-full bg-[#4D7C4D]/20 px-2 py-0.5 flex-row items-center gap-1">
                          <Check size={11} color="#7FB37F" strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold text-[#7FB37F]">cobrado</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[#8C7F6E] text-xs mt-0.5">
                      {item.nComandas} comanda{item.nComandas === 1 ? '' : 's'} · toca para ver el detalle
                    </Text>
                  </View>
                  <Text className="text-[#4D7C4D] font-extrabold">S/ {item.total.toFixed(2)}</Text>
                </ScalePressable>
              )}
            />
          )}
        </View>
      )}

      {pickerAbierto && Platform.OS === 'android' && (
        <DateTimePicker
          value={fechaCalendario}
          mode="date"
          display="default"
          onChange={(event, fecha) => {
            setPickerAbierto(false);
            if (event.type === 'set' && fecha) {
              setFechaReporte(fechaLocalAYYYYMMDD(fecha));
              hapticSuccess();
            }
          }}
        />
      )}

      {pickerAbierto && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPickerAbierto(false)}>
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="bg-[#2B2420] rounded-2xl border border-[#3A322B] p-5 w-full max-w-sm"
            >
              <Text className="text-[#F7F2E9] font-bold text-lg mb-4 text-center">Elegir fecha</Text>
              <DateTimePicker
                value={fechaCalendario}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={(event, fecha) => {
                  if (fecha) setFechaCalendario(fecha);
                }}
              />
              <View className="flex-row gap-3 mt-4">
                <ScalePressable
                  onPress={() => setPickerAbierto(false)}
                  className="flex-1 bg-[#1E1A17] rounded-full items-center"
                  innerClassName="w-full py-3 items-center justify-center"
                >
                  <Text className="text-[#8C7F6E] font-semibold">Cancelar</Text>
                </ScalePressable>
                <ScalePressable
                  onPress={() => {
                    setFechaReporte(fechaLocalAYYYYMMDD(fechaCalendario));
                    hapticSuccess();
                    setPickerAbierto(false);
                  }}
                  className="flex-1 bg-[#D4432B] rounded-full items-center"
                  innerClassName="w-full py-3 items-center justify-center"
                >
                  <Text className="text-[#F7F2E9] font-semibold">Listo</Text>
                </ScalePressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      <Modal
        visible={cobroModal !== null}
        transparent
        animationType="none"
        onRequestClose={cerrarCobroModal}
      >
        <Pressable className="flex-1" onPress={cerrarCobroModal}>
          <Animated.View entering={FadeIn.duration(180)} className="flex-1 bg-[#130F0C]/70" />
        </Pressable>
        <Animated.View
          entering={FadeInDown.springify().damping(17).stiffness(180)}
          className="absolute bottom-0 inset-x-0 bg-[#2B2420] rounded-t-3xl border-t border-[#3A322B] px-6 pt-5 pb-8"
        >
          <Text className="text-[#F7F2E9] font-extrabold text-lg text-center">
            Cobrar · {cobroModal?.nombre}
          </Text>
          <Text className="text-[#4D7C4D] font-extrabold text-center mt-1 text-2xl">
            S/ {(cobroModal?.monto ?? 0).toFixed(2)}
          </Text>
          <Text className="text-[#8C7F6E] text-xs text-center mt-1.5">
            El cobro se contabiliza el día en que se anotó el fiado
          </Text>
          {errorCobro !== '' && (
            <Text className="text-[#D4432B] text-xs text-center mt-2">{errorCobro}</Text>
          )}
          <View className="flex-row gap-3 mt-5">
            <Pressable
              onPress={() => ejecutarCobro('YAPE')}
              className="flex-1 bg-[#6C4FBF] rounded-full py-3.5 items-center"
            >
              <View className="flex-row items-center gap-1.5">
              <Smartphone size={14} color="#F7F2E9" strokeWidth={2.5} />
              <Text className="text-[#F7F2E9] font-bold">Yape</Text>
            </View>
            </Pressable>
            <Pressable
              onPress={() => ejecutarCobro('EFECTIVO')}
              className="flex-1 bg-[#4D7C4D] rounded-full py-3.5 items-center"
            >
              <View className="flex-row items-center gap-1.5">
                <Banknote size={14} color="#F7F2E9" strokeWidth={2.5} />
                <Text className="text-[#F7F2E9] font-bold">Efectivo</Text>
              </View>
            </Pressable>
          </View>
          <Pressable onPress={cerrarCobroModal} className="mt-3 items-center">
            <Text className="text-[#8C7F6E] font-semibold text-sm">Cancelar</Text>
          </Pressable>
        </Animated.View>
      </Modal>

      <Modal
        visible={modalManual}
        transparent
        animationType="none"
        onRequestClose={() => setModalManual(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <Pressable className="flex-1 bg-black/50" onPress={() => setModalManual(false)} />
          <Animated.View
            entering={FadeInDown.springify().damping(17).stiffness(180)}
            className="bg-[#2B2420] rounded-t-3xl border-t border-[#3A322B] px-6 pt-5 pb-8"
          >
            <Text className="text-[#F7F2E9] font-extrabold text-lg text-center mb-4">
              ＋ Agregar manualmente
            </Text>

            <View className="flex-row bg-[#1E1A17] rounded-full p-1 mb-4">
              {(['FIADO', 'INGRESO'] as const).map((t) => {
                const activo = tipoManual === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      hapticImpact();
                      setTipoManual(t);
                    }}
                    className={`flex-1 py-2 rounded-full items-center ${activo ? 'bg-[#6C4FBF]' : ''}`}
                  >
                    <View className="flex-row items-center gap-1.5">
                    {t === 'FIADO' ? (
                      <Hourglass size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                    ) : (
                      <NotebookText size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                    )}
                    <Text className={`font-bold text-xs ${activo ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                      {t === 'FIADO' ? 'Fiado' : 'Cuadre del día'}
                    </Text>
                  </View>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-[#8C7F6E] text-sm mb-1">Canal</Text>
            <View className="flex-row gap-2 mb-4">
              {([
                { valor: 'mesa', texto: 'Mesa' },
                { valor: 'delivery', texto: 'Delivery' },
              ] as const).map((c) => {
                const activo = canalManual === c.valor;
                return (
                  <Pressable
                    key={c.valor}
                    onPress={() => {
                      hapticImpact();
                      setCanalManual(c.valor);
                    }}
                    className={`flex-1 rounded-full py-2.5 items-center ${activo ? 'bg-[#6C4FBF]' : 'bg-[#1E1A17]'}`}
                  >
                    <View className="flex-row items-center gap-1.5">
                      {c.valor === 'mesa' ? (
                        <Utensils size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                      ) : (
                        <Truck size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                      )}
                      <Text className={`text-xs font-bold ${activo ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                        {c.texto}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-[#8C7F6E] text-sm mb-1">Monto (S/)</Text>
            <TextInput
              className="bg-[#1E1A17] rounded-lg text-[#F7F2E9] text-base px-4 py-3 mb-4"
              placeholder="0.00"
              placeholderTextColor={COLOR.placeholder}
              keyboardType="decimal-pad"
              value={montoManual}
              onChangeText={setMontoManual}
            />

            {tipoManual === 'FIADO' ? (
              <>
                <Text className="text-[#8C7F6E] text-sm mb-1">Cliente</Text>
                <TextInput
                  className="bg-[#1E1A17] rounded-lg text-[#F7F2E9] text-base px-4 py-3 mb-4"
                  placeholder="Nombre del cliente"
                  placeholderTextColor={COLOR.placeholder}
                  value={clienteManual}
                  onChangeText={setClienteManual}
                />
              </>
            ) : (
              <>
                <Text className="text-[#8C7F6E] text-sm mb-1">Método de pago</Text>
                <View className="flex-row gap-2 mb-4">
                  {(['YAPE', 'EFECTIVO'] as const).map((m) => {
                    const activo = metodoManual === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => {
                          hapticImpact();
                          setMetodoManual(m);
                        }}
                        className={`flex-1 rounded-full py-2.5 items-center ${
                          activo
                            ? m === 'YAPE'
                              ? 'bg-[#6C4FBF]'
                              : 'bg-[#4D7C4D]'
                            : 'bg-[#1E1A17]'
                        }`}
                      >
                        <View className="flex-row items-center gap-1.5">
                          {m === 'YAPE' ? (
                            <Smartphone size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                          ) : (
                            <Banknote size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                          )}
                          <Text className={`text-xs font-bold ${activo ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                            {m === 'YAPE' ? 'Yape' : 'Efectivo'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="text-[#8C7F6E] text-sm mb-1">Concepto</Text>
                <TextInput
                  className="bg-[#1E1A17] rounded-lg text-[#F7F2E9] text-base px-4 py-3 mb-4"
                  placeholder="Ej. propina, cuadre de caja"
                  placeholderTextColor={COLOR.placeholder}
                  value={conceptoManual}
                  onChangeText={setConceptoManual}
                />

                <Text className="text-[#8C7F6E] text-sm mb-1">Fecha del cuadre</Text>
                <Pressable
                  onPress={() => {
                    hapticImpact();
                    const [y, m, d] = fechaManual.split('-').map(Number);
                    setFechaCalendarioManual(new Date(y, m - 1, d));
                    setPickerManualAbierto(true);
                  }}
                  className="bg-[#1E1A17] rounded-lg px-4 py-3 mb-4 flex-row items-center justify-between"
                >
                  <Text className="text-[#F7F2E9] text-base">{fechaCortaDia(fechaManual)}</Text>
                  <Text className="text-[#8C7F6E] text-xs font-bold">Toca para cambiar</Text>
                </Pressable>
              </>
            )}

            {errorManual !== '' && (
              <Text className="text-[#D4432B] text-sm mb-3">{errorManual}</Text>
            )}

            <ScalePressable
              onPress={guardarRegistroManual}
              disabled={guardandoManual}
              className={`rounded-full items-center ${guardandoManual ? 'bg-[#3A322B]' : 'bg-[#6C4FBF]'}`}
              innerClassName="w-full py-4 items-center justify-center"
            >
              {guardandoManual ? (
                <ActivityIndicator color="#F7F2E9" size="small" />
              ) : (
                <Text className="text-[#F7F2E9] font-bold text-base">Guardar</Text>
              )}
            </ScalePressable>
            <Pressable onPress={() => setModalManual(false)} className="mt-3 items-center">
              <Text className="text-[#8C7F6E] font-semibold text-sm">Cancelar</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {pickerManualAbierto && Platform.OS === 'android' && (
        <DateTimePicker
          value={fechaCalendarioManual}
          mode="date"
          display="default"
          onChange={(event, fecha) => {
            setPickerManualAbierto(false);
            if (event.type === 'set' && fecha) {
              setFechaManual(fechaLocalAYYYYMMDD(fecha));
              hapticSuccess();
            }
          }}
        />
      )}

      {pickerManualAbierto && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPickerManualAbierto(false)}>
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <Animated.View
              entering={FadeInDown.duration(200)}
              className="bg-[#2B2420] rounded-2xl border border-[#3A322B] p-5 w-full max-w-sm"
            >
              <Text className="text-[#F7F2E9] font-bold text-lg mb-4 text-center">Elegir fecha del cuadre</Text>
              <DateTimePicker
                value={fechaCalendarioManual}
                mode="date"
                display="inline"
                themeVariant="dark"
                onChange={(event, fecha) => {
                  if (fecha) setFechaCalendarioManual(fecha);
                }}
              />
              <View className="flex-row gap-3 mt-4">
                <ScalePressable
                  onPress={() => setPickerManualAbierto(false)}
                  className="flex-1 bg-[#1E1A17] rounded-full items-center"
                  innerClassName="w-full py-3 items-center justify-center"
                >
                  <Text className="text-[#8C7F6E] font-semibold">Cancelar</Text>
                </ScalePressable>
                <ScalePressable
                  onPress={() => {
                    setFechaManual(fechaLocalAYYYYMMDD(fechaCalendarioManual));
                    hapticSuccess();
                    setPickerManualAbierto(false);
                  }}
                  className="flex-1 bg-[#D4432B] rounded-full items-center"
                  innerClassName="w-full py-3 items-center justify-center"
                >
                  <Text className="text-[#F7F2E9] font-semibold">Listo</Text>
                </ScalePressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      <Modal
        visible={detalleVenta !== null}
        transparent
        animationType="none"
        onRequestClose={cerrarDetalleVenta}
      >
        <Pressable className="flex-1" onPress={cerrarDetalleVenta}>
          <Animated.View entering={FadeIn.duration(180)} className="flex-1 bg-[#130F0C]/70" />
        </Pressable>
        <Animated.View
          entering={FadeInDown.springify().damping(17).stiffness(180)}
          className="absolute bottom-0 inset-x-0 bg-[#2B2420] rounded-t-3xl border-t border-[#3A322B] px-6 pt-5 pb-8"
        >
          {detalleVenta && (() => {
            const venta = detalleVenta;
            const tapero = taperoVenta(venta);
            const titulo =
              venta.canal === 'delivery'
                ? 'Delivery'
                : venta.tableNumber === 0
                  ? 'Para llevar'
                  : `Mesa ${venta.tableNumber}`;
            return (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[#F7F2E9] font-extrabold text-lg flex-shrink">
                    {titulo}
                  </Text>
                  <Text className="text-[#8C7F6E] text-sm">{horaLima(venta.completedAt)}</Text>
                </View>

                <View className="flex-row flex-wrap items-center gap-1.5 mb-4">
                  {venta.pagoEstado === 'PENDIENTE' ? (
                    <View className="rounded-full bg-[#E8A33D]/20 px-2.5 py-1 flex-row items-center gap-1">
                      <Hourglass size={11} color="#E8A33D" strokeWidth={2.5} />
                      <Text className="text-[11px] font-bold text-[#E8A33D]">fiado</Text>
                    </View>
                  ) : venta.metodoPago === 'YAPE' ? (
                    <View className="rounded-full bg-[#6C4FBF]/25 px-2.5 py-1 flex-row items-center gap-1">
                      <Smartphone size={11} color="#B79BE8" strokeWidth={2.5} />
                      <Text className="text-[11px] font-bold text-[#B79BE8]">Yape</Text>
                    </View>
                  ) : venta.metodoPago === 'EFECTIVO' ? (
                    <View className="rounded-full bg-[#4D7C4D]/20 px-2.5 py-1 flex-row items-center gap-1">
                      <Banknote size={11} color="#7FB37F" strokeWidth={2.5} />
                      <Text className="text-[11px] font-bold text-[#7FB37F]">Efectivo</Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-[#4D7C4D]/20 px-2.5 py-1 flex-row items-center gap-1">
                      <Check size={11} color="#7FB37F" strokeWidth={2.5} />
                      <Text className="text-[11px] font-bold text-[#7FB37F]">cobrado</Text>
                    </View>
                  )}
                  {tapero > 0 && (
                    <View className="bg-[#1E1A17] rounded-full px-2.5 py-1 flex-row items-center gap-1">
                      <ShoppingBag size={11} color="#E8A33D" strokeWidth={2.5} />
                      <Text className="text-[11px] font-semibold text-[#E8A33D]">
                        tapero +S/ {tapero.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  {venta.orders.map((orden, idx) => (
                    <View
                      key={orden.orderId}
                      className="border border-[#3A322B] rounded-2xl px-4 py-3 mb-3"
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-[#F7F2E9] font-bold text-sm">
                          {venta.orders.length > 1 ? `Comanda ${idx + 1}` : 'Comanda'}
                          {orden.edited ? ' · editada' : ''}
                        </Text>
                        <ScalePressable
                          onPress={() => {
                            hapticImpact();
                            setErrorEliminar('');
                            setEliminarConfirm((actual) =>
                              actual === orden.orderId ? null : orden.orderId
                            );
                          }}
                          pressedScale={0.9}
                          hitSlop={6}
                          className="w-8 h-8 rounded-full items-center justify-center border border-[#3A322B] bg-[#1E1A17]"
                          innerClassName="flex-1 w-full h-full items-center justify-center"
                        >
                          <Trash2
                            size={14}
                            color={eliminarConfirm === orden.orderId ? '#D4432B' : '#8C7F6E'}
                            strokeWidth={2.5}
                          />
                        </ScalePressable>
                      </View>

                      {eliminarConfirm === orden.orderId && (
                        <View className="bg-[#D4432B]/15 border border-[#D4432B]/40 rounded-xl px-3 py-2.5 mb-2">
                          <Text className="text-[#F7F2E9] text-xs font-bold mb-2">
                            ¿Eliminar esta comanda del reporte? Se quitará de las ventas y totales.
                          </Text>
                          <View className="flex-row gap-2">
                            <ScalePressable
                              onPress={() => ejecutarEliminarComanda(orden.orderId)}
                              disabled={eliminando === orden.orderId}
                              className={`flex-1 rounded-full items-center ${
                                eliminando === orden.orderId ? 'bg-[#3A322B]' : 'bg-[#D4432B]'
                              }`}
                              innerClassName="w-full py-2 items-center justify-center"
                            >
                              {eliminando === orden.orderId ? (
                                <ActivityIndicator color="#F7F2E9" size="small" />
                              ) : (
                                <Text className="text-[#F7F2E9] font-bold text-xs">Eliminar</Text>
                              )}
                            </ScalePressable>
                            <ScalePressable
                              onPress={() => setEliminarConfirm(null)}
                              className="flex-1 bg-[#1E1A17] rounded-full items-center"
                              innerClassName="w-full py-2 items-center justify-center"
                            >
                              <Text className="text-[#8C7F6E] font-semibold text-xs">Cancelar</Text>
                            </ScalePressable>
                          </View>
                        </View>
                      )}

                      {orden.items.map((item, i) => (
                        <View key={i} className="flex-row items-start justify-between py-1.5">
                          <View className="flex-1 flex-row items-start gap-2 pr-2">
                            <Text className="text-[#8C7F6E] text-xs font-bold mt-0.5">
                              {item.quantity}x
                            </Text>
                            <View className="flex-1">
                              <View className="flex-row items-center flex-wrap gap-1.5">
                                <Text className="text-[#F7F2E9] text-sm font-semibold">
                                  {item.name}
                                </Text>
                                {item.esExtra && (
                                  <View className="rounded-full bg-[#6C4FBF]/30 px-2 py-0.5">
                                    <Text className="text-[9px] font-extrabold text-[#B79BE8]">
                                      extra
                                    </Text>
                                  </View>
                                )}
                                {item.paraLlevar && (
                                  <View className="rounded-full bg-[#E8A33D]/20 px-2 py-0.5">
                                    <Text className="text-[9px] font-bold text-[#E8A33D]">
                                      tapero +S/ {(item.taperoPrecio ?? 1).toFixed(2)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              {item.entrada && (
                                <Text className="text-[#8C7F6E] text-xs mt-0.5">
                                  + {item.entrada.name} (S/ {item.entrada.price.toFixed(2)})
                                </Text>
                              )}
                              {item.entradaPersonalizada && (
                                <Text className="text-[#8C7F6E] text-xs mt-0.5">
                                  + {item.entradaPersonalizada.name} (S/ {item.entradaPersonalizada.price.toFixed(2)})
                                </Text>
                              )}
                              {item.notes ? (
                                <Text className="text-[#B79BE8] text-xs mt-0.5">
                                  📝  {item.notes}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <Text className="text-[#F7F2E9] font-bold text-sm">
                            S/ {totalItemFila(item).toFixed(2)}
                          </Text>
                        </View>
                      ))}

                      <View className="border-t border-[#3A322B] mt-1.5 pt-2 flex-row items-center justify-between">
                        <Text className="text-[#8C7F6E] text-xs font-bold">Subtotal comanda</Text>
                        <Text className="text-[#E8A33D] font-extrabold">S/ {orden.total.toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {errorEliminar !== '' && (
                  <Text className="text-[#D4432B] text-xs text-center mt-3">{errorEliminar}</Text>
                )}

                <View className="border-t border-[#3A322B] pt-3 mt-1 flex-row items-center justify-between">
                  <Text className="text-[#F7F2E9] font-extrabold text-sm">Total</Text>
                  <Text className="text-[#4D7C4D] font-extrabold text-xl">
                    S/ {venta.total.toFixed(2)}
                  </Text>
                </View>
                <Pressable onPress={cerrarDetalleVenta} className="mt-4 items-center">
                  <Text className="text-[#8C7F6E] font-semibold text-sm">Cerrar</Text>
                </Pressable>
              </>
            );
          })()}
        </Animated.View>
      </Modal>

      <Modal
        visible={filtroPanelAbierto}
        transparent
        animationType="none"
        onRequestClose={() => setFiltroPanelAbierto(false)}
      >
        <Pressable className="flex-1" onPress={() => setFiltroPanelAbierto(false)}>
          <Animated.View entering={FadeIn.duration(180)} className="flex-1 bg-[#130F0C]/70" />
        </Pressable>
        <Animated.View
          entering={FadeInDown.springify().damping(17).stiffness(180)}
          className="absolute bottom-0 inset-x-0 bg-[#2B2420] rounded-t-3xl border-t border-[#3A322B] px-6 pt-5 pb-8"
        >
          <View className="flex-row items-center justify-center gap-1.5 mb-4">
            <Search size={16} color="#F7F2E9" strokeWidth={2.5} />
            <Text className="text-[#F7F2E9] font-extrabold text-lg text-center">Filtrar ventas</Text>
          </View>

          <Text className="text-[#8C7F6E] text-sm font-bold mb-1.5">Orden</Text>
          <View className="flex-row gap-2 mb-4">
            {([
              { valor: 'recientes', texto: 'Más recientes' },
              { valor: 'antiguos', texto: 'Antiguos primero' },
            ] as const).map((op) => {
              const activo = filtroReporte.orden === op.valor;
              return (
                <Pressable
                  key={op.valor}
                  onPress={() => {
                    hapticImpact();
                    setFiltroReporte((f) => ({ ...f, orden: op.valor }));
                  }}
                  className={`flex-1 rounded-full py-2.5 items-center ${activo ? 'bg-[#6C4FBF]' : 'bg-[#1E1A17]'}`}
                >
                  <Text className={`text-xs font-bold ${activo ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                    {op.texto}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-[#8C7F6E] text-sm font-bold mb-1.5">Método de pago</Text>
          <View className="flex-row gap-2 mb-4">
            {([
              { valor: 'todos', texto: 'Todos' },
              { valor: 'YAPE', texto: 'Yape' },
              { valor: 'EFECTIVO', texto: 'Efectivo' },
            ] as const).map((op) => {
              const activo = filtroReporte.metodo === op.valor;
              return (
                <Pressable
                  key={op.valor}
                  onPress={() => {
                    hapticImpact();
                    setFiltroReporte((f) => ({ ...f, metodo: op.valor }));
                  }}
                  className={`flex-1 rounded-full py-2.5 items-center ${activo ? 'bg-[#6C4FBF]' : 'bg-[#1E1A17]'}`}
                >
                  <View className="flex-row items-center gap-1.5">
                    {op.valor === 'YAPE' ? (
                      <Smartphone size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                    ) : op.valor === 'EFECTIVO' ? (
                      <Banknote size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                    ) : null}
                    <Text className={`text-xs font-bold ${activo ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                      {op.texto}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-[#8C7F6E] text-sm font-bold mb-1.5">Canal</Text>
          <View className="flex-row gap-2 mb-6">
            {([
              { valor: 'todos', texto: 'Todos' },
              { valor: 'mesas', texto: 'Mesas' },
              { valor: 'delivery', texto: 'Deliverys' },
            ] as const).map((op) => {
              const activo = filtroReporte.canal === op.valor;
              return (
                <Pressable
                  key={op.valor}
                  onPress={() => {
                    hapticImpact();
                    setFiltroReporte((f) => ({ ...f, canal: op.valor }));
                  }}
                  className={`flex-1 rounded-full py-2.5 items-center ${activo ? 'bg-[#6C4FBF]' : 'bg-[#1E1A17]'}`}
                >
                  <View className="flex-row items-center gap-1.5">
                    {op.valor === 'mesas' ? (
                      <Utensils size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                    ) : op.valor === 'delivery' ? (
                      <Truck size={13} color={activo ? '#F7F2E9' : '#8C7F6E'} strokeWidth={2.5} />
                    ) : null}
                    <Text className={`text-xs font-bold ${activo ? 'text-[#F7F2E9]' : 'text-[#8C7F6E]'}`}>
                      {op.texto}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row gap-3">
            <ScalePressable
              onPress={() => {
                hapticImpact();
                setFiltroReporte({ orden: 'antiguos', metodo: 'todos', canal: 'todos' });
                setFiltroPanelAbierto(false);
              }}
              className="flex-1 bg-[#1E1A17] rounded-full items-center"
              innerClassName="w-full py-3.5 items-center justify-center"
            >
              <Text className="text-[#8C7F6E] font-semibold">Limpiar</Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => setFiltroPanelAbierto(false)}
              className="flex-1 bg-[#6C4FBF] rounded-full items-center"
              innerClassName="w-full py-3.5 items-center justify-center"
            >
              <Text className="text-[#F7F2E9] font-bold">Aplicar</Text>
            </ScalePressable>
          </View>
        </Animated.View>
      </Modal>

      </View>
  );
}