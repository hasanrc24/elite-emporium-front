'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Archive, ArrowLeft, CheckCircle2, Eye, Plus, RefreshCw, RotateCcw, Search, XCircle } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, DataTable, DialogContent, DialogRoot, actionsColumn, DatePicker, DateRangePicker, Field, FieldGroup, FormattedDate, FormattedMoney, Input, MultiSelect, NativeSelect, Skeleton, StatusBadge, Switch, TableFooter, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useSearchInput, useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from './admin-page-header';
import { ReturnWorkflow } from './returns/return-workflow';

const definitions = {
  categories: { title: 'Categories', eyebrow: 'Catalog', endpoint: '/admin/categories', columns: ['translations.en.name', 'slug', 'active', 'displayOrder'], detail: true, taxonomy: true },
  collections: { title: 'Collections', eyebrow: 'Catalog', endpoint: '/admin/collections', columns: ['translations.en.name', 'slug', 'active', 'displayOrder'], detail: true, taxonomy: true },
  brands: { title: 'Brands', eyebrow: 'Catalog', endpoint: '/admin/brands', columns: ['translations.en.name', 'slug', 'active', 'displayOrder'], detail: true, taxonomy: true },
  attributes: { title: 'Attributes', eyebrow: 'Catalog', endpoint: '/admin/attributes', columns: ['translations.en.label', 'key', 'type', 'values.length'] },
  inventory: { title: 'Inventory', eyebrow: 'Catalog operations', endpoint: '/admin/inventory/levels', columns: ['variant.sku', 'productName', 'variant.title', 'onHand', 'reserved', 'available', 'lowStockThreshold'], filters: ['lowStock'], adjustment: true },
  orders: { title: 'Orders', eyebrow: 'Commerce', endpoint: '/admin/orders', columns: ['reference', 'customer.name', 'orderStatus', 'paymentStatus', 'fulfillmentStatus', 'totals.grand', 'createdAt'], detail: true },
  payments: { title: 'Payments', eyebrow: 'Commerce', endpoint: '/admin/payments', columns: ['order.reference', 'provider', 'method', 'status', 'amount', 'transactionId', 'createdAt'], detail: true },
  refunds: { title: 'Refunds', eyebrow: 'Commerce', endpoint: '/admin/refunds', columns: ['order.reference', 'method', 'status', 'amount', 'reason', 'createdAt'], detail: true },
  returns: { title: 'Returns & exchanges', eyebrow: 'Commerce', endpoint: '/admin/returns', columns: ['reference', 'order.reference', 'order.customer.name', 'status', 'resolution', 'refundAmount', 'createdAt'], detail: true },
  customers: { title: 'Customers', eyebrow: 'Customer care', endpoint: '/admin/customers', columns: ['name', 'phone', 'status', 'riskLevel', 'stats.orderCount', 'stats.deliveredCount', 'stats.rtoCount', 'stats.lifetimeValue'], detail: true },
  coupons: { title: 'Coupons', eyebrow: 'Marketing', endpoint: '/admin/coupons', columns: ['code', 'type', 'amount', 'active', 'startsAt', 'endsAt'], detail: true },
  reviews: { title: 'Review moderation', eyebrow: 'Customer care', endpoint: '/admin/reviews', columns: ['product.slug', 'customer.name', 'rating', 'title', 'status', 'verifiedPurchase', 'createdAt'] },
  shipments: { title: 'Shipments', eyebrow: 'Fulfillment', endpoint: '/admin/shipments', columns: ['order.reference', 'courierName', 'status', 'consignmentId', 'fee', 'updatedAt'] },
  media: { title: 'Media library', eyebrow: 'Content', endpoint: '/admin/media', columns: ['originalName', 'kind', 'privacy', 'status', 'byteSize', 'createdAt'], media: true },
  staff: { title: 'Staff', eyebrow: 'Access control', endpoint: '/admin/staff', columns: ['name', 'email', 'phone', 'status', 'roles', 'lastLoginAt'], detail: true },
  roles: { title: 'Roles & permissions', eyebrow: 'Access control', endpoint: '/admin/roles', columns: ['name', 'key', 'active', 'protected', 'system', 'permissions.length'] },
  audits: { title: 'Audit log', eyebrow: 'Security', endpoint: '/admin/audits', columns: ['createdAt', 'actor.name', 'action', 'resourceType', 'resourceId', 'requestId'] },
  integrations: { title: 'Integrations', eyebrow: 'Platform', endpoint: '/admin/integrations', columns: ['provider', 'environment', 'maskedLabel', 'active', 'testStatus', 'testedAt'] },
  notifications: { title: 'Notification templates', eyebrow: 'Platform', endpoint: '/admin/notifications/templates', columns: ['event', 'channel', 'locale', 'active', 'updatedAt'] },
  deliveries: { title: 'Notification deliveries', eyebrow: 'Platform', endpoint: '/admin/notifications/outbox', columns: ['event', 'channel', 'recipient', 'status', 'attempts', 'scheduledAt', 'lastError'] },
  webhooks: { title: 'Webhooks', eyebrow: 'Platform', endpoint: '/admin/webhooks', columns: ['name', 'url', 'topics', 'status', 'failureCount', 'updatedAt'] },
  exports: { title: 'Exports', eyebrow: 'Reporting', endpoint: '/admin/exports', columns: ['report', 'status', 'requester.name', 'errorCode', 'createdAt'], export: true },
  reports: { title: 'Reports', eyebrow: 'Reporting', endpoint: '/admin/reports/summary', report: true },
  contacts: { title: 'Contact inbox', eyebrow: 'Customer care', endpoint: '/admin/contact-messages', columns: ['name', 'subject', 'email', 'phone', 'status', 'createdAt'] },
  privacy: { title: 'Privacy requests', eyebrow: 'Customer care', endpoint: '/admin/privacy-requests', columns: ['customer.name', 'type', 'status', 'requestedAt', 'reviewer.name'], detail: true },
  pages: { title: 'Pages', eyebrow: 'Content', endpoint: '/admin/pages', columns: ['translations.en.title', 'slug', 'status', 'publishAt', 'updatedAt'], detail: true },
  posts: { title: 'Posts & lookbooks', eyebrow: 'Content', endpoint: '/admin/posts', columns: ['translations.en.title', 'slug', 'type', 'status', 'publishAt'], detail: true },
  home: { title: 'Homepage sections', eyebrow: 'Appearance', endpoint: '/admin/home-sections', columns: ['type', 'status', 'enabled', 'displayOrder', 'startsAt', 'endsAt'] },
  menus: { title: 'Navigation menus', eyebrow: 'Appearance', endpoint: '/admin/menus', columns: ['name', 'location', 'status', 'items.length', 'version'] },
  theme: { title: 'Theme', eyebrow: 'Appearance', endpoint: '/admin/theme', columns: ['status', 'version', 'publishedAt', 'updatedAt'] }
};

