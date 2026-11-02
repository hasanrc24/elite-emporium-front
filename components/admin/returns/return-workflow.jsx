'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, CardBody, CardHeader, Field, FormattedMoney, Input, NativeSelect, StatusBadge } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useCan } from '../orders/order-shared';

const CONDITIONS = ['new', 'opened', 'used', 'damaged', 'defective', 'unsellable'].map((value) => ({ value, label: value.replace(/^./, (letter) => letter.toUpperCase()) }));
const reasonLabel = (reason) => String(reason || '').replaceAll('_', ' ');

/**
 * Step-by-step return desk (BR-RET-001): review, approve with refund amount,
 * pickup, receipt, inspection with restock decision, then refund or the
 * replacement order for exchanges, and completion.
 */
export function ReturnWorkflow({ row, onSaved }) {
  const can = useCan();
  if (!can('returns.manage')) return null;
  const inspected = row.items.every((item) => item.condition && item.restock != null);
  return (
    <Card>
      <CardHeader title="Next step" description={`${row.type === 'exchange' ? 'Exchange' : 'Return'} · ${reasonLabel(row.reason)}`} action={<StatusBadge status={row.status} />} />
      <CardBody className="grid gap-5">
        <ItemSummary row={row} />
        {row.status === 'requested' ? <SimpleStep row={row} action="review" label="Start review" onSaved={onSaved} /> : null}
        {row.status === 'under_review' ? <ApproveStep row={row} onSaved={onSaved} /> : null}
        {row.status === 'approved' ? <TransitStep row={row} onSaved={onSaved} /> : null}
        {row.status === 'in_transit' ? <SimpleStep row={row} action="receive" label="Mark item received" onSaved={onSaved} /> : null}
        {row.status === 'received' && !inspected ? <InspectStep row={row} onSaved={onSaved} /> : null}
        {row.status === 'received' && inspected && row.resolution === 'refund' && !row.refund ? <RefundStep row={row} onSaved={onSaved} /> : null}
        {row.status === 'received' && inspected && row.resolution === 'exchange' && !row.replacementOrder ? <ExchangeStep row={row} onSaved={onSaved} /> : null}
        {row.replacementOrder ? <p className="text-sm">Replacement order <Link className="font-semibold text-[var(--color-primary)] hover:underline" href={`/admin/orders/${row.replacementOrder.id}`}>{row.replacementOrder.reference}</Link> is ready to confirm and ship.</p> : null}
        {row.refund ? <p className="text-sm">Refund of <FormattedMoney value={row.refund.amount} /> by {row.refund.method} is <StatusBadge status={row.refund.status} />.</p> : null}
        {row.status === 'received' && inspected && (row.refund || row.replacementOrder) ? <SimpleStep row={row} action="complete" label="Complete return" onSaved={onSaved} /> : null}
        {['completed', 'rejected', 'cancelled'].includes(row.status) ? <p className="text-sm text-[var(--color-muted)]">No further action is needed.</p> : null}
      </CardBody>
    </Card>
  );
}

