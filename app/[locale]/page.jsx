import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ArrowUpRight, BadgeCheck, PackageCheck, PackageSearch, RotateCcw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { StructuredContent } from '@/components/storefront/structured-content';
import { serverGet } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';

function localized(value, locale) {
  if (Array.isArray(value)) return value.map((item) => localized(item, locale));
  if (!value || typeof value !== 'object') return value;
  if (Object.hasOwn(value, 'en') || Object.hasOwn(value, 'bn')) return value[locale] ?? value.en ?? value.bn;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localized(item, locale)]));
}

export default async function HomePage({ params }) {
  const { locale } = await params; const t = await getTranslations('Home');
  let products = []; let home = null; let categories = []; let collections = [];
  try { [products, home, categories, collections] = await Promise.all([serverGet('/products?featured=true&pageSize=12', { locale, tags: ['products'], revalidate: 60 }), serverGet('/storefront/home', { locale, tags: ['homepage'], revalidate: 60 }), serverGet('/categories', { locale, tags: ['categories'], revalidate: 300 }), serverGet('/collections', { locale, tags: ['collections'], revalidate: 300 })]); } catch { /* Backend may be bootstrapping. */ }
  const sections = home?.sections || [];
  if (!sections.length) return <LaunchFallback locale={locale} t={t} products={products} />;
  return <div className="grid gap-24 pb-12">{sections.map((section) => <HomepageSection key={section.id} section={{ ...section, config: localized(section.config, locale) }} locale={locale} products={products} categories={categories} collections={collections} />)}</div>;
}

