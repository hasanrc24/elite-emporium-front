import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChevronDown } from 'lucide-react';
import { serverGet } from '@/lib/api/server-api';
import { ProductExperience } from '@/components/storefront/product-experience';
import { ProductReviews } from '@/components/storefront/product-reviews';
import { ProductCard } from '@/components/storefront/product-card';
import { RecentlyViewed } from '@/components/storefront/recently-viewed';
import { buildProductJsonLd } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function loadProduct(slug, locale) {
  try { return await serverGet(`/products/${encodeURIComponent(slug)}`, { locale, tags: [`product:${slug}`], revalidate: 60 }); } catch (error) { if (error.status === 404) return null; throw error; }
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const product = await loadProduct(slug, locale).catch(() => null);
  if (!product) {
    const t = await getTranslations({ locale, namespace: 'Product' });
    return { title: t('notFoundTitle'), robots: { index: false } };
  }
  const image = product.primaryImage;
  const canonicalSlug = product.slug || slug;
  const description = product.seo?.description || product.shortDescription || undefined;
  return {
    title: product.seo?.title || product.name,
    description,
    alternates: { canonical: product.seo?.canonicalUrl || `/${locale}/product/${canonicalSlug}`, languages: { en: `/en/product/${canonicalSlug}`, bn: `/bn/product/${canonicalSlug}`, 'x-default': `/en/product/${canonicalSlug}` } },
    openGraph: {
      title: product.seo?.title || product.name,
      description,
      url: `/${locale}/product/${canonicalSlug}`,
      type: 'website',
      locale: locale === 'bn' ? 'bn_BD' : 'en_US',
      alternateLocale: locale === 'bn' ? ['en_US'] : ['bn_BD'],
      images: image ? [{ url: product.seo?.image || image.url, width: image.width || undefined, height: image.height || undefined, alt: image.alt || product.name }] : undefined
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: product.seo?.title || product.name, description, images: image ? [image.url] : undefined }
  };
}

function Section({ title, children, open = false }) {
  return (
    <details open={open} className="group border-b border-[var(--color-border)]">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between text-[15px] font-medium">{title}<ChevronDown size={18} className="transition group-open:rotate-180" aria-hidden="true" /></summary>
      <div className="pb-5 text-[14px] leading-7 text-[var(--color-muted)]">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const { variant: variantParam } = await searchParams;
  const product = await loadProduct(slug, locale);
  if (!product) notFound();
  // A renamed slug resolves to the product; send visitors and crawlers to the canonical URL.
  if (product.slug && product.slug !== slug) {
    const keep = typeof variantParam === 'string' && variantParam ? `?variant=${encodeURIComponent(variantParam)}` : '';
    permanentRedirect(`/${locale}/product/${product.slug}${keep}`);
  }
  const t = await getTranslations({ locale, namespace: 'Product' });
  const fashion = product.fashion || {};
  const details = [
    fashion.pieces ? [t('pieces'), fashion.pieces] : null,
    fashion.stitched != null ? [t('type'), fashion.stitched ? t('stitched') : t('unstitched')] : null,
    fashion.fitType ? [t('fit'), t(`fitTypes.${fashion.fitType}`)] : null,
    fashion.occasion ? [t('occasion'), fashion.occasion] : null,
    fashion.origin ? [t('origin'), fashion.origin] : null,
    product.materialText ? [t('material'), product.materialText] : null,
    product.careText ? [t('care'), product.careText] : null
  ].filter(Boolean);
  const origin = siteOrigin();
  const jsonLd = buildProductJsonLd({ product, locale, origin, slug, labels: { home: t('breadcrumbHome') } });
  const trail = Array.isArray(product.breadcrumbs) && product.breadcrumbs.length ? product.breadcrumbs : product.category ? [product.category] : [];
  const crumbs = [
    { key: 'home', href: `/${locale}`, label: t('breadcrumbHome') },
    ...(trail.length ? trail.map((crumb) => ({ key: `category-${crumb.slug}`, href: `/${locale}/category/${crumb.slug}`, label: crumb.name })) : [{ key: 'shop', href: `/${locale}/shop`, label: t('breadcrumbShop') }])
  ];
  const breadcrumb = { label: t('breadcrumb'), items: crumbs };
  return (
    <div className="pb-20 md:pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="container pt-0 md:pt-6">
        <ProductExperience product={product} locale={locale} breadcrumb={breadcrumb} variantParam={variantParam} />
        <div className="mt-10 grid gap-x-16 md:mt-14 md:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.35fr_1fr]">
          <div className="border-t border-[var(--color-border)] md:col-start-2">
            {product.description ? <Section title={t('description')} open><p className="whitespace-pre-line">{product.description}</p></Section> : null}
            {details.length ? <Section title={t('fabricCare')}><dl className="grid gap-2">{details.map(([label, value], index) => <div key={`${label}-${index}`} className="grid grid-cols-[7rem_1fr] gap-3"><dt className="text-[var(--color-text)]">{label}</dt><dd className="whitespace-pre-line">{value}</dd></div>)}</dl></Section> : null}
            <Section title={t('deliveryReturns')}><p>{t('codAvailable')}.</p><p><Link href={`/${locale}/page/shipping`} className="underline underline-offset-4">{t('details')}</Link></p></Section>
          </div>
        </div>
        <div className="mt-16"><ProductReviews productId={product.id} locale={locale} fitFeedback={product.fitFeedback} /></div>
      </div>
      {product.completeTheLook?.length ? (
        <section className="container mt-16" aria-labelledby="look-heading">
          <h2 id="look-heading" className="section-heading mb-5">{t('completeLook')}</h2>
          <div className="rail">{product.completeTheLook.map((item) => <ProductCard key={item.id} product={item} locale={locale} sizes="(min-width: 1200px) 25vw, 45vw" />)}</div>
        </section>
      ) : null}
      {product.related?.length ? (
        <section className="container mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="section-heading mb-5">{t('youMayLike')}</h2>
          <div className="rail">{product.related.map((item) => <ProductCard key={item.id} product={item} locale={locale} sizes="(min-width: 1200px) 25vw, 45vw" />)}</div>
        </section>
      ) : null}
      <RecentlyViewed locale={locale} excludeSlug={slug} />
    </div>
  );
}