function valueAt(row, path) { return path.split('.').reduce((value, key) => value?.[key], row); }
function labelFor(path) {
  return path.split('.').at(-1).replaceAll(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

// Status filters must use each backend list's own query parameter and enum values; resources whose list
// endpoint has no status filter get no status control instead of a silently ignored one.
const statusOptions = (values) => [{ value: '', label: 'All statuses' }, ...values.map((value) => ({ value, label: value.replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase()) }))];
const taxonomyStatuses = statusOptions(['active', 'archived']);
const contentStatuses = statusOptions(['draft', 'scheduled', 'published']);
const statusFilters = {
  categories: { options: taxonomyStatuses },
  collections: { options: taxonomyStatuses },
  brands: { options: taxonomyStatuses },
  orders: { param: 'orderStatus', options: statusOptions(['draft', 'pending_payment', 'placed', 'confirmed', 'processing', 'completed', 'cancelled', 'failed']) },
  payments: { options: statusOptions(['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded']) },
  refunds: { options: statusOptions(['pending', 'processing', 'completed', 'failed', 'cancelled']) },
  returns: { options: statusOptions(['requested', 'under_review', 'approved', 'rejected', 'in_transit', 'received', 'completed', 'cancelled']) },
  customers: { options: statusOptions(['active', 'disabled']) },
  coupons: { options: statusOptions(['active', 'inactive', 'archived']) },
  reviews: { options: statusOptions(['pending', 'approved', 'rejected', 'spam']) },
  shipments: { options: statusOptions(['draft', 'created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'failed']) },
  staff: { options: statusOptions(['active', 'disabled']) },
  deliveries: { options: statusOptions(['pending', 'processing', 'sent', 'retry', 'dead', 'skipped']) },
  exports: { options: statusOptions(['queued', 'processing', 'ready', 'failed', 'expired']) },
  contacts: { options: statusOptions(['new', 'in_progress', 'resolved', 'spam']) },
  privacy: { options: statusOptions(['requested', 'under_review', 'approved', 'rejected', 'completed']) },
  pages: { options: contentStatuses },
  posts: { options: contentStatuses }
};

// UX gating only; the backend enforces the same permissions.
function useCan() {
  const permissions = useAuthStore((state) => state.user?.permissions);
  return (permission) => Boolean(permissions?.includes(permission));
}

// The API sends ISO-8601 UTC; the picker works in local `YYYY-MM-DDTHH:mm`.
function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const dateFilterResources = new Set(['orders', 'payments', 'refunds', 'returns', 'shipments', 'audits', 'deliveries', 'exports', 'contacts', 'privacy', 'pages', 'posts']);

function resolveDefinition(segments) {
  const joined = segments.join('/');
  const aliases = { 'content/pages': 'pages', 'content/posts': 'posts', 'appearance/home': 'home', 'appearance/theme': 'theme', 'appearance/menus': 'menus', 'contact-messages': 'contacts', 'privacy-requests': 'privacy', 'notification-deliveries': 'deliveries' };
  const prefix = aliases[segments.slice(0, 2).join('/')];
  const resource = aliases[joined] || prefix || aliases[segments[0]] || segments[0];
  return { resource, definition: definitions[resource], id: prefix ? segments[2] || null : aliases[joined] ? null : segments[1] || null };
}

export function ResourceConsole({ segments }) {
  const resolved = resolveDefinition(segments);
  if (!resolved.definition) return <Alert tone="error">This administration section is not available.</Alert>;
  return resolved.id && resolved.definition.detail
    ? <ResourceDetail resource={resolved.resource} definition={resolved.definition} id={resolved.id} />
    : <ResourceList resource={resolved.resource} definition={resolved.definition} />;
}

const numericColumn = /amount|price|total|fee|value|count|attempts|onHand|reserved|available|lowStockThreshold|displayOrder|byteSize|rating|failureCount|version|length|revenue/i;
const plainTextColumn = /email|url|slug|key|requestId|transactionId|consignmentId|resourceId|code|sku|maskedLabel|recipient/i;
const truncatedColumn = /title|reason|lastError|url|recipient|subject|resourceId|requestId|transactionId|consignmentId|originalName|maskedLabel/i;
const detailHref = (resource, id) => (['pages', 'posts'].includes(resource) ? `/admin/content/${resource}/${id}` : `/admin/${resource}/${id}`);
const customerSortKeys = { name_asc: [{ id: 'name', desc: false }], name_desc: [{ id: 'name', desc: true }] };
const tableDefaults = { page: 1, pageSize: 25, search: '', status: '', from: '', to: '', sort: '' };

function ResourceList({ resource, definition }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [tableParams, setTableParams] = useTableParams(tableDefaults);
  const can = useCan();
  const supportsDateRange = definition.report || dateFilterResources.has(resource);
  const statusFilter = statusFilters[resource];
  const pageSize = Math.min(tableParams.pageSize, 100);
  const dateRange = useMemo(() => ({ from: tableParams.from, to: tableParams.to }), [tableParams.from, tableParams.to]);
  const [searchText, setSearchText] = useSearchInput(tableParams.search, (search) => setTableParams({ search }));
  const serverSort = resource === 'customers';
  const sorting = serverSort ? customerSortKeys[tableParams.sort] || [] : undefined;
  const params = useMemo(() => ({
    page: tableParams.page,
    pageSize,
    ...(tableParams.search ? { search: tableParams.search } : {}),
    ...(tableParams.status && statusFilter ? { [statusFilter.param || 'status']: tableParams.status } : {}),
    ...(tableParams.from ? { from: tableParams.from } : {}),
    ...(tableParams.to ? { to: tableParams.to } : {}),
    ...(serverSort && customerSortKeys[tableParams.sort] ? { sort: tableParams.sort } : {})
  }), [tableParams, pageSize, statusFilter, serverSort]);
  const query = useQuery({
    queryKey: ['admin-resource', resource, params],
    queryFn: () => browserApi.get(definition.endpoint, { params }).then((response) => response.data),
    placeholderData: keepPreviousData
  });
  const quick = useMutation({
    mutationFn: ({ row, kind }) => {
      if (kind === 'review') return browserApi.post(`/admin/reviews/${row.id}/moderate`, { status: row.status === 'approved' ? 'rejected' : 'approved', reason: 'Reviewed by administrator', version: Number(row.version) });
      if (kind === 'retry') return browserApi.post(`/admin/notifications/outbox/${row.id}/retry`);
      if (kind === 'contact') return browserApi.patch(`/admin/contact-messages/${row.id}`, { status: row.status === 'resolved' ? 'in_progress' : 'resolved' });
      return Promise.reject(new Error('Unsupported action'));
    },
    onSuccess: () => query.refetch()
  });
  const raw = query.data?.data;
  const rows = Array.isArray(raw) ? raw : definition.report && raw ? Object.entries(raw).map(([key, value]) => ({ key, value })) : [];
  const columns = definition.report ? ['key', 'value'] : definition.columns;
  const total = query.data?.meta?.total;
  const filtersActive = Boolean(tableParams.search || tableParams.status || tableParams.from || tableParams.to);
  const clearFilters = () => setTableParams({ search: '', status: '', from: '', to: '' });
  const hasQuickActions = resource in quickActionPermissions;
  const hasActions = Boolean((definition.detail || hasQuickActions) && !definition.report);

  const columnsDef = columns.map((column) => ({
    id: column,
    header: labelFor(column),
    accessorFn: (row) => valueAt(row, column),
    enableSorting: serverSort ? column === 'name' : Boolean(definition.report),
    meta: numericColumn.test(column) && !definition.report ? { align: 'right' } : undefined,
    cell: ({ row }) => {
      const value = valueAt(row.original, column);
      const text = typeof value === 'string' ? value : undefined;
      return (
        <span
          className={`${plainTextColumn.test(column) ? '' : 'capitalize '}${numericColumn.test(column) && !definition.report ? 'tabular-nums ' : ''}${truncatedColumn.test(column) ? 'block max-w-[18rem] truncate' : ''}`.trim()}
          title={truncatedColumn.test(column) ? text : undefined}
        >
          {renderCell(value, column)}
        </span>
      );
    }
  }));
  if (hasActions) {
    columnsDef.push(actionsColumn((row) => [
      { label: 'View details', icon: Eye, href: detailHref(resource, row.id), hidden: !definition.detail || !row.id },
      ...quickActionItems(resource, row, can, quick)
    ], { label: (row) => `Actions for ${row.reference || row.code || row.translations?.en?.name || row.translations?.en?.title || row.name || row.slug || row.id || 'row'}` }));
  }

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title={definition.title}
        description={`View and manage ${definition.title.toLowerCase()} from one workspace.`}
        actions={<>
          {definition.taxonomy && can('catalog.manage') ? (
            <Button onClick={() => setCreating((value) => !value)}>
              <Plus size={17} />
              {creating ? 'Close form' : `Add ${resource.slice(0, -1)}`}
            </Button>
          ) : ['pages', 'posts'].includes(resource) && can('cms.manage') ? (
            <Button asChild>
              <Link href={`/admin/content/${resource}/new`}><Plus size={17} />Create {resource === 'pages' ? 'page' : 'post'}</Link>
            </Button>
          ) : resource === 'orders' && can('orders.create') ? (
            <Button asChild>
              <Link href="/admin/orders/new"><Plus size={17} />Create manual order</Link>
            </Button>
          ) : null}
        </>}
      />

      {creating && definition.taxonomy ? <TaxonomyEditor resource={resource} endpoint={definition.endpoint} onSaved={() => { setCreating(false); query.refetch(); }} /> : null}

      {definition.adjustment && can('inventory.adjust') ? <InventoryAdjustment onSaved={() => query.refetch()} /> : null}
      {definition.media ? <MediaUpload onSaved={() => query.refetch()} /> : null}
      {definition.export && can('reports.export') ? <ExportRequest onSaved={() => query.refetch()} /> : null}
      {resource === 'integrations' ? <IntegrationActions rows={rows} onSaved={() => query.refetch()} /> : null}
      {definition.report ? <OrderOutcomesReport dateRange={dateRange} /> : null}

      {quick.error ? <Alert tone="error">{apiMessage(quick.error, 'The action could not be completed.')}</Alert> : null}

      <Card>
        <CardHeader title={`All ${definition.title.toLowerCase()}`} description={`${total ?? rows.length} records`} />
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] p-4">
          <Field label="Search" className="min-w-56 flex-1 sm:max-w-sm"><Input className="!min-h-10" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder={`Search ${definition.title.toLowerCase()}…`} /></Field>
          {statusFilter ? <Field label="Status" className="min-w-40"><NativeSelect className="!min-h-10" value={tableParams.status} onChange={(event) => setTableParams({ status: event.target.value })} options={statusFilter.options} /></Field> : null}
          {supportsDateRange ? <Field label="Date range" className="min-w-60"><DateRangePicker value={dateRange} onChange={(next) => setTableParams({ from: next.from || '', to: next.to || '' })} /></Field> : null}
          {filtersActive ? <Button size="sm" type="button" variant="ghost" onClick={clearFilters}>Clear filters</Button> : null}
          <Button size="sm" type="button" variant="secondary" loading={query.isFetching && !query.isLoading} onClick={() => query.refetch()}><RefreshCw size={15} />Refresh</Button>
        </div>
        <CardBody className="p-0">
          <DataTable
            className="!rounded-none !border-0 !shadow-none"
            columns={columnsDef}
            data={rows}
            loading={query.isLoading}
            fetching={query.isFetching}
            error={query.error ? apiMessage(query.error, `${definition.title} could not be loaded.`) : null}
            onRetry={() => query.refetch()}
            minWidth={Math.max(640, columns.length * 130 + (hasActions ? 56 : 0))}
            caption={definition.title}
            sortable={Boolean(definition.report)}
            sorting={sorting}
            onSortingChange={serverSort ? (next) => setTableParams({ sort: next[0] ? (next[0].desc ? 'name_desc' : 'name_asc') : '' }) : undefined}
            onRowClick={definition.detail && !definition.report ? (row) => row.id && router.push(detailHref(resource, row.id)) : undefined}
            rowLabel={(row) => `Open ${row.reference || row.code || row.translations?.en?.name || row.translations?.en?.title || row.name || row.slug || 'record'}`}
            emptyTitle={filtersActive ? 'No matching records' : `No ${definition.title.toLowerCase()} yet`}
            emptyDescription={filtersActive ? 'Try changing your search, status or date filters.' : 'Records will appear here once they exist.'}
            emptyAction={filtersActive ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button> : null}
          />
        </CardBody>
        {total ? (
          <TableFooter
            page={tableParams.page}
            pageSize={pageSize}
            total={total}
            pageCount={query.data?.meta?.pageCount}
            onPageChange={(page) => setTableParams({ page })}
            onPageSizeChange={(size) => setTableParams({ pageSize: size })}
            className="border-t border-[var(--color-border)]"
          />
        ) : null}
      </Card>
    </div>
  );
}

function renderCell(value, path) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return <StatusBadge status={value ? 'active' : 'inactive'} />;
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'object' ? item.name || item.key || item.slug || item.id : item)).join(', ') || '—';
  if (typeof value === 'object') return value.name || value.label || value.reference || JSON.stringify(value);
  if (/amount|price|total|revenue|grossPaid|fee|value/i.test(path) && /^\d+(\.\d+)?$/.test(String(value))) return <FormattedMoney value={String(value)} />;
  if (/At$/.test(path) && !Number.isNaN(Date.parse(String(value)))) return <FormattedDate value={value} withTime />;
  if (/(^|\.)(status|orderStatus|paymentStatus|fulfillmentStatus)$/.test(path)) return <StatusBadge status={String(value)} />;
  return String(value).replaceAll('_', ' ');
}

