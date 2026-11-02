'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { browserApi } from '@/lib/api/browser-api';
import { trackCommerceEvent } from '@/lib/analytics';
import { resetFiltersPending, useFiltersPending } from './catalog-controls';
import { ProductCard, ProductCardSkeleton } from './product-card';

/** Server-rendered page plus client "Load more" with progress (FE-UX-002). */
export function CatalogResults({ initial, query, locale, listName, endpoint = '/products', previousHref = null }) {
  const t = useTranslations('Listing');
  const [pages, setPages] = useState({ items: initial.data, page: initial.meta?.page || 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const filtering = useFiltersPending();
  const total = initial.meta?.total || initial.data.length;
  const pageCount = initial.meta?.pageCount || 1;
  const queryKey = JSON.stringify(query);

  // New filters arrive as a new server render; reset the appended pages.
  useEffect(() => { queueMicrotask(() => { setPages({ items: initial.data, page: initial.meta?.page || 1 }); setError(false); resetFiltersPending(); }); }, [initial, queryKey]);
  useEffect(() => { trackCommerceEvent('view_item_list', { item_list_name: listName, items: initial.data.length }); }, [initial, listName]);

  async function loadMore() {
    setLoading(true); setError(false);
    try {
      const next = pages.page + 1;
      const response = await browserApi.get(endpoint, { params: { ...query, page: next, pageSize: 24, locale }, skipAuthRefresh: true });
      setPages((current) => ({ items: [...current.items, ...response.data.data.filter((item) => !current.items.some((existing) => existing.id === item.id))], page: next }));
    } catch { setError(true); } finally { setLoading(false); }
  }

  const shown = pages.items.length;
  const offset = ((initial.meta?.page || 1) - 1) * 24;
  return (
    <>
      {previousHref ? <div className="mt-5 text-center"><Link href={previousHref} scroll={false} className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-8 text-[14px] hover:border-[var(--color-text)]">{t('loadPrevious')}</Link></div> : null}
      <div className="product-grid mt-5" aria-busy={filtering || loading}>
        {filtering
          ? [0, 1, 2, 3, 4, 5, 6, 7].map((key) => <ProductCardSkeleton key={`f-${key}`} />)
          : pages.items.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} priority={index < 4} />)}
        {loading ? [0, 1, 2, 3].map((key) => <ProductCardSkeleton key={`s-${key}`} />) : null}
      </div>
      {pages.page < pageCount ? (
        <div className="mt-12 grid justify-items-center gap-3">
          <p className="text-[13px] text-[var(--color-muted)]" aria-live="polite">{t('showing', { shown: offset + shown, total })}</p>
          <div className="h-0.5 w-48 overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full bg-[var(--color-text)]" style={{ width: `${Math.min(100, Math.round(((offset + shown) / total) * 100))}%` }} /></div>
          <button type="button" onClick={loadMore} disabled={loading} className="mt-2 min-h-12 rounded-[var(--radius-sm)] border border-[var(--color-text)] px-10 text-[15px] transition hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] disabled:opacity-50">{loading ? t('loading') : t('loadMore')}</button>
          {error ? <p role="alert" className="text-[13px] text-[var(--color-danger)]">{t('loadMoreFailed')}</p> : null}
          <noscript><a href={`?${new URLSearchParams({ ...query, page: String(pages.page + 1) })}`}>{t('loadMore')}</a></noscript>
        </div>
      ) : null}
    </>
  );
}
