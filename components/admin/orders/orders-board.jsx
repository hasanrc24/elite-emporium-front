'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Copy, Eye, FileText, Phone, PhoneCall, Plus, Printer, Search } from 'lucide-react';
import { Button, DataTable, FormattedMoney, TableFooter, actionsColumn, pushToast } from '@/components/ui';
import { useSearchInput, useTableParams } from '@/lib/hooks/use-table-params';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { AdminPageHeader } from '../admin-page-header';
import { orderActionMenuItems, useOrderActionDialog } from './order-actions';
import { CHANNEL_LABELS, RiskBadge, StatusPill, formatDateTime, telHref, useCan } from './order-shared';

/** Saved operational views (FE-ADMIN 10.4): each maps to backend list filters. */
const VIEWS = [
  { key: 'all', label: 'All orders', params: {} },
  { key: 'confirm', label: 'To confirm', params: { orderStatus: 'placed', confirmationStatus: 'pending' } },
  { key: 'pack', label: 'To pack', params: { orderStatus: 'confirmed', fulfillmentStatus: 'unfulfilled' } },
  { key: 'ship', label: 'To ship', params: { fulfillmentStatus: 'packed' } },
  { key: 'transit', label: 'In transit', params: { fulfillmentStatus: 'shipped' } },
  { key: 'delivered', label: 'Delivered', params: { fulfillmentStatus: 'delivered' } },
  { key: 'rto', label: 'Returned (RTO)', params: { fulfillmentStatus: 'returned_to_origin' } },
  { key: 'cancelled', label: 'Cancelled', params: { orderStatus: 'cancelled' } },
  { key: 'high-risk', label: 'High risk', params: { riskLevel: 'high' } }
];

const DEFAULTS = { page: 1, pageSize: 25, view: 'all', search: '', channel: '' };

