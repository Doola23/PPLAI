import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
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
