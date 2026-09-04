'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Archive, ArrowLeft, Plus, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, DataTable, Field, FieldGroup, FormattedDate, FormattedMoney, Input, MultiSelect, NativeSelect, Pagination, Skeleton, Switch, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';

const definitions = {
  categories: { title: 'Categories', eyebrow: 'Catalog', endpoint: '/admin/categories', columns: ['translations.en.name', 'slug', 'active', 'displayOrder'], detail: true, taxonomy: true },
  collections: { title: 'Collections', eyebrow: 'Catalog', endpoint: '/admin/collections', columns: ['translations.en.name', 'slug', 'active', 'displayOrder'], detail: true, taxonomy: true },
  brands: { title: 'Brands', eyebrow: 'Catalog', endpoint: '/admin/brands', columns: ['translations.en.name', 'slug', 'active', 'displayOrder'], detail: true, taxonomy: true },
  attributes: { title: 'Attributes', eyebrow: 'Catalog', endpoint: '/admin/attributes', columns: ['translations.en.label', 'key', 'type', 'values.length'] },
  inventory: { title: 'Inventory', eyebrow: 'Catalog operations', endpoint: '/admin/inventory/levels', columns: ['variant.sku', 'productName', 'variant.title', 'onHand', 'reserved', 'available', 'lowStockThreshold'], filters: ['lowStock'], adjustment: true },
  orders: { title: 'Orders', eyebrow: 'Commerce', endpoint: '/admin/orders', columns: ['reference', 'customerName', 'orderStatus', 'paymentStatus', 'fulfillmentStatus', 'grandTotal', 'createdAt'], detail: true },
  payments: { title: 'Payments', eyebrow: 'Commerce', endpoint: '/admin/payments', columns: ['order.reference', 'provider', 'method', 'status', 'amount', 'transactionId', 'createdAt'], detail: true },
  refunds: { title: 'Refunds', eyebrow: 'Commerce', endpoint: '/admin/refunds', columns: ['order.reference', 'method', 'status', 'amount', 'reason', 'createdAt'], detail: true },
  returns: { title: 'Returns & exchanges', eyebrow: 'Commerce', endpoint: '/admin/returns', columns: ['reference', 'order.reference', 'customer.name', 'status', 'resolution', 'requestedAmount', 'createdAt'], detail: true },
  customers: { title: 'Customers', eyebrow: 'Customer care', endpoint: '/admin/customers', columns: ['name', 'phone', 'email', 'status', 'riskLevel', 'stats.orderCount', 'stats.grossPaid'], detail: true },
  coupons: { title: 'Coupons', eyebrow: 'Marketing', endpoint: '/admin/coupons', columns: ['code', 'name', 'type', 'value', 'active', 'usageCount', 'endsAt'], detail: true },
  reviews: { title: 'Review moderation', eyebrow: 'Customer care', endpoint: '/admin/reviews', columns: ['product.slug', 'user.name', 'rating', 'title', 'status', 'verifiedPurchase', 'createdAt'] },
  shipments: { title: 'Shipments', eyebrow: 'Fulfillment', endpoint: '/admin/shipments', columns: ['order.reference', 'courierName', 'status', 'consignmentId', 'fee', 'updatedAt'] },
  media: { title: 'Media library', eyebrow: 'Content', endpoint: '/admin/media', columns: ['originalName', 'kind', 'privacy', 'status', 'byteSize', 'createdAt'], media: true },
  staff: { title: 'Staff', eyebrow: 'Access control', endpoint: '/admin/staff', columns: ['name', 'email', 'phone', 'status', 'roles', 'lastLoginAt'], detail: true },
  roles: { title: 'Roles & permissions', eyebrow: 'Access control', endpoint: '/admin/roles', columns: ['name', 'key', 'active', 'protected', 'users.length', 'permissions.length'] },
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

const statusFilters = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Published' }
];

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

