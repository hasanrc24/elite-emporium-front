import axios from 'axios';
import { tokenManager } from '@/lib/auth/token-manager';
import { useAuthStore } from '@/lib/auth/auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
export const browserApi = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
let refreshPromise = null;
let bootstrapPromise = null;

function applyAuth(data) {
  tokenManager.set(data.accessToken, data.accessExpiresIn);
  useAuthStore.getState().authenticated(data.user);
  return data.accessToken;
}

// The refresh cookie rotates on every use and the backend revokes the session on
// reuse, so tabs must never refresh concurrently. Web Locks serialise refreshes
// across same-origin tabs; the in-tab promise below deduplicates within a tab.
function exclusive(task) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request('ee-auth-refresh', task);
  return task();
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = exclusive(() => browserApi.post('/auth/refresh', null, { skipAuthRefresh: true })).then((response) => applyAuth(response.data.data)).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

/** Runs the page-load refresh exactly once and settles the auth status. */
export function bootstrapSession() {
  if (!bootstrapPromise) {
    bootstrapPromise = refreshSession().catch((error) => {
      tokenManager.clear();
      if (error?.response?.status === 401) useAuthStore.getState().anonymous();
      else useAuthStore.getState().unavailable();
    });
  }
  return bootstrapPromise;
}

browserApi.interceptors.request.use(async (config) => {
  // Guest-or-user endpoints (cart, wishlist, checkout) resolve their context from the
  // bearer token, so they must not race the bootstrap refresh and fall back to a guest cart.
  if (!config.skipAuthRefresh && useAuthStore.getState().status === 'checking') await bootstrapSession();
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
    // Only an authoritative 401 signs the user out; network/5xx failures must not.
    if (refreshError?.response?.status === 401) { tokenManager.clear(); useAuthStore.getState().anonymous(); }
    throw refreshError;
  }
});

export function apiMessage(error, fallback = 'Something went wrong.') {
  return error?.response?.data?.error?.message || fallback;
}

/** True when the request may not have reached the backend, so an idempotent retry must reuse its key. */
export function isRetryableFailure(error) {
  const status = error?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
}
