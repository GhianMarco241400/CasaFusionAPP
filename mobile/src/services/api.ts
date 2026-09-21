// src/services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'http://192.168.101.70:3000';

export async function getTokenAsync(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('token');
  } catch {
    return null;
  }
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
});

api.interceptors.request.use(async (config) => {
  const token = await getTokenAsync();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});