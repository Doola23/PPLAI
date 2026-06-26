import axios from 'axios';

// In production: VITE_API_URL if set, else same-origin ('') so requests go to /api on the
// serving domain (reverse-proxy setup). In dev: follow the serving host on :3001 so LAN/mobile
// testing reaches the PC's backend instead of the device's own localhost.
const API_BASE = import.meta.env.VITE_API_URL
  ?? (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : '');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the auth token when one exists, so backend routes that only restrict
// logged-in accounts (e.g. role-based checks) can see who's asking. Public/anonymous
// requests are unaffected -- this is a no-op when no one's logged in.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('plai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
