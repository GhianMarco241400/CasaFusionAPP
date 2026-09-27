// app/index.tsx
import { View, Text, TextInput, Pressable, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useTema } from '../src/context/TemaContext';
import { loginSchema, LoginFormData } from '../src/schemas/authSchema';
import Logo from '../src/components/Logo';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useTema();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData) {
    const usuarioEncontrado = await login(data.email, data.password);

    if (!usuarioEncontrado) {
      setError('Correo o contraseña incorrectos');
      return;
    }

    setError('');
    router.replace(`/${usuarioEncontrado.role}`);
  }

  return (
    <ImageBackground
      source={require('../assets/login-bg.jpg')}
      resizeMode="cover"
      className="flex-1"
    >
      <StatusBar style="light" />
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <Logo altura={130} estilo={{ marginBottom: 22 }} />

        <View
          className="w-full max-w-sm rounded-2xl px-7 py-7"
          style={{
            backgroundColor: t.surfaceElevated,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Text
            className="text-2xl font-semibold text-center mb-1"
            style={{ color: t.textPrimary }}
          >
            Iniciar sesión
          </Text>
          <Text className="text-sm text-center mb-6" style={{ color: t.placeholder }}>
            Gestiona tu restaurante, todo en un solo lugar.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View
                className="flex-row items-center rounded-xl px-4 py-2.5 mb-3"
                style={{ backgroundColor: t.inputBg, borderColor: t.border, borderWidth: 1 }}
              >
                <Feather name="mail" size={18} color={t.placeholder} />
                <TextInput
                  className="flex-1 text-base ml-3"
                  style={{ color: t.textPrimary }}
                  placeholder="Correo electrónico"
                  placeholderTextColor={t.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.email && (
            <Text className="text-sm mb-2 -mt-1" style={{ color: t.primary }}>
              {errors.email.message}
            </Text>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View
                className="flex-row items-center rounded-xl px-4 py-2.5 mb-2"
                style={{ backgroundColor: t.inputBg, borderColor: t.border, borderWidth: 1 }}
              >
                <Feather name="lock" size={18} color={t.placeholder} />
                <TextInput
                  className="flex-1 text-base ml-3"
                  style={{ color: t.textPrimary }}
                  placeholder="Contraseña"
                  placeholderTextColor={t.placeholder}
                  secureTextEntry={!showPassword}
                  onChangeText={onChange}
                  value={value}
                />
                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={t.placeholder}
                  />
                </Pressable>
              </View>
            )}
          />
          {errors.password && (
            <Text className="text-sm mb-2" style={{ color: t.primary }}>
              {errors.password.message}
            </Text>
          )}

          {error !== '' && (
            <Text className="text-sm text-center mt-1 mb-1" style={{ color: t.primary }}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleSubmit(onSubmit)}
            className="mt-5 active:opacity-80"
            style={{
              height: 46,
              borderRadius: 999,
              backgroundColor: t.primary,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: t.primary,
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <Text className="text-center font-semibold text-base tracking-wide" style={{ color: t.onPrimary }}>
              Ingresar
            </Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}