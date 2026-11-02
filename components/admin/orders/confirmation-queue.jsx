'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock, MessageCircle, Phone, PhoneMissed, PhoneOff, UserX } from 'lucide-react';
import { Alert, Button, ConfirmAction, FormattedMoney, Skeleton, TableFooter, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from '../admin-page-header';
import { CHANNEL_LABELS, RISK_SIGNAL_LABELS, RiskBadge, StatusPill, formatDateTime, telHref, useCan, whatsappHref } from './order-shared';

const AUTO_CANCEL_NOTE = 'After the configured number of failed attempts the order is cancelled automatically.';
const OUTCOMES = [
  { outcome: 'confirmed', label: 'Confirmed', Icon: CheckCircle2, variant: 'primary', title: 'Mark as confirmed?', description: 'The customer confirmed on the call. The order moves to the packing queue.' },
  { outcome: 'no_answer', label: 'No answer', Icon: PhoneMissed, variant: 'secondary', title: 'Record no answer?', description: `Logs an unanswered call. ${AUTO_CANCEL_NOTE}` },
  { outcome: 'call_back', label: 'Call back', Icon: Clock, variant: 'secondary', title: 'Schedule a call back?', description: 'The order returns to the queue at the chosen time.' },
  { outcome: 'wrong_number', label: 'Wrong number', Icon: PhoneOff, variant: 'secondary', title: 'Record wrong number?', description: `Logs that the number did not reach the customer. ${AUTO_CANCEL_NOTE}` },
  { outcome: 'customer_cancelled', label: 'Cancelled', Icon: UserX, variant: 'danger', title: 'Cancel this order?', description: 'The customer declined on the call. The order is cancelled, stock is released and the customer is notified. This cannot be undone.' }
];

/** Mobile-friendly call desk (FE-ADMIN 10.10): one order at a time, newest decisions first. */
export function ConfirmationQueue() {
  const client = useQueryClient();
  const can = useCan();
  const [{ page, pageSize, risk, due }, setTableParams] = useTableParams({ page: 1, pageSize: 30, risk: '', due: '1' });
  const dueOnly = due !== '0';
  const params = { page, pageSize, ...(risk ? { riskLevel: risk } : {}), ...(dueOnly ? { due: 'true' } : {}) };
  const queue = useQuery({ queryKey: ['admin-confirmations', params], queryFn: () => browserApi.get('/admin/confirmations', { params }).then((response) => response.data), refetchInterval: 60_000, placeholderData: keepPreviousData });
  const rows = queue.data?.data || [];
  const meta = queue.data?.meta || {};
  const byRisk = queue.data?.meta?.byRisk || {};
  const [bulkAsk, setBulkAsk] = useState(false);
  const record = useMutation({
    mutationFn: ({ order, outcome, note, callbackAt }) => browserApi.post(`/admin/confirmations/${order.id}`, { outcome, method: 'call', note: note || undefined, callbackAt: callbackAt || undefined, version: Number(order.version) }).then((response) => response.data.data),
    onSuccess: (result) => {
      pushToast({ tone: result.decision === 'confirm' ? 'success' : result.decision === 'retry' ? 'info' : 'warning', title: `${result.reference}: ${result.decision === 'confirm' ? 'confirmed' : result.decision === 'retry' ? 'attempt saved' : 'cancelled'}` });
      client.invalidateQueries({ queryKey: ['admin-confirmations'] });
      client.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error) => { pushToast({ tone: 'error', title: 'Could not save', description: apiMessage(error) }); client.invalidateQueries({ queryKey: ['admin-confirmations'] }); }
  });
  const bulk = useMutation({
    mutationFn: (ids) => browserApi.post('/admin/confirmations/actions/bulk-confirm', { ids }).then((response) => response.data.data),
    onSuccess: (results) => { const ok = results.filter((item) => item.ok).length; pushToast({ tone: ok === results.length ? 'success' : 'warning', title: `${ok} of ${results.length} confirmed` }); client.invalidateQueries({ queryKey: ['admin-confirmations'] }); }
  });
  const lowRiskIds = rows.filter((row) => row.riskLevel === 'low').map((row) => row.id);

  if (!can('orders.confirm')) return <Alert tone="error">You do not have permission to confirm orders.</Alert>;
  return (
    <div className="grid gap-5">
      <AdminPageHeader backHref="/admin/orders" backLabel="Orders" title="Confirmation queue" description="Call each customer, record the outcome, and the next order appears. Unconfirmed orders are cancelled automatically after the configured attempts." actions={lowRiskIds.length ? <Button variant="secondary" loading={bulk.isPending} onClick={() => setBulkAsk(true)}>Confirm {lowRiskIds.length} low-risk</Button> : null} />
      <ConfirmAction open={bulkAsk} onOpenChange={setBulkAsk} tone="primary" title={`Confirm ${lowRiskIds.length} low-risk ${lowRiskIds.length === 1 ? 'order' : 'orders'} without calling?`} description="They move straight to the packing queue. Only use this when your process allows skipping the confirmation call for low-risk orders." confirmLabel={`Confirm ${lowRiskIds.length}`} onConfirm={() => bulk.mutate(lowRiskIds)} />
      <div className="flex flex-wrap items-center gap-2">
        {[['', 'All'], ['high', 'High risk'], ['medium', 'Medium'], ['low', 'Low']].map(([value, label]) => <button key={value || 'all'} type="button" onClick={() => setTableParams({ risk: value })} aria-pressed={risk === value} className={`min-h-9 rounded-full px-3.5 text-[13px] font-medium ${risk === value ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-raised)] ring-1 ring-[var(--color-border)]'}`}>{label}{value && byRisk[value] ? ` (${byRisk[value]})` : ''}</button>)}
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={dueOnly} onChange={(event) => setTableParams({ due: event.target.checked ? '1' : '0' })} />Due now only</label>
      </div>
      {queue.error ? <div role="alert" className="admin-card flex flex-wrap items-center gap-3 p-4 text-sm"><AlertCircle size={18} className="text-[var(--color-danger)]" aria-hidden="true" /><span className="font-semibold">{apiMessage(queue.error)}</span><Button size="sm" variant="secondary" onClick={() => queue.refetch()}>Retry</Button></div> : null}
      {queue.isLoading ? <div className="grid gap-3">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-56" />)}</div> : rows.length ? (
        <ul className={`grid gap-4 transition-opacity lg:grid-cols-2 ${queue.isFetching ? 'opacity-60' : ''}`} aria-busy={queue.isFetching || undefined}>
          {rows.map((order) => <QueueCard key={order.id} order={order} onRecord={(input) => record.mutate({ order, ...input })} pending={record.isPending && record.variables?.order.id === order.id} canSeeRisk={can('risk.view')} />)}
        </ul>
      ) : queue.error ? null : page > 1 ? <div className="admin-card p-10 text-center"><p className="font-semibold">No more orders on this page</p><Button className="mt-3" variant="secondary" size="sm" onClick={() => setTableParams({ page: 1 })}>Back to first page</Button></div> : <div className="admin-card p-10 text-center"><CheckCircle2 className="mx-auto text-[var(--color-success)]" /><p className="mt-3 font-semibold">{risk || !dueOnly ? 'No orders match' : 'All caught up'}</p><p className="text-sm text-[var(--color-muted)]">{risk || !dueOnly ? 'No orders in the queue match these filters.' : 'No orders are waiting for confirmation right now.'}</p>{risk || !dueOnly ? <Button className="mt-3" variant="secondary" size="sm" onClick={() => setTableParams({ risk: '', due: '1' })}>Clear filters</Button> : null}</div>}
      <TableFooter page={page} pageSize={pageSize} total={meta.total || 0} pageCount={meta.pageCount} pageSizeOptions={[10, 30, 50, 100]} onPageChange={(next) => setTableParams({ page: next })} onPageSizeChange={(size) => setTableParams({ pageSize: size })} />
    </div>
  );
}

