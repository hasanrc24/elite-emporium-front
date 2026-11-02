'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/hooks/use-cart';
import { useUiStore } from '@/lib/ui-store';
import { formatMoney } from '@/lib/utils';
import { Sheet } from './sheet';
import { CartLines, FreeDeliveryProgress } from './cart-lines';
import { CartRecommendations } from './cart-recommendations';

/** Slide-out bag opened by Add to bag and the header bag icon (FE-UX-002). */
export function CartDrawer({ locale }) {
  const t = useTranslations('Cart');
  const open = useUiStore((state) => state.cartOpen);
  const setOpen = useUiStore((state) => state.setCartOpen);
  const cartState = useCart(locale);
  const cart = cartState.cart.data;
  const count = cart?.itemCount || 0;
  const close = () => setOpen(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={`${t('title')} (${count})`}
      closeLabel={t('continue')}
      footer={count ? (
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between"><span className="text-sm">{t('subtotal')}</span><strong className="text-base font-medium tabular-nums">{formatMoney(cart.totals?.subtotal, locale)}</strong></div>
          <p className="text-xs text-[var(--color-muted)]">{t('taxes')}</p>
          <Link href={`/${locale}/checkout`} onClick={close} className="flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)] transition hover:bg-black">{t('checkout')}</Link>
          <Link href={`/${locale}/cart`} onClick={close} className="text-center text-sm underline underline-offset-4">{t('viewBag')}</Link>
        </div>
      ) : null}
    >
      {cartState.cart.isLoading ? (
        <div className="grid gap-4 p-5">{[0, 1].map((key) => <div key={key} className="flex gap-3"><div className="skeleton h-24 w-[76px] rounded" /><div className="grid flex-1 gap-2"><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-4 w-1/3 rounded" /></div></div>)}</div>
      ) : count ? (
        <div className="grid gap-2 px-5 pt-4">
          <FreeDeliveryProgress subtotal={cart.totals?.subtotal} locale={locale} />
          {cart.notices?.length ? <p className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] px-3 py-2 text-[13px] text-[var(--color-warning)]">{t('reviewNotice')}</p> : null}
          {cartState.update.error || cartState.remove.error ? <p role="alert" className="text-[13px] text-[var(--color-danger)]">{t('updateError')}</p> : null}
          <CartLines cartState={cartState} locale={locale} compact onNavigate={close} />
          <CartRecommendations items={cart.items} locale={locale} onNavigate={close} />
        </div>
      ) : (
        <div className="grid place-items-center gap-4 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[var(--color-surface)]"><ShoppingBag size={24} /></span>
          <div><p className="font-medium">{t('empty')}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{t('emptyBody')}</p></div>
          <Link href={`/${locale}/shop`} onClick={close} className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] px-6 text-sm font-medium">{t('continue')}</Link>
        </div>
      )}
    </Sheet>
  );
}
