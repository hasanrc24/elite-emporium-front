'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, CardBody, CardHeader, Field, FieldGroup, FormattedDate, FormattedMoney, Input, NativeSelect } from '@/components/ui';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';

export function GuestReturnManager({ params }) {
  const { locale } = use(params);
  const search = useSearchParams();
  const [credentials, setCredentials] = useState({ orderReference: search.get('reference') || '', phone: '' });
  const [eligibility, setEligibility] = useState(null);
  const [requests, setRequests] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [type, setType] = useState('return');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function check(event) {
    event.preventDefault();
    setBusy(true); setError(''); setRequests(null);
    try {
      setEligibility(await accountApi.guestReturnEligibility(credentials));
    } catch (caught) {
      setEligibility(null);
      setError(apiMessage(caught, 'Order not found or is not eligible.'));
    } finally { setBusy(false); }
  }

  async function lookup() {
    setBusy(true); setError(''); setEligibility(null);
    try {
      const value = await accountApi.guestReturnLookup(credentials);
      setRequests(Array.isArray(value) ? value : [value]);
    } catch (caught) {
      setRequests(null);
      setError(apiMessage(caught, 'No return requests were found.'));
    } finally { setBusy(false); }
  }

  async function submit() {
    const items = Object.entries(quantities)
      .filter(([, value]) => Number(value) > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity: Number(quantity) }));
    if (!items.length) return setError('Select at least one item.');
    if (reason.trim().length < 3) return setError('Enter a reason for the request.');
    setBusy(true); setError('');
    try {
      const created = await accountApi.createGuestReturn(
        { ...credentials, type, resolution: type === 'exchange' ? 'exchange' : 'refund', reason, items, mediaIds: [] },
        crypto.randomUUID()
      );
      setEligibility(null);
      setRequests([created]);
    } catch (caught) {
      setError(apiMessage(caught));
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Customer care</p><h1 className="storefront-page-title mt-2">Returns and exchanges</h1>
      <p className="mt-2 text-[var(--color-muted)]">Use the order reference and checkout phone number. These details are checked together to protect your order.</p>

      <form className="card mt-7 grid gap-4 p-6 md:grid-cols-2" onSubmit={check}>
        <Field label="Order reference" required>
          <Input required value={credentials.orderReference} onChange={(event) => setCredentials({ ...credentials, orderReference: event.target.value })} />
        </Field>
        <Field label="Checkout phone" required>
          <Input required inputMode="tel" value={credentials.phone} onChange={(event) => setCredentials({ ...credentials, phone: event.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <Button loading={busy}>Check eligibility</Button>
          <Button type="button" variant="secondary" loading={busy} onClick={lookup}>Find existing requests</Button>
        </div>
        {error ? <div className="md:col-span-2"><Alert tone="error">{error}</Alert></div> : null}
      </form>

      {eligibility ? (
        <Card className="mt-6">
          <CardHeader title="Eligible items" description={`Submit by ${new Date(eligibility.policy.deadline).toLocaleDateString('en-BD', { timeZone: 'Asia/Dhaka' })}.`} />
          <CardBody className="grid gap-3">
            {eligibility.items.map((item) => (
              <div key={item.orderItemId} className={`grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 sm:grid-cols-[1fr_110px] ${item.eligible ? '' : 'opacity-60'}`}>
                <span>
                  <strong>{item.productName}</strong>
                  <br />
                  <span className="text-sm text-[var(--color-muted)]">
                    {item.variantTitle} · {item.sku} · up to {item.eligibleQuantity} ·{' '}
                    <FormattedMoney value={item.refundableAmount} locale={locale} />
                  </span>
                  {!item.eligible ? <><br /><span className="text-sm text-[var(--color-danger)]">{item.reason}</span></> : null}
                </span>
                <Input
                  aria-label={`Quantity for ${item.productName}`}
                  type="number"
                  min={0}
                  max={item.eligibleQuantity}
                  disabled={!item.eligible}
                  value={quantities[item.orderItemId] || 0}
                  onChange={(event) => setQuantities({ ...quantities, [item.orderItemId]: event.target.value })}
                />
              </div>
            ))}
            <FieldGroup columns={2}>
              <Field label="Resolution">
                <NativeSelect
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  options={[
                    { value: 'return', label: 'Refund' },
                    { value: 'exchange', label: 'Exchange' }
                  ]}
                />
              </Field>
              <Field label="Reason" required>
                <Input minLength={3} required value={reason} onChange={(event) => setReason(event.target.value)} />
              </Field>
            </FieldGroup>
            <Button loading={busy} onClick={submit}>Submit request</Button>
          </CardBody>
        </Card>
      ) : null}

      {requests ? (
        <section className="mt-6 grid gap-4" aria-live="polite">
          <h2 className="text-2xl font-bold">Return requests</h2>
          {requests.map((request) => (
            <Card key={request.id}>
              <CardBody className="grid gap-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <strong>{request.reference}</strong>
                    <p className="capitalize text-[var(--color-muted)]">{request.type} · {request.status.replaceAll('_', ' ')}</p>
                  </div>
                  <strong>{request.refundAmount ? <FormattedMoney value={request.refundAmount} locale={locale} /> : 'Pending review'}</strong>
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
