// src/context/LetrasCocina.tsx
// Ajuste de letras POR-ROL y POR-SECCIÓN.
// Cada app (cocina | delivery | mesero | admin) guarda sus propios ajustes
// en SecureStore bajo `letras_${rol}`, y dentro de cada rol cada sección
// (posits, comandas, mesas, menu, informes) tiene su PROPIA escala.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type FuenteLetras = 'sistema' | 'serif' | 'mono';
export type RolLetras = 'cocina' | 'delivery' | 'mesero' | 'admin';
export type SeccionLetras = 'posits' | 'comandas' | 'mesas' | 'menu' | 'informes';

export const SECCIONES: SeccionLetras[] = ['posits', 'comandas', 'mesas', 'menu', 'informes'];

export const ETIQUETAS_SECCION: Record<SeccionLetras, { icono: string; nombre: string }> = {
  posits: { icono: '📌', nombre: 'Posits (notas)' },
  comandas: { icono: '🧾', nombre: 'Comandas (tickets)' },
  mesas: { icono: '🪑', nombre: 'Mesas' },
  menu: { icono: '📜', nombre: 'Menú / platos' },
  informes: { icono: '📊', nombre: 'Informes / reportes' },
};

const CLAVE_PREFIJO = 'letras_';
const ESCALA_MIN = 0.7;
const ESCALA_MAX = 1.6;
const PASO = 0.1;

const POR_DEFECTO: Record<SeccionLetras, number> = {
  posits: 1,
  comandas: 1,
  mesas: 1,
  menu: 1,
  informes: 1,
};

const NOMBRES_FUENTE: Record<FuenteLetras, string> = {
  sistema: 'Actual',
  serif: 'Serif',
  mono: 'Máquina',
};

const FUENTES: FuenteLetras[] = ['sistema', 'serif', 'mono'];

const FAMILIAS_FUENTE: Record<FuenteLetras, string | undefined> = {
  sistema: undefined,
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
};

export type LetrasCocinaContextType = {
  rol: RolLetras;
  escalas: Record<SeccionLetras, number>;
  escala: number; // escala de comandas (compat)
  t: (n: number) => number; // comandas (compat)
  tPosits: (n: number) => number;
  tComandas: (n: number) => number;
  tMesas: (n: number) => number;
  tMenu: (n: number) => number;
  tInformes: (n: number) => number;
  tDe: (seccion: SeccionLetras, n: number) => number;
  escalaDe: (seccion: SeccionLetras) => number;
  alMinimo: boolean;
  alMaximo: boolean;
  fuente: FuenteLetras;
  fuenteValor: string | undefined;
  fuentes: FuenteLetras[];
  aumentar: (seccion?: SeccionLetras) => void;
  disminuir: (seccion?: SeccionLetras) => void;
  restablecer: (seccion?: SeccionLetras) => void;
  restablecerTodo: () => void;
  cambiarFuente: (fuente: FuenteLetras) => void;
};

const LetrasCocinaContext = createContext<LetrasCocinaContextType | undefined>(undefined);

export function LetrasCocinaProvider({
  rol,
  children,
}: {
  rol: RolLetras;
  children: ReactNode;
}) {
  const clave = `${CLAVE_PREFIJO}${rol}`;
  const [escalas, setEscalas] = useState<Record<SeccionLetras, number>>(POR_DEFECTO);
  const [fuente, setFuente] = useState<FuenteLetras>('sistema');
  const listo = useRef(false);

  useEffect(() => {
    SecureStore.getItemAsync(clave)
      .then((raw) => {
        if (!raw) return;
        try {
          const datos = JSON.parse(raw);
          const normas = { ...POR_DEFECTO };
          for (const seccion of SECCIONES) {
            const v = datos[seccion];
            if (typeof v === 'number') {
              normas[seccion] = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v));
            }
          }
          setEscalas(normas);
          if (datos.fuente === 'serif' || datos.fuente === 'mono') setFuente(datos.fuente);
        } catch {}
      })
      .catch(() => {})
      .finally(() => {
        listo.current = true;
      });
  }, [clave]);

  useEffect(() => {
    if (!listo.current) return;
    SecureStore.setItemAsync(clave, JSON.stringify({ ...escalas, fuente })).catch(() => {});
  }, [escalas, fuente, clave]);

  function aplicarDelta(seccion: SeccionLetras, delta: number) {
    setEscalas((prev) => {
      const destino = (prev[seccion] ?? 1) + delta;
      if (destino < ESCALA_MIN || destino > ESCALA_MAX) return prev;
      return { ...prev, [seccion]: destino };
    });
  }

  function tDe(seccion: SeccionLetras, n: number): number {
    return Math.round(n * (escalas[seccion] ?? 1));
  }

  const valor = useMemo<LetrasCocinaContextType>(
    () => ({
      rol,
      escalas,
      escala: escalas.comandas,
      t: (n: number) => tDe('comandas', n),
      tPosits: (n: number) => tDe('posits', n),
      tComandas: (n: number) => tDe('comandas', n),
      tMesas: (n: number) => tDe('mesas', n),
      tMenu: (n: number) => tDe('menu', n),
      tInformes: (n: number) => tDe('informes', n),
      tDe,
      escalaDe: (seccion: SeccionLetras) => escalas[seccion] ?? 1,
      alMinimo: (escalas.comandas ?? 1) <= ESCALA_MIN,
      alMaximo: (escalas.comandas ?? 1) >= ESCALA_MAX,
      fuente,
      fuenteValor: FAMILIAS_FUENTE[fuente],
      fuentes: FUENTES,
      aumentar: (seccion: SeccionLetras = 'comandas') => aplicarDelta(seccion, PASO),
      disminuir: (seccion: SeccionLetras = 'comandas') => aplicarDelta(seccion, -PASO),
      restablecer: (seccion: SeccionLetras = 'comandas') =>
        setEscalas((prev) => ({ ...prev, [seccion]: 1 })),
      restablecerTodo: () => setEscalas(POR_DEFECTO),
      cambiarFuente: setFuente,
    }),
    [escalas, fuente, rol, tDe],
  );

  return <LetrasCocinaContext.Provider value={valor}>{children}</LetrasCocinaContext.Provider>;
}

export function useLetrasCocina(): LetrasCocinaContextType {
  const contexto = useContext(LetrasCocinaContext);
  if (contexto) return contexto;
  return {
    rol: 'cocina',
    escalas: POR_DEFECTO,
    escala: 1,
    t: (n) => n,
    tPosits: (n) => n,
    tComandas: (n) => n,
    tMesas: (n) => n,
    tMenu: (n) => n,
    tInformes: (n) => n,
    tDe: (_seccion, n) => n,
    escalaDe: () => 1,
    alMinimo: false,
    alMaximo: false,
    fuente: 'sistema',
    fuenteValor: undefined,
    fuentes: FUENTES,
    aumentar: () => {},
    disminuir: () => {},
    restablecer: () => {},
    restablecerTodo: () => {},
    cambiarFuente: () => {},
  };
}
