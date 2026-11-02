'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { browserApi } from '@/lib/api/browser-api';
import { ProductCard } from './product-card';

const KEY = 'ee_recently_viewed';

/** Remembers product slugs on this device only (a harmless browsing convenience). */
export function rememberProduct(slug) {
  try {
    const current = JSON.parse(window.localStorage.getItem(KEY) || '[]').filter((value) => typeof value === 'string' && value !== slug);
    window.localStorage.setItem(KEY, JSON.stringify([slug, ...current].slice(0, 12)));
  } catch { /* storage unavailable */ }
}

function readSlugs() {
  try { return JSON.parse(window.localStorage.getItem(KEY) || '[]').filter((value) => typeof value === 'string').slice(0, 12); } catch { return []; }
}

export function RecentlyViewed({ locale, excludeSlug }) {
  const t = useTranslations('Product');
  const [slugs, setSlugs] = useState([]);
  useEffect(() => { queueMicrotask(() => setSlugs(readSlugs().filter((slug) => slug !== excludeSlug).slice(0, 8))); }, [excludeSlug]);
  const products = useQuery({
    queryKey: ['recently-viewed', locale, slugs],
    enabled: slugs.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows = await browserApi.get('/products', { params: { slugs: slugs.join(','), pageSize: slugs.length, locale }, skipAuthRefresh: true }).then((response) => response.data.data);
      return slugs.map((slug) => rows.find((row) => row.slug === slug)).filter(Boolean);
    }
  });
  if (!products.data?.length) return null;
  return (
    <section className="container mt-16" aria-labelledby="recently-viewed">
      <h2 id="recently-viewed" className="section-heading mb-5">{t('recentlyViewed')}</h2>
      <div className="rail">{products.data.map((product) => <ProductCard key={product.id} product={product} locale={locale} sizes="(min-width: 1200px) 25vw, 45vw" />)}</div>
    </section>
  );
}
