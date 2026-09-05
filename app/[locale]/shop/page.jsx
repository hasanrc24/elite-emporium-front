import Link from 'next/link';
import { ChevronLeft, ChevronRight, PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '@/components/storefront/product-card';
import { Field, NativeSelect } from '@/components/ui';
import { serverGet, serverGetEnvelope } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shop' };

export default async function ShopPage({ params, searchParams }) {
  const { locale } = await params;
  const query = await searchParams;
  const allowed = ['search', 'category', 'brand', 'minPrice', 'maxPrice', 'available', 'sale', 'sort', 'page'];
  const filters = Object.fromEntries(allowed.map((key) => [key, Array.isArray(query[key]) ? query[key][0] : String(query[key] || '')]).filter(([, value]) => value));
  const apiQuery = new URLSearchParams({ ...filters, pageSize: '24' });
  let result = { data: [], meta: null }; let categories = []; let brands = []; let error = null;
  try { [result, categories, brands] = await Promise.all([serverGetEnvelope(`/products?${apiQuery}`, { locale, revalidate: 30 }), serverGet('/categories', { locale, revalidate: 300 }), serverGet('/brands', { locale, revalidate: 300 })]); } catch (caught) { error = caught; }
  const page = Number(result.meta?.page || 1);
  const pageHref = (next) => { const value = new URLSearchParams(filters); value.set('page', String(next)); return `/${locale}/shop?${value}`; };
  const filterCount = ['search', 'category', 'brand', 'minPrice', 'maxPrice', 'available', 'sale'].filter((key) => filters[key]).length;

  return <div className="container py-8 md:py-11">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Elite collection</p><h1 className="storefront-page-title mt-2">All products</h1><p className="mt-2 text-sm text-[var(--color-muted)]">{result.meta?.total || 0} carefully selected pieces</p></div>{filterCount ? <Link href={`/${locale}/shop`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]"><X size={14} /> Clear {filterCount} filters</Link> : null}</div>
    <div className="grid items-start gap-8 lg:grid-cols-[220px_1fr]">
      <details className="shop-filter storefront-panel lg:sticky lg:top-24">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4"><span className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal size={15} />Filter & sort</span>{filterCount ? <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[9px] font-bold text-white">{filterCount}</span> : <span className="text-xs text-[var(--color-muted)] lg:hidden">Open</span>}</summary>
        <form className="grid gap-5 border-t border-[var(--color-border)] p-4">
        <label className="field"><span>Search</span><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" /><input className="!min-h-10 !pl-9 !text-xs" name="search" defaultValue={filters.search} placeholder="Product or style" /></div></label>
        <FilterSelect label="Category" name="category" value={filters.category} options={categories} />
        <FilterSelect label="Brand" name="brand" value={filters.brand} options={brands} />
        <div><p className="mb-2 text-xs font-semibold">Price range</p><div className="grid grid-cols-2 gap-2"><input className="!min-h-10 !text-xs" name="minPrice" inputMode="decimal" defaultValue={filters.minPrice} placeholder="Min" /><input className="!min-h-10 !text-xs" name="maxPrice" inputMode="decimal" defaultValue={filters.maxPrice} placeholder="Max" /></div></div>
        <Field label="Sort by"><NativeSelect className="text-xs" name="sort" defaultValue={filters.sort || ''} options={[{ value: '', label: 'Newest' }, { value: 'price_asc', label: 'Price: low to high' }, { value: 'price_desc', label: 'Price: high to low' }, { value: 'rating', label: 'Top rated' }]} /></Field>
        <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" name="available" value="true" defaultChecked={filters.available === 'true'} /> In stock only</label>
        <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" name="sale" value="true" defaultChecked={filters.sale === 'true'} /> On sale</label>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-[#151719] px-4 text-xs font-semibold text-white"><Search size={14} />Apply filters</button>
        </form>
      </details>

      <section className="min-w-0">
        <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-3"><p className="text-xs text-[var(--color-muted)]">Showing <strong className="text-[var(--color-text)]">{result.data.length}</strong> products</p><p className="text-[10px] text-[var(--color-muted)]">Page {page} of {result.meta?.pageCount || 1}</p></div>
        {error ? <CatalogEmpty title="The catalog is temporarily unavailable" body="Please try again in a moment." /> : result.data.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 xl:grid-cols-4">{result.data.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div> : <CatalogEmpty title="No matching products" body="Try removing a filter or browse the complete collection." />}
        {result.meta?.pageCount > 1 ? <nav aria-label="Product pages" className="mt-12 flex items-center justify-center gap-3">{page > 1 ? <PageLink href={pageHref(page - 1)}><ChevronLeft size={15} />Previous</PageLink> : null}<span className="px-3 text-xs text-[var(--color-muted)]">{page} / {result.meta.pageCount}</span>{page < result.meta.pageCount ? <PageLink href={pageHref(page + 1)}>Next<ChevronRight size={15} /></PageLink> : null}</nav> : null}
      </section>
    </div>
  </div>;
}

function FilterSelect({ label, name, value, options }) { return <Field label={label}><NativeSelect className="text-xs" name={name} defaultValue={value || ''} options={[{ value: '', label: `All ${label.toLowerCase()}` }, ...options.map((item) => ({ value: item.slug, label: item.name }))]} /></Field>; }
function CatalogEmpty({ title, body }) { return <div className="empty-state"><div><PackageSearch className="mx-auto text-[var(--color-primary)]" /><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{body}</p></div></div>; }
function PageLink({ href, children }) { return <Link className="inline-flex min-h-10 items-center gap-1 rounded-sm border border-[var(--color-border)] px-4 text-xs font-semibold hover:border-[var(--color-primary)]" href={href}>{children}</Link>; }
