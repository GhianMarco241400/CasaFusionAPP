// app/mesero/_layout.tsx
import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { HeaderActions } from '../../src/components/HeaderActions';
import { useTema } from '../../src/context/TemaContext';

export default function MeseroLayout() {
  const { t } = useTema();
  const pathname = usePathname();
  const esHomeMesero = pathname === '/mesero';

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <Slot />
      {esHomeMesero && <HeaderActions />}
    </View>
  );
}