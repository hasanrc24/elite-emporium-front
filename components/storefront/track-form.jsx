'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { orderApi } from '@/lib/api/order-api';
import { apiMessage } from '@/lib/api/browser-api';
import { FormattedDate } from '@/components/ui';

const STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];

function progressIndex(result) {
  const fulfillment = result.fulfillmentStatus;
  if (['delivered', 'partially_returned', 'returned'].includes(fulfillment)) return 4;
  if (['shipped', 'out_for_delivery'].includes(fulfillment)) return 3;
  if (fulfillment === 'packed') return 2;
  if (['confirmed', 'processing'].includes(result.orderStatus) || fulfillment === 'processing') return 1;
  return 0;
}

export function TrackForm({ locale = 'en' }) {
  const t = useTranslations('Track');
  const search = useSearchParams();
  const [reference, setReference] = useState(search.get('reference') || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try { setResult(await orderApi.track({ reference: reference.trim() })); } catch (caught) { setError(caught?.response?.status === 404 ? t('notFound') : apiMessage(caught, t('notFound'))); } finally { setLoading(false); }
  }

  const index = result ? progressIndex(result) : 0;
  const stopped = result && (result.orderStatus === 'cancelled' || result.fulfillmentStatus === 'returned_to_origin');
  return (
    <div className="mx-auto max-w-xl py-10 md:py-14">
      <h1 className="page-heading">{t('title')}</h1>
      <p className="mt-2 text-[15px] text-[var(--color-muted)]">{t('subtitle')}</p>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="field"><span>{t('reference')}</span><input required value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="EE-XXXXXXXX" autoComplete="off" /></label>
        {error ? <p role="alert" className="text-[14px] text-[var(--color-danger)]">{error}</p> : null}
        <button disabled={loading} className="min-h-12 rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[15px] font-medium text-[var(--color-bg)] disabled:opacity-60">{loading ? '…' : t('submit')}</button>
      </form>

      {result ? (
        <section className="mt-10 border-t border-[var(--color-border)] pt-8" aria-live="polite">
          <p className="text-[12px] uppercase tracking-[.12em] text-[var(--color-muted)]">{result.reference}</p>
          {stopped ? (
            <p className="mt-3 rounded-[var(--radius)] bg-[var(--color-surface)] p-4 text-[15px]">{result.fulfillmentStatus === 'returned_to_origin' ? t('returnedToOrigin') : t('cancelled')}</p>
          ) : (
            <ol className="mt-5 grid grid-cols-5 gap-1">
              {STEPS.map((step, stepIndex) => (
                <li key={step} className="grid justify-items-center gap-2 text-center">
                  <span className={`grid size-8 place-items-center rounded-full border text-[12px] ${stepIndex <= index ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]' : 'border-[var(--color-border-strong)] text-[var(--color-muted)]'}`} aria-hidden="true">{stepIndex < index ? <Check size={15} /> : stepIndex + 1}</span>
                  <span className={`text-[11px] leading-tight md:text-[12px] ${stepIndex <= index ? '' : 'text-[var(--color-muted)]'}`}>{t(`progress.${step}`)}</span>
                </li>
              ))}
            </ol>
          )}
          {result.events?.length ? (
            <>
              <h2 className="mt-8 text-[15px] font-medium">{t('timeline')}</h2>
              <ol className="mt-3 grid gap-4 border-l border-[var(--color-border-strong)] pl-5">
                {[...result.events].reverse().map((event, eventIndex) => (
                  <li key={eventIndex} className="relative"><span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-[var(--color-text)]" aria-hidden="true" /><p className="text-[14px]">{event.message}</p><FormattedDate value={event.createdAt} locale={locale} withTime className="text-[12px] text-[var(--color-muted)]" /></li>
                ))}
              </ol>
            </>
          ) : null}
          {result.fulfillmentStatus === 'delivered' ? <Link href={`/${locale}/returns?reference=${encodeURIComponent(result.reference)}`} className="mt-8 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--color-text)] px-6 text-[14px]">{t('returnExchange')}</Link> : null}
        </section>
      ) : null}
    </div>
  );
}