function ResourceDetail({ resource, definition, id }) {
  const client = useQueryClient();
  const can = useCan();
  const editableTaxonomy = definition.taxonomy && can('catalog.manage');
  const query = useQuery({
    queryKey: ['admin-resource-detail', resource, id],
    queryFn: () => browserApi.get(`${definition.endpoint}/${id}`).then((response) => response.data.data)
  });
  const row = query.data;
  return (
    <div className="grid gap-5">
      <AdminPageHeader backHref={`/admin/${resource}`} backLabel={`Back to ${definition.title.toLowerCase()}`} title={row?.reference || row?.code || row?.translations?.en?.name || row?.name || row?.slug || definition.title} description="Review details and make authorized changes below." />
      {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
      {query.isLoading ? <Card><CardBody>Loading record…</CardBody></Card> : null}
      {row ? (
        <>
          {editableTaxonomy ? <TaxonomyEditor resource={resource} endpoint={definition.endpoint} row={row} onSaved={(saved) => { client.setQueryData(['admin-resource-detail', resource, id], saved); query.refetch(); client.invalidateQueries({ queryKey: ['admin-resource', resource] }); }} /> : null}
          {resource === 'customers' && row.stats ? <CustomerProfileStats stats={row.stats} /> : null}
          <DetailCards value={row} compact={editableTaxonomy} />
          {resource === 'returns' ? <ReturnWorkflow row={row} onSaved={() => { query.refetch(); client.invalidateQueries({ queryKey: ['admin-resource', resource] }); }} /> : null}
          <DetailActions resource={resource} row={row} onSaved={(saved) => { client.setQueryData(['admin-resource-detail', resource, id], saved); query.refetch(); client.invalidateQueries({ queryKey: ['admin-resource', resource] }); }} />
        </>
      ) : null}
    </div>
  );
}

/** Confirmation, cancellation and RTO rates by zone or channel (BR-REP-001). */
function OrderOutcomesReport({ dateRange }) {
  const [groupBy, setGroupBy] = useState('zone');
  const params = { groupBy, ...(dateRange.from ? { from: dateRange.from } : {}), ...(dateRange.to ? { to: dateRange.to } : {}) };
  const query = useQuery({
    queryKey: ['admin-report', 'order_outcomes', params],
    queryFn: () => browserApi.get('/admin/reports/order_outcomes', { params }).then((response) => response.data.data.rows)
  });
  const rate = (value) => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  const num = { align: 'right' };
  const columns = [
    { header: groupBy === 'zone' ? 'Delivery zone' : 'Channel', accessorKey: 'label', cell: ({ row }) => <span className="capitalize">{String(row.original.label || row.original.group || '—').replaceAll('_', ' ')}</span> },
    { header: 'Orders', accessorKey: 'orders', meta: num, cell: ({ row }) => <span className="tabular-nums">{row.original.orders}</span> },
    { header: 'Confirmation rate', accessorKey: 'confirmationRate', meta: num, cell: ({ row }) => <span className="tabular-nums">{`${rate(row.original.confirmationRate)} (${row.original.confirmed}/${row.original.needsConfirmation})`}</span> },
    { header: 'Cancellation rate', accessorKey: 'cancellationRate', meta: num, cell: ({ row }) => <span className="tabular-nums">{`${rate(row.original.cancellationRate)} (${row.original.cancelled})`}</span> },
    { header: 'Delivered', accessorKey: 'delivered', meta: num, cell: ({ row }) => <span className="tabular-nums">{row.original.delivered}</span> },
    { header: 'RTO rate', accessorKey: 'rtoRate', meta: num, cell: ({ row }) => <span className={`tabular-nums ${row.original.rtoRate >= 20 ? 'font-bold text-[var(--color-danger)]' : ''}`}>{`${rate(row.original.rtoRate)} (${row.original.rto})`}</span> }
  ];
  return (
    <Card>
      <CardHeader title="Order outcomes" description="RTO rate is measured against parcels that were delivered or returned to origin." />
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--color-border)] p-4">
        <Field label="Group by" className="min-w-40"><NativeSelect className="!min-h-10" value={groupBy} onChange={(event) => setGroupBy(event.target.value)} options={[{ value: 'zone', label: 'Delivery zone' }, { value: 'channel', label: 'Sales channel' }]} /></Field>
      </div>
      <CardBody className="p-0">
        <DataTable className="!rounded-none !border-0 !shadow-none" columns={columns} data={query.data || []} loading={query.isLoading} fetching={query.isFetching} error={query.error ? apiMessage(query.error, 'Order outcomes could not be loaded.') : null} onRetry={() => query.refetch()} sortable minWidth={720} caption="Order outcomes" emptyTitle="No orders in this period" emptyDescription="Change the date range to see outcomes." />
      </CardBody>
    </Card>
  );
}

