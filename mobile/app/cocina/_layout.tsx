import { Slot, usePathname } from 'expo-router';
import { View } from 'react-native';
import { HeaderActions } from '../../src/components/HeaderActions';
import { useTema } from '../../src/context/TemaContext';
import { LetrasCocinaProvider } from '../../src/context/LetrasCocina';

export default function CocinaLayout() {
  const { t } = useTema();
  const pathname = usePathname();
  const esHomeCocina = pathname === '/cocina';

  return (
    <LetrasCocinaProvider rol="cocina">
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <Slot />
        {esHomeCocina && <HeaderActions />}
      </View>
    </LetrasCocinaProvider>
  );
}