export function OrdersBoard() {
  const router = useRouter();
  const can = useCan();
  const [tableParams, setTableParams] = useTableParams(DEFAULTS);
  const { page, pageSize, view, search, channel } = tableParams;
  const [selected, setSelected] = useState([]);
  const statusDialog = useOrderActionDialog({ can });
  const openStatusDialog = statusDialog.open;
  const active = VIEWS.find((item) => item.key === view) || VIEWS[0];
  const commitSearch = useCallback((value) => { setTableParams({ search: value }); setSelected([]); }, [setTableParams]);
  const [searchText, setSearchText] = useSearchInput(search, commitSearch);
  const params = useMemo(() => ({ page, pageSize, ...active.params, ...(search ? { search } : {}), ...(channel ? { channel } : {}) }), [page, pageSize, active, search, channel]);
  const orders = useQuery({ queryKey: ['admin-orders', params], queryFn: () => browserApi.get('/admin/orders', { params }).then((response) => response.data), placeholderData: keepPreviousData });
  const rows = orders.data?.data || [];
  const meta = orders.data?.meta || {};
  const filtered = Boolean(search || channel || view !== 'all');

  function changeView(key) { setTableParams({ view: key }); setSelected([]); }
  function clearFilters() { setTableParams({ view: 'all', search: '', channel: '' }); setSelected([]); }

  const columns = useMemo(() => [
    { id: 'order', header: 'Order', cell: ({ row: { original: row } }) => <div><Link href={`/admin/orders/${row.id}`} className="font-semibold hover:underline">{row.reference}</Link><p className="whitespace-nowrap text-xs text-[var(--color-muted)]">{formatDateTime(row.createdAt)} · {CHANNEL_LABELS[row.channel] || row.source}</p></div> },
    { id: 'customer', header: 'Customer', cell: ({ row: { original: row } }) => <div className="max-w-[14rem]"><p className="truncate font-medium" title={row.customer?.name}>{row.customer?.name}</p><p className="text-xs text-[var(--color-muted)]">{row.customer?.phone}</p></div> },
    { id: 'status', header: 'Status', cell: ({ row: { original: row } }) => <div className="flex flex-wrap gap-1"><StatusPill value={row.orderStatus} /><StatusPill value={row.fulfillmentStatus} />{row.confirmationStatus && row.confirmationStatus !== 'not_required' && row.confirmationStatus !== 'confirmed' ? <StatusPill value={row.confirmationStatus} label={`Confirm: ${row.confirmationStatus.replaceAll('_', ' ')}`} /> : null}</div> },
    { id: 'risk', header: 'Risk', cell: ({ row: { original: row } }) => <RiskBadge level={row.riskLevel} /> },
    { id: 'total', header: 'Total', meta: { align: 'right' }, cell: ({ row: { original: row } }) => <div><FormattedMoney value={row.totals.grand} /><p className="whitespace-nowrap text-xs text-[var(--color-muted)]">{row.paymentMethod?.toUpperCase()} · {row.paymentStatus}</p></div> },
    actionsColumn((row) => [
      { label: 'View order', icon: Eye, href: `/admin/orders/${row.id}` },
      { label: 'Print packing slip / invoice', icon: Printer, href: `/admin/orders/print?ids=${row.id}`, hidden: !can('orders.view') },
      { separator: true },
      ...orderActionMenuItems(row, can, openStatusDialog),
      { separator: true },
      { label: 'Copy reference', icon: Copy, onSelect: () => navigator.clipboard?.writeText(row.reference).then(() => pushToast({ tone: 'success', title: 'Reference copied' }), () => pushToast({ tone: 'error', title: 'Could not copy' })) },
      { label: 'Call customer', icon: Phone, href: telHref(row.customer?.phone), hidden: !telHref(row.customer?.phone) }
    ], { label: (row) => `Actions for order ${row.reference}` })
  ], [can, openStatusDialog]);

  return (
    <div className="grid gap-5">
      <AdminPageHeader title="Orders" description="Confirm, pack and ship from saved views. Select orders to print packing slips in bulk." actions={<>
        {can('orders.confirm') ? <Button asChild variant="secondary"><Link href="/admin/confirmations"><PhoneCall size={16} />Confirmation queue</Link></Button> : null}
        {can('orders.create') ? <Button asChild><Link href="/admin/orders/new"><Plus size={16} />Manual order</Link></Button> : null}
      </>} />
      <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Order views">
        {VIEWS.map((item) => <button key={item.key} type="button" role="tab" aria-selected={active.key === item.key} onClick={() => changeView(item.key)} className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition ${active.key === item.key ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)] ring-1 ring-[var(--color-border)] hover:text-[var(--color-text)]'}`}>{item.label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1" role="search">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search reference, phone, name or email" aria-label="Search orders" className="!pl-9" />
        </div>
        <select value={channel} onChange={(event) => { setTableParams({ channel: event.target.value }); setSelected([]); }} aria-label="Channel" className="!w-auto">
          <option value="">All channels</option>
          {Object.entries(CHANNEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {selected.length ? <Button variant="secondary" onClick={() => router.push(`/admin/orders/print?ids=${selected.join(',')}`)}><Printer size={16} />Print {selected.length} {selected.length === 1 ? 'order' : 'orders'}</Button> : null}
      </div>
      <div className="grid gap-0">
        <DataTable
          caption="Orders"
          columns={columns}
          data={rows}
          loading={orders.isLoading}
          fetching={orders.isFetching}
          error={orders.error ? apiMessage(orders.error) : null}
          onRetry={orders.refetch}
          minWidth={820}
          emptyTitle={filtered ? 'No orders match' : 'No orders yet'}
          emptyDescription={filtered ? 'Try another view, search term or channel.' : 'Orders from your storefront and manual orders will appear here.'}
          emptyAction={filtered ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
          onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
          rowLabel={(row) => `Open order ${row.reference}`}
          selectedIds={selected}
          onSelectedIdsChange={setSelected}
        />
        {statusDialog.element}
        <TableFooter page={page} pageSize={pageSize} total={meta.total || 0} pageCount={meta.pageCount} onPageChange={(next) => setTableParams({ page: next })} onPageSizeChange={(size) => setTableParams({ pageSize: size })} />
      </div>
    </div>
  );
}
