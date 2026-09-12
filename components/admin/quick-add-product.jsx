'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, NativeSelect, Textarea, ImageUpload } from '@/components/ui';
import { successToast, errorToast } from '@/components/ui/toast';
import { browserApi, apiMessage } from '@/lib/api/browser-api';

const variantSchema = z.object({
  clientKey: z.string().min(1),
  sku: z.string().trim().optional(),
  title: z.string().min(1),
  attributes: z.record(z.string(), z.string()).default({}),
  regularPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valid price (e.g., 99.99)'),
  salePrice: z.string().trim().optional(),
  costPrice: z.string().trim().optional(),
  stockPolicy: z.enum(['deny', 'allow_backorder', 'preorder', 'available']).default('deny'),
  initialStock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(3),
  status: z.enum(['active', 'archived']).default('active'),
  isDefault: z.boolean().default(true),
}).refine(
  (data) => !data.salePrice || /^\d+(\.\d{1,2})?$/.test(data.salePrice),
  {
    message: 'Sale price must be valid (e.g., 99.99)',
    path: ['salePrice'],
  }
).refine(
  (data) => !data.costPrice || /^\d+(\.\d{1,2})?$/.test(data.costPrice),
  {
    message: 'Cost price must be valid (e.g., 99.99)',
    path: ['costPrice'],
  }
);

const productTranslation = z.object({
  name: z.string().trim().min(2, 'Enter product name (min 2 characters)').max(220, 'Max 220 characters'),
  shortDescription: z.string().max(2000, 'Max 2000 characters').default(''),
  description: z.string().max(100000, 'Max 100000 characters').default(''),
  careText: z.string().max(20000, 'Max 20000 characters').nullable().optional(),
  materialText: z.string().max(20000, 'Max 20000 characters').nullable().optional(),
  seoTitle: z.string().trim().max(255, 'Max 255 characters').nullable().optional(),
  seoDescription: z.string().trim().max(500, 'Max 500 characters').nullable().optional(),
});

const schema = z.object({
  slug: z.string().trim().optional(),
  categoryId: z.string().min(1, 'Please select a category'),
  brandId: z.string().optional(),
  type: z.enum(['simple', 'variable']).default('simple'),
  status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
  publishAt: z.string().optional(),
  featured: z.boolean().default(false),
  visibility: z.enum(['catalog_search', 'catalog', 'search', 'hidden']).default('catalog_search'),
  taxClass: z.string().trim().max(80).default('standard'),
  shippingProfile: z.object({
    requiresShipping: z.boolean().default(true),
    freeShipping: z.boolean().default(false),
    shippingClass: z.string().trim().max(80).nullable().optional(),
  }),
  translations: z.object({
    en: productTranslation,
    bn: productTranslation,
  }),
  attributes: z.array(z.object({
    attributeId: z.string().length(26),
    variation: z.boolean().default(false),
    visible: z.boolean().default(true),
    displayOrder: z.number().int().min(0).optional(),
  })).default([]),
  variants: z.array(variantSchema).min(1, 'At least one variant is required').max(250),
  media: z.array(z.object({
    mediaId: z.string().length(26),
    role: z.enum(['primary', 'gallery', 'swatch', 'size_chart']).default('primary'),
    displayOrder: z.number().int().min(0).optional(),
    altEn: z.string().trim().max(500).nullable().optional(),
    altBn: z.string().trim().max(500).nullable().optional(),
    variantSku: z.string().trim().max(100).nullable().optional(),
  })).default([]),
}).refine(
  (data) => {
    const slug = data.slug || slugify(data.translations.en.name);
    return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  },
  {
    message: 'Slug is required and must use lowercase letters, numbers, and hyphens only',
    path: ['slug'],
  }
);

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function defaultValues() {
  return {
    slug: '',
    categoryId: '',
    brandId: '',
    type: 'simple',
    status: 'draft',
    publishAt: '',
    featured: false,
    visibility: 'catalog_search',
    taxClass: 'standard',
    shippingProfile: { requiresShipping: true, freeShipping: false, shippingClass: null },
    translations: { en: { name: '', shortDescription: '', description: '', careText: '', materialText: '', seoTitle: '', seoDescription: '' }, bn: { name: '', shortDescription: '', description: '', careText: '', materialText: '', seoTitle: '', seoDescription: '' } },
    attributes: [],
    variants: [{
      clientKey: crypto.randomUUID(),
      sku: '',
      title: 'Default',
      attributes: {},
      regularPrice: '',
      stockPolicy: 'deny',
      initialStock: 0,
      lowStockThreshold: 3,
      status: 'active',
      isDefault: true,
    }],
    media: [],
  };
}

