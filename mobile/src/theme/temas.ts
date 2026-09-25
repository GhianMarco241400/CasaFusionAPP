// src/theme/temas.ts
// Paleta central por modo de tema. Se consumen con el hook `useTema()`.
// Por ahora hay dos modos: 'actual' (espresso, el look de siempre) y 'claro'.
// Elegante y Pastel se agregan aquí mismo cuando estén listos.

export type TemaId = 'actual' | 'claro';

export type TemaTokens = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  placeholder: string;
  primary: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  success: string;
  yape: string;
  extrasSheet: string;
  extrasChart: string;
  excel: string;
  overlay: string;
  chip: string;
  chipText: string;
  inputBg: string;
  paper: string;
  pillBg: string;
  pillText: string;
};

export const TEMAS: Record<TemaId, TemaTokens> = {
  actual: {
    background: '#1E1A17',
    surface: '#2B2420',
    surfaceElevated: '#2B2420',
    border: '#3A322B',
    textPrimary: '#F7F2E9',
    textSecondary: '#8C7F6E',
    placeholder: '#B8AC9B',
    primary: '#D4432B',
    onPrimary: '#F7F2E9',
    accent: '#E8A33D',
    onAccent: '#8A5A10',
    success: '#4D7C4D',
    yape: '#6C4FBF',
    extrasSheet: '#EAE2F8',
    extrasChart: '#7FB58A',
    excel: '#217346',
    overlay: '#130F0C',
    chip: '#1E1A17',
    chipText: '#F7F2E9',
    inputBg: 'rgba(255,255,255,0.06)',
    paper: '#FBF7EE',
    pillBg: '#F7F2E9',
    pillText: '#2B2420',
  },
  claro: {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E4DCCB',
    textPrimary: '#2B2420',
    textSecondary: '#8C7F6E',
    placeholder: '#B8AC9B',
    primary: '#C23A22',
    onPrimary: '#F7F2E9',
    accent: '#C98A2E',
    onAccent: '#8A5A10',
    success: '#3E6B3E',
    yape: '#5A3FA0',
    extrasSheet: '#EAE2F8',
    extrasChart: '#6FA47D',
    excel: '#217346',
    overlay: '#130F0C',
    chip: '#2B2420',
    chipText: '#F7F2E9',
    inputBg: 'rgba(0,0,0,0.05)',
    paper: '#FBF7EE',
    pillBg: '#FFFFFF',
    pillText: '#2B2420',
  },
};

export const TEMAS_IDS: TemaId[] = ['actual', 'claro'];

// Convierte "#RRGGBB" + porcentaje en "#RRGGBBAA" (RN soporta 8 dígitos).
export function alpha(hex: string, pct: number): string {
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex) || hex.startsWith('#')) {
    const limpio = hex.slice(1);
    const rgb =
      limpio.length === 3
        ? limpio
            .split('')
            .map((c) => c + c)
            .join('')
        : limpio.slice(0, 6);
    const canal = Math.round(Math.max(0, Math.min(100, pct)) * 2.55)
      .toString(16)
      .padStart(2, '0');
    return `#${rgb}${canal}`;
  }
  return hex;
}