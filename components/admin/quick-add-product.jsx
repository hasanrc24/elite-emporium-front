'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Decimal from 'decimal.js';
import { ChevronLeft, Save, X } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, Combobox, Field, FormattedMoney, ImageUpload, Input, NativeSelect, Skeleton, Textarea } from '@/components/ui';
import { successToast, errorToast } from '@/components/ui/toast';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { MONEY_RE, buildPayload, computeMargin, emptyProduct, emptyTranslation, fieldId, mapFieldErrors, newVariant, slugify } from './products/product-logic';
import { useUnsavedGuard } from './products/use-unsaved-guard';

const money = (label) => z.string().trim().refine((value) => value === '' || MONEY_RE.test(value), `Enter ${label} like 1250 or 1250.50.`);

const schema = z.object({
  nameEn: z.string().trim().min(1, 'Enter the English product name.').max(220, 'Use at most 220 characters.'),
  nameBn: z.string().trim().min(1, 'Enter the Bangla product name.').max(220, 'Use at most 220 characters.'),
  slug: z.string().trim().max(180).refine((value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Use lowercase letters, numbers and single hyphens only.'),
  categoryId: z.string(),
  brandId: z.string(),
  status: z.enum(['draft', 'published']),
  regularPrice: money('a price').refine((value) => value !== '', 'Enter the regular price.'),
  salePrice: money('a sale price'),
  costPrice: money('a cost'),
  stockPolicy: z.enum(['deny', 'allow_backorder', 'available']),
  stock: z.string().trim().regex(/^\d*$/, 'Enter a whole number, 0 or more.'),
  sku: z.string().trim().max(100, 'Use at most 100 characters.'),
  shortEn: z.string().max(2000, 'Use at most 2,000 characters.'),
  shortBn: z.string().max(2000, 'Use at most 2,000 characters.'),
}).superRefine((value, context) => {
  if (value.salePrice && MONEY_RE.test(value.salePrice) && MONEY_RE.test(value.regularPrice) && new Decimal(value.salePrice).greaterThanOrEqualTo(value.regularPrice)) context.addIssue({ code: 'custom', path: ['salePrice'], message: 'Sale price must be lower than the regular price.' });
  if (value.status === 'published' && !value.categoryId) context.addIssue({ code: 'custom', path: ['categoryId'], message: 'Choose a category before publishing.' });
});

const DEFAULTS = { nameEn: '', nameBn: '', slug: '', categoryId: '', brandId: '', status: 'draft', regularPrice: '', salePrice: '', costPrice: '', stockPolicy: 'deny', stock: '0', sku: '', shortEn: '', shortBn: '' };

/** Maps backend payload paths (variants.0.regularPrice ...) onto this form's field names. */
const BACKEND_TO_FIELD = {
  'translations.en.name': 'nameEn', 'translations.bn.name': 'nameBn', slug: 'slug', categoryId: 'categoryId', brandId: 'brandId', status: 'status',
  'translations.en.shortDescription': 'shortEn', 'translations.bn.shortDescription': 'shortBn',
  'variants.0.sku': 'sku', 'variants.0.regularPrice': 'regularPrice', 'variants.0.salePrice': 'salePrice', 'variants.0.costPrice': 'costPrice', 'variants.0.stockPolicy': 'stockPolicy', 'variants.0.stock': 'stock', 'variants.0.initialStock': 'stock',
};

async function fetchAll(path) {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await browserApi.get(path, { params: { page, pageSize: 100, status: 'active' } });
    rows.push(...(response.data.data || []));
    if (page >= (response.data.meta?.pageCount || 1)) break;
  }
  return rows;
}
const options = (list) => (list || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }));

