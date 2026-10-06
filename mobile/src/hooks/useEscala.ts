// src/hooks/useEscala.ts
// Escala acotada por ancho de pantalla. NO se usa para escalar todo el layout:
// el recorte real se corrige con flex/flexShrink/numberOfLines. Esto es solo
// para unos pocos tamaños puntuales (p. ej. el chef) y evitar que se vean
// exagerados en tablets o minúsculos en equipos chicos.
import { useWindowDimensions } from 'react-native';

const ANCHO_BASE = 390;
const FACTOR_MIN = 0.85;
const FACTOR_MAX = 1.15;

export function useEscala() {
  const { width, height } = useWindowDimensions();
  const factor = Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, width / ANCHO_BASE));
  const escala = (valor: number) => Math.round(valor * factor);

  return { width, height, factor, escala };
}
