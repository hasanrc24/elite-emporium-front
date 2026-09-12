'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, QuantitySelector } from '@/components/ui';
import { cartApi } from '@/lib/api/cart-api';
import { apiMessage } from '@/lib/api/browser-api';
import { formatMoney } from '@/lib/utils';
import { WishlistButton } from '@/components/storefront/wishlist-button';
import Link from 'next/link';
import { Check, CircleCheck, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

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
    <div className="purchase-card overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)]">
      <div className="p-5 sm:p-6">
        <div className="mb-6 grid grid-cols-3 gap-2" aria-label="Add to bag steps">
          {['Choose option', 'Set quantity', 'Add to bag'].map((step, index) => <div key={step} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)]"><span className={`grid size-7 shrink-0 place-items-center rounded-full ${index === 0 ? 'bg-[var(--color-primary-strong)] text-white' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'}`}>{index + 1}</span><span className="hidden sm:inline">{step}</span></div>)}
        </div>
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--color-muted)]">Your selection</p><p className="mt-1 text-xs text-[var(--color-muted)]">SKU · {selected?.sku || 'Select an option'}</p></div><div className="text-right" data-numeric>
          <strong className="text-2xl font-bold tracking-[-.04em]">{formatMoney(selected?.price, locale)}</strong>
          {selected?.salePrice ? <del className="ml-2 text-sm text-[var(--color-muted)]">{formatMoney(selected.regularPrice, locale)}</del> : null}
        </div></div>

        <fieldset className="mt-6">
          <legend className="text-sm font-bold">1. Choose an option</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariantId(variant.id)}
                aria-pressed={variant.id === variantId}
                className={`inline-flex min-h-9 items-center gap-2 rounded-sm border px-3 text-xs font-medium transition active:scale-[.98] ${variant.id === variantId ? 'border-[#151719] bg-[#151719] text-white' : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)]'}`}
              >
                {variant.id === variantId ? <Check size={15} /> : null}
                {variant.title}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5"><p className="text-sm font-bold">2. How many?</p><div className="mt-3 max-w-36">
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={99} />
        </div></div>

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
        {add.isSuccess ? <div className="mt-4"><Alert tone="success" action={<Button asChild size="sm" variant="secondary"><Link href={`/${locale}/cart`}>View bag</Link></Button>}><span className="inline-flex items-center gap-2"><CircleCheck size={16} /> Added to your bag.</span></Alert></div> : null}

        <div className="mt-5 grid gap-3">
          <Button className="w-full !rounded-[var(--radius-sm)] !bg-[var(--color-primary-strong)]" disabled={disabled} loading={add.isPending} onClick={() => add.mutate()}>
            <ShoppingBag size={18} />
            {disabled && !selected ? 'Choose an option first' : disabled ? 'Currently unavailable' : '3. Add to bag'}
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
