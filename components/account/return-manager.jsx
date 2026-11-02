'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage, isRetryableFailure } from '@/lib/api/browser-api';
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, FormattedDate, FormattedMoney, Input, NativeSelect, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AccountList } from './list-parts';

const RETURNS_PAGE_SIZE = 10;

// Reason codes from BR-RET-001; the code is stored as the request reason.
export const RETURN_REASONS = ['size_too_small', 'size_too_large', 'damaged', 'wrong_item', 'not_as_pictured', 'changed_mind', 'other'];

const returnSchema = (t) => z.object({
  type: z.enum(['return', 'exchange']),
  reason: z.enum(RETURN_REASONS, { error: t('errors.reason') }),
  customerNote: z.string().trim().max(1000, t('errors.noteLength')).optional().default('')
}).refine((value) => value.reason !== 'other' || value.customerNote.trim().length >= 3, { path: ['customerNote'], message: t('errors.otherNote') });

const reasonLabel = (t, reason) => (RETURN_REASONS.includes(reason) ? t(`reasons.${reason}`) : reason);

export function ReturnList({ locale }) {
  const t = useTranslations('Account.returns');
  const [params, setParams] = useTableParams({ page: 1 });
  const returns = useQuery({ queryKey: ['account', 'returns', params.page], queryFn: () => accountApi.returns({ page: params.page, pageSize: RETURNS_PAGE_SIZE }), placeholderData: (previous) => previous });
  const href = (item) => `/${locale}/account/returns/${item.id}`;
  const columns = [
    { id: 'reference', header: t('columns.request'), cell: ({ row }) => <Link href={href(row.original)} className="font-semibold text-[var(--color-primary)] hover:underline">{row.original.reference}</Link> },
    { id: 'order', header: t('columns.order'), cell: ({ row }) => row.original.order.reference },
    { id: 'type', header: t('columns.type'), cell: ({ row }) => t(`types.${row.original.type}`) },
    { id: 'status', header: t('columns.status'), cell: ({ row }) => <StatusBadge status={row.original.status} locale={locale} /> },
    { id: 'view', header: <span className="sr-only">{t('view')}</span>, meta: { align: 'right' }, cell: ({ row }) => <Link href={href(row.original)} aria-label={`${t('view')} ${row.original.reference}`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{t('view')} →</Link> }
  ];
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">{t('title')}</h2>
      <AccountList
        query={returns}
        columns={columns}
        caption={t('title')}
        page={params.page}
        pageSize={RETURNS_PAGE_SIZE}
        onPageChange={(page) => setParams({ page })}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyBody')}
        emptyAction={<Button asChild variant="secondary"><Link href={`/${locale}/account/orders`}>{t('viewOrders')}</Link></Button>}
        renderCard={(item) => (
          <Link href={href(item)} className="card flex items-center justify-between gap-4 p-4 hover:border-[var(--color-primary)]">
            <div className="grid gap-1">
              <p className="text-sm text-[var(--color-muted)]">{item.reference} · {t('orderRef', { reference: item.order.reference })}</p>
              <h3 className="flex flex-wrap items-center gap-2 font-bold">{t(`types.${item.type}`)} <StatusBadge status={item.status} locale={locale} /></h3>
            </div>
            <span className="shrink-0 font-semibold text-[var(--color-primary)]">{t('view')} →</span>
          </Link>
        )}
      />
    </div>
  );
}

