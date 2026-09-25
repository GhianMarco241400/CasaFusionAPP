// src/context/TemaContext.tsx
// Tema visual por dispositivo (se guarda en SecureStore, key `cf_tema`).
// Por defecto: 'actual' (el look espresso de siempre).
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { TEMAS, TEMAS_IDS, TemaId, TemaTokens } from '../theme/temas';

const CLAVE = 'cf_tema';

type TemaContextType = {
  temaId: TemaId;
  t: TemaTokens;
  setTemaId: (id: TemaId) => void;
  temas: TemaId[];
};

const TemaContext = createContext<TemaContextType | undefined>(undefined);

function esTemaValido(v: unknown): v is TemaId {
  return typeof v === 'string' && (TEMAS_IDS as string[]).includes(v);
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [temaId, setTemaIdState] = useState<TemaId>('actual');
  const listo = useRef(false);

  useEffect(() => {
    SecureStore.getItemAsync(CLAVE)
      .then((raw) => {
        if (esTemaValido(raw)) setTemaIdState(raw);
      })
      .catch(() => {})
      .finally(() => {
        listo.current = true;
      });
  }, []);

  useEffect(() => {
    if (!listo.current) return;
    SecureStore.setItemAsync(CLAVE, temaId).catch(() => {});
  }, [temaId]);

  const valor = useMemo<TemaContextType>(
    () => ({
      temaId,
      t: TEMAS[temaId],
      setTemaId: setTemaIdState,
      temas: TEMAS_IDS,
    }),
    [temaId],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextType {
  const contexto = useContext(TemaContext);
  if (!contexto) {
    return { temaId: 'actual', t: TEMAS.actual, setTemaId: () => {}, temas: TEMAS_IDS };
  }
  return contexto;
}