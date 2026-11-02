'use client';

import { useQuery } from '@tanstack/react-query';
import { browserApi } from '@/lib/api/browser-api';
import { DEFAULT_MIN_IMAGES } from './product-logic';

/**
 * Minimum product images required to publish (settings group `catalog.minProductImages`).
 * Staff without `settings.manage` get a 403 and fall back to the backend default.
 */
export function useMinProductImages() {
  const query = useQuery({
    queryKey: ['admin', 'settings-groups'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: () => browserApi.get('/admin/settings').then((response) => response.data.data),
  });
  const value = Number((query.data || []).find((group) => group.key === 'catalog')?.value?.minProductImages);
  return Number.isInteger(value) && value >= 1 ? Math.min(value, 20) : DEFAULT_MIN_IMAGES;
}
