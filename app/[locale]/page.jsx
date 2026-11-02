import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Banknote, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { ProductCard } from '@/components/storefront/product-card';
import { BannerBlock, HeroBlock, StructuredContent } from '@/components/storefront/structured-content';
import { serverGet, serverGetEnvelope } from '@/lib/api/server-api';
import { htmlToText } from '@/lib/safe-html';

export const dynamic = 'force-dynamic';

function localized(value, locale) {
  if (Array.isArray(value)) return value.map((item) => localized(item, locale));
  if (!value || typeof value !== 'object') return value;
  if (Object.hasOwn(value, 'en') || Object.hasOwn(value, 'bn')) return value[locale] ?? value.en ?? value.bn;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localized(item, locale)]));
}

const list = (promise) => promise.then((value) => (Array.isArray(value) ? value : value?.data || [])).catch(() => []);

export default async function HomePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });
  const tt = await getTranslations({ locale, namespace: 'Trust' });
  const [home, settings, categories, collections, featured, newest, sale] = await Promise.all([
    serverGet('/storefront/home', { locale, tags: ['homepage'], revalidate: 60 }).catch(() => null),
    serverGet('/storefront/settings', { locale, tags: ['settings'], revalidate: 60 }).catch(() => ({})),
    list(serverGet('/categories', { locale, tags: ['categories'], revalidate: 300 })),
    list(serverGet('/collections', { locale, tags: ['collections'], revalidate: 300 })),
    list(serverGetEnvelope('/products?featured=true&pageSize=12', { locale, tags: ['products'], revalidate: 60 })),
    list(serverGetEnvelope('/products?sort=newest&pageSize=12', { locale, tags: ['products'], revalidate: 60 })),
    list(serverGetEnvelope('/products?sale=true&pageSize=12', { locale, tags: ['products'], revalidate: 60 }))
  ]);
  const sections = (home?.sections || []).map((section) => ({ ...section, config: localized(section.config, locale) }));
  const topCategories = categories.filter((category) => !category.parentId);
  const insideDays = settings?.delivery?.estimates?.inside_dhaka?.[locale] || settings?.delivery?.estimates?.inside_dhaka?.en;
  const returnDays = settings?.returns?.enabled ? settings.returns.windowDays : null;
  const fallbackImage = [...featured, ...newest].find((product) => product.primaryImage)?.primaryImage?.url;

  const blocks = {
    categories: topCategories.length ? <CategoryCircles key="categories" title={t('categories')} categories={topCategories} locale={locale} /> : null,
    newest: newest.length ? <ProductRail key="newest" title={t('newArrivals')} href={`/${locale}/shop?sort=newest`} viewAll={t('viewAll')} products={newest} locale={locale} /> : null,
    featured: featured.length ? <ProductGridSection key="featured" title={t('bestSellers')} href={`/${locale}/shop`} viewAll={t('viewAll')} products={featured.slice(0, 8)} locale={locale} /> : null,
    sale: sale.length ? <ProductRail key="sale" title={t('onSale')} href={`/${locale}/shop?sale=true`} viewAll={t('viewAll')} products={sale} locale={locale} /> : null,
    collections: collections.length ? <CollectionTiles key="collections" title={t('collections')} viewAll={t('viewAll')} collections={collections} locale={locale} /> : null,
    trust: <TrustStrip key="trust" items={[
      [Banknote, tt('cod'), tt('codText')],
      [Truck, tt('delivery'), insideDays ? tt('deliveryText', { days: insideDays }) : tt('delivery')],
      ...(returnDays ? [[RotateCcw, tt('returns'), tt('returnsText', { days: returnDays })]] : []),
      [ShieldCheck, tt('secure'), tt('secureText')]
    ]} />
  };

  const heroSection = sections.find((section) => section.type === 'hero');
  const heroData = heroSection
    ? { ...heroSection.config, title: heroSection.config.title || t('title'), text: heroSection.config.text || htmlToText(heroSection.config.body) || t('subtitle'), url: heroSection.config.url || heroSection.config.cta?.href || '/shop?sort=newest', cta: heroSection.config.cta?.label || heroSection.config.cta || t('shop'), imageUrl: heroSection.config.imageUrl || heroSection.config.backgroundImage || fallbackImage }
    : { eyebrow: t('eyebrow'), title: t('title'), text: t('subtitle'), url: '/shop?sort=newest', cta: t('shop'), secondaryUrl: sale.length ? '/shop?sale=true' : null, secondaryCta: t('secondary'), imageUrl: fallbackImage };

  // Admin-ordered CMS sections drive the page; product/category sections map to live data.
  const rendered = [];
  const used = new Set();
  for (const section of sections) {
    if (section === heroSection) continue;
    const config = section.config || {};
    if (section.type === 'category_grid' && !used.has('categories')) { used.add('categories'); rendered.push(blocks.categories); }
    else if (section.type === 'collection_grid' && !used.has('collections')) { used.add('collections'); rendered.push(blocks.collections); }
    else if (section.type === 'product_carousel') {
      const source = config.ids?.length ? [...featured, ...newest, ...sale].filter((product, index, all) => config.ids.includes(product.id) && all.findIndex((item) => item.id === product.id) === index) : featured;
      if (source.length) rendered.push(<ProductRail key={section.id} title={config.title || t('bestSellers')} href={`/${locale}/shop`} viewAll={t('viewAll')} products={source} locale={locale} />);
      used.add('featured');
    }
    else if (section.type === 'banner') rendered.push(<div key={section.id} className="container"><BannerBlock data={{ ...config, text: config.text || htmlToText(config.body), url: config.url || config.cta?.href, cta: config.cta?.label || config.cta }} locale={locale} /></div>);
    else if (['editorial', 'countdown', 'testimonials', 'newsletter'].includes(section.type)) rendered.push(<div key={section.id} className="container"><StructuredContent locale={locale} blocks={[{ id: section.id, type: section.type === 'editorial' ? 'rich_text' : section.type, data: section.type === 'editorial' ? { html: config.html || config.body || '' } : config }]} /></div>);
  }
  const defaults = ['categories', 'newest', 'featured', 'sale', 'collections'].filter((key) => !used.has(key)).map((key) => blocks[key]).filter(Boolean);
  const body = [blocks.categories && !used.has('categories') ? blocks.categories : null, blocks.trust, ...rendered, ...defaults.filter((block) => block !== blocks.categories)].filter(Boolean);
  const hasProducts = featured.length || newest.length;

  return (
    <div className="grid gap-14 pb-6 md:gap-20">
      <HeroBlock data={heroData} locale={locale} priority />
      {body}
      {!hasProducts ? <div className="container"><div className="empty-state"><div><p className="font-medium">{t('emptyTitle')}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{t('emptyBody')}</p></div></div></div> : null}
    </div>
  );
}

