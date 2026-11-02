import { browserApi } from './browser-api';
import { readMetaTracking } from '@/lib/meta-tracking';

export const orderApi = {
  quote: (payload) => browserApi.post('/checkout/quote', { ...payload, tracking: readMetaTracking() || undefined }).then((response) => response.data.data),
  create: (payload, idempotencyKey) => browserApi.post('/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } }).then((response) => response.data.data),
  startBkash: (quoteId, idempotencyKey) => browserApi.post('/payments/bkash/create', { quoteId }, { headers: { 'Idempotency-Key': idempotencyKey } }).then((response) => response.data.data),
  recoverBkash: (payload) => browserApi.post('/payments/bkash/recover', payload, { skipAuthRefresh: true }).then((response) => response.data.data),
  list: (params = {}) => browserApi.get('/orders', { params }).then((response) => response.data),
  get: (id) => browserApi.get(`/orders/${id}`).then((response) => response.data.data),
  track: (payload) => browserApi.post('/orders/track', payload, { skipAuthRefresh: true }).then((response) => response.data.data),
  cancel: (id, reason) => browserApi.post(`/orders/${id}/cancel`, { reason }).then((response) => response.data.data),
  submitManualPayment: (payload) => browserApi.post('/orders/manual-payment', payload, { skipAuthRefresh: true }).then((response) => response.data.data),
  locations: () => browserApi.get('/locations', { skipAuthRefresh: true }).then((response) => response.data.data),
  lookupConfirmation: (token) => browserApi.post('/orders/confirmation/lookup', { token }, { skipAuthRefresh: true }).then((response) => response.data.data),
  confirm: (token) => browserApi.post('/orders/confirmation', { token }, { skipAuthRefresh: true }).then((response) => response.data.data),
};
