import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/config';

function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as any;
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;
      const storedRefresh = await SecureStore.getItemAsync('refreshToken');
      const storedAccess  = await SecureStore.getItemAsync('accessToken');
      if (storedRefresh && storedAccess) {
        const payload = decodeJwtPayload(storedAccess);
        if (payload?.sub) {
          try {
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              userId: payload.sub,
              refreshToken: storedRefresh,
            });
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
            await SecureStore.setItemAsync('accessToken', newAccess);
            await SecureStore.setItemAsync('refreshToken', newRefresh);
            config.headers = config.headers ?? {};
            config.headers.Authorization = `Bearer ${newAccess}`;
            return api(config);
          } catch {
            // refresh failed — fall through to clear tokens
          }
        }
      }
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
    return Promise.reject(error);
  },
);
