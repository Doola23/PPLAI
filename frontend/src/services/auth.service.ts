import axios from 'axios';
import type { AuthResponse, ProfileUpdate, User } from '../types/auth.types';

const TOKEN_KEY = 'plai_token';

// Production: VITE_API_URL if set, else same-origin ('') → /api on the serving domain.
// Dev: follow the serving host on :3001 so LAN/mobile testing reaches the PC's backend.
const API_BASE = import.meta.env.VITE_API_URL
  ?? (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : '');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !original.url?.includes('/refresh')) {
      original._retry = true;
      try {
        await authService.refreshToken();
        original.headers.Authorization = `Bearer ${authService.getToken()}`;
        return api(original);
      } catch {
        authService.clearLocal();
      }
    }
    return Promise.reject(err);
  }
);

export const authService = {
  async signup(name: string, email: string, password: string, role: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/auth/signup', { name, email, password, role });
    this.setToken(data.token);
    return data;
  },

  async login(email: string, password: string, _role: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    this.clearLocal();
  },

  async refreshToken(): Promise<void> {
    const { data } = await api.post<{ token: string }>('/api/auth/refresh');
    this.setToken(data.token);
  },

  async me(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/api/auth/me');
    return data.user;
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/api/auth/me');
    this.clearLocal();
  },

  async updateProfile(patch: ProfileUpdate): Promise<User> {
    const { data } = await api.patch<{ user: User; token?: string }>('/api/auth/me', patch);
    if (data.token) this.setToken(data.token);
    return data.user;
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearLocal() {
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export default api;
