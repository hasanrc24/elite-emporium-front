'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, Button, Card, CardBody, CardHeader, Field, FieldGroup, FormattedDate, FormattedMoney, Input, NativeSelect, StatusBadge, Textarea } from '@/components/ui';
import { RETURN_REASONS } from '@/components/account/return-manager';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage, isRetryableFailure } from '@/lib/api/browser-api';

export function GuestReturnManager({ locale }) {
  const t = useTranslations('Account.returns');
  const g = useTranslations('GuestReturns');
  const search = useSearchParams();
  const [credentials, setCredentials] = useState({ orderReference: search.get('reference') || '', phone: '' });
  const [eligibility, setEligibility] = useState(null);
  const [requests, setRequests] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [type, setType] = useState('return');
  const [reason, setReason] = useState('size_too_small');
  const [note, setNote] = useState('');
  const [replacements, setReplacements] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // One key per intended submission: reused when a retry may duplicate a request that reached the server.
  const idempotencyKey = useRef(null);

  async function check(event) {
    event.preventDefault();
    setBusy(true); setError(''); setRequests(null);
    try {
      setEligibility(await accountApi.guestReturnEligibility(credentials));
    } catch (caught) {
      setEligibility(null);
      setError(apiMessage(caught, g('notFound')));
    } finally { setBusy(false); }
  }

  async function lookup() {
    setBusy(true); setError(''); setEligibility(null);
    try {
      const value = await accountApi.guestReturnLookup(credentials);
      setRequests(Array.isArray(value) ? value : [value]);
    } catch (caught) {
      setRequests(null);
      setError(apiMessage(caught, g('noRequests')));
    } finally { setBusy(false); }
  }

  async function submit() {
    const items = Object.entries(quantities)
      .filter(([, value]) => Number(value) > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity: Number(quantity), ...(type === 'exchange' && replacements[orderItemId] ? { requestedVariantId: replacements[orderItemId] } : {}) }));
    if (!items.length) return setError(t('errors.noItems'));
    if (reason === 'other' && note.trim().length < 3) return setError(t('errors.otherNote'));
    setBusy(true); setError('');
    idempotencyKey.current ||= crypto.randomUUID();
    try {
      const created = await accountApi.createGuestReturn(
        { ...credentials, type, resolution: type === 'exchange' ? 'exchange' : 'refund', reason, ...(note.trim() ? { customerNote: note.trim() } : {}), items, mediaIds: [] },
        idempotencyKey.current
      );
      idempotencyKey.current = null;
      setEligibility(null);
      setRequests([created]);
    } catch (caught) {
      if (!isRetryableFailure(caught)) idempotencyKey.current = null;
      setError(apiMessage(caught));
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">{g('eyebrow')}</p><h1 className="storefront-page-title mt-2">{t('title')}</h1>
      <p className="mt-2 text-[var(--color-muted)]">{g('intro')}</p>

      <form className="card mt-7 grid gap-4 p-6 md:grid-cols-2" onSubmit={check}>
        <Field label={g('reference')} required>
          <Input required value={credentials.orderReference} onChange={(event) => setCredentials({ ...credentials, orderReference: event.target.value })} />
        </Field>
        <Field label={g('phone')} required>
          <Input required inputMode="tel" value={credentials.phone} onChange={(event) => setCredentials({ ...credentials, phone: event.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <Button loading={busy}>{g('check')}</Button>
          <Button type="button" variant="secondary" loading={busy} onClick={lookup}>{g('find')}</Button>
        </div>
        {error ? <div className="md:col-span-2"><Alert tone="error">{error}</Alert></div> : null}
      </form>

      {eligibility ? (
        <Card className="mt-6">
          <CardHeader title={g('eligibleItems')} description={<>{t('requestBy')} <FormattedDate value={eligibility.policy.deadline} locale={locale} /></>} />
          <CardBody className="grid gap-3">
            {eligibility.items.map((item) => (
              <div key={item.orderItemId} className={`grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 sm:grid-cols-[1fr_110px] ${item.eligible ? '' : 'opacity-60'}`}>
                <span>
                  <strong>{item.productName}</strong>
                  <br />
                  <span className="text-sm text-[var(--color-muted)]">
                    {item.variantTitle} · {item.sku} · {t('upTo', { count: item.eligibleQuantity })} ·{' '}
                    <FormattedMoney value={item.refundableAmount} locale={locale} />
                  </span>
                  {!item.eligible ? <><br /><span className="text-sm text-[var(--color-danger)]">{g('itemNotEligible')}</span></> : null}
                </span>
                <Input
                  aria-label={t('quantityFor', { name: item.productName })}
                  type="number"
                  min={0}
                  max={item.eligibleQuantity}
                  disabled={!item.eligible}
                  value={quantities[item.orderItemId] || 0}
                  onChange={(event) => setQuantities({ ...quantities, [item.orderItemId]: event.target.value })}
                />
                {type === 'exchange' && item.eligible && Number(quantities[item.orderItemId] || 0) > 0 && item.exchangeOptions?.length ? (
                  <Field label={t('replacement')} hint={t('replacementHint')} className="sm:col-span-2">
                    <NativeSelect
                      value={replacements[item.orderItemId] || ''}
                      onChange={(event) => setReplacements({ ...replacements, [item.orderItemId]: event.target.value })}
                      options={[{ value: '', label: t('replacementNone') }, ...item.exchangeOptions.map((option) => ({ value: option.variantId, label: option.available ? option.title : `${option.title} — ${t('soldOut')}`, disabled: !option.available }))]}
                    />
                  </Field>
                ) : null}
              </div>
            ))}
            <FieldGroup columns={2}>
              <Field label={t('type')}>
                <NativeSelect
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  options={[
                    { value: 'return', label: t('types.return') },
                    { value: 'exchange', label: t('types.exchange') }
                  ]}
                />
              </Field>
              <Field label={t('reason')} required>
                <NativeSelect value={reason} onChange={(event) => setReason(event.target.value)} options={RETURN_REASONS.map((value) => ({ value, label: t(`reasons.${value}`) }))} />
              </Field>
            </FieldGroup>
            <Field label={t('details')}>
              <Textarea rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
            <Button loading={busy} onClick={submit}>{t('submit')}</Button>
          </CardBody>
        </Card>
      ) : null}

      {requests ? (
        <section className="mt-6 grid gap-4" aria-live="polite">
          <h2 className="text-2xl font-bold">{g('requests')}</h2>
          {requests.map((request) => (
            <Card key={request.id}>
              <CardBody className="grid gap-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <strong>{request.reference}</strong>
                    <p className="flex flex-wrap items-center gap-2 text-[var(--color-muted)]">{t(`types.${request.type}`)} <StatusBadge status={request.status} locale={locale} /></p>
                  </div>
                  <strong>{request.refundAmount ? <FormattedMoney value={request.refundAmount} locale={locale} /> : g('pendingReview')}</strong>
                </div>
                <ol className="border-l-2 border-[var(--color-border)] pl-4">
                  {request.events?.map((event) => (
                    <li key={event.id} className="mb-3">
                      <strong>{event.message}</strong>
                      <br />
                      <FormattedDate value={event.createdAt} locale={locale} withTime className="text-sm text-[var(--color-muted)]" />
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
