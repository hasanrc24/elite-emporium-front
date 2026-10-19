'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeftRight, AlertTriangle, Boxes, Package, PackageSearch, Search, RefreshCw,
} from 'lucide-react';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { pushToast } from '@/components/ui';
import {
  Alert, Button, Card, CardBody, DataTable, Field, FieldGroup, FormattedDate,
  Input, NativeSelect, Pagination, Skeleton, StatusBadge, TabsContent, TabsList, TabsRoot, Textarea,
} from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { AdminPageHeader } from './admin-page-header';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

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

export function InventoryManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('levels');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    variantId: '', locationId: '', mode: 'increase', quantity: '', reason: '', note: '', version: '', idempotencyKey: '',
  });
  const [adjustErrors, setAdjustErrors] = useState({});

  const [timeoutId, setTimeoutId] = useState(null);
  const debouncedSearch = useMemo(() => (value) => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => setSearch(value), 300);
    setTimeoutId(id);
  }, [timeoutId]);

  const handleSearchChange = (value) => {
    debouncedSearch(value);
    setPage(1);
  };

  const levelsParams = useMemo(() => {
    const params = { page, pageSize: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (lowStockOnly) params.lowStock = 'true';
    if (locationId) params.locationId = locationId;
    return params;
  }, [page, search, lowStockOnly, locationId]);

  const movementsParams = useMemo(() => {
    const params = { page, pageSize: PAGE_SIZE };
    if (search.trim()) params.search = search.trim();
    if (locationId) params.locationId = locationId;
    return params;
  }, [page, search, locationId]);

  const levelsQuery = useQuery({
    queryKey: ['admin-inventory-levels', levelsParams],
    queryFn: () => browserApi.get('/admin/inventory/levels', { params: levelsParams }).then((r) => r.data),
    staleTime: 30000,
  });

  const lowStockQuery = useQuery({
    queryKey: ['admin-inventory-low-stock', levelsParams],
    queryFn: () => browserApi.get('/admin/inventory/low-stock', { params: levelsParams }).then((r) => r.data),
    staleTime: 30000,
  });

  const movementsQuery = useQuery({
    queryKey: ['admin-inventory-movements', movementsParams],
    queryFn: () => browserApi.get('/admin/inventory/movements', { params: movementsParams }).then((r) => r.data),
    staleTime: 30000,
  });

  const locationsQuery = useQuery({
    queryKey: ['admin-inventory-locations'],
    queryFn: () => browserApi.get('/admin/inventory/locations').then((r) => r.data.data),
    staleTime: 60000,
  });

  const rows = activeTab === 'low-stock'
    ? (Array.isArray(lowStockQuery.data?.data) ? lowStockQuery.data.data : [])
    : (Array.isArray(levelsQuery.data?.data) ? levelsQuery.data.data : []);

  const totalRecords = activeTab === 'low-stock'
    ? (lowStockQuery.data?.meta?.total ?? rows.length)
    : (levelsQuery.data?.meta?.total ?? rows.length);
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  const kpis = useMemo(() => {
    const data = rows;
    const totalSku = new Set(data.map((r) => r.sku).filter(Boolean)).size;
    const lowStock = data.filter((r) => r.lowStock).length;
    const outOfStock = data.filter((r) => (Number(r.onHand) - Number(r.reserved)) <= 0).length;
    const totalOnHand = data.reduce((sum, r) => sum + Number(r.onHand), 0);
    return { totalSku, lowStock, outOfStock, totalOnHand };
  }, [rows]);

  const adjustmentMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await browserApi.post(
        '/admin/inventory/adjustments',
        payload,
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      return response.data;
    },
    onSuccess: () => {
      setAdjustmentOpen(false);
      setAdjustForm({ variantId: '', locationId: '', mode: 'increase', quantity: '', reason: '', note: '', version: '', idempotencyKey: '' });
      setAdjustErrors({});
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-locations'] });
      pushToast({ tone: 'success', title: 'Adjustment recorded successfully.' });
    },
    onError: (error) => {
      const code = error?.response?.data?.error?.code;
      if (code === 'VERSION_CONFLICT') {
        setConflictData(error?.response?.data?.data);
        setConflictOpen(true);
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
    if (!adjustForm.idempotencyKey) errors.idempotencyKey = 'Idempotency key is required.';
    if (adjustForm.mode !== 'counted' && !adjustForm.quantity) errors.quantity = 'Quantity is required.';
    if (Object.keys(errors).length > 0) { setAdjustErrors(errors); return; }

    const payload = {
      variantId: adjustForm.variantId,
      locationId: adjustForm.locationId,
      reason: adjustForm.reason,
      note: adjustForm.note || null,
      version: Number(adjustForm.version),
    };
    if (adjustForm.mode === 'counted') {
      payload.countedQuantity = Number(adjustForm.quantity);
    } else {
      payload.delta = adjustForm.mode === 'increase' ? Number(adjustForm.quantity) : -Number(adjustForm.quantity);
    }

    adjustmentMutation.mutate(payload);
  };

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title="Inventory"
        description="Monitor stock levels, review movements, and make authorized adjustments."
        actions={
          <Button onClick={() => setAdjustmentOpen(true)}>
            <ArrowLeftRight size={17} />
            Adjust Inventory
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="grid gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <Package className="h-4 w-4" /> Total SKUs
            </div>
            <p className="text-2xl font-black tracking-tight" data-numeric={kpis.totalSku} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="grid gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <AlertTriangle className="h-4 w-4" /> Low Stock
            </div>
            <p className="text-2xl font-black tracking-tight" data-numeric={kpis.lowStock} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="grid gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <PackageSearch className="h-4 w-4" /> Out of Stock
            </div>
            <p className="text-2xl font-black tracking-tight" data-numeric={kpis.outOfStock} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="grid gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <Boxes className="h-4 w-4" /> Units On Hand
            </div>
            <p className="text-2xl font-black tracking-tight" data-numeric={kpis.totalOnHand.toLocaleString()} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="grid gap-4">
          <TabsRoot value={activeTab} onValueChange={setActiveTab}>
            <TabsList items={[
              { value: 'levels', label: 'Levels' },
              { value: 'low-stock', label: 'Low Stock' },
              { value: 'movements', label: 'Movements' },
            ]} />

            <TabsContent value="levels">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Search" className="min-w-56 flex-1 sm:max-w-sm">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
                      <Input className="!min-h-10 !pl-9" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search SKU or product…" />
                    </div>
                  </Field>
                  <Field label="Location" className="min-w-40">
                    <NativeSelect
                      value={locationId}
                      onChange={(e) => { setLocationId(e.target.value); setPage(1); }}
                      options={[
                        { value: '', label: 'All locations' },
                        ...(locationsQuery.data || []).map((loc) => ({ value: loc.id, label: `${loc.code} — ${loc.name}` })),
                      ]}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }} className="rounded" />
                    Low stock only
                  </label>
                  <Button size="sm" variant="secondary" onClick={() => { levelsQuery.refetch(); movementsQuery.refetch(); }}><RefreshCw size={15} />Refresh</Button>
                </div>

                {levelsQuery.isLoading ? <Skeleton className="h-48" /> : null}
                {levelsQuery.error ? <Alert tone="error">{apiMessage(levelsQuery.error, 'Inventory levels could not be loaded.')}</Alert> : null}

                <DataTable
                  columns={[
                    {
                      header: 'SKU / Product',
                      id: 'product',
                      cell: ({ row }) => (
                        <div className="min-w-[200px]">
                          <p className="font-semibold text-[var(--color-text)]">{row.original.sku || '—'}</p>
                          <p className="text-xs text-[var(--color-muted)]">{row.original.product?.name || row.original.variantTitle || ''}</p>
                          {row.original.variantTitle ? <p className="text-xs text-[var(--color-muted)]">Variant: {row.original.variantTitle}</p> : null}
                        </div>
                      ),
                    },
                    {
                      header: 'Location',
                      accessorKey: 'location',
                      cell: ({ row }) => (
                        <span className="text-sm">{row.original.location ? `${row.original.location.code} — ${row.original.location.name}` : '—'}</span>
                      ),
                    },
                    {
                      header: 'On Hand',
                      accessorKey: 'onHand',
                      cell: ({ row }) => <span className="font-semibold">{Number(row.original.onHand).toLocaleString()}</span>,
                    },
                    {
                      header: 'Reserved',
                      accessorKey: 'reserved',
                      cell: ({ row }) => <span className="text-[var(--color-muted)]">{Number(row.original.reserved).toLocaleString()}</span>,
                    },
                    {
                      header: 'Available',
                      accessorKey: 'available',
                      cell: ({ row }) => {
                        const avail = Number(row.original.available);
                        return <span className={cn(avail <= 0 && 'text-[var(--color-danger)] font-semibold')}>{avail.toLocaleString()}</span>;
                      },
                    },
                    {
                      header: 'Low Threshold',
                      accessorKey: 'lowStockThreshold',
                      cell: ({ row }) => <span>{Number(row.original.lowStockThreshold).toLocaleString()}</span>,
                    },
                    {
                      header: 'Status',
                      id: 'status',
                      cell: ({ row }) => {
                        const avail = Number(row.original.available);
                        if (avail <= 0) return <StatusBadge status="inactive">Out of stock</StatusBadge>;
                        if (row.original.lowStock) return <StatusBadge status="pending">Low stock</StatusBadge>;
                        return <StatusBadge status="active">In stock</StatusBadge>;
                      },
                    },
                    {
                      header: 'Updated',
                      accessorKey: 'updatedAt',
                      cell: ({ row }) => <FormattedDate value={row.original.updatedAt} withTime />,
                    },
                    {
                      header: 'Actions',
                      id: 'actions',
                      cell: ({ row }) => (
                        <Button size="sm" variant="ghost" onClick={() => {
                          setAdjustForm({ variantId: row.original.variantId || '', locationId: row.original.location?.id || '', mode: 'increase', quantity: '', reason: '', note: '', version: String(row.original.version || 1), idempotencyKey: crypto.randomUUID() });
                          setAdjustErrors({});
                          setAdjustmentOpen(true);
                        }}>Adjust</Button>
                      ),
                    },
                  ]}
                  data={rows}
                  loading={levelsQuery.isLoading}
                  emptyTitle="No inventory records found"
                  emptyDescription="Try changing your search or filters."
                  rowKey={(row) => row.id}
                />

                {totalPages > 1 ? (
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} className="justify-end" />
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="low-stock">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Search" className="min-w-56 flex-1 sm:max-w-sm">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
                      <Input className="!min-h-10 !pl-9" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search SKU or product…" />
                    </div>
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked defaultChecked className="rounded" />
                    Showing low stock only
                  </label>
                </div>

                {lowStockQuery.isLoading ? <Skeleton className="h-48" /> : null}
                {lowStockQuery.error ? <Alert tone="error">{apiMessage(lowStockQuery.error, 'Low stock data could not be loaded.')}</Alert> : null}

                <DataTable
                  columns={[
                    {
                      header: 'SKU / Product',
                      id: 'product',
                      cell: ({ row }) => (
                        <div className="min-w-[200px]">
                          <p className="font-semibold text-[var(--color-text)]">{row.original.sku || '—'}</p>
                          <p className="text-xs text-[var(--color-muted)]">{row.original.product?.name || ''}</p>
                        </div>
                      ),
                    },
                    {
                      header: 'On Hand',
                      accessorKey: 'onHand',
                      cell: ({ row }) => <span className="font-semibold text-[var(--color-danger)]">{Number(row.original.onHand).toLocaleString()}</span>,
                    },
                    {
                      header: 'Reserved',
                      accessorKey: 'reserved',
                      cell: ({ row }) => <span>{Number(row.original.reserved).toLocaleString()}</span>,
                    },
                    {
                      header: 'Available',
                      accessorKey: 'available',
                      cell: ({ row }) => <span className="text-[var(--color-danger)] font-semibold">{Number(row.original.available).toLocaleString()}</span>,
                    },
                    {
                      header: 'Low Threshold',
                      accessorKey: 'lowStockThreshold',
                      cell: ({ row }) => <span>{Number(row.original.lowStockThreshold).toLocaleString()}</span>,
                    },
                    {
                      header: 'Status',
                      id: 'status',
                      cell: () => <StatusBadge status="warning">Low stock</StatusBadge>,
                    },
                    {
                      header: 'Updated',
                      accessorKey: 'updatedAt',
                      cell: ({ row }) => <FormattedDate value={row.original.updatedAt} withTime />,
                    },
                  ]}
                  data={Array.isArray(lowStockQuery.data?.data) ? lowStockQuery.data.data : []}
                  loading={lowStockQuery.isLoading}
                  emptyTitle="No low stock items"
                  emptyDescription="All inventory items are above their low stock threshold."
                  rowKey={(row) => row.id}
                />
              </div>
            </TabsContent>

            <TabsContent value="movements">
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Search" className="min-w-56 flex-1 sm:max-w-sm">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
                      <Input className="!min-h-10 !pl-9" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search variant or location…" />
                    </div>
                  </Field>
                  <Field label="Location" className="min-w-40">
                    <NativeSelect
                      value={locationId}
                      onChange={(e) => { setLocationId(e.target.value); setPage(1); }}
                      options={[
                        { value: '', label: 'All locations' },
                        ...(locationsQuery.data || []).map((loc) => ({ value: loc.id, label: `${loc.code} — ${loc.name}` })),
                      ]}
                    />
                  </Field>
                  <Button size="sm" variant="secondary" onClick={() => movementsQuery.refetch()}><RefreshCw size={15} />Refresh</Button>
                </div>

                {movementsQuery.isLoading ? <Skeleton className="h-48" /> : null}
                {movementsQuery.error ? <Alert tone="error">{apiMessage(movementsQuery.error, 'Movement ledger could not be loaded.')}</Alert> : null}

                <DataTable
                  columns={[
                    {
                      header: 'Variant',
                      id: 'variant',
                      cell: ({ row }) => (
                        <div>
                          <p className="font-semibold text-[var(--color-text)]">{row.original.variant?.sku || '—'}</p>
                          <p className="text-xs text-[var(--color-muted)]">{row.original.variant?.title || ''}</p>
                        </div>
                      ),
                    },
                    {
                      header: 'Location',
                      cell: ({ row }) => <span className="text-sm">{row.original.location ? row.original.location.code : '—'}</span>,
                    },
                    {
                      header: 'Qty Δ',
                      accessorKey: 'quantityDelta',
                      cell: ({ row }) => {
                        const delta = Number(row.original.quantityDelta);
                        return (
                          <span className={cn(delta >= 0 && 'text-[var(--color-success)]', delta < 0 && 'text-[var(--color-danger)]')}>
                            {delta >= 0 ? '+' : ''}{delta.toLocaleString()}
                          </span>
                        );
                      },
                    },
                    {
                      header: 'Before',
                      accessorKey: 'onHandBefore',
                      cell: ({ row }) => <span className="text-[var(--color-muted)]">{Number(row.original.onHandBefore).toLocaleString()}</span>,
                    },
                    {
                      header: 'After',
                      accessorKey: 'onHandAfter',
                      cell: ({ row }) => <span className="font-semibold">{Number(row.original.onHandAfter).toLocaleString()}</span>,
                    },
                    {
                      header: 'Reason',
                      accessorKey: 'reason',
                      cell: ({ row }) => <span className="capitalize">{row.original.reason?.replace(/_/g, ' ') || '—'}</span>,
                    },
                    {
                      header: 'Actor',
                      accessorKey: 'actor',
                      cell: ({ row }) => <span>{row.original.actor?.name || 'System'}</span>,
                    },
                    {
                      header: 'Order/Ref',
                      id: 'correlation',
                      cell: ({ row }) => (
                        <span className="text-xs text-[var(--color-muted)]">
                          {row.original.orderId ? `Order: ${row.original.orderId}` : row.original.correlationId ? `Ref: ${row.original.correlationId?.slice(0, 8)}…` : '—'}
                        </span>
                      ),
                    },
                    {
                      header: 'Date',
                      accessorKey: 'createdAt',
                      cell: ({ row }) => <FormattedDate value={row.original.createdAt} withTime />,
                    },
                  ]}
                  data={Array.isArray(movementsQuery.data?.data) ? movementsQuery.data.data : []}
                  loading={movementsQuery.isLoading}
                  emptyTitle="No movement records found"
                  emptyDescription="Inventory movements will appear here as they occur."
                  rowKey={(row) => row.id}
                />

                {movementsQuery.data?.meta?.pageCount > 1 ? (
                  <Pagination page={page} totalPages={movementsQuery.data.meta.pageCount} onChange={setPage} className="justify-end" />
                ) : null}
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
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-levels'] });
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
          queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
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

          <Field label="Idempotency Key" hint="Unique key to prevent duplicate adjustments." required error={errors.idempotencyKey}>
            <Input value={form.idempotencyKey} onChange={(e) => setForm({ ...form, idempotencyKey: e.target.value })} placeholder="Auto-generated or paste…" />
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
            <Button onClick={() => onResolved()}>Refresh and Review</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Alert tone="warning">The inventory record has been updated by another user. Refresh to see the latest balance.</Alert>
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
