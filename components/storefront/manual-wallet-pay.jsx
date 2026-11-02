'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { orderApi } from '@/lib/api/order-api';
import { apiMessage } from '@/lib/api/browser-api';
import { useUiStore } from '@/lib/ui-store';
import { formatMoney } from '@/lib/utils';
import { useStorefront } from './storefront-context';

const PROVIDER_LABELS = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', upay: 'Upay' };

/** BR-PAY-006: send money to the shop's wallet, then report the TrxID for staff to verify. */
export function ManualWalletPay({ locale, reference }) {
  const t = useTranslations('ManualPay');
  const { settings } = useStorefront();
  const lastOrder = useUiStore((state) => state.lastOrder);
  const order = lastOrder?.reference === reference ? lastOrder : null;
  const wallet = settings?.manualWallet;
  const accounts = wallet?.enabled ? wallet.accounts || [] : [];
  const [form, setForm] = useState({ provider: accounts[0]?.provider || 'bkash', phone: '', senderPhone: '', trxId: '' });
  const [state, setState] = useState({ loading: false, error: '', result: null });
  const [copied, setCopied] = useState('');
  const account = accounts.find((item) => item.provider === form.provider);
  const instructions = wallet?.instructions?.[locale] || wallet?.instructions?.en;
  const back = <Link href={`/${locale}/track-order?reference=${encodeURIComponent(reference)}`} className="mt-6 inline-block text-[14px] underline underline-offset-4">{t('track')}</Link>;

  if (!accounts.length) return <div className="mx-auto max-w-xl py-10 text-center md:py-16"><h1 className="page-heading">{t('unavailableTitle')}</h1><p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('unavailableBody')}</p>{back}</div>;

  async function copy(value) {
    try { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(''), 2000); } catch { /* clipboard is optional */ }
  }
  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: '', result: null });
    try {
      const result = await orderApi.submitManualPayment({ reference, phone: form.phone.trim(), provider: form.provider, senderPhone: form.senderPhone.trim(), trxId: form.trxId.trim() });
      setState({ loading: false, error: '', result });
    } catch (caught) {
      setState({ loading: false, error: apiMessage(caught, t('failed')), result: null });
    }
  }

  if (state.result) return (
    <div className="mx-auto max-w-xl py-10 text-center md:py-16" aria-live="polite">
      <Check size={44} strokeWidth={1.4} className="mx-auto text-[var(--color-success)]" aria-hidden="true" />
      <h1 className="page-heading mt-4">{t('receivedTitle')}</h1>
      <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('receivedBody')}</p>
      <p className="mt-4 text-[14px]">{t('trx')}: <strong className="tracking-wide">{state.result.trxId}</strong></p>
      {back}
    </div>
  );

  return (
    <div className="mx-auto max-w-xl py-10 md:py-14">
      <h1 className="page-heading">{t('title')}</h1>
      <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('subtitle', { reference })}</p>
      {order?.total ? <p className="mt-4 text-[15px]">{t('amount')}: <strong className="tabular-nums">{formatMoney(order.total, locale)}</strong></p> : null}
      <ol className="mt-6 grid gap-3 text-[14px] leading-6">
        <li>1. {t('step1')}</li>
        <li>2. {t('step2')}</li>
        <li>3. {t('step3')}</li>
      </ol>
      {instructions ? <p className="mt-3 whitespace-pre-line rounded-[var(--radius)] bg-[var(--color-surface)] p-4 text-[14px]">{instructions}</p> : null}
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="field"><span>{t('provider')}</span><select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}>{accounts.map((item) => <option key={item.provider} value={item.provider}>{PROVIDER_LABELS[item.provider] || item.provider}</option>)}</select></label>
        {account ? <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-4"><div><p className="text-[12px] uppercase tracking-[.12em] text-[var(--color-muted)]">{t('sendTo')}{account.accountType ? ` · ${account.accountType}` : ''}</p><strong className="select-all text-[18px] tracking-wide">{account.number}</strong></div><button type="button" onClick={() => copy(account.number)} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 text-[13px]">{copied === account.number ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === account.number ? t('copied') : t('copy')}</button></div> : null}
        <label className="field"><span>{t('senderPhone')}</span><input required inputMode="tel" autoComplete="off" value={form.senderPhone} onChange={(event) => setForm({ ...form, senderPhone: event.target.value })} placeholder="01XXXXXXXXX" /></label>
        <label className="field"><span>{t('trxId')}</span><input required autoComplete="off" value={form.trxId} onChange={(event) => setForm({ ...form, trxId: event.target.value.toUpperCase() })} placeholder="9XH3K2LQ" /></label>
        <label className="field"><span>{t('orderPhone')}</span><input required inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="01XXXXXXXXX" /><small className="text-[12px] text-[var(--color-muted)]">{t('orderPhoneHint')}</small></label>
        <p className="text-[12px] text-[var(--color-muted)]">{t('noPin')}</p>
        {state.error ? <p role="alert" className="text-[14px] text-[var(--color-danger)]">{state.error}</p> : null}
        <button disabled={state.loading} className="min-h-12 rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)] disabled:opacity-60">{state.loading ? '…' : t('submit')}</button>
      </form>
      {back}
    </div>
  );
}
