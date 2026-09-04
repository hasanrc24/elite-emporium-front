'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Field, FieldGroup, Input, NativeSelect, Skeleton, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';

const emptyTranslation = { name: '', shortDescription: '', description: '', careText: '', materialText: '', seoTitle: '', seoDescription: '' };
const newVariant = () => ({
  clientKey: crypto.randomUUID(),
  sku: '',
  barcode: '',
  title: 'Default',
  attributes: {},
  attributeValueIds: [],
  regularPrice: '',
  salePrice: '',
  costPrice: '',
  saleStartsAt: null,
  saleEndsAt: null,
  stockPolicy: 'deny',
  preorderAvailableAt: null,
  preorderMessage: '',
  weightGrams: null,
  dimensions: null,
  status: 'active',
  isDefault: false,
  initialStock: 0,
  lowStockThreshold: 3
});

const emptyProduct = {
  slug: '',
  categoryId: '',
  categoryIds: [],
  collectionIds: [],
  brandId: '',
  type: 'simple',
  status: 'draft',
  publishAt: null,
  featured: false,
  visibility: 'catalog_search',
  taxClass: 'standard',
  shippingProfile: { requiresShipping: true, freeShipping: false, shippingClass: null },
  translations: { en: { ...emptyTranslation }, bn: { ...emptyTranslation } },
  attributes: [],
  variants: [{ ...newVariant(), isDefault: true }],
  media: [],
  version: 1
};

function normalizeProduct(product) {
  return {
    ...emptyProduct,
    ...product,
    categoryId: product.categoryId || '',
    brandId: product.brandId || '',
    translations: { en: { ...emptyTranslation, ...product.translations.en }, bn: { ...emptyTranslation, ...product.translations.bn } },
    variants: product.variants.map((variant) => ({
      ...variant,
      clientKey: variant.id,
      barcode: variant.barcode || '',
      salePrice: variant.salePrice || '',
      costPrice: variant.costPrice || '',
      preorderMessage: variant.preorderMessage || '',
      initialStock: 0,
      lowStockThreshold: variant.inventory?.[0]?.lowStockThreshold ?? 3
    })),
    media: product.media.map((item) => ({
      mediaId: item.mediaId,
      role: item.role,
      displayOrder: item.displayOrder,
      altEn: item.altEn || '',
      altBn: item.altBn || '',
      variantKey: item.variantId || null
    })),
    attributes: product.attributes.map((item) => ({
      attributeId: item.id,
      variation: item.variation,
      visible: item.visible,
      displayOrder: item.displayOrder
    }))
  };
}

const splitCsv = (value) => value.split(',').map((part) => part.trim()).filter(Boolean);

export function ProductEditor({ id }) {
  const query = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data)
  });
  if (query.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;
  return <ProductEditorForm key={`${id}:${query.data.version}`} id={id} initialProduct={query.data} />;
}

function ProductEditorForm({ id, initialProduct }) {
  const [form, setForm] = useState(() => normalizeProduct(initialProduct));
  const save = useMutation({
    mutationFn: () => browserApi.patch(`/admin/products/${id}`, payload(form)).then((response) => response.data.data),
    onSuccess: (saved) => setForm(normalizeProduct(saved))
  });
  const publication = useMutation({
    mutationFn: (status) =>
      browserApi.post(`/admin/products/${id}/publication`, { version: Number(form.version), status, publishAt: status === 'scheduled' ? form.publishAt : null }).then((response) => response.data.data),
    onSuccess: (saved) => setForm(normalizeProduct(saved))
  });

  return (
    <div className="grid gap-5">
      <Link href="/admin/products" className="text-sm font-semibold text-[var(--color-primary)]">
        ← Products
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-[var(--color-primary)]">Complete product editor</p>
          <h1 className="text-3xl font-black">{form.translations.en.name || form.slug}</h1>
          <p className="mt-1 text-[var(--color-muted)]">Version {form.version} · {form.status}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" loading={publication.isPending} onClick={() => publication.mutate('draft')}>Move to draft</Button>
          <Button loading={publication.isPending} onClick={() => publication.mutate('published')}>Publish</Button>
        </div>
      </div>

      <BaseFields form={form} setForm={setForm} />
      <TranslationFields form={form} setForm={setForm} />
      <VariantFields form={form} setForm={setForm} />
      <MediaFields form={form} setForm={setForm} />

      {save.error || publication.error ? <Alert tone="error">{apiMessage(save.error || publication.error)}</Alert> : null}
      {save.isSuccess ? <Alert tone="success">Product changes saved.</Alert> : null}
      <div>
        <Button loading={save.isPending} onClick={() => save.mutate()}>Save product</Button>
      </div>
    </div>
  );
}

