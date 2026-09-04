import { browserApi } from './browser-api';

export const wishlistApi = {
  current: (locale = 'en') => browserApi.get('/wishlist', { params: { locale } }).then((response) => response.data.data),
  add: (productId, variantId, locale = 'en') => browserApi.post('/wishlist/items', { productId, variantId: variantId || null }, { params: { locale } }).then((response) => response.data.data),
  remove: (itemId, locale = 'en') => browserApi.delete(`/wishlist/items/${itemId}`, { params: { locale } }).then((response) => response.data.data),
  merge: (locale = 'en') => browserApi.post('/wishlist/merge', null, { params: { locale } }).then((response) => response.data.data),
};
