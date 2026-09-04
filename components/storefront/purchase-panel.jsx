'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, QuantitySelector } from '@/components/ui';
import { cartApi } from '@/lib/api/cart-api';
import { apiMessage } from '@/lib/api/browser-api';
import { formatMoney } from '@/lib/utils';
import { WishlistButton } from '@/components/storefront/wishlist-button';
import { Check, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

export function PurchasePanel({ product, locale }) {
  const initial = product.variants.find((variant) => variant.isDefault) || product.variants[0];
  const [variantId, setVariantId] = useState(initial?.id || '');
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();
  const selected = product.variants.find((variant) => variant.id === variantId);
  const add = useMutation({
    mutationFn: () => cartApi.add(variantId, quantity, locale),
    onSuccess: (cart) => queryClient.setQueryData(['cart', locale], cart)
  });
  const disabled = !selected || (selected.stockPolicy === 'deny' && selected.availableQuantity < quantity);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--color-border)]">
      <div className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--color-muted)]">SKU · {selected?.sku}</p>
        <div className="mt-2 flex items-baseline gap-3" data-numeric>
          <strong className="text-3xl font-semibold tracking-[-.04em] text-[var(--color-primary)]">{formatMoney(selected?.price, locale)}</strong>
          {selected?.salePrice ? <del className="text-[var(--color-muted)]">{formatMoney(selected.regularPrice, locale)}</del> : null}
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Choose an option</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariantId(variant.id)}
                aria-pressed={variant.id === variantId}
                className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border px-4 text-sm font-medium transition active:scale-[.98] ${variant.id === variantId ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]'}`}
              >
                {variant.id === variantId ? <Check size={15} /> : null}
                {variant.title}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 max-w-32">
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={99} />
        </div>

        <p className="mt-4 text-sm text-[var(--color-muted)]">
          {selected?.stockPolicy === 'deny'
            ? selected.available
              ? `${selected.availableQuantity} available`
              : 'Out of stock'
            : selected?.stockPolicy === 'preorder'
              ? 'Available for pre-order'
              : 'Backorders accepted'}
        </p>

        {add.error ? <div className="mt-4"><Alert tone="error">{apiMessage(add.error)}</Alert></div> : null}
        {add.isSuccess ? <div className="mt-4"><Alert tone="success">Added to your cart.</Alert></div> : null}

        <div className="mt-5 grid gap-3">
          <Button className="w-full" disabled={disabled} loading={add.isPending} onClick={() => add.mutate()}>
            <ShoppingBag size={18} />
            Add to bag
          </Button>
          <WishlistButton productId={product.id} variantId={selected?.id || null} locale={locale} />
        </div>
      </div>
      <div className="grid border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] sm:grid-cols-2">
        <p className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-3 text-xs font-semibold sm:border-b-0 sm:border-r">
          <Truck size={16} className="text-[var(--color-primary)]" />
          Delivery across Bangladesh
        </p>
        <p className="flex items-center gap-2 px-5 py-3 text-xs font-semibold">
          <ShieldCheck size={16} className="text-[var(--color-primary)]" />
          Secure checkout
        </p>
      </div>
    </div>
  );
}