'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Heart, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiMessage } from '@/lib/api/browser-api';
import { cartApi } from '@/lib/api/cart-api';
import { wishlistApi } from '@/lib/api/wishlist-api';
import { useUiStore } from '@/lib/ui-store';
import { formatMoney } from '@/lib/utils';

export function WishlistView({ locale }) {
  const t = useTranslations('Wishlist');
  const client = useQueryClient();
  const setCartOpen = useUiStore((state) => state.setCartOpen);
  const key = ['wishlist', locale];
  const wishlist = useQuery({ queryKey: key, queryFn: () => wishlistApi.current(locale) });
  const remove = useMutation({ mutationFn: (itemId) => wishlistApi.remove(itemId, locale), onSuccess: (data) => client.setQueryData(key, data) });
  const move = useMutation({
    mutationFn: async (item) => {
      const cart = await cartApi.add(item.variant.id, 1, locale);
      const updatedWishlist = await wishlistApi.remove(item.id, locale);
      return { cart, updatedWishlist };
    },
    onSuccess: ({ cart, updatedWishlist }) => { client.setQueryData(['cart', locale], cart); client.setQueryData(key, updatedWishlist); setCartOpen(true); }
  });

  if (wishlist.isLoading) return <div className="product-grid">{[0, 1, 2, 3].map((index) => <div key={index} className="skeleton aspect-[3/4] rounded" />)}</div>;
  if (wishlist.error) return <p role="alert" className="text-sm text-[var(--color-danger)]">{apiMessage(wishlist.error, t('loadError'))}</p>;
  if (!wishlist.data.items.length) return (
    <div className="grid place-items-center gap-3 py-20 text-center">
      <Heart size={28} strokeWidth={1.5} />
      <h2 className="text-xl font-medium">{t('empty')}</h2>
      <p className="text-sm text-[var(--color-muted)]">{t('emptyBody')}</p>
      <Link href={`/${locale}/shop?sort=newest`} className="mt-2 inline-flex min-h-12 items-center rounded-[var(--radius-sm)] bg-[var(--color-text)] px-8 text-[15px] text-[var(--color-bg)]">{t('browse')}</Link>
    </div>
  );
  return (
    <>
      {move.error ? <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">{apiMessage(move.error)}</p> : null}
      <ul className="product-grid">
        {wishlist.data.items.map((item) => (
          <li key={item.id} className="relative min-w-0">
            <Link href={`/${locale}/product/${item.product.slug}`} className="product-media block rounded-[var(--radius-sm)]">{item.image ? <Image src={item.image.url} alt={item.image.alt || item.product.name} fill sizes="(min-width: 1200px) 25vw, (min-width: 768px) 33vw, 50vw" /> : null}</Link>
            <button type="button" onClick={() => remove.mutate(item.id)} aria-label={t('remove', { name: item.product.name })} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-white/90 text-[#111]"><X size={16} /></button>
            <h2 className="mt-2.5 line-clamp-2 text-[14px] md:text-[15px]"><Link href={`/${locale}/product/${item.product.slug}`} className="hover:underline">{item.product.name}</Link></h2>
            {item.variant ? <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">{item.variant.title}</p> : null}
            {item.variant?.price ? <p className="mt-1 text-[14px] tabular-nums">{formatMoney(item.variant.price, locale)}</p> : null}
            {item.variant && item.available ? (
              <button type="button" onClick={() => move.mutate(item)} disabled={move.isPending} className="mt-3 min-h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-text)] text-[14px] transition hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] disabled:opacity-50">{t('moveToBag')}</button>
            ) : (
              <Link href={`/${locale}/product/${item.product.slug}`} className="mt-3 flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[13px] text-[var(--color-muted)]">{item.variant ? t('unavailable') : t('chooseOption')}</Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
