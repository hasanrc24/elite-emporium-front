'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus, Tag, Trash2, Truck, X } from 'lucide-react';
import { apiMessage } from '@/lib/api/browser-api';
import { formatMoney } from '@/lib/utils';
import { freeDeliveryThreshold, useStorefront } from './storefront-context';

export function FreeDeliveryProgress({ subtotal, locale }) {
  const t = useTranslations('Cart');
  const { settings } = useStorefront();
  const threshold = freeDeliveryThreshold(settings);
  if (!threshold) return null;
  const current = Number(subtotal || 0);
  const remaining = Math.max(0, threshold - current);
  const percent = Math.min(100, Math.round((current / threshold) * 100));
  return (
    <div className="rounded-[var(--radius)] bg-[var(--color-surface)] px-4 py-3">
      <p className="flex items-center gap-2 text-[13px]">
        <Truck size={16} aria-hidden="true" className="shrink-0" />
        {remaining > 0 ? t('freeDeliveryProgress', { amount: formatMoney(remaining, locale) }) : <strong className="font-medium">{t('freeDeliveryUnlocked')}</strong>}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-border)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('freeDeliveryUnlocked')}>
        <div className="h-full rounded-full bg-[var(--color-text)] transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function noticeText(t, item, notice) {
  const key = `notices.${notice}`;
  return t.has(key) ? t(key, { available: item.available ?? 0 }) : notice.replaceAll('_', ' ').toLowerCase();
}

/** Line items shared by the cart drawer and the cart page. */
export function CartLines({ cartState, locale, compact = false, onNavigate }) {
  const t = useTranslations('Cart');
  const { cart, update, remove } = cartState;
  const items = cart.data?.items || [];
  const pendingId = update.isPending ? update.variables?.id : remove.isPending ? remove.variables : null;
  return (
    <ul className="divide-y divide-[var(--color-border)]" aria-live="polite">
      {items.map((item) => {
        const busy = pendingId === item.id;
        const max = item.stockPolicy === 'deny' ? Math.max(item.available ?? 0, 0) : 99;
        return (
          <li key={item.id} className={`flex gap-3 py-4 ${busy ? 'opacity-60' : ''} ${compact ? '' : 'sm:gap-5'}`}>
            <Link href={`/${locale}/product/${item.product.slug}`} onClick={onNavigate} className={`product-media shrink-0 rounded-[var(--radius-sm)] ${compact ? 'w-[76px]' : 'w-[88px] sm:w-[112px]'}`}>
              {item.image ? <Image src={item.image.url} alt={item.image.alt || item.product.name} fill sizes="112px" /> : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/${locale}/product/${item.product.slug}`} onClick={onNavigate} className="line-clamp-2 text-sm font-medium hover:underline">{item.product.name}</Link>
                  {item.variantTitle ? <p className="mt-0.5 text-[13px] text-[var(--color-muted)]">{item.variantTitle}</p> : null}
                </div>
                <button type="button" onClick={() => remove.mutate(item.id)} disabled={busy} aria-label={t('remove', { name: item.product.name })} className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]">
                  {compact ? <X size={16} /> : <Trash2 size={16} />}
                </button>
              </div>
              {item.notices?.length ? <p className="mt-1 text-[13px] font-medium text-[var(--color-warning)]">{item.notices.map((notice) => noticeText(t, item, notice)).join(' · ')}</p> : null}
              <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                <div className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]">
                  <button type="button" className="grid h-full w-9 place-items-center disabled:opacity-35" aria-label="−" disabled={busy || item.quantity <= 1} onClick={() => update.mutate({ id: item.id, quantity: item.quantity - 1, version: item.version })}><Minus size={14} /></button>
                  <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">{item.quantity}</span>
                  <button type="button" className="grid h-full w-9 place-items-center disabled:opacity-35" aria-label="+" disabled={busy || item.quantity >= max || (!item.purchasable && !item.notices?.includes('QUANTITY_EXCEEDS_STOCK'))} onClick={() => update.mutate({ id: item.id, quantity: item.quantity + 1, version: item.version })}><Plus size={14} /></button>
                </div>
                <div className="text-right tabular-nums">
                  {item.discountTotal && item.discountTotal !== '0.00' ? <del className="mr-1.5 text-xs text-[var(--color-muted)]">{formatMoney(item.lineTotal, locale)}</del> : null}
                  <span className="text-sm font-medium">{formatMoney(item.discountedLineTotal, locale)}</span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CouponForm({ cartState, locale }) {
  const t = useTranslations('Cart');
  const [code, setCode] = useState('');
  const { cart, applyCoupon, removeCoupon } = cartState;
  return (
    <div className="grid gap-2">
      {cart.data?.coupons?.map((coupon) => (
        <div key={coupon.code} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-3 py-2 text-[13px]">
          <span className="flex items-center gap-2"><Tag size={14} /><strong className="font-medium">{coupon.code}</strong>{coupon.label ? <span className="text-[var(--color-muted)]">· {coupon.label}</span> : null}</span>
          <button type="button" onClick={() => removeCoupon.mutate(coupon.code)} aria-label={t('removeCoupon', { code: coupon.code })} className="grid size-7 place-items-center rounded-full hover:bg-[var(--color-surface-muted)]"><X size={14} /></button>
        </div>
      ))}
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (code.trim()) applyCoupon.mutate(code.trim(), { onSuccess: () => setCode('') }); }}>
        <label className="sr-only" htmlFor={`coupon-${locale}`}>{t('coupon')}</label>
        <input id={`coupon-${locale}`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t('couponPlaceholder')} autoComplete="off" className="!min-h-10 flex-1 uppercase" />
        <button type="submit" disabled={!code.trim() || applyCoupon.isPending} className="min-h-10 rounded-[var(--radius-sm)] border border-[var(--color-text)] px-4 text-sm font-medium transition hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] disabled:opacity-40">{t('apply')}</button>
      </form>
      {applyCoupon.error ? <p role="alert" className="text-[13px] text-[var(--color-danger)]">{apiMessage(applyCoupon.error)}</p> : null}
      {cart.data?.couponIssue ? <p className="text-[13px] text-[var(--color-warning)]">{cart.data.couponIssue.message}</p> : null}
    </div>
  );
}

export function CartTotals({ cart, locale }) {
  const t = useTranslations('Cart');
  const totals = cart?.totals || {};
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t('subtotal')}</dt><dd className="tabular-nums">{formatMoney(totals.subtotal, locale)}</dd></div>
      {totals.discount && totals.discount !== '0.00' ? <div className="flex justify-between text-[var(--color-success)]"><dt>{t('discount')}</dt><dd className="tabular-nums">−{formatMoney(totals.discount, locale)}</dd></div> : null}
      <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t('delivery')}</dt><dd className="text-[var(--color-muted)]">{t('deliveryAtCheckout')}</dd></div>
    </dl>
  );
}
