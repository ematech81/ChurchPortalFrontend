import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { clearPinSetupSkipped } from '../utils/pin-session';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  churchId: string | null;
  hasPin: boolean;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  onboardingDone: boolean;
  isReady: boolean;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  updateTokens: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  setHasPin: (value: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}


function decodePayload(token: string): { sub?: string; exp?: number } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

async function clearStoredAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync('accessToken'),
    SecureStore.deleteItemAsync('refreshToken'),
    SecureStore.deleteItemAsync('user'),
  ]);
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  onboardingDone: false,
  isReady: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    // Returning users who already set up their church don't need to redo onboarding
    if (user.churchId) {
      await SecureStore.setItemAsync('onboardingDone', 'true');
      set({ user, accessToken, onboardingDone: true });
    } else {
      set({ user, accessToken });
    }
  },

  updateTokens: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user, accessToken });
  },

  setOnboardingDone: async () => {
    await SecureStore.setItemAsync('onboardingDone', 'true');
    set({ onboardingDone: true });
  },

  setHasPin: async (value) => {
    set((state) => {
      if (!state.user) return {};
      const updated = { ...state.user, hasPin: value };
      SecureStore.setItemAsync('user', JSON.stringify(updated));
      return { user: updated };
    });
  },

  logout: async () => {
    clearPinSetupSkipped();
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('onboardingDone'),
      SecureStore.deleteItemAsync('user'),
    ]);
    set({ user: null, accessToken: null, onboardingDone: false });
  },

  hydrate: async () => {
    const [token, refreshToken, done, userStr] = await Promise.all([
      SecureStore.getItemAsync('accessToken'),
      SecureStore.getItemAsync('refreshToken'),
      SecureStore.getItemAsync('onboardingDone'),
      SecureStore.getItemAsync('user'),
    ]);

    // No token at all → go to login
    if (!token) {
      set({ isReady: true });
      return;
    }

    const payload = decodePayload(token);

    // Malformed token → clear and go to login
    if (!payload) {
      await clearStoredAuth();
      set({ isReady: true });
      return;
    }

    const isExpired = payload.exp ? payload.exp * 1000 <= Date.now() : true;

    let activeToken = token;

    if (isExpired) {
      // Try to refresh using the stored refresh token
      if (refreshToken && payload.sub) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            userId: payload.sub,
            refreshToken,
          });
          const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
          await SecureStore.setItemAsync('accessToken', newAccess);
          await SecureStore.setItemAsync('refreshToken', newRefresh);
          activeToken = newAccess;
        } catch {
          // Refresh failed → clear everything and go to login
          await clearStoredAuth();
          set({ isReady: true });
          return;
        }
      } else {
        // No refresh token → clear and go to login
        await clearStoredAuth();
        set({ isReady: true });
        return;
      }
    }

    let user: AuthUser | null = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch {
      // Ignore parse error — user will be null (still authenticated via token)
    }

    set({
      user,
      accessToken: activeToken,
      onboardingDone: done === 'true',
      isReady: true,
    });
  },
}));
