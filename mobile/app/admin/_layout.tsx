// app/admin/_layout.tsx
import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useRef } from 'react';
import { BlurTargetView } from 'expo-blur';
import { HeaderActions } from '../../src/components/HeaderActions';

export default function AdminLayout() {
  const pathname = usePathname();
  const esHomeAdmin = pathname === '/admin';
  const blurRef = useRef<View | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <BlurTargetView ref={blurRef} style={{ flex: 1 }}>
        <Slot />
      </BlurTargetView>
      {esHomeAdmin && <HeaderActions blurTargetRef={blurRef} />}
    </View>
  );
}