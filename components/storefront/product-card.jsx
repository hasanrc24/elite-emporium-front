import Link from 'next/link';
import Image from 'next/image';
import { WishlistButton } from '@/components/storefront/wishlist-button';
import { formatMoney } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

export function ProductCard({ product, locale }) {
  const defaultVariant = product.variants.find((variant) => variant.isDefault) || product.variants[0];
  const unavailable = !defaultVariant?.available && defaultVariant?.stockPolicy === 'deny';
  const hasOptions = (product.variants || []).length > 1;
  return <article className="product-card group relative min-w-0">
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[linear-gradient(145deg,var(--color-primary-soft),var(--color-surface-muted))]">
      <Link href={`/${locale}/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden" aria-label={`View ${product.name}`}>
        {product.primaryImage ? <Image src={product.primaryImage.url} alt={product.primaryImage.alt || product.name} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 ease-out group-hover:scale-[1.035]" /> : <span className="absolute inset-0 grid place-items-center text-center text-[11px] font-semibold tracking-[.22em] text-[var(--color-primary)]/50">ELITE<br />EMPORIUM</span>}
        <span className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        {unavailable ? <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[var(--color-danger)]">Out of stock</span> : null}
        {defaultVariant?.salePrice ? <span className="absolute left-3 top-3 rounded-full bg-[var(--color-danger)] px-3 py-1.5 text-[10px] font-bold text-white">Sale</span> : null}
      </Link>
      <div className="absolute right-3 top-3 z-10"><WishlistButton productId={product.id} variantId={defaultVariant?.id} locale={locale} compact /></div>
      <span className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] border border-black/5" />
    </div>
    <div className="pb-2 pt-4">
      <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[var(--color-primary)]">{product.category?.name || 'Elite Emporium'}</p>
      <h2 className="mt-1 line-clamp-2 text-base font-bold leading-snug tracking-[-.02em] transition group-hover:text-[var(--color-primary)]"><Link href={`/${locale}/product/${product.slug}`}>{product.name}</Link></h2>
      <div className="mt-2 flex items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2 tabular-nums"><strong className="text-base font-bold">{formatMoney(defaultVariant?.price || product.priceRange?.min, locale)}</strong>{defaultVariant?.salePrice ? <del className="text-xs muted">{formatMoney(defaultVariant.regularPrice, locale)}</del> : null}</div>{product.rating?.count ? <p className="text-xs text-[var(--color-warning)]">★ {product.rating.average.toFixed(1)} <span className="muted">({product.rating.count})</span></p> : null}</div>
      <Link href={`/${locale}/product/${product.slug}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-white px-3 text-xs font-bold transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]">{hasOptions ? 'Choose options' : unavailable ? 'View details' : 'View product'} <ArrowUpRight size={14} /></Link>
    </div>
  </article>;
}