function payload(form) {
  const blank = (value) => (value === '' ? null : value);
  return {
    ...form,
    categoryId: blank(form.categoryId),
    brandId: blank(form.brandId),
    publishAt: blank(form.publishAt),
    translations: {
      en: Object.fromEntries(Object.entries(form.translations.en).map(([key, value]) => [key, blank(value)])),
      bn: Object.fromEntries(Object.entries(form.translations.bn).map(([key, value]) => [key, blank(value)]))
    },
    variants: form.variants.map((variant) => ({
      ...variant,
      barcode: blank(variant.barcode),
      salePrice: blank(variant.salePrice),
      costPrice: blank(variant.costPrice),
      preorderAvailableAt: blank(variant.preorderAvailableAt),
      preorderMessage: blank(variant.preorderMessage),
      weightGrams: variant.weightGrams === '' ? null : variant.weightGrams == null ? null : Number(variant.weightGrams),
      initialStock: Number(variant.initialStock || 0),
      lowStockThreshold: Number(variant.lowStockThreshold || 0)
    })),
    media: form.media.map((item) => ({ ...item, variantKey: blank(item.variantKey), altEn: blank(item.altEn), altBn: blank(item.altBn) }))
  };
}

function BaseFields({ form, setForm }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  return (
    <Card>
      <CardHeader title="Publication and classification" />
      <CardBody>
        <FieldGroup columns={3}>
          <Field label="Slug">
            <Input value={form.slug} pattern="[a-z0-9-]+" onChange={(event) => update('slug', event.target.value)} />
          </Field>
          <Field label="Product type">
            <NativeSelect
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              options={[{ value: 'simple', label: 'Simple' }, { value: 'variable', label: 'Variable' }]}
            />
          </Field>
          <Field label="Visibility">
            <NativeSelect
              value={form.visibility}
              onChange={(event) => update('visibility', event.target.value)}
              options={['catalog_search', 'catalog', 'search', 'hidden'].map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Primary category ID">
            <Input value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} />
          </Field>
          <Field label="Additional category IDs">
            <Input value={form.categoryIds.join(', ')} onChange={(event) => update('categoryIds', splitCsv(event.target.value))} />
          </Field>
          <Field label="Collection IDs">
            <Input value={form.collectionIds.join(', ')} onChange={(event) => update('collectionIds', splitCsv(event.target.value))} />
          </Field>
          <Field label="Brand ID">
            <Input value={form.brandId} onChange={(event) => update('brandId', event.target.value)} />
          </Field>
          <Field label="Tax class">
            <Input value={form.taxClass} onChange={(event) => update('taxClass', event.target.value)} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
            <Checkbox checked={form.featured} onCheckedChange={(value) => update('featured', !!value)} />
            Featured product
          </label>
        </FieldGroup>
      </CardBody>
    </Card>
  );
}

