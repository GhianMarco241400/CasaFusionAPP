import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useRef } from 'react';
import { BlurTargetView } from 'expo-blur';
import { HeaderActions } from '../../src/components/HeaderActions';
import { LetrasCocinaProvider } from '../../src/context/LetrasCocina';

export default function CocinaLayout() {
  const pathname = usePathname();
  const esHomeCocina = pathname === '/cocina';
  const blurRef = useRef<View | null>(null);

  return (
    <LetrasCocinaProvider rol="cocina">
      <View style={{ flex: 1 }}>
        <BlurTargetView ref={blurRef} style={{ flex: 1 }}>
          <Slot />
        </BlurTargetView>
        {esHomeCocina && <HeaderActions blurTargetRef={blurRef} />}
      </View>
    </LetrasCocinaProvider>
  );
}