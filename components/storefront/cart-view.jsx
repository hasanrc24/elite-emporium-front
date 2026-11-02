'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/hooks/use-cart';
import { apiMessage } from '@/lib/api/browser-api';
import { formatMoney } from '@/lib/utils';
import { CartLines, CartTotals, CouponForm, FreeDeliveryProgress } from './cart-lines';

export function CartView({ locale }) {
  const t = useTranslations('Cart');
  const cartState = useCart(locale);
  const { cart } = cartState;
  if (cart.isLoading) return <div className="grid gap-6 lg:grid-cols-[1fr_380px]"><div className="grid gap-4">{[0, 1, 2].map((key) => <div key={key} className="skeleton h-32 rounded" />)}</div><div className="skeleton h-64 rounded" /></div>;
  if (cart.error) return <p role="alert" className="rounded-[var(--radius)] border border-[var(--color-border)] p-6 text-sm">{apiMessage(cart.error, t('loadError'))}</p>;
  if (!cart.data?.items?.length) return (
    <div className="grid place-items-center gap-4 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--color-surface)]"><ShoppingBag size={26} /></span>
      <h2 className="text-xl font-medium">{t('empty')}</h2>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{t('emptyBody')}</p>
      <Link href={`/${locale}/shop`} className="inline-flex min-h-12 items-center rounded-[var(--radius-sm)] bg-[var(--color-text)] px-8 text-[15px] font-medium text-[var(--color-bg)]">{t('continue')}</Link>
    </div>
  );
  const data = cart.data;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <section aria-label={t('title')}>
        <FreeDeliveryProgress subtotal={data.totals?.subtotal} locale={locale} />
        {data.notices?.length ? <p className="mt-3 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-warning)]">{t('reviewNotice')}</p> : null}
        {cartState.update.error || cartState.remove.error ? <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{t('updateError')}</p> : null}
        <div className="mt-2 border-b border-[var(--color-border)]"><CartLines cartState={cartState} locale={locale} /></div>
        <Link href={`/${locale}/shop`} className="mt-5 inline-block text-sm underline underline-offset-4">{t('continue')}</Link>
      </section>
      <aside className="grid gap-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
        <h2 className="text-lg font-medium">{t('summary')}</h2>
        <CouponForm cartState={cartState} locale={locale} />
        <CartTotals cart={data} locale={locale} />
        <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-4"><span>{t('total')}</span><strong className="text-lg font-medium tabular-nums">{formatMoney(data.totals?.total || data.totals?.subtotal, locale)}</strong></div>
        <Link href={`/${locale}/checkout`} className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)]"><Lock size={16} />{t('checkout')}</Link>
        <p className="text-center text-xs text-[var(--color-muted)]">{t('secure')}</p>
      </aside>
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 md:hidden">
        <Link href={`/${locale}/checkout`} className="flex min-h-12 items-center justify-between rounded-[var(--radius-sm)] bg-[var(--color-text)] px-5 text-[15px] font-medium text-[var(--color-bg)]"><span>{t('checkout')}</span><span className="tabular-nums">{formatMoney(data.totals?.total || data.totals?.subtotal, locale)}</span></Link>
      </div>
    </div>
  );
}
