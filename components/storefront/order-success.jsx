'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, PackageCheck, PhoneCall, Truck } from 'lucide-react';
import { trackCommerceEvent } from '@/lib/analytics';
import { useUiStore } from '@/lib/ui-store';
import { formatMoney } from '@/lib/utils';
import { useStorefront } from './storefront-context';

/** Refresh-safe: details come from in-memory state only; a reload shows the generic view. */
export function OrderSuccess({ locale, reference }) {
  const t = useTranslations('Success');
  const { settings } = useStorefront();
  const lastOrder = useUiStore((state) => state.lastOrder);
  const order = lastOrder?.reference === reference ? lastOrder : null;
  const tracked = useRef(false);
  useEffect(() => {
    if (!order || tracked.current) return;
    tracked.current = true;
    // Purchase fires once, after backend-confirmed placement (FE-ANALYTICS-002).
    trackCommerceEvent('purchase', { transaction_id: order.reference, value: order.total, currency: 'BDT', items: order.itemCount });
  }, [order]);
  const paid = order?.paymentStatus === 'paid';
  const confirmationNeeded = !order || ['pending', 'no_answer', 'call_back'].includes(order.confirmationStatus);
  const whatsapp = settings?.store?.whatsappUrl;
  const canPayByWallet = !paid && (!order || order.paymentMethod === 'cod') && settings?.manualWallet?.enabled && (settings.manualWallet.accounts || []).length > 0;
  const steps = [
    ...(confirmationNeeded ? [[PhoneCall, t('stepConfirm')]] : []),
    [PackageCheck, t('stepPack')],
    [Truck, paid ? t('stepDeliverPaid') : t('stepDeliver', { method: t('cash') })]
  ];
  return (
    <div className="mx-auto max-w-xl py-10 text-center md:py-16">
      <CheckCircle2 size={44} strokeWidth={1.4} className="mx-auto text-[var(--color-success)]" aria-hidden="true" />
      <h1 className="page-heading mt-4">{order?.firstName ? t('title', { name: order.firstName }) : t('subtitle')}</h1>
      {order?.firstName ? <p className="mt-1 text-[15px] text-[var(--color-muted)]">{t('subtitle')}</p> : null}
      <div className="mt-6 inline-grid gap-0.5 rounded-[var(--radius)] bg-[var(--color-surface)] px-6 py-4">
        <span className="text-[12px] uppercase tracking-[.12em] text-[var(--color-muted)]">{t('reference')}</span>
        <strong className="select-all text-[20px] font-medium tracking-wide">{reference}</strong>
        {order?.total ? <span className="text-[14px] tabular-nums">{formatMoney(order.total, locale)}</span> : null}
      </div>
      <p className="mt-3 text-[13px] text-[var(--color-muted)]">{t('saveReference')}</p>
      <div className="mt-10 text-left">
        <h2 className="text-[16px] font-medium">{t('nextTitle')}</h2>
        <ol className="mt-4 grid gap-4">
          {steps.map(([Icon, text], index) => <li key={text} className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-surface)]"><Icon size={18} aria-hidden="true" /></span><p className="pt-1.5 text-[14px] leading-6"><span className="sr-only">{index + 1}. </span>{text}</p></li>)}
        </ol>
      </div>
      {canPayByWallet ? <Link href={`/${locale}/order/${encodeURIComponent(reference)}/pay`} className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-text)] text-[15px] font-medium">{t('payByWallet')}</Link> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href={`/${locale}/track-order?reference=${encodeURIComponent(reference)}`} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)]">{t('track')}</Link>
        <Link href={`/${locale}/shop`} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-text)] text-[15px]">{t('continue')}</Link>
      </div>
      {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-[14px] underline underline-offset-4">{t('help')}</a> : null}
    </div>
  );
}
