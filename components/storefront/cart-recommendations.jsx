'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { browserApi } from '@/lib/api/browser-api';
import { formatMoney } from '@/lib/utils';

/**
 * One recommended add-on rail in the cart drawer (FE-UX-002): the curated
 * "complete the look" items of the newest bag line, falling back to its
 * "you may also like" products, minus anything already in the bag.
 */
export function CartRecommendations({ items, locale, onNavigate }) {
  const t = useTranslations('Cart');
  const anchor = items?.[items.length - 1]?.product?.slug;
  const inBag = new Set((items || []).map((item) => item.product?.slug));
  const query = useQuery({
    queryKey: ['cart-recommendations', anchor, locale],
    enabled: Boolean(anchor),
    staleTime: 5 * 60_000,
    queryFn: () => browserApi.get(`/products/${encodeURIComponent(anchor)}`, { params: { locale }, skipAuthRefresh: true }).then((response) => response.data.data)
  });
  const product = query.data;
  const picks = [...(product?.completeTheLook || []), ...(product?.related || [])]
    .filter((item, index, list) => !inBag.has(item.slug) && list.findIndex((other) => other.id === item.id) === index)
    .slice(0, 6);
  if (!picks.length) return null;
  return (
    <section className="mt-4 border-t border-[var(--color-border)] pt-4" aria-labelledby="cart-recommendations-heading">
      <h3 id="cart-recommendations-heading" className="text-[13px] font-medium uppercase tracking-[.12em]">{product.completeTheLook?.length ? t('completeLook') : t('youMayLike')}</h3>
      <ul className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
        {picks.map((item) => (
          <li key={item.id} className="w-28 shrink-0 snap-start">
            <Link href={`/${locale}/product/${item.slug}`} onClick={onNavigate} className="group block">
              <span className="product-media block rounded-[var(--radius-sm)]">
                {item.primaryImage ? <Image src={item.primaryImage.url} alt={item.primaryImage.alt || item.name} fill sizes="112px" /> : null}
              </span>
              <span className="mt-1.5 line-clamp-2 text-[12px] leading-snug group-hover:underline">{item.name}</span>
              <span className="mt-0.5 block text-[12px] tabular-nums">{formatMoney(item.priceRange?.min, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
