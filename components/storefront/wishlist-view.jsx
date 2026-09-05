'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardBody, EmptyState, FormattedMoney, pushToast } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { cartApi } from '@/lib/api/cart-api';
import { wishlistApi } from '@/lib/api/wishlist-api';

export function WishlistView({ locale }) {
  const client = useQueryClient();
  const key = ['wishlist', locale];
  const wishlist = useQuery({ queryKey: key, queryFn: () => wishlistApi.current(locale) });
  const remove = useMutation({
    mutationFn: (itemId) => wishlistApi.remove(itemId, locale),
    onSuccess: (data) => client.setQueryData(key, data)
  });
  const move = useMutation({
    mutationFn: async (item) => {
      if (!item.variant?.id) throw new Error('Choose an option on the product page before adding this item to the cart.');
      const cart = await cartApi.add(item.variant.id, 1, locale);
      const updatedWishlist = await wishlistApi.remove(item.id, locale);
      return { cart, updatedWishlist };
    },
    onSuccess: ({ cart, updatedWishlist }) => {
      client.setQueryData(['cart', locale], cart);
      client.setQueryData(key, updatedWishlist);
      pushToast({ tone: 'success', title: 'Moved to cart' });
    }
  });

  if (wishlist.isLoading) {
    return (
      <Card>
        <CardBody>Loading your wishlist…</CardBody>
      </Card>
    );
  }
  if (wishlist.error) return <Alert tone="error">{apiMessage(wishlist.error, 'Your wishlist could not be loaded.')}</Alert>;
  if (!wishlist.data.items.length) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Save products here while you decide."
        action={
          <Button asChild>
            <Link href={`/${locale}/shop`}>Browse products</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {move.error ? <Alert tone="error">{apiMessage(move.error, move.error.message)}</Alert> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {wishlist.data.items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <Link href={`/${locale}/product/${item.product.slug}`} className="relative block aspect-[4/5] bg-[var(--color-surface-muted)]">
              {item.image ? <Image src={item.image.url} alt={item.image.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /> : null}
            </Link>
            <CardBody className="!p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold"><Link href={`/${locale}/product/${item.product.slug}`}>{item.product.name}</Link></h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{item.variant ? `${item.variant.title} · ${item.variant.sku}` : 'Choose an option on the product page'}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${item.product.name} from wishlist`} onClick={() => remove.mutate(item.id)}>
                  <Trash2 size={19} />
                </Button>
              </div>
              {item.variant ? <p className="mt-4 text-lg font-bold"><FormattedMoney value={item.variant.price} locale={locale} /></p> : null}
              <p className={`mt-2 text-sm ${item.available ? 'text-[var(--color-muted)]' : 'text-[var(--color-danger)]'}`}>
                {item.available ? (item.variant?.stockPolicy === 'deny' ? `${item.variant.available} available` : 'Available to order') : 'Currently unavailable'}
              </p>
              <Button className="mt-5 w-full" variant="secondary" disabled={!item.available || !item.variant || move.isPending} onClick={() => move.mutate(item)}>
                <ShoppingBag size={18} /> Move to cart
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
