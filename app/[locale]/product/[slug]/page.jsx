import { notFound } from 'next/navigation';
import { PurchasePanel } from '@/components/storefront/purchase-panel';
import { serverGet } from '@/lib/api/server-api';
import { ProductReviews } from '@/components/storefront/product-reviews';
import Image from 'next/image';
import { ProductCard } from '@/components/storefront/product-card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  try { const product = await serverGet(`/products/${slug}`, { locale, revalidate: 60 }); return { title: product.name, description: product.shortDescription }; } catch { return { title: 'Product' }; }
}

export default async function ProductPage({ params }) {
  const { locale, slug } = await params; let product;
  try { product = await serverGet(`/products/${slug}`, { locale, tags: [`product:${slug}`], revalidate: 60 }); } catch { notFound(); }
  return <div className="container py-8 md:py-12"><Link href={`/${locale}/shop`} className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"><ArrowLeft size={16} />Back to the collection</Link><div className="grid gap-10 lg:grid-cols-[1.16fr_.84fr] lg:gap-14"><ProductGallery product={product} /><section className="lg:sticky lg:top-28 lg:h-fit"><p className="eyebrow">{product.category?.name || 'Elite Emporium'}</p><h1 className="page-title mt-3">{product.name}</h1><p className="mt-5 max-w-[58ch] text-base leading-7 muted">{product.shortDescription}</p><div className="mt-8"><PurchasePanel product={product} locale={locale} /></div><div className="prose mt-9 border-t border-[var(--color-border)] pt-8"><h2 className="text-xl font-semibold">Details</h2><p className="mt-3 whitespace-pre-line muted">{product.description}</p>{product.materialText ? <><h3 className="mt-6 font-semibold">Material</h3><p className="mt-2 muted">{product.materialText}</p></> : null}{product.careText ? <><h3 className="mt-6 font-semibold">Care</h3><p className="mt-2 muted">{product.careText}</p></> : null}</div>{product.sizeCharts?.map((chart) => <SizeChart key={chart.id} chart={chart} />)}</section></div><ProductReviews productId={product.id} />{product.related?.length ? <section className="mt-20 border-t border-[var(--color-border)] pt-12"><p className="eyebrow">Continue exploring</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">You may also like</h2><div className="mt-7 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{product.related.map((item) => <ProductCard key={item.id} product={item} locale={locale} />)}</div></section> : null}</div>;
}

function ProductGallery({ product }) { return <section><div className="grid gap-3 sm:grid-cols-2">{product.images?.length ? product.images.map((image, index) => <div key={image.id} className={`relative overflow-hidden bg-[var(--color-surface-muted)] ${index === 0 ? 'aspect-[4/5] rounded-[2rem] sm:col-span-2' : 'aspect-square rounded-[1.35rem]'}`}><Image src={image.url} alt={image.alt || product.name} fill sizes={index === 0 ? '(max-width: 1024px) 100vw, 55vw' : '(max-width: 640px) 100vw, 28vw'} className="object-cover" priority={index === 0} /></div>) : <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,var(--color-primary-soft),var(--color-surface-muted))] p-8 sm:col-span-2"><div className="relative grid h-full place-items-center text-center text-4xl font-medium tracking-[-.05em] text-[var(--color-primary)]"><span className="absolute -right-24 -top-24 size-80 rounded-full border-[55px] border-white/50" />ELITE<br />EMPORIUM</div></div>}</div></section>; }
function SizeChart({ chart }) { const keys = [...new Set(chart.rows.flatMap((row) => Object.keys(row.cells || {})))]; return <details className="mt-8 border-y border-[var(--color-border)] py-5"><summary className="cursor-pointer text-sm font-semibold">{chart.title} <span className="muted">({chart.units})</span></summary><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Size</th>{keys.map((key) => <th className="p-2 capitalize" key={key}>{key}</th>)}</tr></thead><tbody>{chart.rows.map((row) => <tr className="border-t border-[var(--color-border)]" key={row.label}><th className="p-2 font-semibold">{row.label}</th>{keys.map((key) => <td className="p-2 tabular-nums" key={key}>{row.cells[key] ?? '—'}</td>)}</tr>)}</tbody></table></div></details>; }
