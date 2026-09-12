'use client';

import Link from 'next/link';
import { useEffect, forwardRef, useImperativeHandle, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Eye, Save } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, NativeSelect, Skeleton, Textarea, ImageUpload } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { DialogRoot, DialogTrigger, DialogContent } from '@/components/ui/overlay';

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
  stockPolicy: 'deny',
  initialStock: 0,
  lowStockThreshold: 3,
  isDefault: false,
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
  version: 1,
};

function normalizeProduct(product) {
  return {
    ...emptyProduct,
    ...product,
    categoryId: product.categoryId || '',
    brandId: product.brandId || '',
    shippingProfile: (() => {
      const sp = product.shippingProfile;
      if (!sp || typeof sp !== 'object') return { requiresShipping: true, freeShipping: false, shippingClass: null };
      return {
        requiresShipping: Boolean(sp.requiresShipping ?? true),
        freeShipping: Boolean(sp.freeShipping ?? false),
        shippingClass: typeof sp.shippingClass === 'string' ? sp.shippingClass : null,
      };
    })(),
    translations: { en: { ...emptyTranslation, ...(product.translations?.en || {}) }, bn: { ...emptyTranslation, ...(product.translations?.bn || {}) } },
   variants: (product.variants || []).map((variant) => ({
      ...variant,
      clientKey: variant.id || variant.clientKey || crypto.randomUUID(),
      barcode: variant.barcode || '',
      salePrice: variant.salePrice || '',
      costPrice: variant.costPrice || '',
      initialStock: variant.inventory?.[0]?.onHand ?? 0,
      lowStockThreshold: variant.inventory?.[0]?.lowStockThreshold ?? 3,
      attributes: Object.fromEntries(Object.entries(variant.attributes || {}).filter(([k, v]) => typeof k === 'string' && typeof v === 'string')),
    })),
    media: (product.media || []).map((item) => ({
      mediaId: item.mediaId,
      role: item.role,
      displayOrder: item.displayOrder,
      altEn: item.altEn || '',
      altBn: item.altBn || '',
      variantKey: item.variantId || null,
      previewUrl: item.asset?.url || null,
    })),
    attributes: (product.attributes || []).map((item) => ({
      attributeId: item.id,
      variation: item.variation,
      visible: item.visible,
      displayOrder: item.displayOrder,
    })),
  };
}

const splitCsv = (value) => value.split(',').map((part) => part.trim()).filter(Boolean);
const slugify = (text) => text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export const ProductEditor = forwardRef(function ProductEditor({ id, withHeader = false, onActionStateChange }, ref) {
  const isNew = !id;
  const query = useQuery({
    queryKey: ['admin-product', id],
    enabled: !isNew,
    queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data),
  });

  if (isNew) return <ProductEditorForm id={null} initialProduct={emptyProduct} isNew withHeader={withHeader} ref={ref} onActionStateChange={onActionStateChange} />;
  if (query.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;
  return <ProductEditorForm key={`${id}:${query.data.version}`} id={id} initialProduct={query.data} isNew={false} withHeader={withHeader} ref={ref} onActionStateChange={onActionStateChange} />;
});

