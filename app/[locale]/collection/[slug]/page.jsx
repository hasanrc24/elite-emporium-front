import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { serverGet } from '@/lib/api/server-api';
import { isRefinedListing } from '@/lib/storefront';
import { CatalogPage } from '@/components/storefront/catalog-page';

export const dynamic = 'force-dynamic';

async function loadCollection(slug, locale) {
  try { return await serverGet(`/collections/${encodeURIComponent(slug)}`, { locale, tags: ['collections'], revalidate: 300 }); } catch (error) { if (error.status === 404) return null; throw error; }
}

export async function generateMetadata({ params, searchParams }) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const collection = await loadCollection(slug, locale).catch(() => null);
  if (!collection) return { title: 'Elite Emporium', robots: { index: false } };
  return { title: collection.name, description: collection.description || undefined, alternates: { canonical: `/${locale}/collection/${slug}`, languages: { en: `/en/collection/${slug}`, bn: `/bn/collection/${slug}` } } };
}

export default async function CollectionPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const collection = await loadCollection(slug, locale);
  if (!collection) notFound();
  const t = await getTranslations({ locale, namespace: 'Home' });
  return <CatalogPage locale={locale} searchParams={await searchParams} fixed={{ collection: slug }} eyebrow={t('collections')} heading={collection.name} description={collection.description} imageUrl={collection.imageUrl} listName={`collection:${slug}`} />;
}
