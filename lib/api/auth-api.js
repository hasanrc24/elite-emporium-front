import { browserApi } from './browser-api';
import { tokenManager } from '@/lib/auth/token-manager';
import { useAuthStore } from '@/lib/auth/auth-store';
import { wishlistApi } from './wishlist-api';
import { cartApi } from './cart-api';
import { mfaChallenge } from '@/lib/auth/mfa-challenge';

const acceptTokens = async (response) => {
  const data = response.data.data;
  if (data.mfaRequired) {
    mfaChallenge.set(data);
    return data;
  }
  tokenManager.set(data.accessToken, data.accessExpiresIn);
  mfaChallenge.clear();
  // Merge before publishing the authenticated state so cart/wishlist queries refetch the merged data.
  try { await Promise.all([wishlistApi.merge(data.user.locale || 'en'), cartApi.merge(data.user.locale || 'en')]); } catch { /* Authentication succeeded; guest data can retry independently. */ }
  useAuthStore.getState().authenticated(data.user);
  return data.user;
};

function broadcastLogout() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('ee-auth');
  channel.postMessage({ type: 'logout' });
  channel.close();
}

export const authApi = {
  login: (payload) => browserApi.post('/auth/login', payload, { skipAuthRefresh: true }).then(acceptTokens),
  register: (payload) => browserApi.post('/auth/register', payload, { skipAuthRefresh: true }).then(acceptTokens),
  verifyMfa: (challengeToken, code) => browserApi.post('/auth/mfa/verify', { challengeToken, code }, { skipAuthRefresh: true }).then(acceptTokens),
  forgotPassword: (identifier) => browserApi.post('/auth/forgot-password', { identifier }, { skipAuthRefresh: true }).then((response) => response.data.data),
  resetPassword: (token, password) => browserApi.post('/auth/reset-password', { token, password }, { skipAuthRefresh: true }),
  changePassword: (payload) => browserApi.post('/auth/change-password', payload),
  sessions: () => browserApi.get('/auth/sessions').then((response) => response.data.data),
  revokeSession: (id) => browserApi.delete(`/auth/sessions/${id}`),
  logoutAll: async () => { try { await browserApi.post('/auth/logout-all'); } finally { tokenManager.clear(); useAuthStore.getState().anonymous(); broadcastLogout(); } },
  resendVerification: (channel) => browserApi.post('/auth/verify/resend', { channel }),
  verifyIdentity: (channel, code) => browserApi.post(`/auth/verify/${channel}`, { code }),
  setupMfa: (label) => browserApi.post('/auth/mfa/setup', { label }).then((response) => response.data.data),
  confirmMfa: (enrollmentId, code) => browserApi.post('/auth/mfa/confirm', { enrollmentId, code }).then((response) => response.data.data),
  disableMfa: (password, code) => browserApi.delete('/auth/mfa', { data: { password, code } }),
  logout: async () => { try { await browserApi.post('/auth/logout', null, { skipAuthRefresh: true }); } finally { tokenManager.clear(); useAuthStore.getState().anonymous(); broadcastLogout(); } },
};
