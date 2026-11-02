'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Table state (page, pageSize, search and filters) kept in the URL so reload,
 * back/forward and shared links restore the same view. Changing anything other
 * than `page` returns to page 1. Values equal to their default are omitted.
 *
 *   const [params, setParams] = useTableParams({ page: 1, pageSize: 25, search: '', status: '' });
 */
export function useTableParams(defaults, { prefix = '' } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultsKey = JSON.stringify(defaults);

  const params = useMemo(() => {
    const base = JSON.parse(defaultsKey);
    const result = { ...base };
    for (const key of Object.keys(base)) {
      const raw = searchParams.get(prefix + key);
      if (raw == null) continue;
      if (typeof base[key] === 'number') {
        const value = Number(raw);
        if (Number.isFinite(value) && value > 0) result[key] = Math.floor(value);
      } else result[key] = raw;
    }
    return result;
  }, [searchParams, defaultsKey, prefix]);

  const setParams = useCallback((patch) => {
    const base = JSON.parse(defaultsKey);
    const next = { ...params, ...patch };
    if (!('page' in patch) && Object.keys(patch).some((key) => key !== 'page')) next.page = 1;
    const query = new URLSearchParams(searchParams.toString());
    for (const key of Object.keys(base)) {
      if (next[key] === base[key] || next[key] === '' || next[key] == null) query.delete(prefix + key);
      else query.set(prefix + key, String(next[key]));
    }
    const qs = query.toString();
    // Paging adds a history entry so Back returns to the previous page;
    // search and filter edits replace it to avoid one entry per keystroke.
    const method = Object.keys(patch).every((key) => key === 'page') ? 'push' : 'replace';
    router[method](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, searchParams, router, pathname, defaultsKey, prefix]);

  return [params, setParams];
}

/** Value that only updates after `delay` ms without changes (search inputs). */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Search box state for a URL-backed table: typing updates instantly, the URL
 * (and so the query) follows after a pause.
 */
export function useSearchInput(value, onCommit, delay = 300) {
  const [text, setText] = useState(value || '');
  const debounced = useDebouncedValue(text, delay);
  const committed = useRef(value || '');
  useEffect(() => {
    if (debounced.trim() === committed.current) return;
    committed.current = debounced.trim();
    onCommit(committed.current);
  }, [debounced, onCommit]);
  // Follow external changes (back/forward, "clear filters").
  useEffect(() => {
    if ((value || '') !== committed.current) { committed.current = value || ''; setText(value || ''); }
  }, [value]);
  return [text, setText];
}
