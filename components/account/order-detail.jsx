'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiMessage } from '@/lib/api/browser-api';
import { orderApi } from '@/lib/api/order-api';
import { Alert, Button, Card, CardBody, CardHeader, Field, FormattedDate, FormattedMoney, Input, NativeSelect, StatusBadge, Stepper } from '@/components/ui';

const TIMELINE_LABELS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
const statusLabel = (status, locale) => <StatusBadge status={status} locale={locale} />;

export function OrderDetail({ id, locale }) {
  const t = useTranslations('Account.order');
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const order = useQuery({ queryKey: ['order', id], queryFn: () => orderApi.get(id) });
  const cancel = useMutation({
    mutationFn: () => orderApi.cancel(id, reason),
    onSuccess: (data) => {
      client.setQueryData(['order', id], data);
      client.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  if (order.isLoading) {
    return (
      <Card>
        <CardBody>{t('loading')}</CardBody>
      </Card>
    );
  }
  if (order.error) {
    return <Alert tone="error">{apiMessage(order.error, t('loadError'))}</Alert>;
  }

  const data = order.data;
  const cancellable = ['placed', 'confirmed'].includes(data.orderStatus) && data.fulfillmentStatus === 'unfulfilled' && data.paymentStatus !== 'paid';
  const timelineIndex = TIMELINE_LABELS.indexOf(data.orderStatus);
  const returnable = data.items.some((item) => item.fulfilledQuantity > item.returnedQuantity);

  return (
    <div className="grid gap-6">
      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">{data.reference}</p>
            <h2 className="text-2xl font-bold">{statusLabel(data.orderStatus, locale)}</h2>
            <FormattedDate value={data.createdAt} locale={locale} withTime className="text-[var(--color-muted)]" />
            <Stepper steps={TIMELINE_LABELS.map((label) => ({ label: t(`steps.${label}`) }))} current={timelineIndex >= 0 ? timelineIndex + 1 : 0} />
          </div>
          <div className="grid gap-1 text-right">
            <strong className="text-2xl font-black">
              <FormattedMoney value={data.totals.grand} locale={locale} />
            </strong>
            <p className="flex flex-wrap justify-end gap-2 text-sm text-[var(--color-muted)]">{statusLabel(data.paymentStatus, locale)}{statusLabel(data.fulfillmentStatus, locale)}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('items')} />
        <div className="divide-y divide-[var(--color-border)]">
          {data.items.map((item) => (
            <div key={item.id} className="flex flex-wrap justify-between gap-4 px-6 py-4">
              <div>
                <strong>{item.productName}</strong>
                <p className="text-sm text-[var(--color-muted)]">{item.variantTitle} · {item.sku} · {t('qty', { count: item.quantity })}</p>
                {item.productId && item.fulfilledQuantity > item.returnedQuantity ? (
                  <Link className="mt-2 inline-block text-sm font-semibold text-[var(--color-primary)]" href={`/${locale}/account/reviews/new?productId=${item.productId}&orderItemId=${item.id}`}>
                    {t('writeReview')} →
                  </Link>
                ) : null}
              </div>
              <strong className="tabular-nums"><FormattedMoney value={item.lineTotal} locale={locale} /></strong>
            </div>
          ))}
        </div>
        <CardBody className="grid gap-1">
          <TotalRow label={t('subtotal')} value={data.totals.subtotal} locale={locale} />
          <TotalRow label={t('discount')} value={data.totals.discount} locale={locale} />
          <TotalRow label={data.delivery.label} value={data.totals.delivery} locale={locale} />
          <TotalRow label={t('tax')} value={data.totals.tax} locale={locale} />
          <TotalRow label={t('total')} value={data.totals.grand} locale={locale} strong />
          {returnable ? (
            <Link className="mt-3 text-sm font-semibold text-[var(--color-primary)]" href={`/${locale}/account/returns/new?orderId=${encodeURIComponent(data.id)}`}>
              {t('requestReturn')} →
            </Link>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('delivery')} />
        <CardBody className="grid gap-2">
          <p>{data.address?.recipientName || data.customer.name} · {data.address?.phone || data.customer.phone}</p>
          <p className="text-[var(--color-muted)]">{[data.address?.addressLine, data.address?.area, data.address?.district, data.address?.division, data.address?.postcode].filter(Boolean).join(', ')}</p>
          {data.address?.landmark ? <p className="text-sm text-[var(--color-muted)]">{t('landmark')}: {data.address.landmark}</p> : null}
          <div className="mt-3">
            <StatusBadge status={data.fulfillmentStatus} locale={locale} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('timeline')} />
        <CardBody className="grid gap-3">
          {(data.events || []).map((event) => (
            <div key={event.id} className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold capitalize">{event.type?.replaceAll('_', ' ')}</p>
                <p className="text-sm text-[var(--color-muted)]">{event.message}</p>
              </div>
              <FormattedDate value={event.createdAt} locale={locale} withTime className="text-sm text-[var(--color-muted)]" />
            </div>
          ))}
        </CardBody>
      </Card>

      {cancellable ? (
        <Card>
          <CardHeader title={t('cancelTitle')} description={t('cancelIntro')} />
          <CardBody className="grid gap-3">
            <Field label={t('cancelReason')}>
              <Input value={reason} onChange={(event) => setReason(event.target.value)}  placeholder={t('cancelPlaceholder')} />
            </Field>
            <div>
              <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>{t('cancelSubmit')}</Button>
            </div>
            {cancel.error ? <Alert tone="error">{apiMessage(cancel.error)}</Alert> : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function TotalRow({ label, value, locale, strong = false }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-lg font-bold' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums"><FormattedMoney value={value} locale={locale} /></span>
    </div>
  );
}