function ItemSummary({ row }) {
  return (
    <ul className="grid gap-2">
      {row.items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
          <span><strong>{item.orderItem?.productName}</strong> · {item.orderItem?.variantTitle} · Qty {item.quantity}</span>
          <span className="text-[var(--color-muted)]">
            {item.requestedVariant ? `Wants ${item.requestedVariant.title}` : null}
            {item.condition ? ` · ${item.condition}${item.restock ? ', restocked' : ', not restocked'}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function useReturnAction(row, onSaved) {
  return useMutation({
    mutationFn: ({ action, body = {}, headers }) => browserApi.post(`/admin/returns/${row.id}/${action}`, { version: Number(row.version), ...body }, headers ? { headers } : undefined).then((response) => response.data.data),
    onSuccess: (data) => onSaved(data)
  });
}

function StepError({ mutation }) {
  return mutation.error ? <Alert tone="error">{apiMessage(mutation.error)}</Alert> : null;
}

function SimpleStep({ row, action, label, onSaved }) {
  const [message, setMessage] = useState('');
  const mutation = useReturnAction(row, onSaved);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field label="Message to customer (optional)"><Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} /></Field>
      <Button loading={mutation.isPending} onClick={() => mutation.mutate({ action, body: message.trim() ? { message: message.trim() } : {} })}>{label}</Button>
      <div className="sm:col-span-2"><StepError mutation={mutation} /></div>
    </div>
  );
}

function ApproveStep({ row, onSaved }) {
  const [amount, setAmount] = useState(row.policy?.requestedRefundEstimate || '');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const approve = useReturnAction(row, onSaved);
  const reject = useReturnAction(row, onSaved);
  const refund = row.resolution === 'refund';
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {refund ? <Field label="Refund amount (BDT)" hint={row.policy?.requestedRefundEstimate ? `Customer estimate ${row.policy.requestedRefundEstimate}` : undefined}><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field> : null}
        <Field label="Message to customer (optional)"><Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button loading={approve.isPending} onClick={() => approve.mutate({ action: 'approve', body: { ...(refund ? { refundAmount: amount } : {}), ...(message.trim() ? { message: message.trim() } : {}) } })}>Approve</Button>
      </div>
      <StepError mutation={approve} />
      <div className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Rejection reason (shown to the customer)"><Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></Field>
        <Button variant="danger" disabled={reason.trim().length < 3} loading={reject.isPending} onClick={() => reject.mutate({ action: 'reject', body: { reason: reason.trim() } })}>Reject</Button>
      </div>
      <StepError mutation={reject} />
    </div>
  );
}

function TransitStep({ row, onSaved }) {
  const [form, setForm] = useState({ courier: '', trackingNumber: '' });
  const mutation = useReturnAction(row, onSaved);
  const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Pickup courier (optional)"><Input value={form.courier} onChange={(event) => setForm({ ...form, courier: event.target.value })} /></Field>
      <Field label="Tracking number (optional)"><Input value={form.trackingNumber} onChange={(event) => setForm({ ...form, trackingNumber: event.target.value })} /></Field>
      <Button loading={mutation.isPending} onClick={() => mutation.mutate({ action: 'in-transit', body })}>Mark picked up</Button>
      <div className="sm:col-span-3"><StepError mutation={mutation} /></div>
    </div>
  );
}

function InspectStep({ row, onSaved }) {
  const locations = useQuery({ queryKey: ['inventory-locations'], queryFn: () => browserApi.get('/admin/inventory/locations').then((response) => response.data.data) });
  const active = (locations.data || []).filter((location) => location.active);
  const [items, setItems] = useState(() => Object.fromEntries(row.items.map((item) => [item.id, { condition: 'new', restock: true, locationId: '' }])));
  const mutation = useReturnAction(row, onSaved);
  const update = (id, patch) => setItems((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const fallbackLocation = active[0]?.id || '';
  const payload = row.items.map((item) => {
    const entry = items[item.id];
    return { returnItemId: item.id, condition: entry.condition, restock: entry.restock, locationId: entry.restock ? entry.locationId || fallbackLocation || null : null };
  });
  return (
    <div className="grid gap-4">
      <p className="text-sm font-semibold">Inspect each item</p>
      {row.items.map((item) => (
        <div key={item.id} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 sm:grid-cols-3 sm:items-end">
          <p className="text-sm sm:col-span-3"><strong>{item.orderItem?.productName}</strong> · {item.orderItem?.variantTitle}</p>
          <Field label="Condition"><NativeSelect value={items[item.id].condition} onChange={(event) => update(item.id, { condition: event.target.value, restock: ['new', 'opened'].includes(event.target.value) })} options={CONDITIONS} /></Field>
          <Field label="Restock"><NativeSelect value={items[item.id].restock ? 'yes' : 'no'} onChange={(event) => update(item.id, { restock: event.target.value === 'yes' })} options={[{ value: 'yes', label: 'Put back in stock' }, { value: 'no', label: 'Do not restock' }]} /></Field>
          {items[item.id].restock ? <Field label="Location"><NativeSelect value={items[item.id].locationId || fallbackLocation} onChange={(event) => update(item.id, { locationId: event.target.value })} options={active.map((location) => ({ value: location.id, label: location.name }))} /></Field> : null}
        </div>
      ))}
      {locations.error ? <Alert tone="warning">Stock locations could not be loaded: {apiMessage(locations.error)}</Alert> : null}
      <div><Button loading={mutation.isPending} disabled={payload.some((item) => item.restock && !item.locationId)} onClick={() => mutation.mutate({ action: 'inspect', body: { items: payload } })}>Save inspection</Button></div>
      <StepError mutation={mutation} />
    </div>
  );
}

function RefundStep({ row, onSaved }) {
  const can = useCan();
  const capacities = row.policy?.paymentCapacities || [];
  const [paymentId, setPaymentId] = useState(capacities[0]?.paymentId || '');
  const payment = capacities.find((item) => item.paymentId === paymentId);
  const [method, setMethod] = useState(payment?.method === 'bkash' ? 'bkash' : 'manual');
  const [amount, setAmount] = useState(row.refundAmount || '');
  const [reason, setReason] = useState(`Refund for return ${row.reference}`);
  // One key per intended refund; reused when a retry may repeat a request that reached the server.
  const key = useRef(null);
  const mutation = useMutation({
    mutationFn: () => {
      key.current ||= crypto.randomUUID();
      return browserApi.post(`/admin/returns/${row.id}/refund`, { paymentId, amount, method, reason: reason.trim() }, { headers: { 'Idempotency-Key': key.current } });
    },
    onSuccess: () => { key.current = null; onSaved(); }
  });
  if (!can('payments.refund')) return <Alert tone="info">A staff member with refund permission must issue this refund.</Alert>;
  if (!capacities.length) return <Alert tone="warning">This order has no paid payment to refund. For COD orders, record the cash payment on the order first.</Alert>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Refund from payment"><NativeSelect value={paymentId} onChange={(event) => { setPaymentId(event.target.value); const next = capacities.find((item) => item.paymentId === event.target.value); setMethod(next?.method === 'bkash' ? 'bkash' : 'manual'); }} options={capacities.map((item) => ({ value: item.paymentId, label: `${item.method.toUpperCase()} · up to ${item.available}` }))} /></Field>
      <Field label="Refund method"><NativeSelect value={method} onChange={(event) => setMethod(event.target.value)} options={[{ value: 'manual', label: 'Manual (cash, bank or wallet transfer)' }, ...(payment?.method === 'bkash' ? [{ value: 'bkash', label: 'bKash refund API' }] : [])]} /></Field>
      <Field label="Amount (BDT)" hint={payment ? `Available ${payment.available}` : undefined}><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
      <Field label="Reason"><Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></Field>
      <div className="sm:col-span-2"><Button loading={mutation.isPending} disabled={!paymentId || reason.trim().length < 3} onClick={() => mutation.mutate()}>Issue refund</Button></div>
      <div className="sm:col-span-2"><StepError mutation={mutation} /></div>
    </div>
  );
}

function ExchangeStep({ row, onSaved }) {
  const productIds = [...new Set(row.items.map((item) => item.orderItem?.productId).filter(Boolean))];
  const products = useQueries({ queries: productIds.map((id) => ({ queryKey: ['admin-product', id], queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data) })) });
  const variantsFor = (productId) => (products.find((query) => query.data?.id === productId)?.data?.variants || []).filter((variant) => variant.status === 'active' && variant.active !== false);
  const [choices, setChoices] = useState(() => Object.fromEntries(row.items.map((item) => [item.id, item.requestedVariant?.id || item.orderItem?.variantId || ''])));
  const mutation = useReturnAction(row, onSaved);
  const lines = Object.values(row.items.reduce((acc, item) => {
    const variantId = choices[item.id];
    if (variantId) acc[variantId] = { variantId, quantity: (acc[variantId]?.quantity || 0) + item.quantity };
    return acc;
  }, {}));
  return (
    <div className="grid gap-4">
      <p className="text-sm font-semibold">Replacement items</p>
      {row.items.map((item) => (
        <Field key={item.id} label={`${item.orderItem?.productName} · Qty ${item.quantity}`} hint={item.requestedVariant ? `Customer asked for ${item.requestedVariant.title}` : 'Customer did not choose a size.'}>
          <NativeSelect value={choices[item.id]} onChange={(event) => setChoices({ ...choices, [item.id]: event.target.value })} options={variantsFor(item.orderItem?.productId).map((variant) => ({ value: variant.id, label: `${variant.title} · ${variant.sku}` }))} placeholder="Choose replacement" />
        </Field>
      ))}
      <div><Button loading={mutation.isPending} disabled={lines.length === 0 || Object.values(choices).some((value) => !value)} onClick={() => mutation.mutate({ action: 'exchange', body: { items: lines } })}>Create replacement order</Button></div>
      <StepError mutation={mutation} />
    </div>
  );
}
