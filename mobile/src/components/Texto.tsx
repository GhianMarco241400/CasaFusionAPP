// src/components/Texto.tsx
// Wrapper de Text/TextInput que limita el escalado de fuente del sistema.
// No se desactiva del todo (allowFontScaling=false) para no romper
// accesibilidad: se capa a 1.2x, que crece un poco pero no desborda el layout.
// NOTA: los textos de librerías nativas (Alert, modales del SO) no pasan por
// aquí y no se pueden limitar.
import { Text, TextInput, type TextProps, type TextInputProps } from 'react-native';

export const MULTIPLICADOR_FUENTE = 1.2;

export function Texto({
  maxFontSizeMultiplier = MULTIPLICADOR_FUENTE,
  ...props
}: TextProps) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

export function TextoInput({
  maxFontSizeMultiplier = MULTIPLICADOR_FUENTE,
  ...props
}: TextInputProps) {
  return <TextInput maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}
