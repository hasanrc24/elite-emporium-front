'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'ee-admin-products-list';

/** Remembers the product list's query string (filters, page) for this tab so "Back to products" restores it. */
export function rememberProductList(search) {
  try { window.sessionStorage.setItem(KEY, search || ''); } catch { /* storage unavailable: the plain list link still works */ }
}

const subscribe = () => () => {};
const read = () => {
  try { return window.sessionStorage.getItem(KEY) || ''; } catch { return ''; }
};

export function useProductListHref() {
  const saved = useSyncExternalStore(subscribe, read, () => '');
  return saved && /^\?[\w%=&.,:+-]*$/.test(saved) ? `/admin/products${saved}` : '/admin/products';
}
