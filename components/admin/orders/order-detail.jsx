'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Phone, Printer, X } from 'lucide-react';
import { Alert, Button, FormattedMoney, Skeleton } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { AdminPageHeader } from '../admin-page-header';
import { orderActionButtons, useOrderActionDialog } from './order-actions';
import { CHANNEL_LABELS, OPEN_CONFIRMATION, RISK_SIGNAL_LABELS, RiskBadge, StatusPill, formatDateTime, telHref, useCan, whatsappHref } from './order-shared';

export function OrderDetail({ id }) {
  const client = useQueryClient();
  const can = useCan();
  const key = ['admin-order', id];
  const query = useQuery({ queryKey: key, queryFn: () => browserApi.get(`/admin/orders/${id}`).then((response) => response.data.data) });
  const statusDialog = useOrderActionDialog({ can });
  const refresh = (data) => { if (data?.id) client.setQueryData(key, (current) => ({ ...current, ...data })); client.invalidateQueries({ queryKey: key }); client.invalidateQueries({ queryKey: ['admin-orders'] }); };

  if (query.isLoading) return <div className="grid gap-4"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>;
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;
  const order = query.data;
  const payment = order.payments?.[0];
  const confirming = OPEN_CONFIRMATION.includes(order.confirmationStatus) && order.orderStatus === 'placed';
  const fulfillment = order.fulfillmentStatus;
  const { primary, others } = orderActionButtons(order, can);

  return (
    <div className="grid gap-5">
      <AdminPageHeader backHref="/admin/orders" backLabel="Orders" title={order.reference} badge={<div className="flex flex-wrap gap-1"><StatusPill value={order.orderStatus} /><StatusPill value={order.paymentStatus} /><StatusPill value={fulfillment} />{order.confirmationStatus !== 'not_required' ? <StatusPill value={order.confirmationStatus} label={`Confirmation: ${order.confirmationStatus.replaceAll('_', ' ')}`} /> : null}</div>} description={`${formatDateTime(order.createdAt)} · ${CHANNEL_LABELS[order.channel] || order.source} · ${order.paymentMethod?.toUpperCase()}`} actions={<>
        <Button variant="secondary" asChild><Link href={`/admin/orders/print?ids=${order.id}`}><Printer size={16} />Print</Link></Button>
        {primary ? <Button onClick={() => statusDialog.open(order, primary.key)}><primary.icon size={16} />{primary.label}</Button> : null}
      </>} />

      {confirming ? <Alert tone="warning" title="Waiting for confirmation">Call the customer before packing. {order.confirmationAttempts ? `${order.confirmationAttempts} unsuccessful attempt(s) so far.` : ''} <Link href="/admin/confirmations" className="font-semibold underline">Open confirmation queue</Link></Alert> : null}
      {order.duplicateOfOrderId ? <Alert tone="warning" title="Possible duplicate">This looks like a repeat of <Link className="font-semibold underline" href={`/admin/orders/${order.duplicateOfOrderId}`}>another recent order</Link> from the same phone.</Alert> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-5">
          <section className="admin-card">
            <h2 className="border-b border-[var(--color-border)] px-5 py-3 text-sm font-semibold">Items</h2>
            <ul className="divide-y divide-[var(--color-border)]">
              {order.items.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm"><div><p className="font-medium">{item.productName}</p><p className="text-xs text-[var(--color-muted)]">{item.variantTitle} · {item.sku}</p></div><div className="text-right"><p className="tabular-nums">{item.quantity} × <FormattedMoney value={item.unitPrice} /></p><p className="font-semibold"><FormattedMoney value={item.lineTotal} /></p></div></li>)}
            </ul>
            <dl className="grid gap-1.5 border-t border-[var(--color-border)] px-5 py-4 text-sm">
              <Row label="Subtotal" value={<FormattedMoney value={order.totals.subtotal} />} />
              {order.totals.discount !== '0.00' ? <Row label="Discount" value={<>−<FormattedMoney value={order.totals.discount} /></>} /> : null}
              <Row label={`Delivery · ${order.delivery.label}`} value={<FormattedMoney value={order.totals.delivery} />} />
              <Row label="Total" value={<FormattedMoney value={order.totals.grand} />} strong />
              {payment ? <Row label={`Payment · ${payment.method.toUpperCase()}`} value={<StatusPill value={payment.status} />} /> : null}
            </dl>
          </section>

          <Timeline order={order} onSaved={refresh} canNote={can('orders.edit') || can('orders.progress')} />
        </div>

        <div className="grid gap-5">
          <section className="admin-card p-5 text-sm">
            <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">Customer</h2>{can('risk.view') ? <RiskBadge level={order.riskLevel} score={order.riskScore} /> : null}</div>
            <p className="mt-3 font-medium">{order.customer.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={telHref(order.customer.phone)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3"><Phone size={14} />{order.customer.phone}</a>
              <a href={whatsappHref(order.customer.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3"><MessageCircle size={14} />WhatsApp</a>
            </div>
            {order.customer.email ? <p className="mt-2 text-[var(--color-muted)]">{order.customer.email}</p> : null}
            {order.address ? <address className="mt-3 not-italic leading-6 text-[var(--color-muted)]">{order.address.addressLine}<br />{[order.address.thana || order.address.area, order.address.district, order.address.division].filter(Boolean).join(', ')}{order.address.landmark ? <><br />Landmark: {order.address.landmark}</> : null}</address> : null}
            {can('risk.view') && order.riskSignals?.length ? <ul className="mt-3 grid gap-1 border-t border-[var(--color-border)] pt-3 text-xs">{order.riskSignals.map((signal) => <li key={signal} className="text-red-700 dark:text-red-300">• {RISK_SIGNAL_LABELS[signal] || signal}</li>)}</ul> : null}
            {order.note ? <p className="mt-3 rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs"><strong>Customer note:</strong> {order.note}</p> : null}
          </section>

          <TagsEditor order={order} onSaved={refresh} canEdit={can('orders.edit')} />

          {order.shipments?.length ? (
            <section className="admin-card p-5 text-sm">
              <h2 className="font-semibold">Shipment</h2>
              {order.shipments.map((shipment) => <div key={shipment.id} className="mt-2"><p>{shipment.courierName} {shipment.consignmentId ? `· ${shipment.consignmentId}` : ''}</p>{shipment.trackingUrl ? <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">Tracking link</a> : null}</div>)}
            </section>
          ) : null}

          <section className="admin-card grid gap-2 p-5">
            <h2 className="text-sm font-semibold">More actions</h2>
            {others.map((item) => <Button key={item.key} variant={item.key === 'cancel' ? 'danger' : 'secondary'} onClick={() => statusDialog.open(order, item.key)}><item.icon size={16} />{item.label}</Button>)}
            {!others.length ? <p className="text-xs text-[var(--color-muted)]">No further actions for this order.</p> : null}
          </section>
        </div>
      </div>

      {statusDialog.element}
    </div>
  );
}

function Row({ label, value, strong = false }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'border-t border-[var(--color-border)] pt-2 text-base font-semibold' : ''}`}><dt className={strong ? '' : 'text-[var(--color-muted)]'}>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}

function Timeline({ order, onSaved, canNote }) {
  const [message, setMessage] = useState('');
  const [visibility, setVisibility] = useState('internal');
  const save = useMutation({ mutationFn: () => browserApi.post(`/admin/orders/${order.id}/notes`, { visibility, message }), onSuccess: () => { setMessage(''); onSaved(); } });
  const entries = [
    ...(order.events || []).map((event) => ({ id: event.id, at: event.createdAt, text: event.message, meta: event.public ? 'Customer-visible' : 'Internal' })),
    ...(order.notes || []).map((note) => ({ id: note.id, at: note.createdAt, text: note.message, meta: `${note.visibility === 'customer' ? 'Note to customer' : 'Internal note'}${note.actor?.name ? ` · ${note.actor.name}` : ''}` })),
    ...(order.confirmations || []).map((attempt) => ({ id: attempt.id, at: attempt.createdAt, text: `Confirmation: ${attempt.outcome.replaceAll('_', ' ')}${attempt.note ? ` — ${attempt.note}` : ''}`, meta: `${attempt.method}${attempt.actor?.name ? ` · ${attempt.actor.name}` : ''}` }))
  ].sort((left, right) => new Date(right.at) - new Date(left.at));
  return (
    <section className="admin-card p-5">
      <h2 className="text-sm font-semibold">Timeline</h2>
      {canNote ? (
        <form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); if (message.trim()) save.mutate(); }}>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Add a note…" aria-label="Note" />
          <div className="flex items-center justify-between gap-2"><select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="!w-auto !min-h-9 text-sm" aria-label="Visibility"><option value="internal">Internal note</option><option value="customer">Visible to customer</option></select><Button size="sm" type="submit" loading={save.isPending} disabled={!message.trim()}>Add note</Button></div>
          {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}
        </form>
      ) : null}
      <ol className="mt-4 grid gap-3 border-l border-[var(--color-border)] pl-4">
        {entries.map((entry) => <li key={entry.id} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-[var(--color-border-strong)]" /><p>{entry.text}</p><p className="text-xs text-[var(--color-muted)]">{formatDateTime(entry.at)} · {entry.meta}</p></li>)}
      </ol>
    </section>
  );
}

function TagsEditor({ order, onSaved, canEdit }) {
  const [value, setValue] = useState('');
  const save = useMutation({ mutationFn: (tags) => browserApi.patch(`/admin/orders/${order.id}/tags`, { tags }).then((response) => response.data.data), onSuccess: () => { setValue(''); onSaved(); } });
  const tags = order.tags || [];
  const add = () => { const tag = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); if (tag && !tags.includes(tag)) save.mutate([...tags, tag]); };
  return (
    <section className="admin-card p-5">
      <h2 className="text-sm font-semibold">Tags</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.length ? tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs">{tag}{canEdit ? <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => save.mutate(tags.filter((item) => item !== tag))}><X size={12} /></button> : null}</span>) : <span className="text-xs text-[var(--color-muted)]">No tags</span>}
      </div>
      {canEdit ? <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); add(); }}><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="vip, gift, urgent…" aria-label="New tag" className="!min-h-9 text-sm" /><Button size="sm" variant="secondary" type="submit" disabled={!value.trim()}>Add</Button></form> : null}
      {save.error ? <p className="mt-2 text-xs text-[var(--color-danger)]">{apiMessage(save.error)}</p> : null}
    </section>
  );
}
