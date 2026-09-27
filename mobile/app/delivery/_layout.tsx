// app/delivery/_layout.tsx
import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { HeaderActions } from '../../src/components/HeaderActions';
import { useTema } from '../../src/context/TemaContext';

export default function DeliveryLayout() {
  const { t } = useTema();
  const pathname = usePathname();
  const esHomeDelivery = pathname === '/delivery';

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <Slot />
      {esHomeDelivery && <HeaderActions />}
    </View>
  );
}
