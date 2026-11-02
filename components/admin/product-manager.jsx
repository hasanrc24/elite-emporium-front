'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Archive, CopyPlus, Edit3, Eye, PackagePlus, Search, ShoppingBag, Store, Upload, Zap } from 'lucide-react';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useSearchInput, useTableParams } from '@/lib/hooks/use-table-params';
import { actionsColumn, Alert, Button, Card, ConfirmAction, DataTable, Field, FormattedDate, FormattedMoney, Input, NativeSelect, DateRangePicker, StatusBadge, TableFooter, pushToast } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { ExportCsvButton, ImportCsvDialog } from './products/csv-tools';
import { rememberProductList } from './products/list-state';
import { SLUG_RE, activeVariants, dayBoundIso, mapFieldErrors, startingPrice } from './products/product-logic';

const DEFAULTS = { page: 1, pageSize: 25, search: '', status: '', featured: '', categoryId: '', brandId: '', createdFrom: '', createdTo: '' };

export function ProductManager() {
  // useTableParams reads the URL, which needs a Suspense boundary during prerender.
  return <Suspense><ProductTable /></Suspense>;
}

function ProductTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canManage = Boolean(permissions?.includes('catalog.manage'));
  const canPublish = Boolean(permissions?.includes('catalog.publish'));
  const canExport = Boolean(permissions?.includes('catalog.export'));
  const canImport = canManage && Boolean(permissions?.includes('catalog.import'));
  const [importing, setImporting] = useState(false);
  const [params, setParams] = useTableParams(DEFAULTS);
  useEffect(() => { rememberProductList(window.location.search); }, [params]);
  const commitSearch = useCallback((value) => setParams({ search: value }), [setParams]);
  const [searchText, setSearchText] = useSearchInput(params.search, commitSearch);
  const [duplicating, setDuplicating] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);
  // Versions of products the user has selected from (selections can span pages); needed for optimistic-lock bulk updates.
  const [known, setKnown] = useState({});

  const apiParams = {
    page: params.page,
    pageSize: params.pageSize,
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.featured ? { featured: params.featured } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.brandId ? { brandId: params.brandId } : {}),
    ...(params.createdFrom ? { createdAtFrom: dayBoundIso(params.createdFrom, 'start') } : {}),
    ...(params.createdTo ? { createdAtTo: dayBoundIso(params.createdTo, 'end') } : {}),
  };
  const products = useQuery({
    queryKey: ['admin', 'products', apiParams],
    queryFn: () => browserApi.get('/admin/products', { params: apiParams }).then((response) => response.data),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ['admin', 'product-filter-categories'],
    queryFn: () => browserApi.get('/admin/categories', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const brands = useQuery({
    queryKey: ['admin', 'product-filter-brands'],
    queryFn: () => browserApi.get('/admin/brands', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  const archive = useMutation({
    mutationFn: (product) => browserApi.post(`/admin/products/${product.id}/archive`, { version: product.version }),
    onSuccess: () => { pushToast({ tone: 'success', title: 'Product archived.' }); refresh(); },
    onError: (error) => { pushToast({ tone: 'error', title: apiMessage(error, 'Could not archive the product.') }); refresh(); },
  });
  const restore = useMutation({
    mutationFn: (product) => browserApi.post(`/admin/products/${product.id}/restore`),
    onSuccess: () => { pushToast({ tone: 'success', title: 'Product restored as it was. Review it before publishing.' }); refresh(); },
    onError: (error) => { pushToast({ tone: 'error', title: apiMessage(error, 'Could not restore the product.') }); refresh(); },
  });

  const hasFilters = Boolean(params.search || params.status || params.featured || params.categoryId || params.brandId || params.createdFrom || params.createdTo);
  const clearFilters = () => { setSearchText(''); setParams({ search: '', status: '', featured: '', categoryId: '', brandId: '', createdFrom: '', createdTo: '' }); };
  const rows = products.data?.data || [];
  const meta = products.data?.meta;
  const changeSelection = (ids) => {
    setSelectedIds(ids);
    setKnown((current) => ({ ...current, ...Object.fromEntries(rows.map((row) => [row.id, { version: row.version, archived: Boolean(row.archivedAt) }])) }));
  };
  const selectedItems = selectedIds.filter((id) => known[id] && !known[id].archived).map((id) => ({ id, version: known[id].version }));
  const skippedArchived = selectedIds.length - selectedItems.length;
  const bulk = useMutation({
    mutationFn: (changes) => browserApi.post('/admin/products/bulk', { items: selectedItems, ...changes }).then((response) => response.data.data),
    onSuccess: (result) => { pushToast({ tone: 'success', title: `${result.updated} product${result.updated === 1 ? '' : 's'} updated.` }); setSelectedIds([]); refresh(); },
    // A version conflict means the selection is stale: clear it and reload the list rather than retrying blindly.
    onError: (error) => { pushToast({ tone: 'error', title: apiMessage(error, 'Could not update the selected products.') }); if (error?.response?.status === 409) setSelectedIds([]); refresh(); },
  });

  const columns = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: ({ row }) => {
        const product = row.original;
        const name = product.translations?.en?.name || product.name || product.slug;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{product.primaryImage?.url ? <Image src={product.primaryImage.url} alt="" fill sizes="40px" className="object-cover" /> : <ShoppingBag size={17} aria-hidden="true" />}</span>
            <div className="min-w-0">
              <p className="max-w-64 truncate font-semibold" title={name}>{name}</p>
              <p className="max-w-64 truncate text-xs text-[var(--color-muted)]" title={`/${product.slug}`}>/{product.slug}</p>
            </div>
          </div>
        );
      },
    },
    { header: 'Type', accessorKey: 'type', cell: ({ row }) => <span className="text-xs capitalize text-[var(--color-muted)]">{row.original.type}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.archivedAt ? 'archived' : row.original.status} /> },
    {
      header: 'SKUs / variants',
      id: 'variants',
      cell: ({ row }) => {
        const variants = activeVariants(row.original.variants);
        const skus = variants.map((variant) => variant.sku).filter(Boolean);
        const text = skus.slice(0, 3).join(', ') + (variants.length > 3 ? ` +${variants.length - 3} more` : '');
        return <span className="block max-w-56 truncate text-sm" title={skus.join(', ')}>{text || '—'}</span>;
      },
    },
    {
      header: 'Starting price',
      id: 'price',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const price = startingPrice(row.original.variants || []);
        return price ? <FormattedMoney value={price} /> : <span className="text-[var(--color-muted)]">—</span>;
      },
    },
    { header: 'Updated', accessorKey: 'updatedAt', cell: ({ row }) => <span className="whitespace-nowrap text-[var(--color-muted)]"><FormattedDate value={row.original.updatedAt} /></span> },
    actionsColumn((product) => [
      { label: 'View', icon: Eye, href: `/admin/products/${product.id}` },
      { label: 'Edit', icon: Edit3, href: `/admin/products/${product.id}?mode=edit`, hidden: !canManage || Boolean(product.archivedAt) },
      { label: 'View on storefront', icon: Store, onSelect: () => window.open(`/en/product/${product.slug}`, '_blank', 'noopener'), hidden: product.status !== 'published' || Boolean(product.archivedAt) },
      { separator: true },
      { label: 'Duplicate', icon: CopyPlus, onSelect: () => setDuplicating(product), hidden: !canManage },
      { label: 'Restore', icon: ArchiveRestore, onSelect: () => restore.mutate(product), hidden: !canManage || !canPublish || !product.archivedAt },
      {
        label: 'Archive',
        icon: Archive,
        destructive: true,
        hidden: !canManage || !canPublish || Boolean(product.archivedAt),
        confirm: { title: 'Archive this product?', description: 'It disappears from the storefront. You can restore it later.', confirmLabel: 'Archive' },
        onSelect: () => archive.mutate(product),
      },
    ], { label: (product) => `Actions for ${product.name || product.slug}` }),
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] p-5">
        <div>
          <p className="eyebrow">Your catalog</p><h1 className="mt-1 text-3xl font-bold tracking-[-.05em]">Products</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Find a product, update it, or add something new.</p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" variant="secondary"><Link href="/admin/products/new?quick=1"><Zap size={17} /> Quick add</Link></Button>
            <Button asChild size="lg"><Link href="/admin/products/new"><PackagePlus size={17} /> Add a product</Link></Button>
          </div>
        ) : null}
      </div>

      <Card>
        <div className="grid gap-3 border-b border-[var(--color-border)] p-4 lg:grid-cols-4">
          <Field label="Search" className="lg:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
              <Input aria-label="Search products" className="!min-h-10 !pl-9" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Name, slug, or SKU…" />
            </div>
          </Field>
          <Field label="Status">
            <NativeSelect value={params.status} onChange={(event) => setParams({ status: event.target.value })} options={[{ value: '', label: 'All statuses' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'archived', label: 'Archived' }]} />
          </Field>
          <Field label="Featured">
            <NativeSelect value={params.featured} onChange={(event) => setParams({ featured: event.target.value })} options={[{ value: '', label: 'Featured and standard' }, { value: 'true', label: 'Featured only' }, { value: 'false', label: 'Standard only' }]} />
          </Field>
          <Field label="Primary category">
            <NativeSelect value={params.categoryId} onChange={(event) => setParams({ categoryId: event.target.value })} options={[{ value: '', label: 'All categories' }, ...(categories.data || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }))]} />
          </Field>
          <Field label="Brand">
            <NativeSelect value={params.brandId} onChange={(event) => setParams({ brandId: event.target.value })} options={[{ value: '', label: 'All brands' }, ...(brands.data || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }))]} />
          </Field>
          <Field label="Created">
            <DateRangePicker value={{ from: params.createdFrom, to: params.createdTo }} onChange={(range) => setParams({ createdFrom: range.from || '', createdTo: range.to || '' })} placeholder="Created date range" />
          </Field>
          <div className="flex items-end gap-2">
            {hasFilters ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button> : null}
            {canExport ? <ExportCsvButton params={{ ...(params.status ? { status: params.status } : {}), ...(params.categoryId ? { categoryId: params.categoryId } : {}), ...(params.brandId ? { brandId: params.brandId } : {}) }} /> : null}
            {canImport ? <Button size="sm" variant="secondary" onClick={() => setImporting(true)}><Upload size={15} /> Import</Button> : null}
          </div>
        </div>
        {canManage && selectedIds.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm" role="region" aria-label="Bulk actions">
            <span className="font-semibold">{selectedItems.length} selected</span>
            {skippedArchived ? <span className="text-xs text-[var(--color-muted)]">({skippedArchived} archived skipped)</span> : null}
            <Button size="sm" variant="secondary" disabled={!selectedItems.length || bulk.isPending} onClick={() => setBulkAction({ title: 'Mark as featured?', changes: { featured: true }, confirmLabel: 'Mark featured' })}>Feature</Button>
            <Button size="sm" variant="secondary" disabled={!selectedItems.length || bulk.isPending} onClick={() => setBulkAction({ title: 'Remove featured flag?', changes: { featured: false }, confirmLabel: 'Remove featured' })}>Unfeature</Button>
            <Button size="sm" variant="secondary" disabled={!selectedItems.length || bulk.isPending} onClick={() => setBulkAction({ title: 'Hide from catalog and search?', description: 'Shoppers can still open the product by its direct link.', changes: { visibility: 'hidden' }, confirmLabel: 'Hide' })}>Hide</Button>
            <Button size="sm" variant="secondary" disabled={!selectedItems.length || bulk.isPending} onClick={() => setBulkAction({ title: 'Show in catalog and search?', changes: { visibility: 'catalog_search' }, confirmLabel: 'Show' })}>Show</Button>
            {canPublish ? <Button size="sm" variant="secondary" disabled={!selectedItems.length || bulk.isPending} onClick={() => setBulkAction({ title: 'Move to draft?', description: 'Published and scheduled products disappear from the storefront until published again.', changes: { status: 'draft' }, confirmLabel: 'Move to draft', tone: 'danger' })}>Move to draft</Button> : null}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds([])}>Clear selection</Button>
          </div>
        ) : null}
        <DataTable
          className="!rounded-none !border-0 !shadow-none"
          columns={columns}
          data={rows}
          rowKey={(product) => product.id}
          selectedIds={canManage ? selectedIds : undefined}
          onSelectedIdsChange={canManage ? changeSelection : undefined}
          loading={products.isLoading}
          fetching={products.isFetching}
          error={products.error ? apiMessage(products.error, 'Products could not be loaded.') : null}
          onRetry={products.refetch}
          minWidth={880}
          caption="Products"
          onRowClick={(product) => router.push(`/admin/products/${product.id}`)}
          rowLabel={(product) => `Open ${product.name || product.slug}`}
          emptyTitle={hasFilters ? 'No products match your filters' : 'No products yet'}
          emptyDescription={hasFilters ? 'Try a different search or clear the filters.' : 'Add a product to start your catalog.'}
          emptyAction={hasFilters ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button> : canManage ? <Button asChild size="sm"><Link href="/admin/products/new?quick=1"><Zap size={15} /> Quick add your first product</Link></Button> : null}
        />
        <TableFooter
          className="border-t border-[var(--color-border)]"
          page={params.page}
          pageSize={params.pageSize}
          total={meta?.total || 0}
          pageCount={meta?.pageCount}
          onPageChange={(page) => setParams({ page })}
          onPageSizeChange={(pageSize) => setParams({ pageSize })}
        />
      </Card>

      <ConfirmAction
        open={Boolean(bulkAction)}
        onOpenChange={(open) => { if (!open) setBulkAction(null); }}
        title={bulkAction ? `${bulkAction.title} (${selectedItems.length} product${selectedItems.length === 1 ? '' : 's'})` : ''}
        description={bulkAction?.description}
        confirmLabel={bulkAction?.confirmLabel}
        tone={bulkAction?.tone || 'primary'}
        onConfirm={() => { if (bulkAction) bulk.mutate(bulkAction.changes); }}
      />
      {importing ? <ImportCsvDialog onClose={() => setImporting(false)} onDone={() => { setImporting(false); refresh(); }} /> : null}
      {duplicating ? <DuplicateDialog product={duplicating} onClose={() => setDuplicating(null)} onDone={(copy) => { setDuplicating(null); refresh(); router.push(`/admin/products/${copy.id}?mode=edit`); }} /> : null}
    </div>
  );
}