function AdminHeading({ eyebrow, title, description }) {
  return (
    <div className="mt-2">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
      {description ? <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">{description}</p> : null}
    </div>
  );
}

function ResourceList({ resource, definition }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const params = useMemo(() => ({ page, pageSize: 25, ...(search ? { search } : {}), ...(status ? { status } : {}) }), [page, search, status]);
  const query = useQuery({
    queryKey: ['admin-resource', resource, params],
    queryFn: () => browserApi.get(definition.endpoint, { params }).then((response) => response.data)
  });
  const raw = query.data?.data;
  const rows = Array.isArray(raw) ? raw : definition.report && raw ? Object.entries(raw).map(([key, value]) => ({ key, value })) : [];
  const columns = definition.report ? ['key', 'value'] : definition.columns;

  const columnsDef = columns.map((column) => ({
    header: labelFor(column),
    accessorFn: (row) => valueAt(row, column),
    cell: ({ row }) => <span className="capitalize">{renderCell(valueAt(row.original, column), column)}</span>
  }));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AdminHeading eyebrow={definition.eyebrow} title={definition.title} description={`View and manage ${definition.title.toLowerCase()} from one workspace.`} />
        <div className="flex flex-wrap gap-2">
          {definition.taxonomy ? (
            <Button onClick={() => setCreating((value) => !value)}>
              <Plus size={17} />
              {creating ? 'Close form' : `Add ${resource.slice(0, -1)}`}
            </Button>
          ) : ['pages', 'posts'].includes(resource) ? (
            <Button asChild>
              <Link href={`/admin/content/${resource}/new`}><Plus size={17} />Create {resource === 'pages' ? 'page' : 'post'}</Link>
            </Button>
          ) : resource === 'orders' ? (
            <Button asChild>
              <Link href="/admin/orders/new"><Plus size={17} />Create manual order</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {creating && definition.taxonomy ? <TaxonomyEditor resource={resource} endpoint={definition.endpoint} onSaved={() => { setCreating(false); query.refetch(); }} /> : null}

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Search" className="min-w-56 flex-1">
            <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search ${definition.title.toLowerCase()}…`} />
          </Field>
          <Field label="Status" className="min-w-44">
            <NativeSelect value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} options={statusFilters} />
          </Field>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </CardBody>
      </Card>

      {definition.adjustment ? <InventoryAdjustment onSaved={() => query.refetch()} /> : null}
      {definition.media ? <MediaUpload onSaved={() => query.refetch()} /> : null}
      {definition.export ? <ExportRequest onSaved={() => query.refetch()} /> : null}
      {resource === 'integrations' ? <IntegrationActions onSaved={() => query.refetch()} /> : null}

      {query.error ? <Alert tone="error">{apiMessage(query.error, `${definition.title} could not be loaded.`)}</Alert> : null}

      <Card>
        <CardHeader title={`All ${definition.title.toLowerCase()}`} description={`${query.data?.meta?.total ?? rows.length} records`} />
        <CardBody className="p-0">
          <DataTable
            columns={[
              ...columnsDef,
              {
                header: 'Actions',
                id: 'actions',
                cell: ({ row }) => (
                  <div className="flex justify-end">
                    {definition.detail && row.original.id ? (
                      <Link className="inline-flex rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white" href={['pages', 'posts'].includes(resource) ? `/admin/content/${resource}/${row.original.id}` : `/admin/${resource}/${row.original.id}`}>
                        Manage
                      </Link>
                    ) : (
                      <QuickAction resource={resource} row={row.original} onSaved={() => query.refetch()} />
                    )}
                  </div>
                )
              }
            ]}
            data={rows}
            loading={query.isLoading}
            emptyTitle="No matching records"
            emptyDescription="Try changing your search or status filter."
          />
        </CardBody>
      </Card>

      {query.data?.meta?.pageCount > 1 ? (
        <Pagination page={page} totalPages={query.data.meta.pageCount} onChange={setPage} className="justify-end" />
      ) : null}
    </div>
  );
}

function renderCell(value, path) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'object' ? item.name || item.key || item.slug || item.id : item)).join(', ') || '—';
  if (typeof value === 'object') return value.name || value.label || value.reference || JSON.stringify(value);
  if (/amount|price|total|revenue|grossPaid|fee|value/i.test(path) && /^\d+(\.\d+)?$/.test(String(value))) return <FormattedMoney value={String(value)} />;
  if (/At$/.test(path) && !Number.isNaN(Date.parse(String(value)))) return <FormattedDate value={value} withTime />;
  return String(value).replaceAll('_', ' ');
}

function ResourceDetail({ resource, definition, id }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-resource-detail', resource, id],
    queryFn: () => browserApi.get(`${definition.endpoint}/${id}`).then((response) => response.data.data)
  });
  const row = query.data;
  return (
    <div className="grid gap-5">
      <Link href={`/admin/${resource}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">
        <ArrowLeft size={16} />
        Back to {definition.title.toLowerCase()}
      </Link>
      <AdminHeading eyebrow={definition.eyebrow} title={row?.reference || row?.code || row?.translations?.en?.name || row?.name || row?.slug || definition.title} description="Review details and make authorized changes below." />
      {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
      {query.isLoading ? <Card><CardBody>Loading record…</CardBody></Card> : null}
      {row ? (
        <>
          {definition.taxonomy ? <TaxonomyEditor resource={resource} endpoint={definition.endpoint} row={row} onSaved={(saved) => { client.setQueryData(['admin-resource-detail', resource, id], saved); query.refetch(); }} /> : null}
          <DetailCards value={row} compact={definition.taxonomy} />
          <DetailActions resource={resource} row={row} onSaved={(saved) => { client.setQueryData(['admin-resource-detail', resource, id], saved); query.refetch(); }} />
        </>
      ) : null}
    </div>
  );
}

function DetailCards({ value, compact = false }) {
  if (compact) return null;
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {Object.entries(value).filter(([, item]) => item != null).map(([key, item]) => (
        <section key={key} className="card min-w-0 p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-muted)]">{labelFor(key)}</h2>
          {typeof item === 'object' ? (
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--color-surface-muted)] p-4 text-xs">{JSON.stringify(item, null, 2)}</pre>
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
    startsAt: row?.startsAt ? String(row.startsAt).slice(0, 16) : '',
    endsAt: row?.endsAt ? String(row.endsAt).slice(0, 16) : ''
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
                <Input type="datetime-local" value={form.startsAt} onChange={(event) => update('startsAt', event.target.value)} />
              </Field>
              <Field label="Ends at">
                <Input type="datetime-local" value={form.endsAt} onChange={(event) => update('endsAt', event.target.value)} />
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
              <Button variant="danger" loading={lifecycle.isPending} onClick={() => window.confirm('Archive this record? It can be restored later.') && lifecycle.mutate('archive')}>
                <Archive size={16} />
                Archive
              </Button>
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

function DetailActions({ resource, row, onSaved }) {
  const [reason, setReason] = useState('Administrative update');
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState('');
  const mutation = useMutation({
    mutationFn: async (action) => {
      if (resource === 'orders') return browserApi.post(`/admin/orders/${row.id}/transitions`, { dimension: choice === 'fulfillment' ? 'fulfillment' : 'order', status: value, reason, public: true, version: Number(row.version) });
      if (resource === 'customers') return browserApi.patch(`/admin/customers/${row.id}`, { status: choice || row.status, riskLevel: value || row.riskLevel, reason, version: Number(row.version) });
      if (resource === 'coupons') return browserApi.post(`/admin/coupons/${row.id}/activation`, { active: value === 'active', version: Number(row.version) });
      if (resource === 'returns') return browserApi.post(`/admin/returns/${row.id}/${action}`, action === 'reject' ? { version: Number(row.version), reason, public: true } : { version: Number(row.version), message: reason, public: true });
      if (resource === 'refunds') return browserApi.post(`/admin/refunds/${row.id}/${action}`, action === 'complete' ? { reference: value || `MANUAL-${row.id}`, note: reason } : action === 'cancel' ? { reason } : {});
      if (resource === 'privacy') return browserApi.post(`/admin/privacy-requests/${row.id}/transitions`, { status: value, version: Number(row.version), reason, confirmation: value === 'completed' && row.type === 'deletion' ? 'DELETE CUSTOMER DATA' : undefined });
      throw new Error('Unsupported action');
    },
    onSuccess: (response) => onSaved(response.data.data)
  });
  if (!['orders', 'customers', 'coupons', 'returns', 'refunds', 'privacy'].includes(resource)) return null;
  const returnActions = { requested: ['review'], under_review: ['approve', 'reject'], approved: ['in-transit'], in_transit: ['receive'], received: ['complete'] }[row.status] || [];

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
          <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} options={[{ value: 'active', label: 'Activate' }, { value: 'inactive', label: 'Deactivate' }]} />
        ) : null}
        {resource === 'privacy' ? (
          <NativeSelect value={value} onChange={(event) => setValue(event.target.value)} options={[{ value: '', label: 'Choose transition' }, { value: 'under_review', label: 'Under review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'completed', label: 'Completed' }]} />
        ) : null}
        <Field label="Reason or customer message" className="md:col-span-2">
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required reason" />
        </Field>
        {resource === 'returns' ? returnActions.map((action) => (
          <Button key={action} type="button" loading={mutation.isPending} onClick={() => mutation.mutate(action)}>{labelFor(action)}</Button>
        )) : resource === 'refunds' ? ['reconcile', 'complete', 'cancel'].map((action) => (
          <Button key={action} type="button" loading={mutation.isPending} onClick={() => mutation.mutate(action)}>{labelFor(action)}</Button>
        )) : (
          <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate('apply')}>Apply transition</Button>
        )}
        {mutation.error ? <Alert tone="error">{apiMessage(mutation.error)}</Alert> : null}
        {mutation.isSuccess ? <Alert tone="success">Action applied.</Alert> : null}
      </CardBody>
    </Card>
  );
}

function QuickAction({ resource, row, onSaved }) {
  const mutation = useMutation({
    mutationFn: () => {
      if (resource === 'reviews') return browserApi.post(`/admin/reviews/${row.id}/moderate`, { status: row.status === 'approved' ? 'rejected' : 'approved', reason: 'Reviewed by administrator', version: Number(row.version) });
      if (resource === 'deliveries') return browserApi.post(`/admin/notifications/outbox/${row.id}/retry`);
      if (resource === 'contacts') return browserApi.patch(`/admin/contact-messages/${row.id}`, { status: row.status === 'resolved' ? 'in_progress' : 'resolved' });
      return Promise.reject(new Error('Unsupported action'));
    },
    onSuccess: onSaved
  });
  const labels = { reviews: row.status === 'approved' ? 'Reject' : 'Approve', deliveries: ['retry', 'dead'].includes(row.status) ? 'Retry' : null, contacts: row.status === 'resolved' ? 'Reopen' : 'Resolve' };
  if (!labels[resource]) return null;
  return (
    <button className="font-semibold text-[var(--color-primary)] underline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {labels[resource]}
    </button>
  );
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
  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('file', file);
      data.append('altText', altText);
      data.append('privacy', privacy);
      return browserApi.post('/admin/media/upload', data);
    },
    onSuccess: () => { setFile(null); setAltText(''); onSaved(); }
  });
  return (
    <Card>
      <CardBody>
          <FieldGroup columns={4}>
            <Field label="File">
              <Input type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
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
        </CardBody>
    </Card>
  );
}

function ExportRequest({ onSaved }) {
  const [report, setReport] = useState('orders');
  const mutation = useMutation({ mutationFn: () => browserApi.post('/admin/exports', { report, filters: {} }), onSuccess: onSaved });
  const options = ['orders', 'sales', 'products', 'inventory', 'customers', 'coupons', 'payments', 'returns', 'profit', 'audits'].map((value) => ({ value, label: value }));
  return (
    <Card>
      <CardBody className="flex flex-wrap items-end gap-3">
        <Field label="New export" className="min-w-44">
          <NativeSelect value={report} onChange={(event) => setReport(event.target.value)} options={options} />
        </Field>
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Queue CSV export</Button>
      </CardBody>
    </Card>
  );
}

function IntegrationActions({ onSaved }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ environment: 'sandbox', username: '', password: '', appKey: '', appSecret: '' });
  const mutation = useMutation({ mutationFn: (action) => browserApi.post(`/admin/integrations/bkash/${action}`), onSuccess: onSaved });
  const configure = useMutation({
    mutationFn: () => browserApi.put('/admin/integrations/bkash', form),
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