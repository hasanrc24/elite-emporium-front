'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeftRight, AlertTriangle, Boxes, Eye, Package, PackageSearch, Search, RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useSearchInput, useTableParams } from '@/lib/hooks/use-table-params';
import {
  actionsColumn, Alert, Badge, Button, Card, CardBody, DataTable, Field, FieldGroup, FormattedDate,
  Input, NativeSelect, pushToast, TableFooter, TabsContent, TabsList, TabsRoot, Textarea,
} from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { AdminPageHeader } from './admin-page-header';
import { cn } from '@/lib/utils';

const DEFAULTS = { tab: 'levels', page: 1, pageSize: 25, search: '', locationId: '', lowStock: '', reason: '' };

const ADJUSTMENT_REASONS = [
  { value: 'purchase_receipt', label: 'Purchase Receipt' },
  { value: 'manual_correction', label: 'Manual Correction' },
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'return_restock', label: 'Return Restock' },
  { value: 'stock_count', label: 'Stock Count' },
  { value: 'initial_stock', label: 'Initial Stock' },
  { value: 'other', label: 'Other' },
];

const num = 'tabular-nums';

export function InventoryManager() {
  // useTableParams reads the URL, which needs a Suspense boundary during prerender.
  return <Suspense><InventoryPage /></Suspense>;
}

function InventoryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const canAdjust = useAuthStore((state) => Boolean(state.user?.permissions?.includes('inventory.adjust')));
  const [params, setParams] = useTableParams(DEFAULTS);
  const activeTab = ['levels', 'low-stock', 'movements'].includes(params.tab) ? params.tab : 'levels';
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    variantId: '', locationId: '', mode: 'increase', quantity: '', reason: '', note: '', version: '',
  });
  const [adjustErrors, setAdjustErrors] = useState({});

  // The input stays responsive while the URL (and so the query) follows after a pause.
  const commitSearch = useCallback((value) => setParams({ search: value }), [setParams]);
  const [searchInput, setSearchInput] = useSearchInput(params.search, commitSearch);

  const levelsParams = useMemo(() => {
    const p = { page: params.page, pageSize: params.pageSize };
    if (params.search) p.search = params.search;
    if (params.lowStock === 'true') p.lowStock = 'true';
    if (params.locationId) p.locationId = params.locationId;
    return p;
  }, [params.page, params.pageSize, params.search, params.lowStock, params.locationId]);

  const lowStockParams = useMemo(() => {
    const { lowStock: _ignored, ...rest } = levelsParams;
    return rest;
  }, [levelsParams]);

  // The ledger endpoint filters by location and reason only (no free-text search).
  const movementsParams = useMemo(() => {
    const p = { page: params.page, pageSize: params.pageSize };
    if (params.locationId) p.locationId = params.locationId;
    if (params.reason) p.reason = params.reason;
    return p;
  }, [params.page, params.pageSize, params.locationId, params.reason]);

  const levelsQuery = useQuery({
    queryKey: ['admin-inventory-levels', levelsParams],
    queryFn: () => browserApi.get('/admin/inventory/levels', { params: levelsParams }).then((r) => r.data),
    enabled: activeTab === 'levels',
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  const lowStockQuery = useQuery({
    queryKey: ['admin-inventory-low-stock', lowStockParams],
    queryFn: () => browserApi.get('/admin/inventory/low-stock', { params: lowStockParams }).then((r) => r.data),
    enabled: activeTab === 'low-stock',
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  const movementsQuery = useQuery({
    queryKey: ['admin-inventory-movements', movementsParams],
    queryFn: () => browserApi.get('/admin/inventory/movements', { params: movementsParams }).then((r) => r.data),
    enabled: activeTab === 'movements',
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  const locationsQuery = useQuery({
    queryKey: ['admin-inventory-locations'],
    queryFn: () => browserApi.get('/admin/inventory/locations').then((r) => r.data.data),
    staleTime: 60000,
  });

  const rows = useMemo(() => {
    const source = activeTab === 'low-stock' ? lowStockQuery.data?.data : levelsQuery.data?.data;
    return Array.isArray(source) ? source : [];
  }, [activeTab, lowStockQuery.data, levelsQuery.data]);

  const kpis = useMemo(() => {
    const data = rows;
    const totalSku = new Set(data.map((r) => r.sku).filter(Boolean)).size;
    const lowStock = data.filter((r) => r.lowStock).length;
    const outOfStock = data.filter((r) => (Number(r.onHand) - Number(r.reserved)) <= 0).length;
    const totalOnHand = data.reduce((sum, r) => sum + Number(r.onHand), 0);
    return { totalSku, lowStock, outOfStock, totalOnHand };
  }, [rows]);

  const adjustmentMutation = useMutation({
    mutationFn: async ({ payload, idempotencyKey }) => {
      const response = await browserApi.post(
        '/admin/inventory/adjustments',
        payload,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      return response.data;
    },
    onSuccess: () => {
      setAdjustmentOpen(false);
      setAdjustForm({ variantId: '', locationId: '', mode: 'increase', quantity: '', reason: '', note: '', version: '' });
      setAdjustErrors({});
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-locations'] });
      pushToast({ tone: 'success', title: 'Adjustment recorded successfully.' });
    },
    onError: async (error, { payload }) => {
      const code = error?.response?.data?.error?.code;
      if (code === 'VERSION_CONFLICT') {
        // The error envelope carries no record; reload the levels and show the latest balance for review.
        setConflictData(null);
        setConflictOpen(true);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-levels'] }),
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] }),
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] }),
        ]);
        const latest = [
          ...queryClient.getQueriesData({ queryKey: ['admin-inventory-levels'] }),
          ...queryClient.getQueriesData({ queryKey: ['admin-inventory-low-stock'] }),
        ].flatMap(([, data]) => (Array.isArray(data?.data) ? data.data : []))
          .find((row) => row.variantId === payload.variantId && row.location?.id === payload.locationId);
        setConflictData(latest || null);
      } else {
        pushToast({ tone: 'error', title: apiMessage(error, 'Failed to record adjustment.') });
      }
    },
  });

  const handleAdjustmentSubmit = () => {
    const errors = {};
    if (!adjustForm.variantId) errors.variantId = 'Variant is required.';
    if (!adjustForm.locationId) errors.locationId = 'Location is required.';
    if (!adjustForm.reason) errors.reason = 'Reason is required.';
    if (!adjustForm.version) errors.version = 'Current version is required.';
    if (adjustForm.quantity === '') errors.quantity = 'Quantity is required.';
    else if (!/^\d+$/.test(String(adjustForm.quantity).trim())) errors.quantity = 'Enter a whole number of zero or more.';
    if (Object.keys(errors).length > 0) { setAdjustErrors(errors); return; }

    const payload = {
      variantId: adjustForm.variantId,
      locationId: adjustForm.locationId,
      reason: adjustForm.reason,
      version: Number(adjustForm.version),
    };
    if (adjustForm.note.trim()) payload.note = adjustForm.note.trim();
    if (adjustForm.mode === 'counted') {
      payload.countedQuantity = Number(adjustForm.quantity);
    } else {
      payload.delta = adjustForm.mode === 'increase' ? Number(adjustForm.quantity) : -Number(adjustForm.quantity);
    }

    if (adjustmentMutation.isPending) return;
    // One key per submit attempt; client-side auth retries reuse the same request config and key.
    adjustmentMutation.mutate({ payload, idempotencyKey: crypto.randomUUID() });
  };

  const openAdjust = (level) => {
    setAdjustForm({ variantId: level.variantId || '', locationId: level.location?.id || '', mode: 'increase', quantity: '', reason: '', note: '', version: String(level.version || 1) });
    setAdjustErrors({});
    setAdjustmentOpen(true);
  };

  const hasFilters = Boolean(params.search || params.locationId || params.reason || (activeTab === 'levels' && params.lowStock === 'true'));
  const clearFilters = () => { setSearchInput(''); setParams({ search: '', locationId: '', lowStock: '', reason: '' }); };
  const clearAction = hasFilters ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button> : null;
  const locationOptions = [
    { value: '', label: 'All locations' },
    ...(locationsQuery.data || []).map((loc) => ({ value: loc.id, label: `${loc.code} — ${loc.name}` })),
  ];
  const refetchActive = () => (activeTab === 'low-stock' ? lowStockQuery : activeTab === 'movements' ? movementsQuery : levelsQuery).refetch();

  const levelActions = (level) => [
    { label: 'Adjust stock', icon: ArrowLeftRight, onSelect: () => openAdjust(level), hidden: !canAdjust },
    { label: 'View product', icon: Eye, href: `/admin/products/${level.product?.id}`, hidden: !level.product?.id },
  ];
  const levelRowProps = {
    rowKey: (row) => row.id,
    minWidth: 980,
    onRowClick: (row) => { if (row.product?.id) router.push(`/admin/products/${row.product.id}`); },
    rowLabel: (row) => `Open product ${row.product?.name || row.sku || ''}`,
  };
  const skuColumn = {
    header: 'SKU / Product',
    id: 'product',
    cell: ({ row }) => (
      <div className="min-w-[200px]">
        <p className="font-semibold text-[var(--color-text)]">{row.original.sku || '—'}</p>
        <p className="max-w-64 truncate text-xs text-[var(--color-muted)]" title={row.original.product?.name || row.original.variantTitle || ''}>{row.original.product?.name || row.original.variantTitle || ''}</p>
        {row.original.variantTitle ? <p className="max-w-64 truncate text-xs text-[var(--color-muted)]" title={row.original.variantTitle}>Variant: {row.original.variantTitle}</p> : null}
      </div>
    ),
  };

  const levelsColumns = [
    skuColumn,
    {
      header: 'Location',
      id: 'location',
      cell: ({ row }) => (
        row.original.location ? <span className="grid min-w-32 max-w-48 text-sm"><span className="truncate font-medium" title={row.original.location.name}>{row.original.location.name}</span><span className="truncate text-xs text-[var(--color-muted)]">{row.original.location.code}</span></span> : '—'
      ),
    },
    { header: 'On Hand', id: 'onHand', meta: { align: 'right' }, cell: ({ row }) => <span className={cn('font-semibold', num)}>{Number(row.original.onHand).toLocaleString()}</span> },
    { header: 'Reserved', id: 'reserved', meta: { align: 'right' }, cell: ({ row }) => <span className={cn('text-[var(--color-muted)]', num)}>{Number(row.original.reserved).toLocaleString()}</span> },
    {
      header: 'Available',
      id: 'available',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const avail = Number(row.original.available);
        return <span className={cn(num, avail <= 0 && 'text-[var(--color-danger)] font-semibold')}>{avail.toLocaleString()}</span>;
      },
    },
    { header: 'Low Threshold', id: 'lowStockThreshold', meta: { align: 'right' }, cell: ({ row }) => <span className={num}>{Number(row.original.lowStockThreshold).toLocaleString()}</span> },
    {
      header: 'Status',
      id: 'status',
      cell: ({ row }) => {
        const avail = Number(row.original.available);
        if (avail <= 0) return <Badge tone="danger">Out of stock</Badge>;
        if (row.original.lowStock) return <Badge tone="warning">Low stock</Badge>;
        return <Badge tone="success">In stock</Badge>;
      },
    },
    { header: 'Updated', id: 'updatedAt', cell: ({ row }) => <span className="whitespace-nowrap text-[var(--color-muted)]"><FormattedDate value={row.original.updatedAt} withTime /></span> },
    actionsColumn(levelActions, { label: (row) => `Actions for ${row.sku || 'stock level'}` }),
  ];

  const lowStockColumns = [
    skuColumn,
    {
      header: 'Location',
      id: 'location',
      cell: ({ row }) => row.original.location ? <span className="grid min-w-32 max-w-48 text-sm"><span className="truncate font-medium" title={row.original.location.name}>{row.original.location.name}</span><span className="truncate text-xs text-[var(--color-muted)]">{row.original.location.code}</span></span> : '—',
    },
    { header: 'On Hand', id: 'onHand', meta: { align: 'right' }, cell: ({ row }) => <span className={cn('font-semibold text-[var(--color-danger)]', num)}>{Number(row.original.onHand).toLocaleString()}</span> },
    { header: 'Reserved', id: 'reserved', meta: { align: 'right' }, cell: ({ row }) => <span className={num}>{Number(row.original.reserved).toLocaleString()}</span> },
    { header: 'Available', id: 'available', meta: { align: 'right' }, cell: ({ row }) => <span className={cn('text-[var(--color-danger)] font-semibold', num)}>{Number(row.original.available).toLocaleString()}</span> },
    { header: 'Low Threshold', id: 'lowStockThreshold', meta: { align: 'right' }, cell: ({ row }) => <span className={num}>{Number(row.original.lowStockThreshold).toLocaleString()}</span> },
    { header: 'Status', id: 'status', cell: () => <Badge tone="warning">Low stock</Badge> },
    { header: 'Updated', id: 'updatedAt', cell: ({ row }) => <span className="whitespace-nowrap text-[var(--color-muted)]"><FormattedDate value={row.original.updatedAt} withTime /></span> },
    actionsColumn(levelActions, { label: (row) => `Actions for ${row.sku || 'stock level'}` }),
  ];

  const movementColumns = [
    {
      header: 'Variant',
      id: 'variant',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-[var(--color-text)]">{row.original.variant?.sku || '—'}</p>
          <p className="max-w-56 truncate text-xs text-[var(--color-muted)]" title={row.original.variant?.title || ''}>{row.original.variant?.title || ''}</p>
        </div>
      ),
    },
    { header: 'Location', id: 'location', cell: ({ row }) => <span className="text-sm">{row.original.location ? row.original.location.code : '—'}</span> },
    {
      header: 'Qty Δ',
      id: 'quantityDelta',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const delta = Number(row.original.quantityDelta);
        return (
          <span className={cn('font-semibold', num, delta >= 0 && 'text-[var(--color-success)]', delta < 0 && 'text-[var(--color-danger)]')}>
            {delta >= 0 ? '+' : ''}{delta.toLocaleString()}
          </span>
        );
      },
    },
    { header: 'Before', id: 'onHandBefore', meta: { align: 'right' }, cell: ({ row }) => <span className={cn('text-[var(--color-muted)]', num)}>{Number(row.original.onHandBefore).toLocaleString()}</span> },
    { header: 'After', id: 'onHandAfter', meta: { align: 'right' }, cell: ({ row }) => <span className={cn('font-semibold', num)}>{Number(row.original.onHandAfter).toLocaleString()}</span> },
    { header: 'Reason', id: 'reason', cell: ({ row }) => <span className="capitalize">{row.original.reason?.replace(/_/g, ' ') || '—'}</span> },
    { header: 'Actor', id: 'actor', cell: ({ row }) => <span>{row.original.actor?.name || 'System'}</span> },
    {
      header: 'Order/Ref',
      id: 'correlation',
      cell: ({ row }) => {
        const text = row.original.orderId ? `Order: ${row.original.orderId}` : row.original.correlationId ? `Ref: ${row.original.correlationId.slice(0, 8)}…` : '—';
        return <span className="block max-w-40 truncate text-xs text-[var(--color-muted)]" title={row.original.orderId || row.original.correlationId || undefined}>{text}</span>;
      },
    },
    { header: 'Date', id: 'createdAt', cell: ({ row }) => <span className="whitespace-nowrap text-[var(--color-muted)]"><FormattedDate value={row.original.createdAt} withTime /></span> },
  ];

  const searchField = (placeholder) => (
    <Field label="Search" className="min-w-56 flex-1 sm:max-w-sm">
      <Input aria-label="Search" className="!min-h-10 !pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={placeholder} />
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
    </Field>
  );
  const locationField = (
    <Field label="Location" className="min-w-40">
      <NativeSelect value={params.locationId} onChange={(e) => setParams({ locationId: e.target.value })} options={locationOptions} />
    </Field>
  );
  const refreshButton = <Button size="sm" variant="secondary" onClick={refetchActive}><RefreshCw size={15} />Refresh</Button>;
  const footer = (query) => (
    <TableFooter
      page={params.page}
      pageSize={params.pageSize}
      total={query.data?.meta?.total || 0}
      pageCount={query.data?.meta?.pageCount}
      onPageChange={(page) => setParams({ page })}
      onPageSizeChange={(pageSize) => setParams({ pageSize })}
    />
  );
  const tableState = (query, message) => ({
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error ? apiMessage(query.error, message) : null,
    onRetry: query.refetch,
  });

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title="Inventory"
        description="Monitor stock levels, review movements, and make authorized adjustments."
        actions={canAdjust ? (
          <Button onClick={() => { setAdjustErrors({}); setAdjustmentOpen(true); }}>
            <ArrowLeftRight size={17} />
            Adjust Inventory
          </Button>
        ) : null}
      />

      {activeTab !== 'movements' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody className="grid gap-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <Package className="h-4 w-4" /> Total SKUs
              </div>
              <p className="text-2xl font-black tracking-tight" data-numeric>{kpis.totalSku.toLocaleString()}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="grid gap-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <AlertTriangle className="h-4 w-4" /> Low Stock
              </div>
              <p className="text-2xl font-black tracking-tight" data-numeric>{kpis.lowStock.toLocaleString()}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="grid gap-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <PackageSearch className="h-4 w-4" /> Out of Stock
              </div>
              <p className="text-2xl font-black tracking-tight" data-numeric>{kpis.outOfStock.toLocaleString()}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="grid gap-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                <Boxes className="h-4 w-4" /> Units On Hand
              </div>
              <p className="text-2xl font-black tracking-tight" data-numeric>{kpis.totalOnHand.toLocaleString()}</p>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardBody className="grid gap-4">
          <TabsRoot value={activeTab} onValueChange={(tab) => setParams({ tab })}>
            <TabsList items={[
              { value: 'levels', label: 'Levels' },
              { value: 'low-stock', label: 'Low Stock' },
              { value: 'movements', label: 'Movements' },
            ]} />

            <TabsContent value="levels">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  {searchField('Search SKU or product…')}
                  {locationField}
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={params.lowStock === 'true'} onChange={(e) => setParams({ lowStock: e.target.checked ? 'true' : '' })} className="rounded" />
                    Low stock only
                  </label>
                  {hasFilters ? clearAction : null}
                  {refreshButton}
                </div>

                <DataTable
                  columns={levelsColumns}
                  data={rows}
                  {...levelRowProps}
                  {...tableState(levelsQuery, 'Inventory levels could not be loaded.')}
                  caption="Inventory levels"
                  emptyTitle={hasFilters ? 'No inventory matches your filters' : 'No inventory records found'}
                  emptyDescription={hasFilters ? 'Try a different search or clear the filters.' : 'Stock levels appear here once products have inventory.'}
                  emptyAction={clearAction}
                />
                {footer(levelsQuery)}
              </div>
            </TabsContent>

            <TabsContent value="low-stock">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  {searchField('Search SKU or product…')}
                  {locationField}
                  {hasFilters ? clearAction : null}
                  {refreshButton}
                </div>

                <DataTable
                  columns={lowStockColumns}
                  data={Array.isArray(lowStockQuery.data?.data) ? lowStockQuery.data.data : []}
                  {...levelRowProps}
                  {...tableState(lowStockQuery, 'Low stock data could not be loaded.')}
                  caption="Low stock items"
                  emptyTitle={hasFilters ? 'No low stock items match your filters' : 'No low stock items'}
                  emptyDescription={hasFilters ? 'Try a different search or clear the filters.' : 'All inventory items are above their low stock threshold.'}
                  emptyAction={clearAction}
                />
                {footer(lowStockQuery)}
              </div>
            </TabsContent>

            <TabsContent value="movements">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  {locationField}
                  <Field label="Reason" className="min-w-40">
                    <NativeSelect value={params.reason} onChange={(e) => setParams({ reason: e.target.value })} options={[{ value: '', label: 'All reasons' }, ...ADJUSTMENT_REASONS]} />
                  </Field>
                  {hasFilters ? clearAction : null}
                  {refreshButton}
                </div>

                <DataTable
                  columns={movementColumns}
                  data={Array.isArray(movementsQuery.data?.data) ? movementsQuery.data.data : []}
                  rowKey={(row) => row.id}
                  minWidth={960}
                  {...tableState(movementsQuery, 'Movement ledger could not be loaded.')}
                  caption="Inventory movements"
                  emptyTitle={hasFilters ? 'No movements match your filters' : 'No movement records found'}
                  emptyDescription={hasFilters ? 'Try a different location or reason, or clear the filters.' : 'Inventory movements will appear here as they occur.'}
                  emptyAction={clearAction}
                />
                {footer(movementsQuery)}
              </div>
            </TabsContent>
          </TabsRoot>
        </CardBody>
      </Card>

      <AdjustmentDialog
        open={adjustmentOpen}
        onOpenChange={setAdjustmentOpen}
        locations={locationsQuery.data || []}
        form={adjustForm}
        setForm={setAdjustForm}
        errors={adjustErrors}
        setErrors={setAdjustErrors}
        onSubmit={handleAdjustmentSubmit}
        loading={adjustmentMutation.isPending}
      />

      <VersionConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        conflictData={conflictData}
        onResolved={() => {
          setConflictOpen(false);
          // Carry the reviewed server version back into the still-open adjustment form; the user must resubmit.
          if (conflictData?.version) setAdjustForm((current) => ({ ...current, version: String(conflictData.version) }));
        }}
      />
    </div>
  );
}


