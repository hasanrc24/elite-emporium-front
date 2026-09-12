'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Download, Edit3, PackagePlus, Search, ShoppingBag } from 'lucide-react';
import { browserApi } from '@/lib/api/browser-api';
import { ActionMenu, Button, Card, DataTable, Field, FormattedMoney, Input, NativeSelect, DateRangePicker, Pagination, StatusBadge } from '@/components/ui';

const startingPrice = (variants) => {
  if (!variants?.length) return null;
  return variants
    .reduce(
      (min, variant) =>
        new Decimal(variant.regularPrice || 0).lessThan(min)
          ? new Decimal(variant.regularPrice)
          : min,
      new Decimal(variants[0].regularPrice),
    )
    .toFixed(2);
};

function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

export function ProductManager() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    featured: '',
    categoryId: '',
    brandId: '',
    createdAt: { from: '', to: '' },
  });
  const params = useMemo(
    () => ({
      page,
      pageSize: 25,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.featured ? { featured: filters.featured } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.createdAt?.from ? { createdAtFrom: filters.createdAt.from } : {}),
      ...(filters.createdAt?.to ? { createdAtTo: filters.createdAt.to } : {}),
    }),
    [debouncedSearch, filters, page],
  );
  const products = useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => browserApi.get('/admin/products', { params }).then((response) => response.data),
  });
  const categories = useQuery({
    queryKey: ['admin', 'product-filter-categories'],
    queryFn: () => browserApi.get('/admin/categories', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const brands = useQuery({
    queryKey: ['admin', 'product-filter-brands'],
    queryFn: () => browserApi.get('/admin/brands', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const setFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const resetFilters = () => {
    setSearch('');
    setPage(1);
    setFilters({ status: '', featured: '', categoryId: '', brandId: '', createdAt: { from: '', to: '' } });
  };

  const columns = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">{row.original.primaryImage?.url ? <Image src={row.original.primaryImage.url} alt="" fill sizes="48px" className="object-cover" /> : <ShoppingBag size={19} />}</span>
          <div>
            <strong>{row.original.translations?.en?.name || row.original.name || row.original.slug}</strong>
            <br />
            <span className="text-xs text-[var(--color-muted)]">/{row.original.slug}</span>
          </div>
        </div>
      ),
    },
    { header: 'Type', accessorKey: 'type', cell: ({ row }) => <span className="text-xs capitalize text-[var(--color-muted)]">{row.original.type}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      header: 'SKUs / variants',
      accessorKey: 'variants',
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.original.variants || []).map((variant) => variant.sku).filter(Boolean).slice(0, 3).join(', ')}
          {(row.original.variants || []).length > 3 ? ` +${row.original.variants.length - 3} more` : ''}
        </span>
      ),
    },
    {
      header: 'Starting price',
      accessorKey: 'price',
      cell: ({ row }) => {
        const price = startingPrice(row.original.variants || []);
        return price ? <FormattedMoney value={price} /> : <span className="text-[var(--color-muted)]">—</span>;
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <ActionMenu
            actions={[
              { label: 'View', icon: ShoppingBag, onSelect: () => router.push(`/admin/products/${row.original.id}`) },
              { label: 'Edit', icon: Edit3, onSelect: () => router.push(`/admin/products/${row.original.id}?mode=edit`) },
              {
                label: 'Open storefront',
                onSelect: () => window.open(`/en/product/${row.original.slug}`, '_blank'),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] p-5">
        <div>
          <p className="eyebrow">Your catalog</p><h1 className="mt-1 text-3xl font-bold tracking-[-.05em]">Products</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Find a product, update it, or add something new.</p>
        </div>
        <Button asChild size="lg"><Link href="/admin/products/new"><PackagePlus size={17} /> Add a product</Link></Button>
      </div>

      <Card>
        <div className="grid gap-3 border-b border-[var(--color-border)] p-4 lg:grid-cols-4">
          <Field label="Search" className="lg:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
              <Input aria-label="Search products" className="!min-h-10 !pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, slug, or SKU…" />
            </div>
          </Field>
          <Field label="Status">
            <NativeSelect value={filters.status} onChange={(event) => setFilter('status', event.target.value)} options={[{ value: '', label: 'All statuses' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'archived', label: 'Archived' }]} />
          </Field>
          <Field label="Featured">
            <NativeSelect value={filters.featured} onChange={(event) => setFilter('featured', event.target.value)} options={[{ value: '', label: 'Featured and standard' }, { value: 'true', label: 'Featured only' }, { value: 'false', label: 'Standard only' }]} />
          </Field>
          <Field label="Primary category">
            <NativeSelect value={filters.categoryId} onChange={(event) => setFilter('categoryId', event.target.value)} options={[{ value: '', label: 'All categories' }, ...(categories.data || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }))]} />
          </Field>
          <Field label="Brand">
            <NativeSelect value={filters.brandId} onChange={(event) => setFilter('brandId', event.target.value)} options={[{ value: '', label: 'All brands' }, ...(brands.data || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }))]} />
          </Field>
          <Field label="Created">
            <DateRangePicker value={{ from: filters.createdAt.from, to: filters.createdAt.to }} onChange={(range) => { setPage(1); setFilters((current) => ({ ...current, createdAt: { from: range.from, to: range.to } })); }} placeholder="Created date range" />
          </Field>
          <div className="flex items-end gap-2">
            <Button size="sm" variant="secondary" onClick={resetFilters}>Clear filters</Button>
            <Button asChild size="sm" variant="secondary"><Link href="/admin/exports"><Download size={15} /> Export</Link></Button>
          </div>
        </div>
        <DataTable className="!rounded-none !border-0 !shadow-none" columns={columns} data={products.data?.data || []} loading={products.isLoading} onRowClick={(product) => router.push(`/admin/products/${product.id}`)} emptyTitle="No products" emptyDescription="Try changing your filters or add a product to start your catalog." />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3 text-xs text-[var(--color-muted)]">
          <span>Showing {products.data?.data?.length || 0} of {products.data?.meta?.total || 0} products</span>
          {products.data?.meta?.pageCount > 1 ? <Pagination page={page} totalPages={products.data.meta.pageCount} onChange={setPage} /> : null}
        </div>
      </Card>
    </div>
  );
}
