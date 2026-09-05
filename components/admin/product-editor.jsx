'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Eye, Save } from 'lucide-react';
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
      clientKey: variant.id || variant.clientKey || crypto.randomUUID(),
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
      variantKey: item.variantId || null,
      previewUrl: item.asset?.url || null
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
  const isNew = !id;
  const query = useQuery({
    queryKey: ['admin-product', id],
    enabled: !isNew,
    queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data)
  });
  if (isNew) return <ProductEditorForm id={null} initialProduct={emptyProduct} isNew />;
  if (query.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;
  return <ProductEditorForm key={`${id}:${query.data.version}`} id={id} initialProduct={query.data} isNew={false} />;
}

function ProductEditorForm({ id, initialProduct, isNew }) {
  const router = useRouter();
  const [form, setForm] = useState(() => normalizeProduct(initialProduct));
  const save = useMutation({
    mutationFn: () => (isNew ? browserApi.post('/admin/products', createPayload(form)) : browserApi.patch(`/admin/products/${id}`, payload(form))).then((response) => response.data.data),
    onSuccess: (saved) => {
      setForm(normalizeProduct(saved));
      if (isNew) router.replace(`/admin/products/${saved.id}`);
    }
  });
  const publication = useMutation({
    mutationFn: (status) =>
      browserApi.post(`/admin/products/${id}/publication`, { version: Number(form.version), status, publishAt: status === 'scheduled' ? form.publishAt : null }).then((response) => response.data.data),
    onSuccess: (saved) => setForm(normalizeProduct(saved))
  });

  return (
    <div className="grid gap-5">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]">
        <ChevronLeft size={15} /> Back to products
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-.035em]">{isNew ? 'Add product' : form.translations.en.name || form.slug}</h1><Badge tone={form.status === 'published' ? 'success' : 'neutral'}>{form.status}</Badge></div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{isNew ? 'Use the same complete workspace available when editing a product.' : `SKU: ${form.variants[0]?.sku || 'Not set'} · Version ${form.version}`}</p>
        </div>
        <div className="flex gap-2">
          {!isNew && form.status === 'published' ? <Button variant="secondary" size="sm" asChild><a href={`/${form.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /> Preview</a></Button> : null}
          {!isNew ? <Button variant="secondary" size="sm" loading={publication.isPending} onClick={() => publication.mutate(form.status === 'published' ? 'draft' : 'published')}>{form.status === 'published' ? 'Move to draft' : 'Publish'}</Button> : null}
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}><Save size={15} /> {isNew ? 'Create product' : 'Save changes'}</Button>
        </div>
      </div>

      <nav className="sticky top-[68px] z-20 flex gap-6 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-2 backdrop-blur" aria-label="Product editor sections">
        {[['general', 'General'], ['content', 'Content & SEO'], ['variants', 'Variants & inventory'], ['media', 'Media']].map(([href, label], index) => <a key={href} href={`#${href}`} className={`shrink-0 border-b-2 py-3 text-xs font-semibold ${index === 0 ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}>{label}</a>)}
      </nav>

      <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="grid gap-5"><BaseFields form={form} setForm={setForm} /><TranslationFields form={form} setForm={setForm} /></div>
        <MediaFields form={form} setForm={setForm} />
      </div>
      <VariantFields form={form} setForm={setForm} />

      {save.error || publication.error ? <Alert tone="error">{apiMessage(save.error || publication.error)}</Alert> : null}
      {save.isSuccess ? <Alert tone="success">Product changes saved.</Alert> : null}
      <div className="flex justify-end"><Button loading={save.isPending} onClick={() => save.mutate()}><Save size={16} /> Save product</Button></div>
    </div>
  );
}

