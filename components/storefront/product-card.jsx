import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { WishlistButton } from '@/components/storefront/wishlist-button';
import { defaultVariant, formatNumber, knownQuantity, productBadges, quickAddVariant, secondaryImage, sizeSummary } from '@/lib/storefront';
import { discountPercent, formatMoney } from '@/lib/utils';
import { QuickAdd } from './quick-add';

/** Listing card (FE-UX-002): portrait image, hover image, badges, sizes and price. */
export function ProductCard({ product, locale, priority = false, sizes = '(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw' }) {
  const t = useTranslations('Product');
  const variant = defaultVariant(product);
  const badges = productBadges(product);
  const hover = secondaryImage(product);
  const sizeList = sizeSummary(product);
  const quick = quickAddVariant(product);
  const percent = variant?.salePrice ? discountPercent(variant.regularPrice, variant.salePrice) : 0;
  const prices = product.priceRange;
  const varies = prices && prices.min !== prices.max;
  const href = `/${locale}/product/${product.slug}`;
  return (
    <article className="group relative min-w-0">
      <div className="relative">
        <Link href={href} className="product-media block rounded-[var(--radius-sm)]" tabIndex={-1} aria-hidden="true">
          {product.primaryImage ? (
            <>
              <Image src={product.primaryImage.url} alt={product.primaryImage.alt || product.name} fill sizes={sizes} priority={priority} className={`transition-opacity duration-500 ${hover ? 'group-hover:opacity-0' : ''}`} />
              {hover ? <Image src={hover.url} alt="" fill sizes={sizes} className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" /> : null}
            </>
          ) : <span className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[.2em] text-[var(--color-muted)]">Elite Emporium</span>}
          {badges.soldOut ? <span className="absolute inset-x-0 bottom-0 bg-white/85 py-1.5 text-center text-[12px] font-medium text-[#111]">{t('soldOut')}</span> : null}
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {percent > 0 ? <span className="rounded-[3px] bg-[var(--color-sale)] px-1.5 py-0.5 text-[11px] font-medium text-white">{t('off', { percent: formatNumber(percent, locale) })}</span> : null}
          {(product.isNew ?? false) && !badges.soldOut ? <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#111]">{t('new')}</span> : null}
          {badges.preorder ? <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#111]">{t('preorder')}</span> : null}
          {badges.lowStock && !badges.soldOut ? <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[#a35f00]">{(knownQuantity(variant) != null ? t('lowStock', { count: formatNumber(knownQuantity(variant), locale) }) : t('lowStockNoCount'))}</span> : null}
        </div>
        <div className="absolute right-2 top-2"><WishlistButton productId={product.id} variantId={null} locale={locale} compact /></div>
        {quick ? <div className="absolute bottom-2 right-2"><QuickAdd variantId={quick.id} name={product.name} locale={locale} productId={product.id} price={quick.price} /></div> : null}
        {sizeList.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden flex-wrap justify-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex" aria-hidden="true">
            {sizeList.slice(0, 7).map((size) => <span key={size.label} className={`min-w-8 rounded-[3px] bg-white/95 px-1.5 py-0.5 text-center text-[11px] ${size.available ? 'text-[#111]' : 'text-[#999] line-through'}`}>{size.label}</span>)}
          </div>
        ) : null}
      </div>
      <div className="pt-2.5">
        <h3 className="line-clamp-2 text-[14px] leading-snug md:text-[15px]"><Link href={href} className="hover:underline hover:underline-offset-4">{product.name}</Link></h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[14px] tabular-nums md:text-[15px]">
          {varies ? <span>{t('priceFrom', { price: formatMoney(prices.min, locale) })}</span> : <span className={variant?.salePrice ? 'text-[var(--color-sale)]' : ''}>{formatMoney(variant?.price || prices?.min, locale)}</span>}
          {variant?.salePrice && !varies ? <del className="text-[13px] text-[var(--color-muted)]">{formatMoney(variant.regularPrice, locale)}</del> : null}
        </p>
        {product.rating?.count ? <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--color-muted)]"><Star size={12} fill="currentColor" className="text-[var(--color-warning)]" aria-hidden="true" /><span className="sr-only">{t('ratingLabel', { average: formatNumber(product.rating.average, locale, 1), count: product.rating.count })}</span><span className="tabular-nums" aria-hidden="true">{formatNumber(product.rating.average, locale, 1)}</span><span aria-hidden="true">({formatNumber(product.rating.count, locale)})</span></p> : null}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return <div aria-hidden="true"><div className="skeleton aspect-[3/4] rounded-[var(--radius-sm)]" /><div className="skeleton mt-3 h-4 w-4/5 rounded" /><div className="skeleton mt-2 h-4 w-1/3 rounded" /></div>;
}

/** Route-level loading placeholder for listing pages. */
export function CatalogSkeleton() {
  return (
    <div className="container pb-10" aria-busy="true">
      <div className="skeleton mb-6 mt-8 h-10 w-1/3 rounded" />
      <div className="skeleton mb-5 h-10 rounded" />
      <div className="product-grid">{[0, 1, 2, 3, 4, 5, 6, 7].map((key) => <ProductCardSkeleton key={key} />)}</div>
    </div>
  );
}

/** Route-level loading placeholder for the product page. */
export function ProductPageSkeleton() {
  return (
    <div className="container grid gap-6 pb-10 pt-0 md:grid-cols-[1.15fr_1fr] md:gap-10 md:pt-6" aria-busy="true">
      <div className="skeleton -mx-4 aspect-[3/4] max-h-[66svh] w-[calc(100%+2rem)] md:mx-0 md:max-h-none md:w-full md:rounded-[var(--radius-sm)]" />
      <div className="grid content-start gap-4"><div className="skeleton h-8 w-3/4 rounded" /><div className="skeleton h-6 w-1/4 rounded" /><div className="skeleton h-24 rounded" /><div className="skeleton h-12 rounded" /></div>
    </div>
  );
}
