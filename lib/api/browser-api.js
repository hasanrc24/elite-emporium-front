import axios from 'axios';
import { tokenManager } from '@/lib/auth/token-manager';
import { useAuthStore } from '@/lib/auth/auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
export const browserApi = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
let refreshPromise = null;

function applyAuth(data) {
  tokenManager.set(data.accessToken, data.accessExpiresIn);
  useAuthStore.getState().authenticated(data.user);
  return data.accessToken;
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = browserApi.post('/auth/refresh', null, { skipAuthRefresh: true }).then((response) => applyAuth(response.data.data)).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

browserApi.interceptors.request.use((config) => {
  const token = tokenManager.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

browserApi.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?.skipAuthRefresh || original?._retried || original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register')) throw error;
  original._retried = true;
  try {
    const token = await refreshSession();
    original.headers.Authorization = `Bearer ${token}`;
    return browserApi(original);
  } catch (refreshError) {
    tokenManager.clear(); useAuthStore.getState().anonymous();
    throw refreshError;
  }
});

export function apiMessage(error, fallback = 'Something went wrong.') {
  return error?.response?.data?.error?.message || fallback;
}
