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
  return <div className="container py-14 md:py-18"><header className="max-w-3xl"><p className="eyebrow">{kind}</p><h1 className="page-title mt-3">{entity.name}</h1>{entity.description ? <p className="mt-4 max-w-[62ch] text-lg leading-8 muted">{entity.description}</p> : null}</header>{entity.children?.length ? <nav aria-label="Subcategories" className="mt-7 flex flex-wrap gap-2">{entity.children.map((child) => <a key={child.id} href={`/${locale}/category/${child.slug}`} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">{child.name}</a>)}</nav> : null}<div className="mt-11 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{result.data.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>{!result.data.length ? <div className="empty-state mt-9 text-[var(--color-muted)]">No products are currently available here.</div> : null}</div>;
}
