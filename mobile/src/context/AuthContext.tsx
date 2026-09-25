// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, getTokenAsync } from '../services/api';
import type { User } from '../types';

type AuthContextType = {
  user: User | null;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  updateAvatar: (avatar: string) => Promise<User>;
  removeAvatar: () => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    async function restaurarSesion() {
      const token = await getTokenAsync();
      if (!token) {
        setIsRestoring(false);
        return;
      }

      try {
        const response = await api.get<User>('/auth/me');
        setUser(response.data);
      } catch {
        await SecureStore.deleteItemAsync('token');
      } finally {
        setIsRestoring(false);
      }
    }

    restaurarSesion();
  }, []);

  async function login(email: string, password: string): Promise<User | null> {
    try {
      const response = await api.post<{ access_token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      const { access_token, user: usuarioBackend } = response.data;

      await SecureStore.setItemAsync('token', access_token);
      setUser(usuarioBackend);

      return usuarioBackend;
    } catch (error) {
      return null;
    }
  }

  async function updateAvatar(avatar: string): Promise<User> {
    const { data } = await api.put<User>(
      '/auth/me/avatar',
      { avatar },
      { timeout: 30000 }
    );
    setUser(data);
    return data;
  }

  async function removeAvatar(): Promise<User> {
    const { data } = await api.delete<User>('/auth/me/avatar');
    setUser(data);
    return data;
  }

  function logout() {
    setUser(null);
    SecureStore.deleteItemAsync('token');
  }

  return (
    <AuthContext.Provider
      value={{ user, isRestoring, login, updateAvatar, removeAvatar, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}