/** Operational customer profile (BR-ID-004): order outcomes and delivered value. */
function CustomerProfileStats({ stats }) {
  const tiles = [
    { label: 'Orders', value: stats.orderCount },
    { label: 'Delivered', value: stats.deliveredCount },
    { label: 'Cancelled', value: stats.cancelledCount },
    { label: 'Returned to origin', value: stats.rtoCount, warn: stats.rtoCount > 0 },
    { label: 'Returns', value: stats.returnCount },
    { label: 'Lifetime value', value: <FormattedMoney value={stats.lifetimeValue} /> }
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <section key={tile.label} className="admin-card p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--color-muted)]">{tile.label}</h2>
          <p className={`mt-2 text-xl font-bold tabular-nums ${tile.warn ? 'text-[var(--color-danger)]' : ''}`}>{tile.value ?? 0}</p>
        </section>
      ))}
    </div>
  );
}

function DetailCards({ value, compact = false }) {
  if (compact) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Object.entries(value).filter(([, item]) => item != null).map(([key, item]) => (
        <section key={key} className="admin-card min-w-0 p-5">
          <h2 className="text-[10px] font-bold uppercase tracking-[.12em] text-[var(--color-muted)]">{labelFor(key)}</h2>
          {typeof item === 'object' ? (
            <div className="mt-3 max-h-80 overflow-auto rounded-xl bg-[var(--color-surface)] p-3"><pre className="whitespace-pre-wrap break-words text-xs leading-6 text-[var(--color-muted)]">{JSON.stringify(item, null, 2)}</pre></div>
          ) : (
            <p className="mt-2 break-words font-semibold capitalize">{renderCell(item, key)}</p>
          )}
        </section>
      ))}
    </div>
  );
}