function AdjustmentDialog({ open, onOpenChange, locations, form, setForm, errors, setErrors, onSubmit, loading }) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Adjust Inventory"
        description="Record a stock adjustment with increase, decrease, or counted value."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button loading={loading} onClick={onSubmit}>Record Adjustment</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FieldGroup columns={2}>
            <Field label="Variant ID" required error={errors.variantId}>
              <Input value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })} placeholder="Paste variant ID…" />
            </Field>
            <Field label="Location" required error={errors.locationId}>
              <NativeSelect
                value={form.locationId}
                onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                options={[
                  { value: '', label: 'Select location…' },
                  ...(locations || []).map((loc) => ({ value: loc.id, label: `${loc.code} — ${loc.name}` })),
                ]}
              />
            </Field>
          </FieldGroup>

          <FieldGroup columns={2}>
            <Field label="Mode" required>
              <NativeSelect
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                options={[
                  { value: 'increase', label: 'Increase' },
                  { value: 'decrease', label: 'Decrease' },
                  { value: 'counted', label: 'Counted value' },
                ]}
              />
            </Field>
            <Field label={form.mode === 'counted' ? 'Counted Quantity' : 'Quantity'} required error={errors.quantity}>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder={form.mode === 'counted' ? 'Enter counted value…' : 'Enter quantity…'} />
            </Field>
          </FieldGroup>

          <FieldGroup columns={2}>
            <Field label="Reason" required error={errors.reason}>
              <NativeSelect
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                options={[{ value: '', label: 'Select reason…' }, ...ADJUSTMENT_REASONS]}
              />
            </Field>
            <Field label="Current Version" required error={errors.version}>
              <Input type="number" min="1" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1" />
            </Field>
          </FieldGroup>

          <Field label="Note" hint="Optional note for this adjustment.">
            <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason for adjustment…" />
          </Field>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

function VersionConflictDialog({ open, onOpenChange, conflictData, onResolved }) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Version Conflict Detected"
        description="Inventory has been modified since you last loaded it. Review the current data before proceeding."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Dismiss</Button>
            <Button disabled={!conflictData} onClick={() => onResolved()}>Use latest version and review</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Alert tone="warning">The inventory record has been updated by another user. Review the latest balance below, then confirm your adjustment again.</Alert>
          {conflictData ? (
            <div className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="text-sm font-semibold">Current Record</h3>
              <div className="grid gap-2 text-sm">
                <p>SKU: <strong>{conflictData.sku}</strong></p>
                <p>Product: <strong>{conflictData.product?.name}</strong></p>
                <p>On Hand: <strong>{conflictData.onHand}</strong></p>
                <p>Reserved: <strong>{conflictData.reserved}</strong></p>
                <p>Available: <strong>{conflictData.available}</strong></p>
                <p>Version: <strong>{conflictData.version}</strong></p>
                <p>Updated: <strong><FormattedDate value={conflictData.updatedAt} withTime /></strong></p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
