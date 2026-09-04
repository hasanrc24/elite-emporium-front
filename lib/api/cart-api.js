import { browserApi } from './browser-api';

export const cartApi = {
  current: (locale = 'en') => browserApi.get('/carts/current', { params: { locale } }).then((response) => response.data.data),
  add: (variantId, quantity, locale = 'en') => browserApi.post('/carts/items', { variantId, quantity }, { params: { locale } }).then((response) => response.data.data),
  update: (id, quantity, locale = 'en', version = undefined) => browserApi.patch(`/carts/items/${id}`, { quantity, version }, { params: { locale } }).then((response) => response.data.data),
  remove: (id, locale = 'en') => browserApi.delete(`/carts/items/${id}`, { params: { locale } }).then((response) => response.data.data),
  applyCoupon: (code, locale = 'en') => browserApi.post('/carts/coupons', { code }, { params: { locale } }).then((response) => response.data.data),
  removeCoupon: (code, locale = 'en') => browserApi.delete(`/carts/coupons/${encodeURIComponent(code)}`, { params: { locale } }).then((response) => response.data.data),
  merge: (locale = 'en') => browserApi.post('/carts/merge', null, { params: { locale } }).then((response) => response.data.data),
};
