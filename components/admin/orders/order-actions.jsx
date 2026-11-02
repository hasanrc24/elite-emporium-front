'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Ban, CheckCircle2, PackageCheck, RotateCcw, Truck, Wallet } from 'lucide-react';
import { Alert, Button, DialogContent, DialogRoot, FormattedMoney, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { OPEN_CONFIRMATION, StatusPill } from './order-shared';

const LIVE = ['placed', 'confirmed', 'processing'];

const transition = (order, status, reason, message) => browserApi.post(`/admin/orders/${order.id}/transitions`, { dimension: 'fulfillment', status, reason, message, public: true, version: Number(order.version) }).then((response) => response.data.data);

/**
 * Status changes staff may make, in workflow order. `kind` picks the dialog:
 * `confirm` (plain confirmation), `reason` (reason required) or `ship` (courier form).
 * Availability mirrors the backend transition table; the API stays authoritative.
 */
const ACTIONS = {
  confirm: {
    label: 'Confirm order', icon: CheckCircle2, kind: 'confirm', to: { confirmationStatus: 'confirmed' },
    title: 'Confirm this order?', description: 'Use this after the customer has confirmed by phone. The order moves to the packing queue.',
    success: 'Order confirmed',
    available: (order, can) => can('orders.confirm') && order.orderStatus === 'placed' && OPEN_CONFIRMATION.includes(order.confirmationStatus),
    run: (order) => browserApi.post(`/admin/confirmations/${order.id}`, { outcome: 'confirmed', method: 'manual', version: Number(order.version) }).then((response) => response.data.data)
  },
  pack: {
    label: 'Mark packed', icon: PackageCheck, kind: 'confirm', to: { fulfillmentStatus: 'packed' },
    title: 'Mark this order as packed?', description: 'Reserved stock is deducted from inventory. Do this only when the parcel is ready.',
    success: 'Marked packed',
    available: (order, can) => can('orders.progress') && LIVE.includes(order.orderStatus) && ['unfulfilled', 'processing'].includes(order.fulfillmentStatus) && !OPEN_CONFIRMATION.includes(order.confirmationStatus),
    run: (order) => transition(order, 'packed', 'Packed by staff')
  },
  ship: {
    label: 'Ship order', icon: Truck, kind: 'ship', to: { fulfillmentStatus: 'shipped' },
    title: 'Ship this order?', description: 'Record the courier booking. The customer is notified that the order is on the way.',
    success: 'Order shipped',
    available: (order, can) => can('orders.progress') && LIVE.includes(order.orderStatus) && order.fulfillmentStatus === 'packed',
    run: (order, { courierName }) => transition(order, 'shipped', `Handed to ${courierName}`, `Your order is on the way with ${courierName}.`)
  },
  outForDelivery: {
    label: 'Mark out for delivery', icon: Truck, kind: 'confirm', to: { fulfillmentStatus: 'out_for_delivery' },
    title: 'Mark as out for delivery?', description: 'The customer is notified that the rider is on the way.',
    success: 'Marked out for delivery',
    available: (order, can) => can('orders.progress') && LIVE.includes(order.orderStatus) && order.fulfillmentStatus === 'shipped',
    run: (order) => transition(order, 'out_for_delivery', 'Out for delivery', 'Your order is out for delivery.')
  },
  deliver: {
    label: 'Mark delivered', icon: CheckCircle2, kind: 'confirm', to: { fulfillmentStatus: 'delivered' },
    title: 'Mark this order as delivered?', description: 'Confirm the courier has handed the parcel to the customer. The customer is notified.',
    success: 'Marked delivered',
    available: (order, can) => can('orders.progress') && LIVE.includes(order.orderStatus) && ['shipped', 'out_for_delivery'].includes(order.fulfillmentStatus),
    run: (order) => transition(order, 'delivered', 'Delivered by courier')
  },
  codCollected: {
    label: 'Record COD collected', icon: Wallet, kind: 'confirm', to: { paymentStatus: 'paid' },
    title: 'Record cash collected?', description: 'Confirm the courier has remitted the cash for this order. The payment is marked paid.',
    success: 'Cash collection recorded',
    available: (order, can) => can('payments.reconcile') && order.fulfillmentStatus === 'delivered' && Boolean(codPayment(order)),
    run: (order) => { const payment = codPayment(order); return browserApi.post(`/admin/payments/${payment.id}/cod-collection`, { amount: payment.amount }).then(() => ({ id: order.id })); }
  },
  rto: {
    label: 'Returned to origin (RTO)', icon: RotateCcw, kind: 'reason', danger: true, to: { fulfillmentStatus: 'returned_to_origin' },
    title: 'Mark as returned to origin?', description: 'Use when the courier brings the parcel back (refused or unreachable). Items return to stock, the order closes and it counts towards the customer\'s risk.',
    confirmLabel: 'Mark RTO', placeholder: 'e.g. Customer refused at door', success: 'Marked returned to origin',
    available: (order, can) => can('orders.progress') && LIVE.includes(order.orderStatus) && ['shipped', 'out_for_delivery'].includes(order.fulfillmentStatus),
    run: (order, { reason }) => transition(order, 'returned_to_origin', reason, 'Your parcel was returned to us.')
  },
  cancel: {
    label: 'Cancel order', icon: Ban, kind: 'reason', danger: true, to: { orderStatus: 'cancelled' },
    title: 'Cancel this order?', description: 'Reserved stock is released and coupon usage reversed. The customer is notified. This cannot be undone.',
    confirmLabel: 'Cancel order', placeholder: 'e.g. Customer asked to cancel', success: 'Order cancelled',
    // Paid orders need a refund decision first; the backend refuses to cancel them.
    available: (order, can) => can('orders.cancel') && LIVE.includes(order.orderStatus) && ['unfulfilled', 'processing', 'packed'].includes(order.fulfillmentStatus) && !['paid', 'partially_refunded'].includes(order.paymentStatus),
    run: (order, { reason }) => browserApi.post(`/admin/orders/${order.id}/cancel`, { reason }).then((response) => response.data.data)
  }
};

function codPayment(order) {
  return (order.payments || []).find((payment) => payment.method === 'cod' && payment.status === 'unpaid');
}

/** Keys of the status changes available for this order, in workflow order. */
export function availableOrderActions(order, can) {
  return Object.keys(ACTIONS).filter((key) => ACTIONS[key].available(order, can));
}

/** Menu items for `ActionMenu`; selecting one opens the confirmation dialog. */
export function orderActionMenuItems(order, can, open) {
  return availableOrderActions(order, can).map((key) => ({ label: ACTIONS[key].label, icon: ACTIONS[key].icon, destructive: ACTIONS[key].danger, onSelect: () => open(order, key) }));
}

/** Detail-page buttons: the first non-destructive change is the primary next step. */
export function orderActionButtons(order, can) {
  const keys = availableOrderActions(order, can);
  const primary = keys.find((key) => !ACTIONS[key].danger) || null;
  return { primary: primary && { key: primary, ...ACTIONS[primary] }, others: keys.filter((key) => key !== primary).map((key) => ({ key, ...ACTIONS[key] })) };
}

/**
 * One dialog host per page: `open(order, key)` shows the confirmation for that
 * change. The dialog stays open with the error on failure. On a version
 * conflict it reloads the order and asks again when the change is still valid.
 */
export function useOrderActionDialog({ can, onUpdated }) {
  const client = useQueryClient();
  const [pending, setPending] = useState(null);
  const close = () => setPending(null);
  const element = pending ? <OrderActionDialog key={`${pending.order.id}:${pending.key}`} order={pending.order} actionKey={pending.key} can={can} onClose={close} onDone={(data) => {
    if (data?.id) client.setQueryData(['admin-order', data.id], (current) => (current ? { ...current, ...data } : current));
    client.invalidateQueries({ queryKey: ['admin-orders'] });
    client.invalidateQueries({ queryKey: ['admin-order', pending.order.id] });
    onUpdated?.(data);
    close();
  }} /> : null;
  const open = useCallback((order, key) => setPending({ order, key }), []);
  return { open, element };
}

function OrderActionDialog({ order: initialOrder, actionKey, can, onClose, onDone }) {
  const client = useQueryClient();
  const action = ACTIONS[actionKey];
  const [order, setOrder] = useState(initialOrder);
  const [refreshed, setRefreshed] = useState(false);
  const conflict = (error) => error?.response?.data?.error?.code === 'VERSION_CONFLICT';
  const [reason, setReason] = useState('');
  const [ship, setShip] = useState({ courierName: '', consignmentId: '', trackingUrl: '' });
  // A retry after a failed transition must not book a second shipment.
  const [shipmentId, setShipmentId] = useState(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (action.kind === 'ship' && !shipmentId) {
        const shipment = await browserApi.post('/admin/shipments', { orderId: order.id, courierName: ship.courierName.trim(), consignmentId: ship.consignmentId.trim() || undefined, trackingUrl: ship.trackingUrl.trim() || null }).then((response) => response.data.data);
        setShipmentId(shipment?.id || true);
      }
      return action.run(order, { reason: reason.trim(), courierName: ship.courierName.trim() });
    },
    onSuccess: (data) => { pushToast({ tone: 'success', title: action.success, description: order.reference }); onDone(data); },
    onError: async (error) => {
      if (!conflict(error)) return;
      client.invalidateQueries({ queryKey: ['admin-orders'] });
      client.invalidateQueries({ queryKey: ['admin-order', order.id] });
      const fresh = await browserApi.get(`/admin/orders/${order.id}`).then((response) => response.data.data).catch(() => null);
      if (fresh && action.available(fresh, can)) { setOrder(fresh); setRefreshed(true); return; }
      pushToast({ tone: 'warning', title: 'Order changed', description: `${order.reference} was updated by someone else and this change no longer applies.` });
      onClose();
    }
  });
  const busy = mutation.isPending;
  // After a reload the conflict error is replaced by a prompt to confirm again.
  const superseded = refreshed && (!mutation.error || conflict(mutation.error));
  const validUrl = !ship.trackingUrl.trim() || /^https:\/\/\S+$/.test(ship.trackingUrl.trim());
  const ready = action.kind === 'reason' ? reason.trim().length >= 3 : action.kind === 'ship' ? Boolean(ship.courierName.trim()) && validUrl : true;
  const [field, next] = Object.entries(action.to)[0];
  const update = (key) => (event) => setShip((current) => ({ ...current, [key]: event.target.value }));

  return (
    <DialogRoot open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent title={action.title} description={action.description} footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Back</Button>
        <Button variant={action.danger ? 'danger' : 'primary'} loading={busy} disabled={!ready} onClick={() => mutation.mutate()}><action.icon size={16} />{action.confirmLabel || action.label}</Button>
      </>}>
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{order.reference}</p><p className="truncate text-xs text-[var(--color-muted)]">{order.customer?.name}{order.customer?.phone ? ` · ${order.customer.phone}` : ''}</p></div><FormattedMoney value={order.totals?.grand} className="font-semibold tabular-nums" /></div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Status change"><StatusPill value={order[field]} /><ArrowRight size={14} aria-hidden="true" className="text-[var(--color-muted)]" /><StatusPill value={next} /></div>
        </div>
        {action.kind === 'reason' ? <label className="field"><span>Reason (required)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} placeholder={action.placeholder} autoFocus /></label> : null}
        {action.kind === 'ship' ? <>
          <label className="field"><span>Courier</span><input value={ship.courierName} onChange={update('courierName')} list="order-couriers" maxLength={120} placeholder="Steadfast, Pathao, RedX…" autoFocus disabled={Boolean(shipmentId)} /></label>
          <datalist id="order-couriers"><option value="Steadfast" /><option value="Pathao" /><option value="RedX" /><option value="Paperfly" /><option value="Sundarban" /></datalist>
          <label className="field"><span>Consignment ID (optional)</span><input value={ship.consignmentId} onChange={update('consignmentId')} maxLength={120} disabled={Boolean(shipmentId)} /></label>
          <label className="field"><span>Tracking link (optional, https)</span><input value={ship.trackingUrl} onChange={update('trackingUrl')} inputMode="url" disabled={Boolean(shipmentId)} />{!validUrl ? <span className="text-xs text-[var(--color-danger)]">Use a full https:// link.</span> : null}</label>
        </> : null}
        {superseded ? <Alert tone="warning">Someone else updated this order. The details above are the latest; confirm again to continue.</Alert> : null}
        {mutation.error && !superseded ? <Alert tone="error">{apiMessage(mutation.error)}</Alert> : null}
      </DialogContent>
    </DialogRoot>
  );
}