function QueueCard({ order, onRecord, pending, canSeeRisk }) {
  const [note, setNote] = useState('');
  const [callbackAt, setCallbackAt] = useState('');
  const [asking, setAsking] = useState(null);
  const history = order.history;
  return (
    <li className="admin-card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><Link href={`/admin/orders/${order.id}`} className="font-semibold hover:underline">{order.reference}</Link><p className="text-xs text-[var(--color-muted)]">{formatDateTime(order.createdAt)} · {CHANNEL_LABELS[order.channel] || order.channel} · {order.paymentMethod.toUpperCase()}</p></div>
        <div className="flex flex-wrap gap-1">{canSeeRisk ? <RiskBadge level={order.riskLevel} score={order.riskScore} /> : null}<StatusPill value={order.confirmationStatus} />{order.confirmationAttempts ? <StatusPill value="neutral" label={`${order.confirmationAttempts} attempt${order.confirmationAttempts > 1 ? 's' : ''}`} /> : null}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={telHref(order.customer.phone)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"><Phone size={16} />Call {order.customer.phone}</a>
        <a href={whatsappHref(order.customer.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid min-h-11 w-11 place-items-center rounded-lg border border-[var(--color-border)]"><MessageCircle size={18} /></a>
      </div>
      <div className="text-sm">
        <p className="font-medium">{order.customer.name}</p>
        {order.address ? <p className="text-[var(--color-muted)]">{order.address.addressLine}, {[order.address.thana || order.address.area, order.address.district].filter(Boolean).join(', ')}</p> : null}
      </div>
      <ul className="rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
        {order.items.map((item) => <li key={item.id} className="flex justify-between gap-2"><span>{item.quantity} × {item.productName}{item.variantTitle ? <span className="text-[var(--color-muted)]"> · {item.variantTitle}</span> : null}</span></li>)}
        <li className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold"><span>{order.delivery.label}</span><FormattedMoney value={order.totals.grand} /></li>
      </ul>
      {history ? <p className="text-xs text-[var(--color-muted)]">History: {history.orders} orders · {history.delivered} delivered · {history.cancelled} cancelled · <span className={history.returnedToOrigin ? 'font-semibold text-red-700 dark:text-red-300' : ''}>{history.returnedToOrigin} RTO</span></p> : null}
      {canSeeRisk && order.riskSignals?.length ? <p className="text-xs text-red-700 dark:text-red-300">{order.riskSignals.map((signal) => RISK_SIGNAL_LABELS[signal] || signal).join(' · ')}</p> : null}
      {order.note ? <p className="text-xs"><strong>Customer note:</strong> {order.note}</p> : null}
      {order.attempts?.length ? <p className="text-xs text-[var(--color-muted)]">Last: {order.attempts.at(-1).outcome.replaceAll('_', ' ')} {formatDateTime(order.attempts.at(-1).createdAt)}{order.attempts.at(-1).note ? ` — ${order.attempts.at(-1).note}` : ''}</p> : null}
      <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" aria-label="Call note" className="!min-h-10 text-sm" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {OUTCOMES.map(({ outcome, label, Icon, variant }) => <Button key={outcome} size="sm" variant={variant} disabled={pending || (outcome === 'call_back' && !callbackAt)} onClick={() => setAsking(OUTCOMES.find((item) => item.outcome === outcome))} className={outcome === 'confirmed' ? 'col-span-2 sm:col-span-1' : ''}><Icon size={15} />{label}</Button>)}
      </div>
      {asking ? <ConfirmAction open onOpenChange={(open) => { if (!open) setAsking(null); }} tone={asking.variant === 'danger' ? 'danger' : 'primary'} title={asking.title} description={`${order.reference} · ${order.customer.name}. ${asking.description}${asking.outcome === 'call_back' && callbackAt ? ` Call back: ${formatDateTime(new Date(callbackAt).toISOString())}.` : ''}`} confirmLabel={asking.label} cancelLabel="Back" onConfirm={() => onRecord({ outcome: asking.outcome, note, callbackAt: asking.outcome === 'call_back' && callbackAt ? new Date(callbackAt).toISOString() : undefined })} /> : null}
      <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">Call back at<input type="datetime-local" value={callbackAt} onChange={(event) => setCallbackAt(event.target.value)} className="!min-h-9 !w-auto text-sm" /></label>
    </li>
  );
}
