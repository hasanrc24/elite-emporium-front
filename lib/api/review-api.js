import { browserApi } from './browser-api';

export const reviewApi = {
  publicForProduct: (productId, params = {}) => browserApi.get(`/products/${productId}/reviews`, { params, skipAuthRefresh: true }).then((response) => response.data),
  mine: (params = {}) => browserApi.get('/reviews', { params }).then((response) => response.data),
  create: (payload) => browserApi.post('/reviews', payload).then((response) => response.data.data),
  update: (id, payload) => browserApi.patch(`/reviews/${id}`, payload).then((response) => response.data.data),
  remove: (id) => browserApi.delete(`/reviews/${id}`),
};