function payload(form) {
  const blank = (value) => (value === '' ? null : value);
  const translationPayload = (translation) => Object.fromEntries(Object.entries(translation).map(([key, value]) => [key, ['careText', 'materialText', 'seoTitle', 'seoDescription'].includes(key) ? blank(value) : value || '']));
  return {
    ...form,
    categoryId: blank(form.categoryId),
    brandId: blank(form.brandId),
    publishAt: blank(form.publishAt),
    translations: {
      en: translationPayload(form.translations.en),
      bn: translationPayload(form.translations.bn)
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
    media: form.media.map((item) => ({ mediaId: item.mediaId, role: item.role, displayOrder: item.displayOrder, variantKey: blank(item.variantKey), altEn: blank(item.altEn), altBn: blank(item.altBn) }))
  };
}

function createPayload(form) {
  const base = payload(form);
  return {
    slug: base.slug,
    categoryId: base.categoryId,
    categoryIds: base.categoryIds,
    collectionIds: base.collectionIds,
    brandId: base.brandId,
    type: base.type,
    status: base.status,
    publishAt: base.publishAt,
    featured: base.featured,
    visibility: base.visibility,
    taxClass: base.taxClass,
    shippingProfile: base.shippingProfile,
    translations: base.translations,
    attributes: base.attributes,
    variants: base.variants.map(({ id: _id, clientKey: _clientKey, version: _version, initialStock, ...variant }) => ({ ...variant, stock: initialStock })),
    media: base.media.map(({ variantKey: _variantKey, ...item }) => ({ ...item, variantSku: null }))
  };
}

function BaseFields({ form, setForm }) {
  const update = (key, value) => setForm({ ...form, [key]: value });
  return (
    <Card id="general" className="scroll-mt-32">
      <CardHeader title="Product information" description="Core catalog and publication settings." />
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
    <Card id="content" className="scroll-mt-32">
      <CardHeader title="Product content" description="Customer-facing content in English and Bangla." />
      <CardBody>
        <div className="grid gap-5 lg:grid-cols-2">
          {['en', 'bn'].map((locale) => (
            <fieldset key={locale} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
              <legend className="px-2 font-bold">{locale === 'en' ? 'English' : 'বাংলা'}</legend>
              {Object.keys(emptyTranslation).map((key) => (
                <Field key={key} label={key.replaceAll(/([A-Z])/g, ' $1').toLowerCase()} required={key === 'name'}>
                  {['description', 'careText', 'materialText'].includes(key) ? (
                    <Textarea rows={4} value={form.translations[locale][key] || ''} onChange={(event) => update(locale, key, event.target.value)} />
                  ) : (
                    <Input required={key === 'name'} value={form.translations[locale][key] || ''} onChange={(event) => update(locale, key, event.target.value)} />
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
    <Card id="variants" className="scroll-mt-32">
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
                  required={['sku', 'title', 'regularPrice'].includes(key)}
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
    <Card id="media" className="scroll-mt-32">
      <CardHeader
        title="Managed media"
        description="Choose ready public assets from the media library and provide localized alt text."
        action={<Button variant="outline" onClick={add}>Attach asset</Button>}
      />
      <CardBody className="grid gap-3">
        {form.media.length ? form.media.map((item, index) => (
          <div key={`${item.mediaId}-${index}`} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
            {item.previewUrl ? <div role="img" aria-label={item.altEn || 'Product media preview'} className="aspect-square w-full rounded-lg bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(item.previewUrl)})`, backgroundColor: 'var(--color-surface-muted)' }} /> : <div className="grid aspect-[4/2] place-items-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">Media preview</div>}
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
            <Button size="sm" variant="outline" onClick={() => setForm({ ...form, media: form.media.filter((_, position) => position !== index) })}>Remove</Button>
          </div>
        )) : <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-center"><div><p className="text-sm font-semibold">No images attached</p><p className="mt-1 text-xs text-[var(--color-muted)]">Attach a ready asset from the media library.</p></div></div>}
        <Link href="/admin/media" className="inline-block text-xs font-semibold text-[var(--color-primary)]">Open media library →</Link>
      </CardBody>
    </Card>
  );
}
