'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import { Download, Edit3, PackagePlus, Search, ShoppingBag } from 'lucide-react';
import { browserApi } from '@/lib/api/browser-api';
import { ActionMenu, Button, Card, DataTable, FormattedMoney, Input, StatusBadge } from '@/components/ui';

const startingPrice = (variants) => {
  if (!variants?.length) return null;
  return variants
    .reduce((min, variant) => new Decimal(variant.regularPrice || 0).lessThan(min) ? new Decimal(variant.regularPrice) : min, new Decimal(variants[0].regularPrice))
    .toFixed(2);
};

export function ProductManager() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const products = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => browserApi.get('/admin/products', { params: { pageSize: 100 } }).then((response) => response.data.data)
  });

  const visible = products.data?.filter((product) => {
    const matchesSearch = `${product.name || ''} ${product.slug || ''} ${(product.variants || []).map((variant) => variant.sku).join(' ')}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === 'all' || product.status === status || (status === 'archived' && product.archivedAt));
  }) || [];

  const columns = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
            <ShoppingBag size={19} />
          </span>
          <div>
            <strong>{row.original.name}</strong>
            <br />
            <span className="text-xs text-[var(--color-muted)]">/{row.original.slug}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => <span className="text-xs capitalize text-[var(--color-muted)]">{row.original.type}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />
    },
    {
      header: 'SKUs / variants',
      accessorKey: 'variants',
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.original.variants || []).map((variant) => variant.sku).filter(Boolean).slice(0, 3).join(', ')}
          {(row.original.variants || []).length > 3 ? ` +${row.original.variants.length - 3} more` : ''}
        </span>
      )
    },
    {
      header: 'Starting price',
      accessorKey: 'price',
      cell: ({ row }) => {
        const price = startingPrice(row.original.variants || []);
        return price ? <FormattedMoney value={price} /> : <span className="text-[var(--color-muted)]">—</span>;
      }
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ActionMenu
            actions={[
              { label: 'Edit', icon: Edit3, onSelect: () => router.push(`/admin/products/${row.original.id}`) },
              { label: 'Open storefront', onSelect: () => { window.open(`/${row.original.slug}`, '_blank'); } }
            ]}
          />
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-.035em]">Products</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Manage your store products and inventory.</p>
        </div>
        <Button asChild><Link href="/admin/products/new"><PackagePlus size={17} /> Add product</Link></Button>
      </div>

      <Card>
        <div className="flex overflow-x-auto border-b border-[var(--color-border)] px-5">
          {['all', 'published', 'draft', 'scheduled', 'archived'].map((value) => (
            <button key={value} type="button" onClick={() => setStatus(value)} className={`border-b-2 px-3 py-4 text-xs font-semibold capitalize transition ${status === value ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}>
              {value === 'all' ? 'All products' : value}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-4">
          <div className="relative min-w-56 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} /><Input aria-label="Search products" className="!min-h-10 !pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" /></div>
          <Button asChild size="sm" variant="secondary" className="ml-auto"><Link href="/admin/exports"><Download size={15} /> Export</Link></Button>
        </div>
        <DataTable className="!rounded-none !border-0 !shadow-none" columns={columns} data={visible} loading={products.isLoading} onRowClick={(product) => router.push(`/admin/products/${product.id}`)} emptyTitle="No products" emptyDescription="Add a product to start your catalog." />
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3 text-xs text-[var(--color-muted)]"><span>Showing {visible.length} of {products.data?.length || 0} products</span><span>Page 1</span></div>
      </Card>
    </div>
  );
}
