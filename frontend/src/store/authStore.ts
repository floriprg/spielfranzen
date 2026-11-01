import { UserProfile } from '@spielfranzen/shared';
import { create } from 'zustand';
import { api, clearAuthToken, getAuthToken, setAuthToken } from '../api/client.js';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getAuthToken(),
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ user: null, token: null, isLoading: false });
      return;
    }

    try {
      const user = await api.getMe();
      set({ user, token, isLoading: false, error: null });
    } catch (err: any) {
      console.warn('Session expired or invalid:', err);
      clearAuthToken();
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (emailOrUsername, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login({ emailOrUsername, password });
      setAuthToken(res.token);
      set({ user: res.user, token: res.token, isLoading: false, error: null });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login fehlgeschlagen.' });
      throw err;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register({ username, email, password });
      setAuthToken(res.token);
      set({ user: res.user, token: res.token, isLoading: false, error: null });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registrierung fehlgeschlagen.' });
      throw err;
    }
  },

  logout: () => {
    clearAuthToken();
    set({ user: null, token: null, error: null });
  },
}));