function HomepageSection({ section, locale, products, categories, collections }) {
  const config = section.config || {};
  if (['hero', 'banner', 'editorial', 'countdown', 'testimonials', 'newsletter'].includes(section.type)) {
    const type = section.type === 'editorial' ? 'rich_text' : section.type;
    const heroDefaults = section.type === 'hero' ? { title: locale === 'bn' ? 'আপনার প্রতিদিনের জন্য তৈরি' : 'Made for the life you live', text: locale === 'bn' ? 'আরাম, নিজস্বতা ও প্রতিদিনের আত্মবিশ্বাসের জন্য বাছাই করা পোশাক।' : 'Considered dresses for comfort, character, and everyday confidence.', url: '/shop', cta: locale === 'bn' ? 'কালেকশন দেখুন' : 'Explore the collection' } : {};
    const rawUrl = config.url || config.cta?.href || heroDefaults.url;
    const sectionUrl = rawUrl && !/^https:\/\//.test(rawUrl) && !rawUrl.startsWith(`/${locale}`) ? `/${locale}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}` : rawUrl;
    const data = section.type === 'editorial' ? { html: config.html || config.body || '' } : { ...heroDefaults, ...config, title: config.title || heroDefaults.title, text: config.text || config.body || heroDefaults.text, url: sectionUrl, cta: config.cta?.label || config.cta || heroDefaults.cta };
    return <section className={section.type === 'hero' ? 'container pt-8' : 'container'}><StructuredContent locale={locale} blocks={[{ id: section.id, type, data }]} /></section>;
  }
  if (section.type === 'product_carousel') { const selected = config.ids?.length ? products.filter((product) => config.ids.includes(product.id)) : products.slice(0, config.query?.limit || 8); return <EntitySection title={config.title || 'Featured products'} href={`/${locale}/shop`}><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{selected.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div></EntitySection>; }
  if (section.type === 'category_grid') return <EntitySection title={config.title || 'Shop categories'}><LinkGrid values={categories} locale={locale} type="category" ids={config.ids} /></EntitySection>;
  if (section.type === 'collection_grid') return <EntitySection title={config.title || 'Collections'}><LinkGrid values={collections} locale={locale} type="collection" ids={config.ids} /></EntitySection>;
  if (section.type === 'blog_feed') return <EntitySection title={config.title || 'Stories'} href={`/${locale}/blog`}><p className="muted">Explore the latest stories, styling ideas, and lookbooks.</p></EntitySection>;
  return null;
}

function EntitySection({ title, href = null, children }) { return <section className="container"><div className="mb-9 flex items-end justify-between gap-5"><div><p className="eyebrow">Curated for you</p><h2 className="section-title mt-3">{title}</h2></div>{href ? <Link className="group hidden items-center gap-2 border-b border-[var(--color-border-strong)] pb-1 text-sm font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] sm:inline-flex" href={href}>View all <ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link> : null}</div>{children}{href ? <Link className="mt-7 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-primary)] sm:hidden" href={href}>View all <ArrowRight size={16} /></Link> : null}</section>; }
function LinkGrid({ values, ids, locale, type }) { const selected = ids?.length ? values.filter((item) => ids.includes(item.id)) : values.slice(0, 8); return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{selected.map((item, index) => <Link className={`group relative min-h-52 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-6 transition duration-300 hover:-translate-y-1 hover:bg-[var(--color-primary-soft)] ${index < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}`} key={item.id} href={`/${locale}/${type}/${item.slug}`}><span aria-hidden="true" className="absolute -bottom-20 -right-16 size-56 rounded-full border-[42px] border-white/50 transition duration-500 group-hover:scale-110" /><p className="eyebrow relative">{type}</p><h3 className="relative mt-4 max-w-[75%] text-2xl font-semibold tracking-[-.035em]">{item.name}</h3>{item.description ? <p className="relative mt-2 line-clamp-2 max-w-[80%] text-sm muted">{item.description}</p> : null}<span className="absolute bottom-5 right-5 grid size-10 place-items-center rounded-[.75rem] bg-[var(--color-surface)] text-[var(--color-primary)] transition group-hover:bg-[var(--color-primary)] group-hover:text-white"><ArrowUpRight size={17} /></span></Link>)}</div>; }

function LaunchFallback({ locale, t, products }) { const bn = locale === 'bn'; return <>
  <section className="relative overflow-hidden">
    <div aria-hidden="true" className="absolute left-[9%] top-20 h-px w-24 bg-[var(--color-border-strong)]" />
    <div className="container relative grid min-h-[690px] items-center gap-14 py-16 md:grid-cols-[1.08fr_.92fr] md:py-24">
      <div className="relative z-10 max-w-3xl"><div className="mb-7 flex items-center gap-3"><span className="h-px w-8 bg-[var(--color-primary)]" /><p className="eyebrow">{t('eyebrow')}</p></div><h1 className="display-title">{t('title')}</h1><p className="mt-7 max-w-[54ch] text-base leading-8 muted sm:text-lg">{t('subtitle')}</p><div className="mt-9 flex flex-wrap items-center gap-5"><Button asChild className="min-h-12 px-6"><Link href={`/${locale}/shop`}>{t('shop')} <ArrowRight size={17} /></Link></Button><Link className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]" href={`/${locale}/track-order`}>{bn ? 'অর্ডার ট্র্যাক করুন' : 'Track an order'}<ArrowUpRight size={16} className="text-[var(--color-primary)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></div><div className="mt-11 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--color-border)] pt-5 text-xs font-medium text-[var(--color-muted)]"><span className="flex items-center gap-2"><BadgeCheck size={16} className="text-[var(--color-primary)]" />{bn ? 'যাচাইকৃত মান' : 'Quality checked'}</span><span className="flex items-center gap-2"><Truck size={16} className="text-[var(--color-primary)]" />{bn ? 'সারাদেশে ডেলিভারি' : 'Delivery across Bangladesh'}</span></div></div>
      <div aria-hidden="true" className="relative mx-auto aspect-[.92] w-full max-w-[520px]"><div className="absolute inset-x-[8%] bottom-[2%] top-[10%] rotate-3 rounded-[2.7rem] bg-[var(--color-primary-soft)]" /><div className="absolute bottom-[9%] left-0 top-0 w-[69%] -rotate-2 overflow-hidden rounded-[2.7rem] bg-[linear-gradient(155deg,var(--color-primary-strong),var(--color-primary))] shadow-[var(--shadow-md)]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_20%,rgb(255_255_255/.18),transparent_35%)]" /><div className="absolute left-8 top-8 text-[10px] font-semibold uppercase tracking-[.22em] text-white/55">Edition / 01</div><div className="absolute bottom-10 left-8 right-8"><span className="block text-[clamp(3rem,9vw,5rem)] font-medium leading-[.78] tracking-[-.08em] text-white">quiet<br />form</span><p className="mt-6 max-w-48 text-xs leading-5 text-white/60">Considered shape. Comfortable movement. Made for real days.</p></div></div><div className="absolute bottom-0 right-0 grid h-[58%] w-[49%] place-items-center overflow-hidden rounded-[2rem] border-[8px] border-[var(--color-bg)] bg-[var(--color-surface-muted)]"><div className="absolute -right-8 -top-10 size-44 rounded-full border-[34px] border-[var(--color-primary)]/12" /><div className="relative text-center"><p className="text-[5rem] font-medium leading-none tracking-[-.09em] text-[var(--color-primary)]">EE</p><p className="mt-3 text-[9px] font-semibold uppercase tracking-[.24em] text-[var(--color-muted)]">Dhaka · Bangladesh</p></div></div></div>
    </div>
  </section>
  <div className="container grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] md:grid-cols-[1.4fr_1fr_1fr]"><Benefit Icon={PackageCheck} title={bn ? 'নির্বাচিত সংগ্রহ' : 'Thoughtfully selected'} text={bn ? 'মান ও আরামের জন্য' : 'Chosen for quality and comfort'} featured /><Benefit Icon={Truck} title={bn ? 'নির্ভরযোগ্য ডেলিভারি' : 'Reliable delivery'} text={bn ? 'অর্ডারের প্রতিটি ধাপে' : 'Updates at every order step'} /><Benefit Icon={RotateCcw} title={bn ? 'সহজ সহায়তা' : 'Easy support'} text={bn ? 'আপনার প্রয়োজনে পাশে' : 'Simple help when you need it'} /></div>
  <div className="pt-24"><EntitySection title={t('featured')} href={`/${locale}/shop`}>{products.length ? <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div> : <div className="empty-state"><div><PackageSearch className="mx-auto text-[var(--color-primary)]" /><p className="mt-4 font-semibold">{bn ? 'সংগ্রহ প্রস্তুত হচ্ছে' : 'The collection is being prepared'}</p><p className="mt-1 text-sm muted">{bn ? 'পণ্য যোগ হলে এখানে দেখা যাবে।' : 'Products will appear here as soon as they are published.'}</p></div></div>}</EntitySection></div>
  </>; }

function Benefit({ Icon, title, text, featured = false }) { return <div className={`flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-6 last:border-0 md:border-b-0 md:border-r md:last:border-r-0 ${featured ? 'bg-[var(--color-primary-soft)]' : ''}`}><span className="grid size-10 shrink-0 place-items-center rounded-[.75rem] bg-[var(--color-surface)] text-[var(--color-primary)]"><Icon size={18} /></span><div><p className="text-sm font-semibold">{title}</p><p className="text-xs muted">{text}</p></div></div>; }
