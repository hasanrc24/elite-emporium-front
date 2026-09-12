'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardBody, EmptyState, Field, FormattedMoney, Input, QuantitySelector, Skeleton } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { cartApi } from '@/lib/api/cart-api';

export function CartView({ locale }) {
  const client = useQueryClient();
  const [couponCode, setCouponCode] = useState('');
  const cart = useQuery({ queryKey: ['cart', locale], queryFn: () => cartApi.current(locale) });
  const update = useMutation({
    mutationFn: ({ id, quantity, version }) => cartApi.update(id, quantity, locale, version),
    onSuccess: (data) => client.setQueryData(['cart', locale], data)
  });
  const remove = useMutation({
    mutationFn: (id) => cartApi.remove(id, locale),
    onSuccess: (data) => client.setQueryData(['cart', locale], data)
  });
  const applyCoupon = useMutation({
    mutationFn: () => cartApi.applyCoupon(couponCode, locale),
    onSuccess: (data) => { client.setQueryData(['cart', locale], data); setCouponCode(''); }
  });
  const removeCoupon = useMutation({
    mutationFn: (code) => cartApi.removeCoupon(code, locale),
    onSuccess: (data) => client.setQueryData(['cart', locale], data)
  });

  if (cart.isLoading) {
    return (
      <Card>
        <CardBody>
          <Skeleton className="h-10 w-40" />
          <Skeleton className="mt-4 h-24" />
        </CardBody>
      </Card>
    );
  }
  if (cart.error) return <Alert tone="error">{apiMessage(cart.error, 'Your cart could not be loaded.')}</Alert>;
  if (!cart.data.items.length) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse the shop to add items."
        action={
          <Button asChild>
            <Link href={`/${locale}/shop`}>Continue shopping</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <section className="storefront-panel overflow-hidden">
        {cart.data.notices?.length ? (
          <Alert tone="warning" title="Please review your bag">Some item availability or prices changed. Check each item before checkout.</Alert>
        ) : null}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3"><p className="text-xs font-bold">{cart.data.itemCount} {cart.data.itemCount === 1 ? 'item' : 'items'} in your bag</p><Link href={`/${locale}/shop`} className="text-xs font-bold text-[var(--color-primary)]">Continue shopping →</Link></div>
        {cart.data.items.map((item) => (
          <div key={item.id} className="border-b border-[var(--color-border)] last:border-0">
            <div className="grid grid-cols-[88px_1fr] gap-4 p-4 sm:grid-cols-[110px_1fr]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]">{item.image ? <Image src={item.image.url} alt={item.image.alt || item.product.name} fill sizes="110px" className="object-cover" /> : null}</div>
              <div>
                <div className="flex justify-between gap-3">
                  <div>
                    <h2 className="font-bold"><Link href={`/${locale}/product/${item.product.slug}`}>{item.product.name}</Link></h2>
                    <p className="text-sm text-[var(--color-muted)]">{item.variantTitle} · {item.sku}</p>
                    {item.notices?.map((notice) => (
                      <p key={notice} className="mt-1 text-sm text-[var(--color-warning)]">{notice.replaceAll('_', ' ').toLowerCase()}</p>
                    ))}
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${item.product.name}`} onClick={() => remove.mutate(item.id)}>
                    <Trash2 size={19} />
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <QuantitySelector
                    value={item.quantity}
                    min={0}
                    max={item.stockPolicy === 'deny' ? item.available : 99}
                    disabled={!item.purchasable}
                    onChange={(value) => update.mutate({ id: item.id, quantity: value, version: item.version })}
                  />
                  <div className="text-right">
                    {item.discountTotal !== '0.00' ? (
                      <>
                        <del className="text-sm text-[var(--color-muted)]">
                          <FormattedMoney value={item.lineTotal} locale={locale} />
                        </del>
                        <br />
                      </>
                    ) : null}
                    <strong><FormattedMoney value={item.discountedLineTotal} locale={locale} /></strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <aside className="storefront-panel h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-xl font-bold">Order summary</h2>
        <div className="mt-5 grid gap-2 text-sm">
          <SummaryRow label="Subtotal" value={cart.data.totals.subtotal} locale={locale} />
          {cart.data.totals.discount !== '0.00' ? (
            <SummaryRow label="Discount" value={cart.data.totals.discount} locale={locale} negative />
          ) : null}
        </div>

        {cart.data.coupons?.length ? (
          <div className="mt-4 grid gap-2">
            {cart.data.coupons.map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] px-3 py-2 text-sm">
                <span><strong>{coupon.code}</strong> · {coupon.label}</span>
                <button onClick={() => removeCoupon.mutate(coupon.code)} aria-label={`Remove coupon ${coupon.code}`} className="text-[var(--color-danger)]">×</button>
              </div>
            ))}
          </div>
        ) : null}

        <Field label="Coupon code" className="mt-5">
          <form onSubmit={(event) => { event.preventDefault(); applyCoupon.mutate(); }}>
            <Input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" />
          </form>
        </Field>
        {applyCoupon.error ? <Alert tone="error">{apiMessage(applyCoupon.error)}</Alert> : null}

        <Button asChild className="mt-6 w-full !rounded-[var(--radius-sm)] !bg-[var(--color-primary-strong)]" size="lg">
          <Link href={`/${locale}/checkout`}>Checkout</Link>
        </Button>
      </aside>
      <div className="fixed inset-x-3 bottom-[4.75rem] z-30 lg:hidden"><Button asChild size="lg" className="w-full !rounded-[var(--radius-sm)] !bg-[var(--color-primary-strong)] shadow-[var(--shadow-md)]"><Link href={`/${locale}/checkout`}>Checkout · <FormattedMoney value={cart.data.totals.subtotal} locale={locale} /></Link></Button></div>
    </div>
  );
}

function SummaryRow({ label, value, locale, negative }) {
  return (
    <div className={`flex justify-between ${negative ? 'text-[var(--color-success)]' : ''}`}>
      <span>{label}</span>
      <strong>{negative ? '−' : ''}<FormattedMoney value={value} locale={locale} /></strong>
    </div>
  );
}
