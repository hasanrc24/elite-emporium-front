'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Alert, Button, Skeleton } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { formatMoney } from '@/lib/utils';
import { AdminPageHeader } from '../admin-page-header';
import { formatDateTime } from './order-shared';

const MODES = [['slip', 'Packing slips'], ['invoice', 'Invoices'], ['pick', 'Pick list']];

/** Print-optimised packing slips, invoices and a combined pick list (FE-ADMIN 10.10). */
export function OrderDocuments({ store }) {
  const params = useSearchParams();
  const ids = (params.get('ids') || '').split(',').filter((id) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id)).slice(0, 50);
  const [mode, setMode] = useState('slip');
  const documents = useQuery({ queryKey: ['order-documents', ids], enabled: ids.length > 0, queryFn: () => browserApi.post('/admin/order-documents', { ids }).then((response) => response.data.data) });
  const storeName = store?.name?.en || 'Elite Emporium';
  if (!ids.length) return <Alert tone="warning">Select orders on the Orders page to print documents.</Alert>;
  return (
    <div className="grid gap-5">
      <div className="no-print grid gap-4">
        <AdminPageHeader backHref="/admin/orders" backLabel="Orders" title="Print documents" description={`${ids.length} order${ids.length > 1 ? 's' : ''} selected. Each order prints on its own page.`} actions={<Button onClick={() => window.print()} disabled={!documents.data}><Printer size={16} />Print</Button>} />
        <div className="flex gap-2">{MODES.map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`min-h-9 rounded-full px-4 text-sm ${mode === value ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'ring-1 ring-[var(--color-border)]'}`}>{label}</button>)}</div>
      </div>
      {documents.error ? <Alert tone="error">{apiMessage(documents.error)}</Alert> : null}
      {documents.isLoading ? <Skeleton className="h-96" /> : null}
      {documents.data ? (mode === 'pick' ? <PickList orders={documents.data} /> : documents.data.map((order) => <OrderSheet key={order.id} order={order} invoice={mode === 'invoice'} store={store} storeName={storeName} />)) : null}
      <style>{'@media print { @page { size: A4; margin: 12mm; } .print-sheet { break-after: page; box-shadow: none !important; border: 0 !important; } .admin-sidebar, header.admin-topbar { display: none !important; } }'}</style>
    </div>
  );
}

function OrderSheet({ order, invoice, store, storeName }) {
  const cod = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid';
  return (
    <article className="print-sheet admin-card bg-white p-8 text-[13px] text-black">
      <header className="flex items-start justify-between gap-6 border-b border-black pb-4">
        <div><p className="text-lg font-semibold uppercase tracking-[.2em]">{storeName}</p>{store?.address ? <p>{store.address}</p> : null}{store?.contactPhone ? <p>{store.contactPhone}</p> : null}{store?.tradeLicenseNumber ? <p>Trade licence: {store.tradeLicenseNumber}</p> : null}{invoice && store?.bin ? <p>BIN: {store.bin}</p> : null}</div>
        <div className="text-right"><p className="text-base font-semibold">{invoice ? 'INVOICE' : 'PACKING SLIP'}</p><p className="font-mono text-base">{order.reference}</p><p>{formatDateTime(order.placedAt || order.createdAt)}</p></div>
      </header>
      <section className="grid grid-cols-2 gap-6 py-4">
        <div><p className="text-[11px] uppercase tracking-wide text-gray-600">Deliver to</p><p className="text-base font-semibold">{order.address?.recipientName || order.customer.name}</p><p className="text-base">{order.address?.phone || order.customer.phone}</p><p>{order.address?.addressLine}</p><p>{[order.address?.thana || order.address?.area, order.address?.district].filter(Boolean).join(', ')}</p>{order.address?.landmark ? <p>Landmark: {order.address.landmark}</p> : null}</div>
        <div className="text-right"><p className="text-[11px] uppercase tracking-wide text-gray-600">{cod ? 'Collect on delivery' : 'Payment'}</p><p className="text-2xl font-bold">{cod ? formatMoney(order.totals.grand) : 'PAID'}</p><p>{order.delivery.label}</p>{order.shipments?.[0] ? <p>{order.shipments[0].courier} {order.shipments[0].consignmentId || ''}</p> : null}</div>
      </section>
      <table className="w-full border-collapse">
        <thead><tr className="border-y border-black text-left"><th className="py-2">Item</th><th className="py-2">SKU</th><th className="py-2 text-right">Qty</th>{invoice ? <><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Total</th></> : <th className="py-2 text-right">✓</th>}</tr></thead>
        <tbody>{order.items.map((item) => <tr key={item.id} className="border-b border-gray-300"><td className="py-2">{item.productName}<br /><span className="text-gray-600">{item.variantTitle}</span></td><td className="py-2 font-mono">{item.sku}</td><td className="py-2 text-right text-base font-semibold">{item.quantity}</td>{invoice ? <><td className="py-2 text-right">{formatMoney(item.unitPrice)}</td><td className="py-2 text-right">{formatMoney(item.lineTotal)}</td></> : <td className="py-2 text-right">☐</td>}</tr>)}</tbody>
      </table>
      {invoice ? (
        <dl className="ml-auto mt-4 grid w-64 gap-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.totals.subtotal)}</dd></div>
          {order.totals.discount !== '0.00' ? <div className="flex justify-between"><dt>Discount</dt><dd>−{formatMoney(order.totals.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{formatMoney(order.totals.delivery)}</dd></div>
          <div className="flex justify-between border-t border-black pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.totals.grand)}</dd></div>
        </dl>
      ) : null}
      {order.note ? <p className="mt-4 border border-gray-400 p-2"><strong>Customer note:</strong> {order.note}</p> : null}
      <p className="mt-6 text-center text-[11px] text-gray-600">Thank you for shopping with {storeName}. Exchange within the policy window — keep this slip.</p>
    </article>
  );
}

function PickList({ orders }) {
  const lines = new Map();
  for (const order of orders) for (const item of order.items) {
    const key = item.sku;
    const current = lines.get(key) || { sku: item.sku, name: item.productName, variant: item.variantTitle, quantity: 0, orders: [] };
    current.quantity += item.quantity;
    current.orders.push(order.reference);
    lines.set(key, current);
  }
  const rows = [...lines.values()].sort((left, right) => left.sku.localeCompare(right.sku));
  return (
    <article className="print-sheet admin-card bg-white p-8 text-[13px] text-black">
      <h2 className="text-lg font-semibold">Pick list · {orders.length} orders · {formatDateTime(new Date().toISOString())}</h2>
      <table className="mt-4 w-full border-collapse"><thead><tr className="border-y border-black text-left"><th className="py-2">SKU</th><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2">Orders</th></tr></thead><tbody>{rows.map((row) => <tr key={row.sku} className="border-b border-gray-300 align-top"><td className="py-2 font-mono">{row.sku}</td><td className="py-2">{row.name}<br /><span className="text-gray-600">{row.variant}</span></td><td className="py-2 text-right text-base font-semibold">{row.quantity}</td><td className="py-2 text-xs">{row.orders.join(', ')}</td></tr>)}</tbody></table>
    </article>
  );
}
