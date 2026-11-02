import { getTranslations } from 'next-intl/server';
import { Search } from 'lucide-react';
import { CatalogPage } from '@/components/storefront/catalog-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Search' });
  return { title: t('title'), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const q = String(Array.isArray(query.q) ? query.q[0] : query.q || '').trim().slice(0, 80);
  const t = await getTranslations({ locale, namespace: 'Search' });
  const searching = q.length >= 2;
  const form = (
    <form role="search" action={`/${locale}/search`} className="mb-5 flex max-w-xl gap-2">
      <label htmlFor="search-page-q" className="sr-only">{t('label')}</label>
      <input id="search-page-q" name="q" type="search" defaultValue={q} minLength={2} maxLength={80} placeholder={t('placeholder')} className="flex-1" />
      <button className="min-h-[2.875rem] rounded-[var(--radius-sm)] bg-[var(--color-text)] px-5 text-sm font-medium text-[var(--color-bg)]">{t('title')}</button>
    </form>
  );
  // Without a usable term there is nothing to rank: prompt instead of listing the whole catalogue under a search heading.
  if (!searching)
    return (
      <div className="container pb-16">
        <header className="mb-4 mt-4 md:mb-6 md:mt-8"><h1 className="page-heading">{t('title')}</h1></header>
        {form}
        <div className="grid place-items-center gap-2 py-12 text-center" role="status"><Search size={28} className="text-[var(--color-muted)]" aria-hidden="true" /><p className="text-[16px] font-medium">{t('promptTitle')}</p><p className="max-w-sm text-[14px] text-[var(--color-muted)]">{q ? t('minChars') : t('promptBody')}</p></div>
      </div>
    );
  return (
    <CatalogPage locale={locale} searchParams={query} endpoint="/search" fixed={{ q }} searchTerm={q} eyebrow={t('title')} heading={`“${q}”`} listName="search">
      {form}
    </CatalogPage>
  );
}