function TaxonomyEditor({ resource, endpoint, row = null, onSaved }) {
  const [form, setForm] = useState({
    slug: row?.slug || '',
    nameEn: row?.translations?.en?.name || '',
    nameBn: row?.translations?.bn?.name || '',
    descriptionEn: row?.translations?.en?.description || '',
    descriptionBn: row?.translations?.bn?.description || '',
    displayOrder: row?.displayOrder ?? 0,
    active: row?.active ?? true,
    parentId: row?.parentId || '',
    mediaId: row?.mediaId || '',
    startsAt: toLocalInput(row?.startsAt),
    endsAt: toLocalInput(row?.endsAt)
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        slug: form.slug,
        active: form.active,
        displayOrder: Number(form.displayOrder),
        mediaId: form.mediaId || null,
        translations: {
          en: { name: form.nameEn, description: form.descriptionEn, seoTitle: row?.translations?.en?.seoTitle || null, seoDescription: row?.translations?.en?.seoDescription || null },
          bn: { name: form.nameBn, description: form.descriptionBn, seoTitle: row?.translations?.bn?.seoTitle || null, seoDescription: row?.translations?.bn?.seoDescription || null }
        },
        ...(resource === 'categories' ? { parentId: form.parentId || null } : {}),
        ...(resource === 'collections' ? { startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null } : {}),
        ...(row ? { version: Number(row.version) } : {})
      };
      return row ? browserApi.patch(`${endpoint}/${row.id}`, payload) : browserApi.post(endpoint, payload);
    },
    onSuccess: (response) => onSaved(response.data.data)
  });
  const lifecycle = useMutation({
    mutationFn: (action) => browserApi.post(`${endpoint}/${row.id}/${action}`),
    onSuccess: (response) => onSaved(response?.data?.data || row)
  });
  const archived = Boolean(row?.archivedAt);

  return (
    <Card>
      <CardHeader
        title={row ? 'Edit details' : `Create ${resource.slice(0, -1)}`}
        description="English and Bangla names are required for a bilingual storefront."
        action={row ? <span className="status-pill" style={{ color: archived ? 'var(--color-muted)' : 'var(--color-success)' }}>{archived ? 'Archived' : 'Live record'}</span> : null}
      />
      <CardBody className="grid gap-5">
        <FieldGroup columns={3}>
          <Field label="English name" required>
            <Input required value={form.nameEn} onChange={(event) => update('nameEn', event.target.value)} />
          </Field>
          <Field label="Bangla name" required>
            <Input required lang="bn" value={form.nameBn} onChange={(event) => update('nameBn', event.target.value)} />
          </Field>
          <Field label="URL slug" required>
            <Input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="example-name"
              value={form.slug}
              onChange={(event) => update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''))}
            />
          </Field>
          <Field label="English description" className="md:col-span-2 xl:col-span-3">
            <Textarea value={form.descriptionEn} onChange={(event) => update('descriptionEn', event.target.value)} />
          </Field>
          <Field label="Bangla description" className="md:col-span-2 xl:col-span-1">
            <Textarea lang="bn" value={form.descriptionBn} onChange={(event) => update('descriptionBn', event.target.value)} />
          </Field>
          <Field label="Display order">
            <Input type="number" min="0" value={form.displayOrder} onChange={(event) => update('displayOrder', event.target.value)} />
          </Field>
          <Field label="Media asset ID (optional)">
            <Input value={form.mediaId} onChange={(event) => update('mediaId', event.target.value)} />
          </Field>
          {resource === 'categories' ? (
            <Field label="Parent category ID (optional)">
              <Input value={form.parentId} onChange={(event) => update('parentId', event.target.value)} />
            </Field>
          ) : null}
          {resource === 'collections' ? (
            <>
              <Field label="Starts at">
                <DatePicker withTime value={form.startsAt} onChange={(value) => update('startsAt', value)} />
              </Field>
              <Field label="Ends at">
                <DatePicker withTime value={form.endsAt} onChange={(value) => update('endsAt', value)} min={form.startsAt} />
              </Field>
            </>
          ) : null}
        </FieldGroup>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <Switch checked={form.active} onCheckedChange={(value) => update('active', !!value)} />
          Active and visible to customers
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-5">
          <Button loading={save.isPending} disabled={archived || !form.slug || !form.nameEn || !form.nameBn} onClick={() => save.mutate()}>
            {row ? 'Save changes' : `Create ${resource.slice(0, -1)}`}
          </Button>
          {row ? (
            archived ? (
              <Button variant="secondary" loading={lifecycle.isPending} onClick={() => lifecycle.mutate('restore')}>
                <RotateCcw size={16} />
                Restore record
              </Button>
            ) : (
              <ConfirmAction
                title="Archive this record?"
                description="It is hidden from customers and can be restored later. Orders and reports keep their history."
                confirmLabel="Archive"
                onConfirm={() => lifecycle.mutate('archive')}
                trigger={<Button variant="danger" loading={lifecycle.isPending}><Archive size={16} />Archive</Button>}
              />
            )
          ) : null}
          <p className="text-xs text-[var(--color-muted)]">Archive is used instead of permanent deletion to protect reports and order history.</p>
        </div>

        {(save.error || lifecycle.error) ? <Alert tone="error">{apiMessage(save.error || lifecycle.error, 'The record could not be saved.')}</Alert> : null}
        {save.isSuccess ? <Alert tone="success">Changes saved successfully.</Alert> : null}
      </CardBody>
    </Card>
  );
}

