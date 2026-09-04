import { browserApi } from './browser-api';

export const accountApi = {
  profile: () => browserApi.get('/users/me').then((response) => response.data.data),
  updateProfile: (payload) => browserApi.patch('/users/me', payload).then((response) => response.data.data),
  addresses: () => browserApi.get('/users/me/addresses').then((response) => response.data.data),
  createAddress: (payload) => browserApi.post('/users/me/addresses', payload).then((response) => response.data.data),
  updateAddress: (id, payload) => browserApi.patch(`/users/me/addresses/${id}`, payload).then((response) => response.data.data),
  deleteAddress: (id) => browserApi.delete(`/users/me/addresses/${id}`),
  order: (id) => browserApi.get(`/orders/${id}`).then((response) => response.data.data),
  returns: (params = {}) => browserApi.get('/returns', { params }).then((response) => response.data),
  returnEligibility: (orderId) => browserApi.get('/returns/eligibility', { params: { orderId } }).then((response) => response.data.data),
  createReturn: (payload, idempotencyKey) => browserApi.post('/returns', payload, { headers: { 'Idempotency-Key': idempotencyKey } }).then((response) => response.data.data),
  returnDetail: (id) => browserApi.get(`/returns/${id}`).then((response) => response.data.data),
  cancelReturn: (id, version, reason) => browserApi.post(`/returns/${id}/cancel`, { version, reason }).then((response) => response.data.data),
  guestReturnEligibility: (payload) => browserApi.post('/returns/guest-eligibility', payload, { skipAuthRefresh: true }).then((response) => response.data.data),
  createGuestReturn: (payload, idempotencyKey) => browserApi.post('/returns', payload, { headers: { 'Idempotency-Key': idempotencyKey }, skipAuthRefresh: true }).then((response) => response.data.data),
  guestReturnLookup: (payload) => browserApi.post('/returns/guest-lookup', payload, { skipAuthRefresh: true }).then((response) => response.data.data),
  cancelGuestReturn: (id, payload) => browserApi.post(`/returns/${id}/cancel`, payload, { skipAuthRefresh: true }).then((response) => response.data.data),
  privacyRequests: () => browserApi.get('/users/me/privacy-requests').then((response) => response.data.data),
  createPrivacyRequest: (payload) => browserApi.post('/users/me/privacy-requests', payload).then((response) => response.data.data),
};
