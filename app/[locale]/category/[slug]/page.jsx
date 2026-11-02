import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { serverGet } from '@/lib/api/server-api';
import { isRefinedListing } from '@/lib/storefront';
import { CatalogPage } from '@/components/storefront/catalog-page';

export const dynamic = 'force-dynamic';

async function loadCategory(slug, locale) {
  try { return await serverGet(`/categories/${encodeURIComponent(slug)}`, { locale, tags: ['categories'], revalidate: 300 }); } catch (error) { if (error.status === 404) return null; throw error; }
}

export async function generateMetadata({ params, searchParams }) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const category = await loadCategory(slug, locale).catch(() => null);
  if (!category) return { title: 'Elite Emporium', robots: { index: false } };
  return { title: category.seoTitle || category.name, description: category.seoDescription || category.description || undefined, alternates: { canonical: `/${locale}/category/${slug}`, languages: { en: `/en/category/${slug}`, bn: `/bn/category/${slug}` } } };
}

export default async function CategoryPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const category = await loadCategory(slug, locale);
  if (!category) notFound();
  const t = await getTranslations({ locale, namespace: 'Listing' });
  const children = category.children || [];
  return (
    <CatalogPage locale={locale} searchParams={await searchParams} fixed={{ category: slug }} heading={category.name} description={category.description} imageUrl={category.imageUrl} showCategory={false} listName={`category:${slug}`}>
      {children.length ? (
        <nav aria-label={t('subcategories')} className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[var(--color-text)] px-4 text-[13px] text-[var(--color-bg)]">{t('all')}</span>
          {children.map((child) => <Link key={child.id} href={`/${locale}/category/${child.slug}`} className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-[var(--color-border-strong)] px-4 text-[13px] hover:border-[var(--color-text)]">{child.name}</Link>)}
        </nav>
      ) : null}
    </CatalogPage>
  );
}
