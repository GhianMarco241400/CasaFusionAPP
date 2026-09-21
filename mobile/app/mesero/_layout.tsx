// app/mesero/_layout.tsx
import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useRef } from 'react';
import { BlurTargetView } from 'expo-blur';
import { HeaderActions } from '../../src/components/HeaderActions';

export default function MeseroLayout() {
  const pathname = usePathname();
  const esHomeMesero = pathname === '/mesero';
  const blurRef = useRef<View | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={blurRef} style={{ flex: 1 }}>
        <Slot />
      </BlurTargetView>
      {esHomeMesero && <HeaderActions blurTargetRef={blurRef} />}
    </View>
  );
}