const detailActionPermissions = { orders: 'orders.progress', customers: 'customers.manage', coupons: 'promotions.manage', refunds: 'payments.refund', privacy: 'customers.manage' };

function DetailActions({ resource, row, onSaved }) {
  const can = useCan();
  const [reason, setReason] = useState('Administrative update');
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState('');
  const [erasing, setErasing] = useState(false);
  const [erasureText, setErasureText] = useState('');
  const mutation = useMutation({
    mutationFn: async (action) => {
      if (resource === 'orders') return browserApi.post(`/admin/orders/${row.id}/transitions`, { dimension: choice === 'fulfillment' ? 'fulfillment' : 'order', status: value, reason, public: true, version: Number(row.version) });
      if (resource === 'customers') return browserApi.patch(`/admin/customers/${row.id}`, { status: choice || row.status, riskLevel: value || row.riskLevel, reason, version: Number(row.version) });
      if (resource === 'coupons') return browserApi.post(`/admin/coupons/${row.id}/activation`, { active: (value || 'active') === 'active', version: Number(row.version) });
      if (resource === 'refunds') {
        // A completed manual refund must carry the real payout reference; never invent one.
        if (action === 'complete' && !value.trim()) throw new Error('Enter the payout transaction reference before completing this refund.');
        return browserApi.post(`/admin/refunds/${row.id}/${action}`, action === 'complete' ? { reference: value.trim(), note: reason } : action === 'cancel' ? { reason } : {});
      }
      if (resource === 'privacy') {
        if (!value) throw new Error('Choose a transition.');
        // The backend requires an explicit typed confirmation for irreversible data deletion (collected in the dialog below).
        const confirmation = value === 'completed' && row.type === 'deletion' ? erasureText : null;
        return browserApi.post(`/admin/privacy-requests/${row.id}/transitions`, { status: value, version: Number(row.version), reason, ...(confirmation ? { confirmation } : {}) });
      }
      throw new Error('Unsupported action');
    },
    onSuccess: (response) => { setErasing(false); setErasureText(''); if (response) onSaved(response.data.data); }
  });
  const needsErasureConfirmation = resource === 'privacy' && value === 'completed' && row.type === 'deletion';
  // Returns use the step-by-step ReturnWorkflow instead.
  if (!['orders', 'customers', 'coupons', 'refunds', 'privacy'].includes(resource)) return null;
  if (!can(detailActionPermissions[resource])) return null;
  const refundActions = [
    ...(row.method === 'bkash' && row.status === 'processing' && can('payments.reconcile') ? ['reconcile'] : []),
    ...(row.method === 'manual' && ['pending', 'processing'].includes(row.status) ? ['complete'] : []),
    ...(row.status === 'pending' ? ['cancel'] : [])
  ];

  return (
    <Card>
      <CardHeader title="Record actions" />
      <CardBody className="grid gap-3 md:grid-cols-3">
        {resource === 'orders' ? (
          <>
            <NativeSelect value={choice} onChange={(event) => setChoice(event.target.value)} options={[{ value: 'order', label: 'Order status' }, { value: 'fulfillment', label: 'Fulfillment status' }]} />
            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="New status code" />
          </>
        ) : null}
        {resource === 'customers' ? (
          <>
            <NativeSelect value={choice} onChange={(event) => setChoice(event.target.value)} options={[{ value: row.status, label: row.status }, { value: 'active', label: 'active' }, { value: 'disabled', label: 'disabled' }]} />
            <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} options={[{ value: row.riskLevel, label: row.riskLevel }, { value: 'normal', label: 'normal' }, { value: 'review', label: 'review' }, { value: 'blocked', label: 'blocked' }]} />
          </>
        ) : null}
        {resource === 'coupons' ? (
          <NativeSelect value={value || 'active'} onChange={(event) => setValue(event.target.value)} options={[{ value: 'active', label: 'Activate' }, { value: 'inactive', label: 'Deactivate' }]} />
        ) : null}
        {resource === 'refunds' && refundActions.includes('complete') ? (
          <Field label="Payout reference">
            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Bank or wallet transaction ID" />
          </Field>
        ) : null}
        {resource === 'privacy' ? (
          <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} options={[{ value: '', label: 'Choose transition' }, { value: 'under_review', label: 'Under review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'completed', label: 'Completed' }]} />
        ) : null}
        <Field label="Reason or customer message" className="md:col-span-2">
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reason" />
        </Field>
        {resource === 'refunds' ? refundActions.map((action) => (
          <Button key={action} type="button" loading={mutation.isPending} onClick={() => mutation.mutate(action)}>{labelFor(action)}</Button>
        )) : (
          <Button type="button" loading={mutation.isPending} onClick={() => (needsErasureConfirmation ? setErasing(true) : mutation.mutate('apply'))}>Apply transition</Button>
        )}
        <DialogRoot open={erasing} onOpenChange={(open) => { setErasing(open); if (!open) setErasureText(''); }}>
          <DialogContent
            title="Permanently delete customer data?"
            description="This anonymises the customer's personal data and cannot be undone."
            footer={<>
              <Button variant="secondary" onClick={() => setErasing(false)}>Cancel</Button>
              <Button variant="danger" loading={mutation.isPending} disabled={erasureText !== 'DELETE CUSTOMER DATA'} onClick={() => mutation.mutate('apply')}>Delete permanently</Button>
            </>}
          >
            <Field label="Type DELETE CUSTOMER DATA to confirm">
              <Input value={erasureText} onChange={(event) => setErasureText(event.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
            {mutation.error ? <Alert tone="error">{apiMessage(mutation.error, mutation.error.message)}</Alert> : null}
          </DialogContent>
        </DialogRoot>
        {mutation.error ? <Alert tone="error">{apiMessage(mutation.error, mutation.error.message)}</Alert> : null}
        {mutation.isSuccess && mutation.data ? <Alert tone="success">Action applied.</Alert> : null}
      </CardBody>
    </Card>
  );
}

const quickActionPermissions = { reviews: 'reviews.moderate', deliveries: 'notifications.manage', contacts: 'customers.manage' };

// Row-level moderation/retry actions as ActionMenu items; the mutation lives in ResourceList.
function quickActionItems(resource, row, can, mutation) {
  if (!can(quickActionPermissions[resource])) return [];
  const run = (kind) => () => mutation.mutate({ row, kind });
  const disabled = mutation.isPending;
  if (resource === 'reviews') {
    return row.status === 'approved'
      ? [{ label: 'Reject', icon: XCircle, destructive: true, disabled, onSelect: run('review'), confirm: { title: 'Reject this review?', description: 'It will no longer appear on the storefront.', confirmLabel: 'Reject' } }]
      : [{ label: 'Approve', icon: CheckCircle2, disabled, onSelect: run('review') }];
  }
  if (resource === 'deliveries') {
    return ['retry', 'dead'].includes(row.status)
      ? [{ label: 'Retry delivery', icon: RefreshCw, disabled, onSelect: run('retry'), confirm: { title: 'Retry this delivery?', description: 'The notification will be sent again to the recipient.', confirmLabel: 'Retry' } }]
      : [];
  }
  if (resource === 'contacts') {
    return [row.status === 'resolved'
      ? { label: 'Reopen', icon: RotateCcw, disabled, onSelect: run('contact') }
      : { label: 'Mark resolved', icon: CheckCircle2, disabled, onSelect: run('contact') }];
  }
  return [];
}

function InventoryAdjustment({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ variantId: '', locationId: '', mode: 'increase', quantity: '1', reason: 'manual_adjustment', note: '', version: '1' });
  const mutation = useMutation({
    mutationFn: () => browserApi.post(
      '/admin/inventory/adjustments',
      { ...form, quantity: Number(form.quantity), version: Number(form.version) },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } }
    ),
    onSuccess: () => { setOpen(false); onSaved(); }
  });
  return (
    <Card>
      <CardBody className="grid gap-3">
        <Button variant="outline" onClick={() => setOpen((value) => !value)}>{open ? 'Close adjustment' : 'Adjust inventory'}</Button>
        {open ? (
          <>
            <FieldGroup columns={4}>
              {['variantId', 'locationId', 'reason', 'note'].map((key) => (
                <Field label={labelFor(key)} key={key}>
                  <Input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                </Field>
              ))}
              <Field label="Mode">
                <NativeSelect value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })} options={[{ value: 'increase', label: 'Increase' }, { value: 'decrease', label: 'Decrease' }, { value: 'counted', label: 'Counted value' }]} />
              </Field>
              <Field label="Quantity">
                <Input type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
              </Field>
              <Field label="Current version">
                <Input type="number" min="1" value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
              </Field>
            </FieldGroup>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Record adjustment</Button>
            {mutation.error ? <Alert tone="error">{apiMessage(mutation.error)}</Alert> : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}

function MediaUpload({ onSaved }) {
  const [file, setFile] = useState(null);
  const [altText, setAltText] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [inputKey, setInputKey] = useState(0);
  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('file', file);
      data.append('altText', altText);
      data.append('privacy', privacy);
      return browserApi.post('/admin/media/upload', data);
    },
    onSuccess: () => { setFile(null); setAltText(''); setInputKey((key) => key + 1); onSaved(); }
  });
  return (
    <Card>
      <CardBody>
          <FieldGroup columns={4}>
            <Field label="File">
              <Input key={inputKey} type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </Field>
            <Field label="Alt text">
              <Input value={altText} onChange={(event) => setAltText(event.target.value)} />
            </Field>
            <Field label="Privacy">
              <NativeSelect value={privacy} onChange={(event) => setPrivacy(event.target.value)} options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]} />
            </Field>
            <div className="self-end">
              <Button disabled={!file} loading={mutation.isPending} onClick={() => mutation.mutate()}>Upload</Button>
            </div>
          </FieldGroup>
          {mutation.error ? <div className="mt-3"><Alert tone="error">{apiMessage(mutation.error, 'The file could not be uploaded.')}</Alert></div> : null}
        </CardBody>
    </Card>
  );
}

