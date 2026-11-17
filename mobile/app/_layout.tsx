// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { OrdersProvider } from '../src/context/OrdersContext';
import { TemaProvider, useTema } from '../src/context/TemaContext';
import '../global.css';

const queryClient = new QueryClient();

function GuardiaDeSesion() {
  const { user, isRestoring } = useAuth();
  const { t } = useTema();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isRestoring) return;

    const rolesProtegidos = ['mesero', 'cocina', 'delivery', 'admin'];
    const enZonaProtegida = rolesProtegidos.includes(segments[0]);

    if (!user && enZonaProtegida) {
      router.replace('/');
      return;
    }

    if (user) {
      const rutaActual = segments.join('/');
      if (rutaActual === '' || rutaActual === '/') {
        router.replace(`/${user.role}`);
      }
    }
  }, [router, segments, user, isRestoring]);

  return (
    <>
      <StatusBar style={t.statusBarStyle} animated />
      {isRestoring ? (
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: t.background }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: t.background },
          }}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TemaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OrdersProvider>
              <GuardiaDeSesion />
            </OrdersProvider>
          </AuthProvider>
        </QueryClientProvider>
      </TemaProvider>
    </GestureHandlerRootView>
  );
}
