import { notFound } from 'next/navigation';
import { serverGet } from '@/lib/api/server-api';
import { isRefinedListing } from '@/lib/storefront';
import { CatalogPage } from '@/components/storefront/catalog-page';

export const dynamic = 'force-dynamic';

async function loadBrand(slug, locale) {
  const brands = await serverGet('/brands', { locale, tags: ['brands'], revalidate: 300 });
  return (Array.isArray(brands) ? brands : []).find((item) => item.slug === slug) || null;
}

export async function generateMetadata({ params, searchParams }) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const brand = await loadBrand(slug, locale).catch(() => null);
  if (!brand) return { title: 'Elite Emporium', robots: { index: false } };
  return {
    title: brand.name,
    description: brand.description || undefined,
    alternates: { canonical: `/${locale}/brand/${slug}`, languages: { en: `/en/brand/${slug}`, bn: `/bn/brand/${slug}`, 'x-default': `/en/brand/${slug}` } },
    ...(isRefinedListing(query) ? { robots: { index: false, follow: true } } : {})
  };
}

export default async function BrandPage({ params, searchParams }) {
  const { locale, slug } = await params;
  // A failed brand lookup is a backend problem, not a missing brand: let the error boundary show it.
  const brand = await loadBrand(slug, locale);
  if (!brand) notFound();
  return <CatalogPage locale={locale} searchParams={await searchParams} fixed={{ brand: slug }} heading={brand.name} description={brand.description} imageUrl={brand.imageUrl} showBrand={false} listName={`brand:${slug}`} />;
}