function SectionHeader({ title, href, viewAll }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
      <h2 className="section-heading">{title}</h2>
      {href ? <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-[14px] underline-offset-4 hover:underline">{viewAll}<ArrowRight size={15} /></Link> : null}
    </div>
  );
}

function CategoryCircles({ title, categories, locale }) {
  return (
    <section className="container" aria-labelledby="home-categories">
      <h2 id="home-categories" className="section-heading mb-5 md:mb-7">{title}</h2>
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:gap-6 md:px-0">
        {categories.slice(0, 12).map((category) => (
          <li key={category.id} className="w-[84px] shrink-0 md:w-auto">
            <Link href={`/${locale}/category/${category.slug}`} className="group grid justify-items-center gap-2.5 text-center">
              <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] transition group-hover:ring-[var(--color-text)]">
                {category.imageUrl ? <Image src={category.imageUrl} alt="" fill sizes="(min-width: 768px) 15vw, 84px" className="object-cover transition duration-500 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-2xl font-medium text-[var(--color-muted)]">{category.name.slice(0, 1)}</span>}
              </span>
              <span className="line-clamp-2 text-[13px] md:text-[14px]">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductRail({ title, href, viewAll, products, locale }) {
  return (
    <section className="container" aria-label={title}>
      <SectionHeader title={title} href={href} viewAll={viewAll} />
      <div className="rail">{products.map((product) => <ProductCard key={product.id} product={product} locale={locale} sizes="(min-width: 1200px) 25vw, (min-width: 768px) 30vw, 45vw" />)}</div>
    </section>
  );
}

function ProductGridSection({ title, href, viewAll, products, locale }) {
  return (
    <section className="container" aria-label={title}>
      <SectionHeader title={title} href={href} viewAll={viewAll} />
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>
    </section>
  );
}

function CollectionTiles({ title, viewAll, collections, locale }) {
  return (
    <section className="container" aria-labelledby="home-collections">
      <h2 id="home-collections" className="section-heading mb-5 md:mb-7">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {collections.slice(0, 4).map((collection) => <BannerBlock key={collection.id} locale={locale} data={{ title: collection.name, text: collection.description, imageUrl: collection.imageUrl, url: `/collection/${collection.slug}`, cta: viewAll }} />)}
      </div>
    </section>
  );
}

function TrustStrip({ items }) {
  return (
    <section className="container">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 border-y border-[var(--color-border)] py-6 md:grid-cols-4">
        {items.map(([Icon, title, text]) => <li key={title} className="flex items-start gap-3"><Icon size={22} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="text-[14px] font-medium">{title}</p><p className="text-[13px] text-[var(--color-muted)]">{text}</p></div></li>)}
      </ul>
    </section>
  );
}
