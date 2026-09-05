import { ProductCard } from '@/components/storefront/product-card';
import { serverGet, serverGetEnvelope } from '@/lib/api/server-api';

export async function CatalogListing({ locale, kind, slug }) {
  const filter = kind === 'category' ? 'category' : kind === 'collection' ? 'collection' : 'brand';
  let entity; let result;
  if (kind === 'brand') {
    const [brands, products] = await Promise.all([serverGet('/brands', { locale, revalidate: 300 }), serverGetEnvelope(`/products?brand=${encodeURIComponent(slug)}&pageSize=24`, { locale, revalidate: 30 })]);
    entity = brands.find((item) => item.slug === slug); result = products;
  } else {
    [entity, result] = await Promise.all([serverGet(`/${kind === 'category' ? 'categories' : 'collections'}/${encodeURIComponent(slug)}`, { locale, revalidate: 300 }), serverGetEnvelope(`/products?${filter}=${encodeURIComponent(slug)}&pageSize=24`, { locale, revalidate: 30 })]);
  }
  if (!entity) return <div className="container py-14"><div className="empty-state">This {kind} is unavailable.</div></div>;
  return <div className="container py-8 md:py-11"><header className="relative flex min-h-56 items-center overflow-hidden rounded-[var(--radius-lg)] bg-[#f1e9df] p-8 md:p-12"><div className="relative z-10 max-w-xl"><p className="eyebrow">{kind}</p><h1 className="storefront-page-title mt-3">{entity.name}</h1>{entity.description ? <p className="mt-4 max-w-[58ch] text-sm leading-7 text-[var(--color-muted)]">{entity.description}</p> : null}<p className="mt-4 text-xs font-semibold">{result.meta?.total || result.data.length} products</p></div><span aria-hidden="true" className="absolute -right-20 -top-36 size-[28rem] rounded-full border-[78px] border-white/55" /></header>{entity.children?.length ? <nav aria-label="Subcategories" className="mt-5 flex flex-wrap gap-2"><a href={`/${locale}/${kind}/${slug}`} className="rounded-sm bg-[#151719] px-4 py-2 text-xs font-semibold text-white">All</a>{entity.children.map((child) => <a key={child.id} href={`/${locale}/category/${child.slug}`} className="rounded-sm border border-[var(--color-border)] px-4 py-2 text-xs font-medium transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">{child.name}</a>)}</nav> : null}<div className="mt-8 flex items-center justify-between border-b border-[var(--color-border)] pb-3"><p className="text-xs text-[var(--color-muted)]">Browse {entity.name}</p><a href={`/${locale}/shop?${filter}=${encodeURIComponent(slug)}`} className="text-xs font-semibold text-[var(--color-primary)]">Filter & sort →</a></div><div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{result.data.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>{!result.data.length ? <div className="empty-state mt-9 text-[var(--color-muted)]">No products are currently available here.</div> : null}</div>;
}
