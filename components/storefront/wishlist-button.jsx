'use client';

import { Heart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, pushToast } from '@/components/ui';
import { wishlistApi } from '@/lib/api/wishlist-api';
import { apiMessage } from '@/lib/api/browser-api';
import { cn } from '@/lib/utils';

export function WishlistButton({ productId, variantId = null, locale = 'en', compact = false, className = '' }) {
  const client = useQueryClient();
  const key = ['wishlist', locale];
  const wishlist = useQuery({ queryKey: key, queryFn: () => wishlistApi.current(locale) });
  const item = wishlist.data?.items.find((candidate) => candidate.product?.id === productId && (!variantId || candidate.variant?.id === variantId));
  const toggle = useMutation({
    mutationFn: () => (item ? wishlistApi.remove(item.id, locale) : wishlistApi.add(productId, variantId, locale)),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      pushToast({ tone: item ? 'info' : 'success', title: item ? 'Removed from wishlist' : 'Saved to wishlist', duration: 1500 });
    },
    onError: (error) => pushToast({ tone: 'error', title: 'Wishlist error', description: apiMessage(error, 'Wishlist could not be updated.') })
  });
  const active = Boolean(item);

  if (compact) {
    return (
      <IconButton
        icon={Heart}
        label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        variant={active ? 'primary' : 'ghost'}
        onClick={() => toggle.mutate()}
        disabled={wishlist.isLoading || toggle.isPending}
        className={cn('!rounded-full shadow-sm', className)}
      />
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      loading={toggle.isPending}
      disabled={wishlist.isLoading}
      onClick={() => toggle.mutate()}
      className={className}
    >
      <Heart size={20} fill={active ? 'currentColor' : 'none'} />
      {active ? 'Saved to wishlist' : 'Save to wishlist'}
    </Button>
  );
}