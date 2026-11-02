import { getTranslations } from 'next-intl/server';
import { isRefinedListing } from '@/lib/storefront';
import { CatalogPage } from '@/components/storefront/catalog-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const title = query.sale === 'true' ? t('sale') : query.sort === 'newest' ? t('newArrivals') : t('all');
  return { title, alternates: { canonical: `/${locale}/shop`, languages: { en: '/en/shop', bn: '/bn/shop', 'x-default': '/en/shop' } }, ...(isRefinedListing(query) ? { robots: { index: false, follow: true } } : {}) };
}

export default async function ShopPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const heading = query.sale === 'true' ? t('sale') : query.sort === 'newest' ? t('newArrivals') : t('all');
  return <CatalogPage locale={locale} searchParams={query} heading={heading} listName="shop" />;
}
