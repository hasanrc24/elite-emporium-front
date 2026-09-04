'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, Card, CardBody, Field, FormattedDate, Input, StatusBadge, Stepper } from '@/components/ui';
import { orderApi } from '@/lib/api/order-api';
import { apiMessage } from '@/lib/api/browser-api';

const TIMELINE_LABELS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

export function TrackForm() {
  const locale = typeof window === 'undefined' ? 'en' : window.location.pathname.split('/')[1] || 'en';
  const search = useSearchParams();
  const [reference, setReference] = useState(search.get('reference') || '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      setResult(await orderApi.track({ reference, phone }));
    } catch (caught) {
      setError(apiMessage(caught, 'Order not found.'));
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = result ? Math.max(0, TIMELINE_LABELS.indexOf(result.orderStatus?.replace('placed', 'placed') || '')) : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={submit}>
        <Card>
          <CardBody className="grid gap-4">
            <h1 className="text-3xl font-black">Track your order</h1>
            <p className="text-[var(--color-muted)]">Enter the order reference and phone number used during checkout.</p>
            <Field label="Order reference" required>
              <Input required value={reference} onChange={(event) => setReference(event.target.value)} />
            </Field>
            <Field label="Phone number" required>
              <Input required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <div>
              <Button loading={loading}>Track order</Button>
            </div>
          </CardBody>
        </Card>
      </form>

      {result ? (
        <Card className="mt-6">
          <CardBody aria-live="polite">
            <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">{result.reference}</p>
            <h2 className="mt-2 text-2xl font-bold capitalize">{result.orderStatus.replaceAll('_', ' ')}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={result.paymentStatus} />
              <StatusBadge status={result.fulfillmentStatus} />
            </div>
            <Stepper steps={TIMELINE_LABELS.map((label) => ({ label }))} current={stepIndex} />
            <ol className="mt-5 border-l-2 border-[var(--color-border)] pl-5">
              {result.events.map((event, index) => (
                <li key={index} className="mb-4">
                  <strong>{event.message}</strong>
                  <br />
                  <FormattedDate value={event.createdAt} withTime className="text-sm text-[var(--color-muted)]" />
                </li>
              ))}
            </ol>
            <Button className="mt-4" variant="secondary" asChild>
              <Link href={`/${locale}/returns?reference=${encodeURIComponent(reference)}`}>Return or exchange items</Link>
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}