export function NewReturn({ locale }) {
  const t = useTranslations('Account.returns');
  const schema = useMemo(() => returnSchema(t), [t]);
  const search = useSearchParams();
  const router = useRouter();
  const orderId = search.get('orderId') || '';
  const [quantities, setQuantities] = useState({});
  const [replacements, setReplacements] = useState({});
  // One key per intended submission: reused when a retry may duplicate a request that reached the server.
  const idempotencyKey = useRef(null);
  const eligibility = useQuery({
    queryKey: ['return-eligibility', orderId],
    queryFn: () => accountApi.returnEligibility(orderId),
    enabled: Boolean(orderId)
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'return', reason: 'size_too_small', customerNote: '' },
  });

  const [type, reason] = useWatch({ control: form.control, name: ['type', 'reason'] });
  const create = useMutation({
    mutationFn: (values) => {
      const items = Object.entries(quantities)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([orderItemId, qty]) => ({ orderItemId, quantity: Number(qty), ...(values.type === 'exchange' && replacements[orderItemId] ? { requestedVariantId: replacements[orderItemId] } : {}) }));
      if (!items.length) throw new Error(t('errors.noItems'));
      idempotencyKey.current ||= crypto.randomUUID();
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
        idempotencyKey.current
      );
    },
    onSuccess: (data) => {
      idempotencyKey.current = null;
      successToast(t('created'));
      router.replace(`/${locale}/account/returns/${data.id}`);
    },
    onError: (error) => {
      if (error?.response && !isRetryableFailure(error)) idempotencyKey.current = null;
      errorToast(t('createFailed'), apiMessage(error, error.message));
    },
  });

  if (!orderId) return <Alert tone="error">{t('chooseOrder')}</Alert>;
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
        <CardHeader title={t('notEligible')} />
        <CardBody>
          <p className="text-[var(--color-muted)]">
            {t('notEligibleBody')}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
      <div>
        <h2 className="text-2xl font-bold">{t('newTitle')}</h2>
        <p className="mt-1 text-[var(--color-muted)]">
          {t('orderRef', { reference: eligibility.data.order.reference })} · {t('requestBy')}{' '}
          <FormattedDate value={eligibility.data.policy.deadline} locale={locale} />
        </p>
      </div>

      <fieldset>
        <legend className="font-bold">{t('items')}</legend>
        <div className="mt-3 grid gap-3">
          {eligibility.data.items.map((item) => (
            <div
              key={item.orderItemId}
              className={`grid grid-cols-[1fr_120px] items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 ${!item.eligible ? 'opacity-60' : ''}`}
            >
              <span>
                <strong>{item.productName}</strong>
                <br />
                <span className="text-sm text-[var(--color-muted)]">
                  {item.variantTitle} · {item.sku} · {t('upTo', { count: item.eligibleQuantity })} ·{' '}
                  <FormattedMoney value={item.refundableAmount} locale={locale} />
                </span>
              </span>
              <Input
                aria-label={t('quantityFor', { name: item.productName })}
                type="number"
                min={0}
                max={item.eligibleQuantity}
                disabled={!item.eligible}
                value={quantities[item.orderItemId] || 0}
                onChange={(event) => setQuantities((current) => ({ ...current, [item.orderItemId]: event.target.value }))}
              />
              {type === 'exchange' && item.eligible && Number(quantities[item.orderItemId] || 0) > 0 && item.exchangeOptions?.length ? (
                <Field label={t('replacement')} hint={t('replacementHint')} className="col-span-2">
                  <NativeSelect
                    value={replacements[item.orderItemId] || ''}
                    onChange={(event) => setReplacements((current) => ({ ...current, [item.orderItemId]: event.target.value }))}
                    options={[{ value: '', label: t('replacementNone') }, ...item.exchangeOptions.map((option) => ({ value: option.variantId, label: option.available ? option.title : `${option.title} — ${t('soldOut')}`, disabled: !option.available }))]}
                  />
                </Field>
              ) : null}
            </div>
          ))}
        </div>
      </fieldset>

      <Field label={t('type')} error={form.formState.errors.type?.message}>
        <NativeSelect
          value={type}
          onChange={(event) => form.setValue('type', event.target.value)}
          options={[
            { value: 'return', label: t('types.return') },
            { value: 'exchange', label: t('types.exchange') }
          ]}
        />
      </Field>

      <Field label={t('reason')} required error={form.formState.errors.reason?.message}>
        <NativeSelect value={reason} onChange={(event) => form.setValue('reason', event.target.value, { shouldValidate: true })} options={RETURN_REASONS.map((value) => ({ value, label: t(`reasons.${value}`) }))} />
      </Field>

      <Field label={t('details')} error={form.formState.errors.customerNote?.message}>
        <Textarea rows={4} {...form.register('customerNote')} />
      </Field>

      {create.error ? <Alert tone="error">{apiMessage(create.error, create.error.message)}</Alert> : null}

      <div>
        <Button loading={create.isPending} type="submit">{t('submit')}</Button>
      </div>
    </form>
  );
}

export function ReturnDetail({ id, locale }) {
  const t = useTranslations('Account.returns');
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ['account', 'return', id], queryFn: () => accountApi.returnDetail(id) });
  const cancel = useMutation({
    mutationFn: () => accountApi.cancelReturn(id, detail.data.version, 'Cancelled by customer'),
    onSuccess: (data) => {
      client.setQueryData(['account', 'return', id], data);
      client.invalidateQueries({ queryKey: ['account', 'returns'] });
      pushToast({ tone: 'success', title: t('cancelled') });
    },
    onError: (error) => pushToast({ tone: 'error', title: t('cancelFailed'), description: apiMessage(error) })
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
          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{t(`types.${data.type}`)} <StatusBadge status={data.status} locale={locale} /></h2>
          <p className="text-[var(--color-muted)]">{t('orderRef', { reference: data.order.reference })} · {reasonLabel(t, data.reason)}</p>
          {data.refundAmount ? (
            <p className="font-bold">
              {t('refund')}: <FormattedMoney value={data.refundAmount} locale={locale} />
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('items')} />
        <CardBody className="grid gap-3">
          {data.items.map((item) => (
            <div key={item.id} className="border-t border-[var(--color-border)] pt-3 first:border-0 first:pt-0">
              <strong>{item.orderItem.productName}</strong>
              <p className="text-sm text-[var(--color-muted)]">
                {item.orderItem.variantTitle} · {item.orderItem.sku} · {t('qty', { count: item.quantity })}
              </p>
              {item.requestedVariant ? <p className="text-sm">{t('replacementChosen', { size: item.requestedVariant.title })}</p> : null}
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('timeline')} />
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
        <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>{t('cancel')}</Button>
      ) : null}
      {cancel.error ? <Alert tone="error">{apiMessage(cancel.error)}</Alert> : null}
    </div>
  );
}