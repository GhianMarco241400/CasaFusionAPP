// src/components/Logo.tsx
import { Image, type StyleProp, type ImageStyle } from 'react-native';

const ASPECTOS: Record<'casa' | 'logo2', number> = {
  casa: 955 / 707,
  logo2: 1030 / 390,
};

type LogoProps = {
  fuente?: 'casa' | 'logo2';
  altura?: number;
  estilo?: StyleProp<ImageStyle>;
};

export default function Logo({
  fuente = 'casa',
  altura = 40,
  estilo,
}: LogoProps) {
  const aspecto = ASPECTOS[fuente];
  return (
    <Image
      source={
        fuente === 'logo2'
          ? require('../../assets/logo2.png')
          : require('../../assets/casaFusion.png')
      }
      style={[{ width: Math.round(altura * aspecto), height: altura }, estilo]}
      resizeMode="contain"
    />
  );
}