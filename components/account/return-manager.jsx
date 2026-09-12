'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, FormattedDate, FormattedMoney, Input, NativeSelect, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

const returnSchema = z.object({
  type: z.enum(['return', 'exchange'], { required_error: 'Select a request type', invalid_type_error: 'Select a request type' }),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(300, 'Reason must be 300 characters or fewer'),
  customerNote: z.string().trim().max(1000, 'Details must be 1000 characters or fewer').optional().default(''),
});

export function ReturnList({ locale }) {
  const returns = useQuery({ queryKey: ['account', 'returns'], queryFn: () => accountApi.returns() });
  if (returns.isLoading) {
    return (
      <Card>
        <Skeleton className="h-32" />
      </Card>
    );
  }
  if (returns.error) return <Alert tone="error">{apiMessage(returns.error)}</Alert>;

  const list = returns.data?.data || [];
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">Returns and exchanges</h2>
      {list.length ? (
        list.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}/account/returns/${item.id}`}
            className="card flex flex-wrap items-center justify-between gap-4 p-5 hover:border-[var(--color-primary)]"
          >
            <div className="grid gap-1">
              <p className="text-sm text-[var(--color-muted)]">{item.reference} · Order {item.order.reference}</p>
              <h3 className="font-bold capitalize">{item.type} — {item.status.replaceAll('_', ' ')}</h3>
            </div>
            <span className="font-semibold text-[var(--color-primary)]">View →</span>
          </Link>
        ))
      ) : (
        <EmptyState title="No return requests" description="You haven't opened any return or exchange requests yet." />
      )}
    </div>
  );
}

export function NewReturn({ locale }) {
  const search = useSearchParams();
  const router = useRouter();
  const orderId = search.get('orderId') || '';
  const [quantities, setQuantities] = useState({});
  const eligibility = useQuery({
    queryKey: ['return-eligibility', orderId],
    queryFn: () => accountApi.returnEligibility(orderId),
    enabled: Boolean(orderId)
  });
  const form = useForm({
    resolver: zodResolver(returnSchema),
    defaultValues: { type: 'return', reason: '', customerNote: '' },
  });

  const create = useMutation({
    mutationFn: (values) => {
      const items = Object.entries(quantities)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([orderItemId, qty]) => ({ orderItemId, quantity: Number(qty) }));
      if (!items.length) throw new Error('Select at least one item quantity.');
      return accountApi.createReturn(
        {
          orderId,
          type: values.type,
          resolution: values.type === 'exchange' ? 'exchange' : 'refund',
          reason: values.reason,
          customerNote: values.customerNote,
          items,
          mediaIds: []
        },
        crypto.randomUUID()
      );
    },
    onSuccess: (data) => {
      successToast('Return request created', 'Your request has been submitted');
      router.replace(`/${locale}/account/returns/${data.id}`);
    },
    onError: (error) => errorToast('Failed to create return request', apiMessage(error, 'Could not create return request')),
  });

  if (!orderId) return <Alert tone="error">Choose an order before requesting a return.</Alert>;
  if (eligibility.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (eligibility.error) return <Alert tone="error">{apiMessage(eligibility.error)}</Alert>;
  if (!eligibility.data.eligible) {
    return (
      <Card>
        <CardHeader title="This order is not eligible" />
        <CardBody>
          <p className="text-[var(--color-muted)]">
            {eligibility.data.ineligibleReason?.replaceAll('_', ' ') || 'No items can be returned.'}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
      <div>
        <h2 className="text-2xl font-bold">Return or exchange</h2>
        <p className="mt-1 text-[var(--color-muted)]">
          Order {eligibility.data.order.reference} · Request by{' '}
          <FormattedDate value={eligibility.data.policy.deadline} locale={locale} />
        </p>
      </div>

      <fieldset>
        <legend className="font-bold">Items</legend>
        <div className="mt-3 grid gap-3">
          {eligibility.data.items.map((item) => (
            <label
              key={item.orderItemId}
              className={`grid grid-cols-[1fr_120px] items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 ${!item.eligible ? 'opacity-60' : ''}`}
            >
              <span>
                <strong>{item.productName}</strong>
                <br />
                <span className="text-sm text-[var(--color-muted)]">
                  {item.variantTitle} · {item.sku} · Up to {item.eligibleQuantity} ·{' '}
                  <FormattedMoney value={item.refundableAmount} locale={locale} />
                </span>
              </span>
              <Input
                aria-label={`Quantity for ${item.productName}`}
                type="number"
                min={0}
                max={item.eligibleQuantity}
                disabled={!item.eligible}
                value={quantities[item.orderItemId] || 0}
                onChange={(event) => setQuantities((current) => ({ ...current, [item.orderItemId]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Request type" error={form.formState.errors.type?.message}>
        <NativeSelect
          {...form.register('type')}
          options={[
            { value: 'return', label: 'Return for refund' },
            { value: 'exchange', label: 'Exchange' }
          ]}
        />
      </Field>

      <Field label="Reason" required error={form.formState.errors.reason?.message}>
        <Input required minLength={3} {...form.register('reason')} />
      </Field>

      <Field label="Additional details (optional)" error={form.formState.errors.customerNote?.message}>
        <Textarea rows={4} {...form.register('customerNote')} />
      </Field>

      {create.error ? <Alert tone="error">{apiMessage(create.error, create.error.message)}</Alert> : null}

      <div>
        <Button loading={create.isPending} type="submit">Submit request</Button>
      </div>
    </form>
  );
}

export function ReturnDetail({ id, locale }) {
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ['account', 'return', id], queryFn: () => accountApi.returnDetail(id) });
  const cancel = useMutation({
    mutationFn: () => accountApi.cancelReturn(id, detail.data.version, 'Cancelled by customer'),
    onSuccess: (data) => {
      client.setQueryData(['account', 'return', id], data);
      client.invalidateQueries({ queryKey: ['account', 'returns'] });
      pushToast({ tone: 'success', title: 'Return request cancelled', description: 'The request has been cancelled.' });
    },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not cancel return', description: apiMessage(error, 'Return could not be cancelled.') })
  });

  if (detail.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (detail.error) return <Alert tone="error">{apiMessage(detail.error)}</Alert>;

  const data = detail.data;
  return (
    <div className="grid gap-6">
      <Card>
        <CardBody className="grid gap-2">
          <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">{data.reference}</p>
          <h2 className="text-2xl font-bold capitalize">{data.type} — {data.status.replaceAll('_', ' ')}</h2>
          <p className="text-[var(--color-muted)]">Order {data.order.reference}</p>
          {data.refundAmount ? (
            <p className="font-bold">
              Refund: <FormattedMoney value={data.refundAmount} locale={locale} />
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Items" />
        <CardBody className="grid gap-3">
          {data.items.map((item) => (
            <div key={item.id} className="border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0">
              <strong>{item.orderItem.productName}</strong>
              <p className="text-sm text-[var(--color-muted)]">
                {item.orderItem.variantTitle} · {item.orderItem.sku} · Qty {item.quantity}
              </p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Timeline" />
        <CardBody>
          <ol className="border-l-2 border-[var(--color-border)] pl-5">
            {data.events.map((event) => (
              <li key={event.id} className="mb-4 last:mb-0">
                <strong>{event.message}</strong>
                <FormattedDate value={event.createdAt} locale={locale} withTime className="block text-sm text-[var(--color-muted)]" />
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {data.status === 'requested' ? (
        <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancel request</Button>
      ) : null}
      {cancel.error ? <Alert tone="error">{apiMessage(cancel.error)}</Alert> : null}
    </div>
  );
}