function TranslationFields({ form, setForm }) {
  const update = (locale, key, value) => setForm({ ...form, translations: { ...form.translations, [locale]: { ...form.translations[locale], [key]: value } } });
  return (
    <Card>
      <CardHeader title="English and Bangla content" />
      <CardBody>
        <div className="grid gap-5 lg:grid-cols-2">
          {['en', 'bn'].map((locale) => (
            <fieldset key={locale} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
              <legend className="px-2 font-bold">{locale === 'en' ? 'English' : 'বাংলা'}</legend>
              {Object.keys(emptyTranslation).map((key) => (
                <Field key={key} label={key.replaceAll(/([A-Z])/g, ' $1').toLowerCase()}>
                  {['description', 'careText', 'materialText'].includes(key) ? (
                    <Textarea rows={4} value={form.translations[locale][key] || ''} onChange={(event) => update(locale, key, event.target.value)} />
                  ) : (
                    <Input value={form.translations[locale][key] || ''} onChange={(event) => update(locale, key, event.target.value)} />
                  )}
                </Field>
              ))}
            </fieldset>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function VariantFields({ form, setForm }) {
  const update = (index, key, value) =>
    setForm({
      ...form,
      variants: form.variants.map((variant, position) => (position === index ? { ...variant, [key]: value } : key === 'isDefault' && value ? { ...variant, isDefault: false } : variant))
    });
  const remove = (index) => setForm({ ...form, variants: form.variants.filter((_, position) => position !== index) });

  return (
    <Card>
      <CardHeader
        title="Variants"
        description="Existing variant IDs and versions are preserved to prevent deleting order history."
        action={<Button variant="outline" onClick={() => setForm({ ...form, variants: [...form.variants, newVariant()] })}>Add variant</Button>}
      />
      <CardBody className="grid gap-4">
        {form.variants.map((variant, index) => (
          <fieldset key={variant.id || variant.clientKey} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 md:grid-cols-4">
            <legend className="px-2 font-bold">{variant.sku || `Variant ${index + 1}`}</legend>
            {['sku', 'title', 'barcode', 'regularPrice', 'salePrice', 'costPrice', 'weightGrams', 'lowStockThreshold'].map((key) => (
              <Field key={key} label={key.replaceAll(/([A-Z])/g, ' $1').toLowerCase()}>
                <Input
                  value={variant[key] ?? ''}
                  inputMode={/Price|weight|Threshold/i.test(key) ? 'decimal' : undefined}
                  onChange={(event) => update(index, key, event.target.value)}
                />
              </Field>
            ))}
            <Field label="Stock policy">
              <NativeSelect
                value={variant.stockPolicy}
                onChange={(event) => update(index, 'stockPolicy', event.target.value)}
                options={['deny', 'allow_backorder', 'preorder'].map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label="Attributes (key:value, comma separated)" className="md:col-span-2">
              <Input
                value={Object.entries(variant.attributes || {}).map(([key, value]) => `${key}:${value}`).join(', ')}
                onChange={(event) =>
                  update(index, 'attributes', Object.fromEntries(splitCsv(event.target.value).map((part) => part.split(':', 2)).filter((pair) => pair.length === 2)))
                }
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
              <Checkbox checked={variant.isDefault} onCheckedChange={(value) => update(index, 'isDefault', !!value)} />
              Default
            </label>
            {form.variants.length > 1 ? <Button variant="outline" onClick={() => remove(index)}>Archive on save</Button> : null}
          </fieldset>
        ))}
      </CardBody>
    </Card>
  );
}

function MediaFields({ form, setForm }) {
  const add = () =>
    setForm({ ...form, media: [...form.media, { mediaId: '', role: form.media.length ? 'gallery' : 'primary', displayOrder: form.media.length, altEn: '', altBn: '', variantKey: null }] });
  const update = (index, key, value) =>
    setForm({ ...form, media: form.media.map((item, position) => (position === index ? { ...item, [key]: value } : item)) });

  return (
    <Card>
      <CardHeader
        title="Managed media"
        description="Choose ready public assets from the media library and provide localized alt text."
        action={<Button variant="outline" onClick={add}>Attach asset</Button>}
      />
      <CardBody className="grid gap-3">
        {form.media.map((item, index) => (
          <div key={`${item.mediaId}-${index}`} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 md:grid-cols-5">
            <Field label="Media asset ID">
              <Input value={item.mediaId} onChange={(event) => update(index, 'mediaId', event.target.value)} />
            </Field>
            <Field label="Role">
              <NativeSelect
                value={item.role}
                onChange={(event) => update(index, 'role', event.target.value)}
                options={['primary', 'gallery', 'swatch', 'size_chart'].map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label="English alt">
              <Input value={item.altEn || ''} onChange={(event) => update(index, 'altEn', event.target.value)} />
            </Field>
            <Field label="Bangla alt">
              <Input value={item.altBn || ''} onChange={(event) => update(index, 'altBn', event.target.value)} />
            </Field>
            <Button variant="outline" onClick={() => setForm({ ...form, media: form.media.filter((_, position) => position !== index) })}>Remove</Button>
          </div>
        ))}
        <Link href="/admin/media" className="inline-block font-semibold text-[var(--color-primary)] underline">Open media library</Link>
      </CardBody>
    </Card>
  );
}