export function QuickAddProduct() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canCost = Boolean(permissions?.includes('catalog.cost'));
  const canPublish = Boolean(permissions?.includes('catalog.publish'));
  const [image, setImage] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [created, setCreated] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const summaryRef = useRef(null);

  const categories = useQuery({ queryKey: ['admin-editor', 'categories'], queryFn: () => fetchAll('/admin/categories') });
  const brands = useQuery({ queryKey: ['admin-editor', 'brands'], queryFn: () => fetchAll('/admin/brands') });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const { errors, isDirty } = form.formState;
  const { dialog: leaveDialog } = useUnsavedGuard((isDirty || Boolean(image)) && !created, { description: 'You have not created this product yet. If you leave now, what you entered will be lost.' });
  const [regularPrice, salePrice, costPrice, stockPolicy, status] = useWatch({ control: form.control, name: ['regularPrice', 'salePrice', 'costPrice', 'stockPolicy', 'status'] });
  const margin = canCost ? computeMargin(regularPrice, salePrice, costPrice) : null;

  const create = useMutation({
    mutationFn: ({ values }) => {
      const slug = values.slug || slugify(values.nameEn);
      const body = buildPayload({
        ...emptyProduct(),
        slug,
        categoryId: values.categoryId,
        brandId: values.brandId,
        status: values.status,
        translations: {
          en: { ...emptyTranslation(), name: values.nameEn, shortDescription: values.shortEn },
          bn: { ...emptyTranslation(), name: values.nameBn, shortDescription: values.shortBn },
        },
        variants: [newVariant({ sku: values.sku || `${slug.toUpperCase()}-1`, title: 'Default', regularPrice: values.regularPrice, salePrice: values.salePrice, costPrice: values.costPrice, stockPolicy: values.stockPolicy, initialStock: values.stock || '0', isDefault: true })],
        media: image ? [{ key: 'primary', mediaId: image.id, role: 'primary', altEn: values.nameEn, altBn: values.nameBn, variantKey: null }] : [],
      }, { isNew: true, canCost });
      return browserApi.post('/admin/products', body).then((response) => response.data.data);
    },
    onSuccess: (product, { another }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      if (another) {
        successToast('Product created', `${product.translations?.en?.name || product.slug} was saved as ${product.status}. Add the next one.`);
        form.reset(DEFAULTS);
        setImage(null);
        setSlugTouched(false);
        setServerMessage('');
        requestAnimationFrame(() => form.setFocus('nameEn'));
        return;
      }
      setCreated(true);
      successToast('Product created', `${product.translations?.en?.name || product.slug} has been created.`);
      router.replace(`/admin/products/${product.id}?mode=edit`);
    },
    onError: (error) => {
      const mapped = mapFieldErrors(error?.response?.data?.error?.fieldErrors);
      const unmatched = [];
      let first = null;
      for (const [path, message] of Object.entries(mapped)) {
        const field = BACKEND_TO_FIELD[path];
        if (field) { form.setError(field, { type: 'server', message }); first ||= field; } else unmatched.push(message);
      }
      const message = apiMessage(error, 'Could not create the product.');
      setServerMessage([message, ...unmatched.filter((item) => item !== message)].join(' '));
      errorToast('Could not create the product', message);
      if (first) form.setFocus(first);
      else requestAnimationFrame(() => summaryRef.current?.focus());
    },
  });

  const submitWith = (another) => form.handleSubmit((values) => { if (create.isPending) return; setServerMessage(''); create.mutate({ values, another }); }, (invalid) => {
    const first = Object.keys(invalid)[0];
    if (first) form.setFocus(first);
  });

  if (categories.isLoading || brands.isLoading) return <Card><CardBody><Skeleton className="h-64" /></CardBody></Card>;
  const err = (name) => errors[name]?.message;
  const field = (name) => ({ ...form.register(name), id: fieldId(name) });

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      {leaveDialog}
      <div className="grid gap-1">
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]"><ChevronLeft size={15} /> Back to products</Link>
        <h1 className="text-2xl font-bold tracking-[-.035em]">Quick add product</h1>
      </div>
      <Card>
        <CardHeader title="The essentials" description="One simple product with a single price and stock count. Need sizes, colours or more images?" action={<Button asChild variant="secondary" size="sm"><Link href="/admin/products/new">Use the full editor</Link></Button>} />
        <CardBody>
          <form onSubmit={submitWith(false)} noValidate className="grid gap-4">
            {serverMessage ? <div ref={summaryRef} tabIndex={-1} className="outline-none"><Alert tone="error">{serverMessage}</Alert></div> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name (English)" required htmlFor={fieldId('nameEn')} error={err('nameEn')}>
                <Input {...form.register('nameEn', { onChange: (event) => { if (!slugTouched) form.setValue('slug', slugify(event.target.value), { shouldValidate: false }); } })} placeholder="e.g. Classic Cotton Shirt" />
              </Field>
              <Field label="Product name (Bangla)" required htmlFor={fieldId('nameBn')} error={err('nameBn')}>
                <Input {...form.register('nameBn')} lang="bn" placeholder="আপনার পণ্যের নাম লিখুন" />
              </Field>
              <Field label="Slug" htmlFor={fieldId('slug')} error={err('slug')} hint="Used in the storefront address. Generated from the English name.">
                <Input {...form.register('slug', { onChange: () => setSlugTouched(true) })} placeholder="auto-generated" />
              </Field>
              <Field label="Primary category" required={status === 'published'} htmlFor={fieldId('categoryId')} error={err('categoryId')}>
                <Controller name="categoryId" control={form.control} render={({ field: controlled }) => <Combobox value={controlled.value || null} onChange={(value) => controlled.onChange(value || '')} options={options(categories.data)} placeholder="Select category…" searchPlaceholder="Search categories" />} />
              </Field>
              <Field label="Brand" htmlFor={fieldId('brandId')} error={err('brandId')}>
                <Controller name="brandId" control={form.control} render={({ field: controlled }) => <Combobox value={controlled.value || null} onChange={(value) => controlled.onChange(value || '')} options={options(brands.data)} placeholder="No brand" searchPlaceholder="Search brands" />} />
              </Field>
              <Field label="Status" htmlFor={fieldId('status')} error={err('status')} hint="Publishing needs a category and the minimum number of images (usually 4), so use Draft here and add images in the full editor. To schedule, use the product page.">
                <Controller name="status" control={form.control} render={({ field: controlled }) => <NativeSelect value={controlled.value} onChange={(event) => controlled.onChange(event.target.value)} options={[{ value: 'draft', label: 'Draft: not visible on the storefront' }, { value: 'published', label: canPublish ? 'Published: visible now' : 'Published (needs publish permission)', disabled: !canPublish }]} />} />
              </Field>
            </div>

            <div className={`grid gap-4 ${canCost ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <Field label="Regular price (৳)" required htmlFor={fieldId('regularPrice')} error={err('regularPrice')}><Input {...field('regularPrice')} inputMode="decimal" placeholder="0.00" /></Field>
              <Field label="Sale price (৳)" htmlFor={fieldId('salePrice')} error={err('salePrice')}><Input {...field('salePrice')} inputMode="decimal" placeholder="Optional" /></Field>
              {canCost ? <Field label="Cost price (৳)" htmlFor={fieldId('costPrice')} error={err('costPrice')}><Input {...field('costPrice')} inputMode="decimal" placeholder="Optional" /></Field> : null}
            </div>
            {margin?.profit != null ? (
              <p className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 text-sm" aria-live="polite">
                Selling <strong><FormattedMoney value={margin.selling} /></strong> · cost <strong><FormattedMoney value={margin.cost} /></strong> ·{' '}
                <span className={margin.negative ? 'font-semibold text-[var(--color-danger)]' : 'font-semibold text-[var(--color-success)]'}>profit <FormattedMoney value={margin.profit} />{margin.margin != null ? ` (${margin.margin}%)` : ''}</span>
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Stock policy" htmlFor={fieldId('stockPolicy')} error={err('stockPolicy')}>
                <Controller name="stockPolicy" control={form.control} render={({ field: controlled }) => <NativeSelect value={controlled.value} onChange={(event) => controlled.onChange(event.target.value)} options={[{ value: 'deny', label: 'Stop selling at zero' }, { value: 'allow_backorder', label: 'Allow backorder' }, { value: 'available', label: 'Always available' }]} />} />
              </Field>
              {stockPolicy !== 'available' ? <Field label="Stock on hand" htmlFor={fieldId('stock')} error={err('stock')}><Input {...field('stock')} inputMode="numeric" placeholder="0" /></Field> : null}
              <Field label="SKU" htmlFor={fieldId('sku')} error={err('sku')} hint="Leave blank to generate one."><Input {...field('sku')} placeholder="e.g. TSHIRT-BLK-S" /></Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Short description (English)" htmlFor={fieldId('shortEn')} error={err('shortEn')}><Textarea rows={3} {...field('shortEn')} placeholder="Brief description shown in listings" /></Field>
              <Field label="Short description (Bangla)" htmlFor={fieldId('shortBn')} error={err('shortBn')}><Textarea rows={3} lang="bn" {...field('shortBn')} /></Field>
            </div>

            <div className="grid gap-2 border-t border-[var(--color-border)] pt-4">
              <p className="text-sm font-semibold">Primary image</p>
              <p className="text-xs text-[var(--color-muted)]">Portrait 3:4, for example 1200 × 1600 px. Add more images in the full editor.</p>
              {image ? (
                <div className="flex items-center gap-3">
                  <span className="relative block aspect-[3/4] w-20 overflow-hidden rounded-lg border border-[var(--color-border)]">{image.url ? <Image src={image.url} alt="Primary product image" fill sizes="80px" className="object-cover" /> : null}</span>
                  <Button variant="secondary" size="sm" onClick={() => setImage(null)}><X size={14} /> Remove</Button>
                </div>
              ) : (
                <ImageUpload
                  multiple={false}
                  label=""
                  max={1}
                  hint="JPEG, PNG, WebP or AVIF, up to 10 MB."
                  onUpload={async (file) => {
                    const data = new FormData();
                    data.append('file', file);
                    data.append('privacy', 'public');
                    return (await browserApi.post('/admin/media/upload', data, { timeout: 60000 })).data.data;
                  }}
                  onChange={(images) => { if (images[0]?.id) setImage(images[0]); }}
                />
              )}
            </div>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={create.isPending} onClick={submitWith(true)}>Create and add another</Button>
              <Button type="submit" loading={create.isPending}><Save size={16} /> Create product</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
