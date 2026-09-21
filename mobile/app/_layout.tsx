// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { OrdersProvider } from '../src/context/OrdersContext';
import '../global.css';

const queryClient = new QueryClient();

function GuardiaDeSesion({ children }: { children: ReactNode }) {
  const { user, isRestoring } = useAuth();
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

  if (isRestoring) {
    return (
      <View className="flex-1 items-center justify-center bg-[#1E1A17]">
        <ActivityIndicator size="large" color="#D4432B" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrdersProvider>
            <GuardiaDeSesion>
              <Stack screenOptions={{ headerShown: false }} />
            </GuardiaDeSesion>
          </OrdersProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