function DuplicateDialog({ product, onClose, onDone }) {
  const [slug, setSlug] = useState(`${product.slug}-copy`);
  const [skuPrefix, setSkuPrefix] = useState(`${product.slug}-copy`.toUpperCase());
  const [copyStock, setCopyStock] = useState(false);
  const [error, setError] = useState('');
  const duplicate = useMutation({
    mutationFn: () => browserApi.post(`/admin/products/${product.id}/duplicate`, { slug: slug.trim(), skuPrefix: skuPrefix.trim(), copyStock }).then((response) => response.data.data),
    onSuccess: (copy) => { pushToast({ tone: 'success', title: 'Product duplicated as a draft.' }); onDone(copy); },
    onError: (err) => {
      const fields = mapFieldErrors(err?.response?.data?.error?.fieldErrors);
      setError(Object.values(fields)[0] || apiMessage(err, 'Could not duplicate the product.'));
    },
  });
  const slugValid = SLUG_RE.test(slug.trim()) && slug.trim().length <= 180;
  const valid = slugValid && /^[A-Za-z0-9_-]{1,80}$/.test(skuPrefix.trim());
  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        title="Duplicate product"
        description="Creates a draft copy of this product with new SKUs."
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={duplicate.isPending} disabled={!valid} onClick={() => { setError(''); duplicate.mutate(); }}>Duplicate</Button></>}
      >
        <div className="grid gap-4">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="New slug" required error={slug.trim() && !slugValid ? 'Use lowercase letters, numbers and single hyphens only.' : undefined}><Input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} /></Field>
          <Field label="SKU prefix" required hint="Letters, numbers, dashes and underscores. Variants become PREFIX-01, PREFIX-02…"><Input value={skuPrefix} onChange={(event) => setSkuPrefix(event.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4" checked={copyStock} onChange={(event) => setCopyStock(event.target.checked)} />Copy stock levels</label>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
