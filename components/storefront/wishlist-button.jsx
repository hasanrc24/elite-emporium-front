'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pushToast } from '@/components/ui';
import { wishlistApi } from '@/lib/api/wishlist-api';
import { apiMessage } from '@/lib/api/browser-api';
import { trackCommerceEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export function WishlistButton({ productId, variantId = null, locale = 'en', compact = false, className = '' }) {
  const t = useTranslations('Product');
  const client = useQueryClient();
  const key = ['wishlist', locale];
  const wishlist = useQuery({ queryKey: key, queryFn: () => wishlistApi.current(locale) });
  const item = wishlist.data?.items.find((candidate) => candidate.product?.id === productId && (!variantId || candidate.variant?.id === variantId));
  const active = Boolean(item);
  const toggle = useMutation({
    mutationFn: () => (item ? wishlistApi.remove(item.id, locale) : wishlistApi.add(productId, variantId, locale)),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      trackCommerceEvent(item ? 'remove_from_wishlist' : 'add_to_wishlist', { productId });
      pushToast({ tone: item ? 'info' : 'success', title: item ? t('wishlistRemove') : t('wishlistAdd'), duration: 1500 });
    },
    onError: (error) => pushToast({ tone: 'error', title: apiMessage(error, t('wishlistAdd')) })
  });
  const label = active ? t('wishlistRemove') : t('wishlistAdd');
  // Loading state differs between the server and first client render, so it only gates the click, never `disabled`.
  const onToggle = () => { if (!wishlist.isLoading && !toggle.isPending) toggle.mutate(); };

  if (compact) {
    return (
      <button type="button" aria-label={label} aria-pressed={active} title={label} onClick={(event) => { event.preventDefault(); onToggle(); }} disabled={toggle.isPending} className={cn('grid size-11 place-items-center rounded-full bg-white/90 text-[#111] backdrop-blur transition hover:bg-white disabled:opacity-60', className)}>
        <Heart size={17} fill={active ? 'currentColor' : 'none'} strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={onToggle} disabled={toggle.isPending} className={cn('grid size-12 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] transition hover:border-[var(--color-text)] disabled:opacity-60', className)}>
      <Heart size={20} fill={active ? 'currentColor' : 'none'} strokeWidth={1.7} />
    </button>
  );
}