const ProductEditorForm = forwardRef(function ProductEditorForm({ id, initialProduct, isNew, withHeader = true, onActionStateChange }, ref) {
  const router = useRouter();
  const [form, setForm] = useState(() => normalizeProduct(initialProduct));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(normalizeProduct(initialProduct)));
  const [serverErrors, setServerErrors] = useState({});
  const isDirty = JSON.stringify(form) !== savedSnapshot;
  const [openSections, setOpenSections] = useState({ content: true, variants: true, media: false, advanced: false });
  const categories = useQuery({
    queryKey: ['admin-product-editor-categories'],
    queryFn: () => browserApi.get('/admin/categories', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const brands = useQuery({
    queryKey: ['admin-product-editor-brands'],
    queryFn: () => browserApi.get('/admin/brands', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const collections = useQuery({
    queryKey: ['admin-product-editor-collections'],
    queryFn: () => browserApi.get('/admin/collections', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const media = useQuery({
    queryKey: ['admin-product-editor-media'],
    queryFn: () => browserApi.get('/admin/media', { params: { pageSize: 100 } }).then((response) => response.data.data),
  });
  const save = useMutation({
    onMutate: () => setServerErrors({}),
    mutationFn: () => (isNew ? browserApi.post('/admin/products', createPayload(form)) : browserApi.patch(`/admin/products/${id}`, payload(form))).then((response) => response.data.data),
    onSuccess: (saved) => {
      setServerErrors({});
      const normalized = normalizeProduct(saved);
      setForm(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
      if (isNew) router.replace(`/admin/products/${saved.id}`);
    },
    onError: (error) => {
      const fieldErrors = error?.response?.data?.error?.fieldErrors;
      if (fieldErrors) setServerErrors(fieldErrors);
    },
  });
  const publication = useMutation({
    mutationFn: (status) => browserApi.post(`/admin/products/${id}/publication`, { version: Number(form.version), status, publishAt: status === 'scheduled' ? form.publishAt : null }).then((response) => response.data.data),
    onSuccess: (saved) => setForm(normalizeProduct(saved)),
  });
  const uploadMedia = useMutation({
    mutationFn: (data) => browserApi.post('/admin/media/upload', data).then((response) => response.data.data),
  });

  const toggleSection = (section) => setOpenSections((current) => ({ ...current, [section]: !current[section] }));

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  useImperativeHandle(ref, () => ({
    save: () => save.mutate(),
    publish: () => publication.mutate(form.status === 'published' ? 'draft' : 'published'),
    form,
    isDirty,
    saveState: { isPending: save.isPending, isSuccess: save.isSuccess, error: save.error },
    publicationState: { isPending: publication.isPending, error: publication.error },
  }), [form, isDirty, save, publication]);

   const serverErrorsRef = useRef(serverErrors);
  useEffect(() => { serverErrorsRef.current = serverErrors; }, [serverErrors]);
  const onActionStateChangeRef = useRef(onActionStateChange);
  useEffect(() => { onActionStateChangeRef.current = onActionStateChange; }, [onActionStateChange]);

  useEffect(() => {
    if (onActionStateChangeRef.current) {
      onActionStateChangeRef.current({ savePending: save.isPending, saveSuccess: save.isSuccess, publishPending: publication.isPending, isDirty });
    }
  }, [save.isPending, save.isSuccess, publication.isPending, isDirty]);

  return (
    <div className="grid gap-5">
      {withHeader ? (
        <>
          <Link href="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-primary)]">
            <ChevronLeft size={15} /> Back to products
          </Link>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-[-.035em]">{isNew ? 'Add product' : form.translations.en.name || form.slug}</h1>
                <Badge tone={form.status === 'published' ? 'success' : 'neutral'}>{form.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{isNew ? 'Start with the basics. You can add more detail later.' : `SKU: ${form.variants[0]?.sku || 'Not set'} · Version ${form.version}`}</p>
            </div>
            <div className="flex gap-2">
              {!isNew && form.status === 'published' ? <Button variant="secondary" size="sm" asChild><a href={`/en/product/${form.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /> Preview</a></Button> : null}
              {!isNew ? <Button variant="secondary" size="sm" loading={publication.isPending} onClick={() => publication.mutate(form.status === 'published' ? 'draft' : 'published')}>{form.status === 'published' ? 'Move to draft' : 'Publish'}</Button> : null}
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}><Save size={15} /> {isNew ? 'Create product' : isDirty ? 'Save changes' : 'Saved'}</Button>
            </div>
          </div>
        </>
      ) : null}

      <BasicFields form={form} setForm={setForm} categories={categories.data} brands={brands.data} serverErrors={serverErrors} clearError={() => setServerErrors({})} />

      <Collapsible title="Content & SEO" open={openSections.content} onToggle={() => toggleSection('content')}>
        <TranslationFields form={form} setForm={setForm} serverErrors={serverErrors} clearError={() => setServerErrors({})} />
      </Collapsible>

      <Collapsible title="Pricing & Inventory" open={openSections.variants} onToggle={() => toggleSection('variants')}>
        <VariantFields form={form} setForm={setForm} isNew={isNew} serverErrors={serverErrors} clearError={() => setServerErrors({})} />
      </Collapsible>

      <Collapsible title="Media" open={openSections.media} onToggle={() => toggleSection('media')}>
        <MediaFields form={form} setForm={setForm} mediaLibrary={media.data} uploadMedia={uploadMedia} serverErrors={serverErrors} clearError={() => setServerErrors({})} />
      </Collapsible>

      <Collapsible title="Advanced settings" open={openSections.advanced} onToggle={() => toggleSection('advanced')}>
        <AdvancedFields form={form} setForm={setForm} collections={collections.data} serverErrors={serverErrors} clearError={() => setServerErrors({})} />
      </Collapsible>

      {save.error || publication.error ? <Alert tone="error">{apiMessage(save.error || publication.error)}</Alert> : null}
      {isDirty ? <p className="text-right text-xs font-semibold text-[var(--color-warning)]">You have unsaved changes.</p> : null}
      {save.isSuccess ? <Alert tone="success">Product changes saved.</Alert> : null}
      <div className="flex justify-end"><Button loading={save.isPending} onClick={() => save.mutate()}><Save size={16} /> Save product</Button></div>
    </div>
  );
});

function Collapsible({ title, description, open, onToggle, children }) {
  return (
    <details open={open} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold" onClick={(e) => { e.preventDefault(); onToggle(); }}>
        <span>{title}</span>
        <span className="text-[var(--color-muted)]">{open ? 'Hide' : 'Show'}</span>
      </summary>
      {open ? <div className="border-t border-[var(--color-border)] px-5 py-5">{children}</div> : null}
    </details>
  );
}

function BasicFields({ form, setForm, categories, brands, serverErrors, clearError }) {
  const update = (key, value) => { setForm({ ...form, [key]: value }); clearError(); };
  const onNameChange = (locale, value) => {
    const nextTranslations = { ...form.translations, [locale]: { ...form.translations[locale], name: value } };
    setForm({ ...form, translations: nextTranslations, ...(locale === 'en' && !form.slug && slugify(value) ? { slug: slugify(value) } : {}) });
    clearError();
  };
  const error = (path) => serverErrors[path]?.[0];

  return (
    <Card id="general" className="scroll-mt-32">
      <CardHeader title="Product information" description="The essentials you need to add a product." />
      <CardBody>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Product name (English)" required error={error('translations.en.name')}>
            <Input value={form.translations.en.name || ''} onChange={(event) => onNameChange('en', event.target.value)} placeholder="e.g., Classic Cotton Shirt" />
          </Field>
          <Field label="Product name (Bangla)" required error={error('translations.bn.name')}>
            <Input value={form.translations.bn.name || ''} onChange={(event) => onNameChange('bn', event.target.value)} placeholder="আপনার পণ্যের নাম লিখুন" />
          </Field>
          <Field label="Slug" error={error('slug')}><Input value={form.slug || ''} onChange={(event) => update('slug', event.target.value)} placeholder="auto-generated from name" /></Field>
          <Field label="Product type" error={error('type')}>
            <NativeSelect value={form.type} onChange={(event) => update('type', event.target.value)} options={[{ value: 'simple', label: 'Simple (single variant)' }, { value: 'variable', label: 'Variable (multiple variants)' }]} />
          </Field>
          <Field label="Primary category" required error={error('categoryId')}>
            <NativeSelect value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} options={[{ value: '', label: 'Select category…' }, ...(categories || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }))]} />
          </Field>
          <Field label="Brand" error={error('brandId')}>
            <NativeSelect value={form.brandId} onChange={(event) => update('brandId', event.target.value)} options={[{ value: '', label: 'No brand' }, ...(brands || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }))]} />
          </Field>
          <Field label="Status" error={error('status')}>
            <NativeSelect value={form.status} onChange={(event) => update('status', event.target.value)} options={[{ value: 'draft', label: 'Draft — not visible on storefront' }, { value: 'scheduled', label: 'Scheduled — publish at a future date' }, { value: 'published', label: 'Published — visible immediately' }]} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
            <Checkbox checked={form.featured} onCheckedChange={(value) => update('featured', !!value)} />
            Featured product
          </label>
        </div>
      </CardBody>
    </Card>
  );
}

function TranslationFields({ form, setForm, serverErrors, clearError }) {
  const update = (locale, key, value) => { setForm({ ...form, translations: { ...form.translations, [locale]: { ...form.translations[locale], [key]: value } } }); clearError(); };
  const error = (locale, key) => serverErrors[`translations.${locale}.${key}`]?.[0];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {['en', 'bn'].map((locale) => (
        <fieldset key={locale} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
          <legend className="px-2 font-bold">{locale === 'en' ? 'English' : 'বাংলা'}</legend>
          <Field label="Short description" error={error(locale, 'shortDescription')}>
            <Textarea rows={3} value={form.translations[locale].shortDescription || ''} onChange={(event) => update(locale, 'shortDescription', event.target.value)} placeholder="Brief description shown in listings" />
          </Field>
          <Field label="Description" error={error(locale, 'description')}>
            <Textarea rows={4} value={form.translations[locale].description || ''} onChange={(event) => update(locale, 'description', event.target.value)} placeholder="Detailed description" />
          </Field>
          <Field label="Care instructions" error={error(locale, 'careText')}>
            <Textarea rows={3} value={form.translations[locale].careText || ''} onChange={(event) => update(locale, 'careText', event.target.value)} placeholder="Care and maintenance instructions" />
          </Field>
          <Field label="Materials" error={error(locale, 'materialText')}>
            <Textarea rows={2} value={form.translations[locale].materialText || ''} onChange={(event) => update(locale, 'materialText', event.target.value)} placeholder="Materials and composition" />
          </Field>
          <Field label="SEO title" error={error(locale, 'seoTitle')}>
            <Input value={form.translations[locale].seoTitle || ''} onChange={(event) => update(locale, 'seoTitle', event.target.value)} placeholder="Search engine title" />
          </Field>
          <Field label="SEO description" error={error(locale, 'seoDescription')}>
            <Input value={form.translations[locale].seoDescription || ''} onChange={(event) => update(locale, 'seoDescription', event.target.value)} placeholder="Search engine description" />
          </Field>
        </fieldset>
      ))}
    </div>
  );
}

function VariantFields({ form, setForm, isNew, serverErrors, clearError }) {
  const update = (index, key, value) => { setForm({ ...form, variants: form.variants.map((variant, position) => (position === index ? { ...variant, [key]: value } : key === 'isDefault' && value ? { ...variant, isDefault: false } : variant)) }); clearError(); };
  const remove = (index) => { setForm({ ...form, variants: form.variants.filter((_, position) => position !== index) }); clearError(); };
  const error = (key) => serverErrors[`variants.0.${key}`]?.[0];

  return (
    <div className="grid gap-4">
      {form.variants.map((variant, index) => (
        <fieldset key={variant.id || variant.clientKey} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 md:grid-cols-4">
          <legend className="px-2 font-bold">{variant.sku || `Variant ${index + 1}`}</legend>
          <Field label="SKU" required error={error('sku')}>
            <Input value={variant.sku || ''} onChange={(event) => update(index, 'sku', event.target.value)} placeholder="e.g., TSHIRT-BLK-S" />
          </Field>
          <Field label="Title" required error={error('title')}>
            <Input value={variant.title || ''} onChange={(event) => update(index, 'title', event.target.value)} />
          </Field>
          <Field label="Regular price (BDT)" required error={error('regularPrice')}>
            <Input value={variant.regularPrice || ''} inputMode="decimal" onChange={(event) => update(index, 'regularPrice', event.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Sale price (BDT)" error={error('salePrice')}>
            <Input value={variant.salePrice || ''} inputMode="decimal" onChange={(event) => update(index, 'salePrice', event.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Cost price (BDT)" error={error('costPrice')}>
            <Input value={variant.costPrice || ''} inputMode="decimal" onChange={(event) => update(index, 'costPrice', event.target.value)} placeholder="Optional" />
          </Field>
          {variant.stockPolicy !== 'available' ? (
            <Field label="Stock quantity" error={error('initialStock')}>
              <Input type="number" min="0" value={variant.initialStock ?? 0} onChange={(event) => update(index, 'initialStock', Number(event.target.value))} />
            </Field>
          ) : null}
          <Field label="Stock policy" error={error('stockPolicy')}>
            <NativeSelect value={variant.stockPolicy} onChange={(event) => update(index, 'stockPolicy', event.target.value)} options={[{ value: 'deny', label: 'Deny' }, { value: 'allow_backorder', label: 'Allow backorder' }, { value: 'preorder', label: 'Preorder' }, { value: 'available', label: 'Available' }]} />
          </Field>
          <Field label="Low stock threshold" error={error('lowStockThreshold')}>
            <Input type="number" min="0" value={variant.lowStockThreshold ?? 0} onChange={(event) => update(index, 'lowStockThreshold', Number(event.target.value))} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
            <Checkbox checked={variant.isDefault} onCheckedChange={(value) => update(index, 'isDefault', !!value)} />
            Default variant
          </label>
          {form.variants.length > 1 ? <Button variant="outline" onClick={() => remove(index)}>Archive on save</Button> : null}
        </fieldset>
      ))}
      {form.type === 'variable' ? <Button variant="outline" onClick={() => { setForm({ ...form, variants: [...form.variants, newVariant()] }); clearError(); }}>Add variant</Button> : null}
    </div>
  );
}

function MediaFields({ form, setForm, mediaLibrary, uploadMedia, serverErrors, clearError }) {
  const add = (asset = null) => { setForm({ ...form, media: [...form.media, { mediaId: asset?.id || '', role: form.media.length ? 'gallery' : 'primary', displayOrder: form.media.length, altEn: '', altBn: '', variantKey: null, previewUrl: asset?.url || null }] }); clearError(); };
  const update = (index, key, value) => { setForm({ ...form, media: form.media.map((item, position) => (position === index ? { ...item, [key]: value } : item)) }); clearError(); };

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMedia = mediaLibrary?.filter(item => 
    item.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.altText?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleMediaSelect = (mediaItem) => {
    const isSelected = selectedMedia.some(item => item.id === mediaItem.id);
    if (isSelected) {
      setSelectedMedia(selectedMedia.filter(item => item.id !== mediaItem.id));
    } else {
      setSelectedMedia([...selectedMedia, mediaItem]);
    }
  };

  const attachSelectedMedia = () => {
    setForm((prev) => {
      const newMediaItems = selectedMedia.map((item, index) => ({
        mediaId: item.id || '',
        role: prev.media.length === 0 && selectedMedia.length === 1 && index === 0 ? 'primary' : 'gallery',
        displayOrder: prev.media.length + index,
        altEn: item.altText || '',
        altBn: item.altText || '',
        variantKey: null,
        previewUrl: item.url || null,
      }));
      return { ...prev, media: [...prev.media, ...newMediaItems] };
    });
    setSelectedMedia([]);
    setMediaModalOpen(false);
    setSearchTerm('');
    clearError();
  };

  const modalFooter = (
    <>
      <Button variant="outline" onClick={() => { setMediaModalOpen(false); clearError(); }}>Cancel</Button>
      <Button variant="primary" onClick={attachSelectedMedia} disabled={selectedMedia.length === 0}>
        Attach Selected ({selectedMedia.length})
      </Button>
    </>
  );

  const error = (key) => serverErrors[`media.0.${key}`]?.[0];

  return (
    <div className="grid gap-5">
      <div className="mb-2">
        <Field label="Upload new images">
          <ImageUpload
            multiple={true}
            label=""
            hint="Supports JPEG, PNG, WebP, AVIF formats. Max 10MB per image."
            onUpload={async (file) => {
              const data = new FormData();
              data.append('file', file);
              data.append('privacy', 'public');
              return uploadMedia.mutateAsync(data);
            }}
            uploading={uploadMedia.isPending}
            onChange={(images) => {
              if (images.length > 0) {
                setForm((prev) => {
                  const newMedia = images.map((image, index) => ({
                    mediaId: image.id || '',
                    role: prev.media.length === 0 && index === 0 ? 'primary' : 'gallery',
                    displayOrder: prev.media.length + index,
                    altEn: '',
                    altBn: '',
                    previewUrl: image.url || null,
                  }));
                  return { ...prev, media: [...prev.media, ...newMedia] };
                });
                clearError();
              }
            }}
          />
        </Field>
      </div>

      {form.media.length ? (
        <div className="grid gap-4">
          {form.media.map((item, index) => (
            <div key={`${item.mediaId}-${index}`} className="grid gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-[140px_1fr_auto] md:items-start">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.altEn || 'Media preview'} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs text-[var(--color-muted)]">No image</div>
                )}
              </div>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold uppercase tracking-wider ${item.role === 'primary' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' : 'bg-[var(--color-surface-muted)] text-[var(--color-muted)]'}`}>
                    {item.role}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="English alt" error={error('altEn')}>
                    <Input value={item.altEn || ''} onChange={(event) => update(index, 'altEn', event.target.value)} placeholder="Alt text" />
                  </Field>
                  <Field label="Bangla alt" error={error('altBn')}>
                    <Input value={item.altBn || ''} onChange={(event) => update(index, 'altBn', event.target.value)} placeholder="Alt text" />
                  </Field>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setForm({ ...form, media: form.media.filter((_, position) => position !== index) }); clearError(); }} className="self-start">Remove</Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-center">
          <div>
            <p className="text-sm font-semibold">No images attached</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Upload images directly or use the media library below.</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => { setMediaModalOpen(true); clearError(); }}>
          Browse Media Library
        </Button>
      </div>

      <DialogRoot open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogTrigger asChild>
          <div className="hidden" />
        </DialogTrigger>
        <DialogContent title="Media Library" description="Select media assets to attach to this product" size="lg" footer={modalFooter}>
          <div className="space-y-4">
            <Field label="Search media">
              <Input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); clearError(); }}
                placeholder="Search by filename or alt text..."
              />
            </Field>
            
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 max-h-[60vh] overflow-y-auto">
              {filteredMedia.length > 0 ? (
                filteredMedia.map((item) => {
                  const isSelected = selectedMedia.some(selItem => selItem.id === item.id);
                  return (
                    <label key={item.id} className={`relative group aspect-square overflow-hidden rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { handleMediaSelect(item); clearError(); }}
                        className="sr-only"
                      />
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/50 opacity-0 group-hover:bg-[var(--color-primary)]/20 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {isSelected ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--color-muted)]" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <circle cx="10" cy="10" r="9" strokeWidth="2" />
                          </svg>
                        )}
                      </div>
                      {item.url ? (
                        <img 
                          src={item.url} 
                          alt="" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-muted)] text-xs">
                          No preview
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-xs text-[var(--color-muted)] bg-[var(--color-surface)]/80 backdrop-blur truncate">
                        {item.originalName || 'Unnamed'}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8">
                  {searchTerm ? (
                    <p>No media found matching &quot;{searchTerm}&quot;</p>
                  ) : (
                    <p>No media items found in library</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}

function AdvancedFields({ form, setForm, collections, serverErrors, clearError }) {
  const update = (key, value) => { setForm({ ...form, [key]: value }); clearError(); };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Visibility" error={serverErrors?.visibility}>
        <NativeSelect value={form.visibility} onChange={(event) => update('visibility', event.target.value)} options={['catalog_search', 'catalog', 'search', 'hidden'].map((value) => ({ value, label: value }))} />
      </Field>
      <Field label="Tax class" error={serverErrors?.taxClass}>
        <Input value={form.taxClass || ''} onChange={(event) => update('taxClass', event.target.value)} placeholder="standard" />
      </Field>
      <Field label="Collection IDs (comma separated)" error={serverErrors?.collectionIds}>
        <Input value={form.collectionIds.join(', ')} onChange={(event) => update('collectionIds', splitCsv(event.target.value))} placeholder="e.g., 123, 456" />
      </Field>
      <Field label="Additional category IDs (comma separated)" error={serverErrors?.categoryIds}>
        <Input value={form.categoryIds.join(', ')} onChange={(event) => update('categoryIds', splitCsv(event.target.value))} placeholder="e.g., 123, 456" />
      </Field>
      <Field label="Attributes (key:value, comma separated)" error={serverErrors?.attributes}>
        <Input value={form.attributes.map((item) => `${item.attributeId || ''}:${item.variation ? 'variation' : 'visible'}`).join(', ')} onChange={(event) => update('attributes', splitCsv(event.target.value).map((part) => { const [id, flag] = part.split(':'); return { attributeId: id, variation: flag === 'variation' }; }))} placeholder="e.g., 123:variation, 456:visible" />
      </Field>
      <Field label="Publish at" error={serverErrors?.publishAt}>
        <Input type="datetime-local" value={form.publishAt || ''} onChange={(event) => update('publishAt', event.target.value)} />
      </Field>
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
      bn: translationPayload(form.translations.bn),
    },
    variants: form.variants.map((variant) => ({
      ...variant,
      barcode: blank(variant.barcode),
      salePrice: blank(variant.salePrice),
      costPrice: blank(variant.costPrice),
      weightGrams: variant.weightGrams === '' ? null : variant.weightGrams == null ? null : Number(variant.weightGrams),
      lowStockThreshold: Number(variant.lowStockThreshold || 0),
      ...(variant.stockPolicy !== 'available' ? { initialStock: Number(variant.initialStock || 0) } : {}),
    })),
    media: form.media.map((item) => ({ mediaId: item.mediaId, role: item.role, displayOrder: item.displayOrder, variantKey: blank(item.variantKey), altEn: blank(item.altEn), altBn: blank(item.altBn) })),
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
    variants: base.variants.map(({ id: _id, clientKey: _clientKey, version: _version, initialStock, ...variant }) => ({ ...variant, ...(variant.stockPolicy !== 'available' && { stock: initialStock }) })),
    media: base.media.map(({ variantKey: _variantKey, ...item }) => ({ ...item, variantSku: null })),
  };
}