function ExportRequest({ onSaved }) {
  const [report, setReport] = useState('orders');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const mutation = useMutation({ mutationFn: () => browserApi.post('/admin/exports', { report, filters: dateRange }), onSuccess: onSaved });
  const options = ['orders', 'sales', 'products', 'inventory', 'customers', 'coupons', 'payments', 'returns', 'profit', 'audits'].map((value) => ({ value, label: value }));
  return (
    <Card>
      <CardBody className="flex flex-wrap items-end gap-3">
        <Field label="New export" className="min-w-44">
          <NativeSelect value={report} onChange={(event) => setReport(event.target.value)} options={options} />
        </Field>
        <Field label="Date range" className="min-w-60"><DateRangePicker value={dateRange} onChange={setDateRange} /></Field>
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Queue CSV export</Button>
        {mutation.error ? <Alert tone="error">{apiMessage(mutation.error, 'The export could not be queued.')}</Alert> : null}
      </CardBody>
    </Card>
  );
}

function IntegrationActions({ rows = [], onSaved }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ environment: 'sandbox', username: '', password: '', appKey: '', appSecret: '' });
  const mutation = useMutation({ mutationFn: (action) => browserApi.post(`/admin/integrations/bkash/${action}`), onSuccess: onSaved });
  const configure = useMutation({
    // Replacing existing credentials is version-checked by the backend; send the current version (null for a first setup).
    mutationFn: () => browserApi.put('/admin/integrations/bkash', { ...form, version: rows.find((row) => row.provider === 'bkash' && row.environment === form.environment)?.version ?? null }),
    onSuccess: () => { setShow(false); setForm({ ...form, username: '', password: '', appKey: '', appSecret: '' }); onSaved(); }
  });
  return (
    <Card>
      <CardBody className="grid gap-3">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setShow((value) => !value)}>{show ? 'Close credentials' : 'Replace bKash credentials'}</Button>
          <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate('test')}>Test bKash</Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate('enable')}>Enable bKash</Button>
          <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate('disable')}>Disable bKash</Button>
        </div>
        {show ? (
          <>
            <FieldGroup columns={3}>
              <Field label="Environment">
                <NativeSelect value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })} options={[{ value: 'sandbox', label: 'Sandbox' }, { value: 'live', label: 'Live' }]} />
              </Field>
              {['username', 'password', 'appKey', 'appSecret'].map((key) => (
                <Field label={labelFor(key)} key={key}>
                  <Input
                    type={key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') ? 'password' : 'text'}
                    autoComplete="off"
                    value={form[key]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  />
                </Field>
              ))}
            </FieldGroup>
            <Button loading={configure.isPending} disabled={Object.values(form).some((value) => !value)} onClick={() => configure.mutate()}>Encrypt and save</Button>
          </>
        ) : null}
        {(mutation.error || configure.error) ? <Alert tone="error">{apiMessage(mutation.error || configure.error)}</Alert> : null}
      </CardBody>
    </Card>
  );
}
