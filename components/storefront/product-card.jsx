import Link from 'next/link';
import Image from 'next/image';
import { WishlistButton } from '@/components/storefront/wishlist-button';
import { formatMoney } from '@/lib/utils';

export function ProductCard({ product, locale }) {
  const defaultVariant = product.variants.find((variant) => variant.isDefault) || product.variants[0];
  const unavailable = !defaultVariant?.available && defaultVariant?.stockPolicy === 'deny';
  return <article className="group relative min-w-0">
    <div className="absolute right-3 top-3 z-10"><WishlistButton productId={product.id} variantId={defaultVariant?.id} locale={locale} compact /></div>
    <Link href={`/${locale}/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-lg)] bg-[linear-gradient(145deg,var(--color-primary-soft),var(--color-surface-muted))]">{product.primaryImage ? <Image src={product.primaryImage.url} alt={product.primaryImage.alt || product.name} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 ease-out group-hover:scale-[1.035]" /> : <span className="absolute inset-0 grid place-items-center text-center text-[11px] font-semibold tracking-[.22em] text-[var(--color-primary)]/50">ELITE<br />EMPORIUM</span>}{unavailable ? <span className="absolute bottom-3 left-3 rounded-sm bg-white/92 px-2 py-1 text-[9px] font-semibold text-[var(--color-danger)]">Out of stock</span> : null}{defaultVariant?.salePrice ? <span className="absolute left-3 top-3 rounded-sm bg-[var(--color-danger)] px-2 py-1 text-[9px] font-semibold text-white">Sale</span> : null}<span className="absolute inset-0 rounded-[var(--radius-lg)] border border-black/5" /></Link>
    <div className="pb-2 pt-3"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-[var(--color-muted)]">{product.category?.name || 'Elite Emporium'}</p><h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug tracking-[-.01em] transition group-hover:text-[var(--color-primary)]"><Link href={`/${locale}/product/${product.slug}`}>{product.name}</Link></h2><div className="mt-1.5 flex items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2 tabular-nums"><strong className="text-sm font-semibold">{formatMoney(defaultVariant?.price || product.priceRange?.min, locale)}</strong>{defaultVariant?.salePrice ? <del className="text-[10px] muted">{formatMoney(defaultVariant.regularPrice, locale)}</del> : null}</div>{product.rating?.count ? <p className="text-[10px] text-[var(--color-warning)]">★ {product.rating.average.toFixed(1)} <span className="muted">({product.rating.count})</span></p> : null}</div></div>
  </article>;
}
