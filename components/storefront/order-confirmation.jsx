'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { orderApi } from '@/lib/api/order-api';
import { formatMoney } from '@/lib/utils';

/**
 * Customer confirms a COD order from the SMS link. Opening the page only
 * looks the order up; confirmation needs an explicit tap so link scanners
 * cannot confirm orders on the customer's behalf.
 */
export function OrderConfirmation({ locale, token }) {
  const t = useTranslations('Confirm');
  const lookup = useQuery({ queryKey: ['confirmation', token], queryFn: () => orderApi.lookupConfirmation(token), retry: false });
  const [state, setState] = useState({ status: 'idle', order: null });
  async function confirm() {
    setState({ status: 'confirming', order: null });
    try { setState({ status: 'done', order: await orderApi.confirm(token) }); } catch (error) { setState({ status: error?.response?.status === 409 ? 'closed' : 'invalid', order: null }); }
  }
  const order = state.order || lookup.data;
  if (lookup.isLoading) return <Panel><p className="text-[var(--color-muted)]">{t('loading')}</p></Panel>;
  if (lookup.error || state.status === 'invalid') return <Panel icon={<CircleAlert size={40} strokeWidth={1.4} className="text-[var(--color-warning)]" />} title={t('invalidTitle')} body={t('invalidBody')} locale={locale} />;
  if (state.status === 'closed' || (order && order.confirmationStatus !== 'confirmed' && order.orderStatus !== 'placed')) return <Panel icon={<CircleAlert size={40} strokeWidth={1.4} className="text-[var(--color-warning)]" />} title={t('closedTitle')} body={t('closedBody')} locale={locale} />;
  if (order?.confirmationStatus === 'confirmed') return <Panel icon={<CheckCircle2 size={44} strokeWidth={1.4} className="text-[var(--color-success)]" />} title={t('confirmedTitle')} body={t('confirmedBody', { reference: order.reference })} locale={locale} />;
  return (
    <Panel title={t('title')} body={t('body', { reference: order.reference, total: formatMoney(order.total, locale) })}>
      <button type="button" onClick={confirm} disabled={state.status === 'confirming'} className="mt-6 min-h-12 w-full rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)] disabled:opacity-60">{state.status === 'confirming' ? t('confirming') : t('confirm')}</button>
    </Panel>
  );
}

function Panel({ icon = null, title, body, children = null, locale }) {
  return (
    <div className="mx-auto grid max-w-md justify-items-center py-16 text-center">
      {icon}
      {title ? <h1 className="page-heading mt-4">{title}</h1> : null}
      {body ? <p className="mt-3 text-[15px] leading-7 text-[var(--color-muted)]">{body}</p> : null}
      {children}
      {locale ? <Link href={`/${locale}/contact`} className="mt-6 text-[14px] underline underline-offset-4">{locale === 'bn' ? 'যোগাযোগ করুন' : 'Contact us'}</Link> : null}
    </div>
  );
}
