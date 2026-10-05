import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { API_BASE_URL } from '../constants/config';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The server rotates the refresh token on every refresh, so two refreshes racing each other would
// invalidate one another and log the user out. All 401s that arrive together share ONE refresh.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const storedRefresh = await SecureStore.getItemAsync('refreshToken');
  if (!storedRefresh) return null;
  try {
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken: storedRefresh },
      { timeout: 15000 },
    );
    const { accessToken, refreshToken } = res.data;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    useAuthStore.setState({ accessToken });
    return accessToken;
  } catch (err: any) {
    const status = err?.response?.status;
    // Only a definite rejection ends the session. A flaky network must not log people out.
    if (status === 401 || status === 403) return null;
    throw err;
  }
}

async function endSession() {
  await useAuthStore.getState().logout();
  router.replace('/(auth)/login' as any);
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as any;
    const isAuthCall = typeof config?.url === 'string' && config.url.startsWith('/auth/');

    if (error.response?.status === 401 && config && !config._retry && !isAuthCall) {
      config._retry = true;
      try {
        refreshInFlight ??= refreshSession().finally(() => { refreshInFlight = null; });
        const newAccess = await refreshInFlight;
        if (newAccess) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${newAccess}`;
          return api(config);
        }
        await endSession();
      } catch {
        // Network trouble while refreshing: surface the original error, keep the session.
      }
    }
    return Promise.reject(error);
  },
);