export function QuickAddProduct() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: ['admin-quick-add-categories'],
    queryFn: () => browserApi.get('/admin/categories', { params: { pageSize: 200 } }).then((r) => r.data.data),
  });
  const brands = useQuery({
    queryKey: ['admin-quick-add-brands'],
    queryFn: () => browserApi.get('/admin/brands', { params: { pageSize: 200 } }).then((r) => r.data.data),
  });

const form = useForm({
     resolver: zodResolver(schema),
     defaultValues: defaultValues(),
   });

   const stockPolicy = form.watch('variants.0.stockPolicy');

   const create = useMutation({
    mutationFn: (data) => browserApi.post('/admin/products', createPayload(data)).then((r) => r.data.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      successToast('Product created', `Product '${created.name || created.slug}' has been created successfully`);
      router.replace(`/admin/products/${created.id}`);
    },
    onError: (error) => {
      const fieldErrors = error?.response?.data?.error?.fieldErrors;
      const firstField = fieldErrors && Object.keys(fieldErrors)[0];
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([path, messages]) => {
          form.setError(path, { type: 'server', message: messages[0] });
        });
        if (firstField && firstField !== '_form') form.setFocus(firstField === 'variants' ? 'variants.0.sku' : firstField);
      }
      errorToast('Failed to create product', apiMessage(error, 'Could not create product'));
    },
  });

  function handleSubmit(values) {
    create.mutate(values);
  }

  function handleInvalid(errors) {
    const firstField = firstErrorPath(errors);
    if (firstField) form.setFocus(firstField);
  }

  if (categories.isLoading || brands.isLoading) {
    return <div className="card p-8">Loading…</div>;
  }

  return (
    <div className="grid max-w-3xl gap-5 mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back
        </Button>
        <h1 className="text-2xl font-bold">Add product (quick)</h1>
      </div>

      <Card>
        <CardHeader title="Add product" description="Quick product creation with essential fields." />
        <CardBody>
          <form onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} className="grid gap-4">
            <Field label="Product name (English)" required error={form.formState.errors.translations?.en?.name?.message}>
              <Input {...form.register('translations.en.name')} placeholder="Enter product name" />
            </Field>
            <Field label="Product name (Bangla)" required error={form.formState.errors.translations?.bn?.name?.message}>
              <Input {...form.register('translations.bn.name')} placeholder="পড় descrip. লিখুন" />
            </Field>
            <Field label="Slug" required error={form.formState.errors.slug?.message}>
              <Input {...form.register('slug')} placeholder="auto-generated from name" />
            </Field>
            <Field label="Primary category" required error={form.formState.errors.categoryId?.message}>
              <NativeSelect
                {...form.register('categoryId')}
                options={[{ value: '', label: 'Select category…' }, ...categories.data.map((c) => ({ value: c.id, label: c.translations?.en?.name || c.slug }))]}
              />
            </Field>
            <Field label="Brand (optional)" error={form.formState.errors.brandId?.message}>
              <NativeSelect
                {...form.register('brandId')}
                options={[{ value: '', label: 'No brand' }, ...brands.data.map((b) => ({ value: b.id, label: b.translations?.en?.name || b.slug }))]}
              />
            </Field>
            <Field label="Product type" error={form.formState.errors.type?.message}>
              <NativeSelect
                {...form.register('type')}
                options={[{ value: 'simple', label: 'Simple (single variant)' }, { value: 'variable', label: 'Variable (multiple variants)' }]}
              />
            </Field>
            <Field label="Status" required error={form.formState.errors.status?.message}>
              <NativeSelect
                {...form.register('status')}
                options={[
                  { value: 'draft', label: 'Draft — not visible on storefront' },
                  { value: 'scheduled', label: 'Scheduled — publish at a future date' },
                  { value: 'published', label: 'Published — visible immediately' },
                ]}
              />
            </Field>
            <Field label="Featured product" error={form.formState.errors.featured?.message}>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register('featured')} className="rounded border-[var(--color-border)]" />
                <span>Mark as featured</span>
              </label>
            </Field>
            <Field label="Regular price (BDT)" required error={form.formState.errors.variants?.[0]?.regularPrice?.message || form.formState.errors.variants?.message}>
              <Input type="number" step="0.01" inputMode="decimal" {...form.register('variants.0.regularPrice')} placeholder="0.00" />
            </Field>
            <Field label="Variant SKU (optional)" error={form.formState.errors.variants?.[0]?.sku?.message || form.formState.errors.variants?.message}>
              <Input {...form.register('variants.0.sku')} placeholder="e.g., TSHIRT-BLK-S" />
            </Field>
            <Field label="Sale price (optional, BDT)" error={form.formState.errors.variants?.[0]?.salePrice?.message}>
              <Input type="number" step="0.01" inputMode="decimal" {...form.register('variants.0.salePrice')} placeholder="0.00" />
            </Field>
            <Field label="Cost price (optional, BDT)" error={form.formState.errors.variants?.[0]?.costPrice?.message}>
              <Input type="number" step="0.01" inputMode="decimal" {...form.register('variants.0.costPrice')} placeholder="0.00" />
            </Field>
            {stockPolicy !== 'available' && (
              <Field label="Initial stock" error={form.formState.errors.variants?.[0]?.initialStock?.message}>
                <Input type="number" min="0" {...form.register('variants.0.initialStock', { valueAsNumber: true })} placeholder="0" />
              </Field>
            )}
            <Field label="Stock policy" error={form.formState.errors.variants?.[0]?.stockPolicy?.message}>
              <NativeSelect
                {...form.register('variants.0.stockPolicy')}
                options={[
                  { value: 'deny', label: 'Deny' },
                  { value: 'allow_backorder', label: 'Allow backorder' },
                  { value: 'preorder', label: 'Preorder' },
                  { value: 'available', label: 'Available' },
                ]}
              />
            </Field>
            <ProfitDisplay form={form} />
            <Field label="Short description (English)" error={form.formState.errors.translations?.en?.shortDescription?.message}>
              <Textarea rows={3} {...form.register('translations.en.shortDescription')} placeholder="Brief description shown in listings" />
            </Field>
            <Field label="Short description (Bangla)" error={form.formState.errors.translations?.bn?.shortDescription?.message}>
              <Textarea rows={3} {...form.register('translations.bn.shortDescription')} placeholder="সংক্ষিপ্ত বিবরণ যা তালিকায় দেখানো হবে" />
            </Field>
            <Field label="Tax class" error={form.formState.errors.taxClass?.message}>
              <Input {...form.register('taxClass')} />
            </Field>
            <Field label="Visibility" error={form.formState.errors.visibility?.message}>
              <NativeSelect
                {...form.register('visibility')}
                options={[
                  { value: 'catalog_search', label: 'Catalog search' },
                  { value: 'catalog', label: 'Catalog' },
                  { value: 'search', label: 'Search only' },
                  { value: 'hidden', label: 'Hidden' },
                ]}
              />
            </Field>

            <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
              <Field label="Primary image">
                <ImageUpload
                  multiple={false}
                  label=""
                  onUpload={async (file) => {
                    const data = new FormData();
                    data.append('file', file);
                    data.append('privacy', 'public');
                    const result = await browserApi.post('/admin/media/upload', data);
                    return result.data.data;
                  }}
                  max={1}
                  onChange={(images) => {
                    if (images.length > 0) {
                      form.setValue('media', [{
                        mediaId: images[0].id || '',
                        role: 'primary',
                        displayOrder: 0,
                        altEn: '',
                        altBn: '',
                      }]);
                    }
                  }}
                />
              </Field>
            </div>

            <Button type="submit" className="w-full mt-4" loading={create.isPending}>
              <Save size={16} className="mr-1" /> Create product
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function createPayload(values) {
  const slug = values.slug?.trim() || slugify(values.translations?.en?.name || '');
  const optionalMoney = (value) => value?.trim() || null;

  return {
    ...values,
    slug,
    categoryId: values.categoryId || null,
    brandId: values.brandId || null,
    publishAt: values.publishAt || null,
variants: values.variants.map((variant, index) => ({
       ...variant,
       // The API requires both fields even though SKU is optional in quick add.
       sku: variant.sku?.trim() || `${slug || 'product'}-${index + 1}`,
       salePrice: optionalMoney(variant.salePrice),
       costPrice: optionalMoney(variant.costPrice),
       ...(variant.stockPolicy !== 'available' ? { stock: Number(variant.initialStock || 0) } : {}),
     })),
  };
}

function firstErrorPath(errors, prefix = '') {
  for (const [key, value] of Object.entries(errors || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value?.message) return path;
    if (value && typeof value === 'object') {
      const nested = firstErrorPath(value, path);
      if (nested) return nested;
    }
  }
  return null;
}

function ProfitDisplay({ form }) {
  const regular = Number(form.getValues('variants.0.regularPrice')) || 0;
  const sale = Number(form.getValues('variants.0.salePrice')) || 0;
  const cost = Number(form.getValues('variants.0.costPrice')) || 0;
  const selling = sale > 0 ? sale : regular;
  const profit = selling - cost;
  const margin = selling > 0 ? (profit / selling) * 100 : 0;
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 text-sm">
      <p className="font-semibold">Estimated margin</p>
      <div className="mt-1 flex flex-wrap gap-4">
        <span>Selling: <strong>৳{selling.toFixed(2)}</strong></span>
        <span>Cost: <strong>৳{cost.toFixed(2)}</strong></span>
        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
          Profit: <strong>৳{profit.toFixed(2)}</strong> ({margin.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
