'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import Decimal from 'decimal.js';
import { Edit3, PackagePlus, Search, ShoppingBag } from 'lucide-react';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { ActionMenu, Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, Field, FormattedMoney, Input, NativeSelect, Skeleton, StatusBadge, Textarea } from '@/components/ui';

const productDefaults = {
  slug: '',
  nameEn: '',
  nameBn: '',
  descriptionEn: '',
  descriptionBn: '',
  sku: '',
  title: 'Default',
  regularPrice: '',
  costPrice: '',
  stock: 0,
  status: 'draft'
};

const startingPrice = (variants) => {
  if (!variants?.length) return null;
  return variants
    .reduce((min, variant) => new Decimal(variant.regularPrice || 0).lessThan(min) ? new Decimal(variant.regularPrice) : min, new Decimal(variants[0].regularPrice))
    .toFixed(2);
};

export function ProductManager() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const products = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => browserApi.get('/admin/products', { params: { pageSize: 100 } }).then((response) => response.data.data)
  });

  const visible = products.data?.filter((product) =>
    `${product.name || ''} ${product.slug || ''} ${(product.variants || []).map((variant) => variant.sku).join(' ')}`.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const columns = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ShoppingBag size={18} />
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
          <p className="eyebrow">Catalog</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Products</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Create, price, publish, archive, and manage every product and variant.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? 'Close editor' : (
            <>
              <PackagePlus size={17} /> Add product
            </>
          )}
        </Button>
      </div>

      {showForm ? <ProductForm onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); products.refetch(); }} /> : null}

      <Card>
        <CardHeader
          title="Product catalog"
          description={`${products.data?.length || 0} products`}
          action={
            <Field label="Search" className="sm:w-72">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, slug, or SKU…" />
            </Field>
          }
        />
        <DataTable columns={columns} data={visible} loading={products.isLoading} emptyTitle="No products" emptyDescription="Add a product to start your catalog." />
      </Card>
    </div>
  );
}

function ProductForm({ onCreated, onCancel }) {
  const { register, handleSubmit } = useForm({ defaultValues: productDefaults });
  const create = useMutation({
    mutationFn: (value) =>
      browserApi.post('/admin/products', {
        slug: value.slug,
        type: 'simple',
        status: value.status,
        featured: false,
        translations: {
          en: { name: value.nameEn, shortDescription: '', description: value.descriptionEn },
          bn: { name: value.nameBn, shortDescription: '', description: value.descriptionBn }
        },
        variants: [{
          sku: value.sku,
          title: value.title,
          attributes: {},
          regularPrice: value.regularPrice,
          costPrice: value.costPrice || null,
          salePrice: null,
          stockPolicy: 'deny',
          stock: Number(value.stock),
          lowStockThreshold: 3,
          isDefault: true
        }]
      }).then((response) => response.data.data),
    onSuccess: onCreated
  });

  return (
    <form onSubmit={handleSubmit((values) => create.mutate(values))}>
      <Card>
        <CardHeader title="New simple product" description="Start with the essentials, then add media, categories, SEO, and variant detail in the full editor." />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="English name" required>
            <Input required {...register('nameEn')} />
          </Field>
          <Field label="Bangla name" required>
            <Input required {...register('nameBn')} />
          </Field>
          <Field label="URL slug" required>
            <Input required pattern="[a-z0-9-]+" placeholder="elegant-linen-dress" {...register('slug')} />
          </Field>
          <Field label="SKU" required>
            <Input required placeholder="EE-0001" {...register('sku')} />
          </Field>
          <Field label="Variant title" required>
            <Input required {...register('title')} />
          </Field>
          <Field label="Regular price" required>
            <Input required inputMode="decimal" {...register('regularPrice')} />
          </Field>
          <Field label="Cost price">
            <Input inputMode="decimal" {...register('costPrice')} />
          </Field>
          <Field label="Opening stock">
            <Input type="number" min={0} {...register('stock', { valueAsNumber: true })} />
          </Field>
          <Field label="English description" className="md:col-span-2">
            <Textarea rows={4} {...register('descriptionEn')} />
          </Field>
          <Field label="Bangla description" className="md:col-span-2">
            <Textarea rows={4} {...register('descriptionBn')} />
          </Field>
          {create.error ? <Alert tone="error">{apiMessage(create.error)}</Alert> : null}
        </CardBody>
        <div className="flex items-center gap-3 border-t border-[var(--color-border)] px-6 py-4">
          <Button loading={create.isPending}>Create draft</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    </form>
  );
}
