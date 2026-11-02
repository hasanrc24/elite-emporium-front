import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { PackageSearch } from 'lucide-react';
import { serverGet, serverGetEnvelope } from '@/lib/api/server-api';
import { catalogQuery, hasActiveFilters } from '@/lib/storefront';
import { CatalogToolbar, ZeroResults } from './catalog-controls';
import { CatalogResults } from './catalog-results';

/**
 * Shared listing for shop, category, collection, brand and search pages:
 * header, sticky filter/sort bar, chips, grid and load-more.
 */
export async function CatalogPage({ locale, searchParams, fixed = {}, heading, description, eyebrow, imageUrl = null, children = null, showCategory = true, showBrand = true, listName, searchTerm = '', endpoint = '/products' }) {
  const t = await getTranslations({ locale, namespace: 'Listing' });
  const query = catalogQuery(searchParams, fixed);
  const { page, ...listQuery } = query;
  let result = { data: [], meta: { total: 0, page: 1, pageCount: 0 } };
  let failed = false;
  const [categories, attributes, brands] = await Promise.all([
    serverGet('/categories', { locale, tags: ['categories'], revalidate: 300 }).catch(() => []),
    serverGet('/attributes', { locale, tags: ['attributes'], revalidate: 300 }).catch(() => []),
    showBrand ? serverGet('/brands', { locale, tags: ['brands'], revalidate: 300 }).catch(() => []) : []
  ]);
  try {
    result = await serverGetEnvelope(`${endpoint}?${new URLSearchParams({ ...listQuery, page: page || '1', pageSize: '24' })}`, { locale, revalidate: 30 });
  } catch { failed = true; }
  return (
    <div className="container pb-10">
      <header className={`relative mb-4 mt-4 overflow-hidden md:mb-6 md:mt-8 ${imageUrl ? 'grid min-h-[200px] items-end rounded-[var(--radius-lg)] p-6 text-white md:min-h-[280px] md:p-10' : ''}`}>
        {imageUrl ? <><Image src={imageUrl} alt="" fill priority sizes="100vw" className="object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-black/55 to-black/5" /></> : null}
        <div className="relative max-w-2xl">
          {eyebrow ? <p className={`eyebrow ${imageUrl ? '!text-white/80' : ''}`}>{eyebrow}</p> : null}
          <h1 className="page-heading mt-1">{heading}</h1>
          {description ? <p className={`mt-2 text-[14px] leading-6 md:text-[15px] ${imageUrl ? 'text-white/85' : 'text-[var(--color-muted)]'}`}>{description}</p> : null}
        </div>
      </header>
      {children}
      <CatalogToolbar total={result.meta?.total || 0} attributes={Array.isArray(attributes) ? attributes : []} categories={Array.isArray(categories) ? categories : []} brands={Array.isArray(brands) ? brands : []} showCategory={showCategory} showBrand={showBrand} locale={locale} relevance={Boolean(fixed.q)} fixed={fixed} endpoint={endpoint} />
      {failed ? (
        <Empty title={t('unavailableTitle')} body={t('unavailableBody')} />
      ) : result.data.length ? (
        <CatalogResults initial={result} query={listQuery} endpoint={endpoint} locale={locale} listName={listName || heading} previousHref={Number(page) > 1 ? `?${new URLSearchParams({ ...listQuery, ...(Number(page) > 2 ? { page: String(Number(page) - 1) } : {}) })}` : null} />
      ) : (
        <ZeroResults locale={locale} categories={Array.isArray(categories) ? categories : []} query={searchTerm} filtered={hasActiveFilters(searchParams, [...(showCategory ? [] : ['category']), ...(showBrand ? [] : ['brand'])])} />
      )}
    </div>
  );
}

function Empty({ title, body, action = null }) {
  return <div className="mt-6 grid place-items-center gap-2 py-16 text-center"><PackageSearch size={28} className="text-[var(--color-muted)]" /><p className="text-[16px] font-medium">{title}</p><p className="max-w-sm text-[14px] text-[var(--color-muted)]">{body}</p>{action}</div>;
}
