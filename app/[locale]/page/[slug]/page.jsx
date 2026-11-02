import { notFound } from 'next/navigation';
import { StructuredContent } from '@/components/storefront/structured-content';
import { serverGet } from '@/lib/api/server-api';

async function loadPage(slug, locale) {
  try { return await serverGet(`/pages/${encodeURIComponent(slug)}`, { locale, revalidate: 60, tags: [`page:${slug}`] }); } catch (error) { if (error.status === 404) return null; throw error; }
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const page = await loadPage(slug, locale).catch(() => null);
  return page ? { title: page.seo?.title || page.title, description: page.seo?.description, alternates: { canonical: `/${locale}/page/${slug}`, languages: { en: `/en/page/${slug}`, bn: `/bn/page/${slug}` } } } : { title: 'Page' };
}

export default async function ContentPage({ params }) {
  const { locale, slug } = await params;
  const page = await loadPage(slug, locale);
  if (!page) notFound();
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="page-heading">{page.title}</h1>
        {page.excerpt ? <p className="mt-3 text-[16px] leading-7 text-[var(--color-muted)]">{page.excerpt}</p> : null}
        <div className="mt-8 border-t border-[var(--color-border)] pt-8"><StructuredContent blocks={page.blocks} locale={locale} /></div>
      </div>
    </div>
  );
}
