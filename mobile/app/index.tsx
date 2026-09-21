// app/index.tsx
import { View, Text, TextInput, Pressable, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { loginSchema, LoginFormData } from '../src/schemas/authSchema';
import Logo from '../src/components/Logo';

export default function LoginScreen() {
  const { login } = useAuth();
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
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <Logo altura={130} estilo={{ marginBottom: 22 }} />

        <View className="w-full max-w-sm bg-[#1E1A17]/85 rounded-2xl px-7 py-7">
          <Text className="text-[#F7F2E9] text-2xl font-semibold text-center mb-1">
            Iniciar sesión
          </Text>
          <Text className="text-[#B8AC9B] text-sm text-center mb-6">
            Gestiona tu restaurante, todo en un solo lugar.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row items-center bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 mb-3">
                <Feather name="mail" size={18} color="#B8AC9B" />
                <TextInput
                  className="flex-1 text-[#F7F2E9] text-base ml-3"
                  placeholder="Correo electrónico"
                  placeholderTextColor="#8C7F6E"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  value={value}
                />
              </View>
            )}
          />
          {errors.email && (
            <Text className="text-[#D4432B] text-sm mb-2 -mt-1">{errors.email.message}</Text>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row items-center bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 mb-2">
                <Feather name="lock" size={18} color="#B8AC9B" />
                <TextInput
                  className="flex-1 text-[#F7F2E9] text-base ml-3"
                  placeholder="Contraseña"
                  placeholderTextColor="#8C7F6E"
                  secureTextEntry={!showPassword}
                  onChangeText={onChange}
                  value={value}
                />
                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color="#B8AC9B"
                  />
                </Pressable>
              </View>
            )}
          />
          {errors.password && (
            <Text className="text-[#D4432B] text-sm mb-2">{errors.password.message}</Text>
          )}

          {error !== '' && (
            <Text className="text-[#D4432B] text-sm text-center mt-1 mb-1">{error}</Text>
          )}

          <Pressable
            onPress={handleSubmit(onSubmit)}
            className="mt-5 active:opacity-80"
            style={{
              height: 46,
              borderRadius: 999,
              backgroundColor: '#D4432B',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#D4432B',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            }}
          >
            <Text className="text-[#F7F2E9] text-center font-semibold text-base tracking-wide">
              Ingresar
            </Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}