'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Circle, X } from 'lucide-react';
import { Alert, Badge, Button, Checkbox, Combobox, Field, Input, MultiSelect, NativeSelect, Skeleton, Textarea } from '@/components/ui';
import { Card, CardBody } from '@/components/ui';
import { successToast, errorToast } from '@/components/ui/toast';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { MediaSection } from './products/media-section';
import { VariantSection } from './products/variant-section';
import { useUnsavedGuard } from './products/use-unsaved-guard';
import { useMinProductImages } from './products/use-min-images';
import {
  MAX_RELATED,
  buildPayload,
  describeServerChanges,
  emptyProduct,
  fieldId,
  isVersionConflict,
  labelForPath,
  mapFieldErrors,
  normalizeProduct,
  publishReadiness,
  rebaseOnto,
  sectionForPath,
  slugify,
  snapshotOf,
  sortErrorPaths,
  validateProduct,
} from './products/product-logic';

const VISIBILITY = [
  { value: 'catalog_search', label: 'Catalog and search' },
  { value: 'catalog', label: 'Catalog only' },
  { value: 'search', label: 'Search only' },
  { value: 'hidden', label: 'Hidden (direct link only)' },
];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft: not visible on the storefront' },
  { value: 'scheduled', label: 'Scheduled: goes live at a set time' },
  { value: 'published', label: 'Published: visible now' },
];

/** Loads every page of a list endpoint (the API caps pageSize at 100). */
async function fetchAll(path, params = {}) {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await browserApi.get(path, { params: { ...params, page, pageSize: 100 } });
    rows.push(...(response.data.data || []));
    if (page >= (response.data.meta?.pageCount || 1)) break;
  }
  return rows;
}

const taxonomyOptions = (list, selected = []) => {
  const options = (list || []).map((item) => ({ value: item.id, label: item.translations?.en?.name || item.slug }));
  const known = new Set(options.map((option) => option.value));
  for (const id of selected) if (id && !known.has(id) && list) options.push({ value: id, label: 'Archived or unavailable' });
  return options;
};

export const ProductEditor = forwardRef(function ProductEditor({ id, onActionStateChange, focusPath }, ref) {
  const isNew = !id;
  const [mountedAt] = useState(() => Date.now());
  const query = useQuery({
    queryKey: ['admin-product', id],
    enabled: !isNew,
    refetchOnMount: 'always',
    queryFn: () => browserApi.get(`/admin/products/${id}`).then((response) => response.data.data),
  });

  if (isNew) return <ProductEditorForm id={null} initialProduct={emptyProduct()} ref={ref} onActionStateChange={onActionStateChange} focusPath={focusPath} />;
  if (query.error && !query.data) return <Alert tone="error">{apiMessage(query.error, 'Could not load this product.')}</Alert>;
  // Wait for a fetch that started after mount so a cached, older version never seeds the form.
  if (!query.data || query.dataUpdatedAt < mountedAt) {
    return <Card><CardBody><Skeleton className="h-40" /></CardBody></Card>;
  }
  return <ProductEditorForm key={id} id={id} initialProduct={query.data} ref={ref} onActionStateChange={onActionStateChange} focusPath={focusPath} />;
});

const ProductEditorForm = forwardRef(function ProductEditorForm({ id, initialProduct, onActionStateChange, focusPath }, ref) {
  const isNew = !id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canCost = Boolean(permissions?.includes('catalog.cost'));
  const canPublish = Boolean(permissions?.includes('catalog.publish'));
  const [form, setForm] = useState(() => (isNew ? initialProduct : normalizeProduct(initialProduct)));
  const baselineRef = useRef(form);
  const [snapshot, setSnapshot] = useState(() => snapshotOf(form));
  const [submitted, setSubmitted] = useState(false);
  const [serverState, setServerState] = useState({ errors: {}, message: '', at: null });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [conflict, setConflict] = useState(null);
  const [open, setOpen] = useState({ general: true, content: true, variants: true, media: true, fashion: false, relations: false, advanced: false });
  const summaryRef = useRef(null);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const [initialStatus, setInitialStatus] = useState(form.status);

  const currentSnapshot = useMemo(() => snapshotOf(form), [form]);
  const isDirty = currentSnapshot !== snapshot;
  const { dialog: leaveDialog } = useUnsavedGuard(isDirty);

  // Server errors describe the data that was submitted; drop them as soon as the user edits anything.
  const serverErrors = serverState.at === currentSnapshot ? serverState.errors : {};
  const clientErrors = useMemo(() => (submitted ? validateProduct(form) : {}), [submitted, form]);
  const errors = { ...serverErrors, ...clientErrors };
  const errorPaths = sortErrorPaths(Object.keys(errors).filter((path) => path !== '_form'));
  const formMessage = serverState.at === currentSnapshot ? serverState.message : '';

  const categories = useQuery({ queryKey: ['admin-editor', 'categories'], queryFn: () => fetchAll('/admin/categories', { status: 'active' }) });
  const brands = useQuery({ queryKey: ['admin-editor', 'brands'], queryFn: () => fetchAll('/admin/brands', { status: 'active' }) });
  const collections = useQuery({ queryKey: ['admin-editor', 'collections'], queryFn: () => fetchAll('/admin/collections', { status: 'active' }) });
  // Size charts may not be exposed yet; the editor then shows the assigned ones read-only.
  const sizeCharts = useQuery({ queryKey: ['admin-editor', 'size-charts'], retry: false, queryFn: () => fetchAll('/admin/size-charts') });
  const attributes = useQuery({ queryKey: ['admin-editor', 'attributes'], queryFn: () => browserApi.get('/admin/attributes').then((response) => response.data.data) });

  const jumpTo = useCallback((path) => {
    const section = sectionForPath(path);
    setOpen((current) => ({ ...current, [section]: true }));
    const attempt = (triesLeft) => {
      const element = document.getElementById(fieldId(path)) || document.getElementById(`section-${section}`);
      if (!element && triesLeft > 0) { requestAnimationFrame(() => attempt(triesLeft - 1)); return; }
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      element?.focus?.({ preventScroll: true });
    };
    requestAnimationFrame(() => attempt(5));
  }, []);

  useEffect(() => {
    if (!focusPath) return undefined;
    const timer = setTimeout(() => jumpTo(focusPath), 0);
    return () => clearTimeout(timer);
    // Only on mount: a "Fix" link from the view page opens the editor at the right section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusFirst = useCallback((found) => {
    const [first] = sortErrorPaths(Object.keys(found).filter((path) => path !== '_form'));
    if (first) jumpTo(first);
    else summaryRef.current?.focus();
  }, [jumpTo]);

  const adopt = useCallback((saved) => {
    const normalized = normalizeProduct(saved);
    baselineRef.current = normalized;
    setInitialStatus(normalized.status);
    setForm(normalized);
    setSnapshot(snapshotOf(normalized));
    setConflict(null);
    setServerState({ errors: {}, message: '', at: null });
    queryClient.setQueryData(['admin-product', saved.id], saved);
    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    return normalized;
  }, [queryClient]);

  const handleConflict = useCallback(async () => {
    setConflict({ loading: true });
    try {
      const latest = normalizeProduct((await browserApi.get(`/admin/products/${id}`)).data.data);
      setConflict({ latest, changes: describeServerChanges(baselineRef.current, latest) });
    } catch (error) {
      setConflict(null);
      setServerState({ errors: {}, message: apiMessage(error, 'This product changed and the latest version could not be loaded.'), at: snapshotOf(formRef.current) });
    }
    summaryRef.current?.focus();
  }, [id]);

  const failure = useCallback((error, fallback) => {
    const mapped = mapFieldErrors(error?.response?.data?.error?.fieldErrors);
    const message = apiMessage(error, fallback);
    setServerState({ errors: mapped, message, at: snapshotOf(formRef.current) });
    setSubmitted(true);
    errorToast(fallback, message);
    if (Object.keys(mapped).length) focusFirst(mapped);
    else requestAnimationFrame(() => summaryRef.current?.focus());
  }, [focusFirst]);

  const save = useMutation({
    mutationFn: async () => {
      const body = buildPayload(formRef.current, { isNew, canCost });
      const response = isNew ? await browserApi.post('/admin/products', body) : await browserApi.patch(`/admin/products/${id}`, body);
      return response.data.data;
    },
    onSuccess: (saved) => {
      if (isNew) {
        // Mark clean first so the leave guard does not trigger on the redirect.
        setSnapshot(snapshotOf(formRef.current));
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        successToast('Product created', 'You can keep adding detail, images and related products.');
        router.replace(`/admin/products/${saved.id}?mode=edit`);
        return;
      }
      adopt(saved);
      successToast('Changes saved');
    },
    onError: (error) => {
      if (!isNew && isVersionConflict(error)) { handleConflict(); return; }
      failure(error, isNew ? 'Could not create the product' : 'Could not save the product');
    },
  });

  const publication = useMutation({
    mutationFn: ({ status, version }) => browserApi.post(`/admin/products/${id}/publication`, { version: Number(version), status, publishAt: null }).then((response) => response.data.data),
    onSuccess: (saved, { status }) => {
      adopt(saved);
      successToast(status === 'published' ? 'Product published' : 'Moved to draft');
    },
    onError: (error) => {
      if (isVersionConflict(error)) { handleConflict(); return; }
      failure(error, 'Could not change publication');
    },
  });

  const runSave = useCallback(async () => {
    if (save.isPending || publication.isPending) return null;
    const found = validateProduct(formRef.current);
    setSubmitted(true);
    if (Object.keys(found).length) {
      focusFirst(found);
      errorToast('Fix the highlighted fields', `${Object.keys(found).length} problem${Object.keys(found).length === 1 ? '' : 's'} need attention before saving.`);
      return null;
    }
    try { return await save.mutateAsync(); } catch { return null; }
  }, [focusFirst, publication.isPending, save]);

  const runPublish = useCallback(async () => {
    if (isNew || save.isPending || publication.isPending) return;
    const target = formRef.current.status === 'published' ? 'draft' : 'published';
    let version = formRef.current.version;
    // Publication acts on the stored product, so unsaved edits are saved first and never silently dropped.
    if (snapshotOf(formRef.current) !== snapshot) {
      const saved = await runSave();
      if (!saved) return;
      version = saved.version;
    }
    publication.mutate({ status: target, version });
  }, [isNew, publication, runSave, save.isPending, snapshot]);

  // Ctrl/Cmd+S saves from anywhere in the form.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); runSave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runSave]);

  useImperativeHandle(ref, () => ({ save: () => runSave(), publish: () => runPublish() }), [runSave, runPublish]);

  const onActionStateChangeRef = useRef(onActionStateChange);
  useEffect(() => { onActionStateChangeRef.current = onActionStateChange; }, [onActionStateChange]);
  useEffect(() => {
    onActionStateChangeRef.current?.({ savePending: save.isPending, publishPending: publication.isPending, isDirty, status: form.status, hasConflict: Boolean(conflict) });
  }, [save.isPending, publication.isPending, isDirty, form.status, conflict]);

  const minImages = useMinProductImages();
  const blockers = useMemo(() => publishReadiness(form, { minImages }).filter((check) => !check.ok), [form, minImages]);
  const toggle = (key) => setOpen((current) => ({ ...current, [key]: !current[key] }));
  const sectionErrors = (key) => errorPaths.filter((path) => sectionForPath(path) === key).length;
  const busy = save.isPending || publication.isPending;

  const categoryOptions = taxonomyOptions(categories.data, [form.categoryId]);

  return (
    <div className="grid gap-5">
      {leaveDialog}

      {conflict?.latest ? (
        <Alert tone="warning" title="This product changed while you were editing">
          <div ref={summaryRef} tabIndex={-1} className="grid gap-2 outline-none">
            <p>Someone else saved version {conflict.latest.version}. Your edits were not saved.</p>
            {conflict.changes.length ? <ul className="list-disc pl-5 text-xs">{conflict.changes.slice(0, 8).map((change) => <li key={change}>{change}</li>)}{conflict.changes.length > 8 ? <li>and {conflict.changes.length - 8} more</li> : null}</ul> : <p className="text-xs">Details such as images, relations or inventory changed.</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => { const latest = conflict.latest; baselineRef.current = latest; setForm(latest); setSnapshot(snapshotOf(latest)); setConflict(null); setSubmitted(false); queryClient.invalidateQueries({ queryKey: ['admin-product', id] }); }}>Discard my edits and load latest</Button>
              <Button size="sm" onClick={() => { const { form: rebased, dropped } = rebaseOnto(formRef.current, conflict.latest); baselineRef.current = conflict.latest; setForm(rebased); setConflict(null); if (dropped.length) errorToast('Some variants were removed', `${dropped.join(', ')} no longer exist and were dropped from your edits.`); else successToast('Edits kept', 'Review the form, then save again to overwrite the other changes.'); }}>Keep my edits on top of the latest</Button>
            </div>
          </div>
        </Alert>
      ) : null}
      {conflict?.loading ? <Alert tone="warning">This product changed elsewhere. Loading the latest version…</Alert> : null}

      {(errorPaths.length || formMessage) && !conflict ? (
        <div ref={summaryRef} tabIndex={-1} className="outline-none">
          <Alert tone="error" title={errorPaths.length ? `Fix ${errorPaths.length} problem${errorPaths.length === 1 ? '' : 's'} to continue` : 'The product could not be saved'}>
            {formMessage && !errorPaths.some((path) => errors[path] === formMessage) ? <p>{formMessage}</p> : null}
            {errorPaths.length ? (
              <ul className="mt-1 grid gap-1 text-sm">
                {errorPaths.slice(0, 10).map((path) => (
                  <li key={path}><button type="button" className="text-left underline underline-offset-2" onClick={() => jumpTo(path)}>{labelForPath(path)}: {errors[path]}</button></li>
                ))}
                {errorPaths.length > 10 ? <li>and {errorPaths.length - 10} more</li> : null}
              </ul>
            ) : null}
          </Alert>
        </div>
      ) : null}

      <Section id="general" title="Product information" description="Names, category and publication." open={open.general} onToggle={() => toggle('general')} errorCount={sectionErrors('general')}>
        <BasicFields form={form} setForm={setForm} errors={errors} categoryOptions={categoryOptions} brands={taxonomyOptions(brands.data, [form.brandId])} slugTouched={slugTouched} setSlugTouched={setSlugTouched} isNew={isNew} blockers={blockers} onFix={jumpTo} canPublish={canPublish} initialStatus={initialStatus} />
      </Section>

      <Section id="content" title="Content and SEO" description="Descriptions shown on the product page, in English and Bangla." open={open.content} onToggle={() => toggle('content')} errorCount={sectionErrors('content')}>
        <TranslationFields form={form} setForm={setForm} errors={errors} />
      </Section>

      <Section id="variants" title="Pricing and inventory" description="Prices in BDT, stock and variants." open={open.variants} onToggle={() => toggle('variants')} errorCount={sectionErrors('variants')}>
        <VariantSection form={form} setForm={setForm} errors={errors} attributes={attributes.data} attributesState={attributes} canCost={canCost} />
        <div className="mt-5 border-t border-[var(--color-border)] pt-5">
          <SizeChartField form={form} setForm={setForm} errors={errors} sizeCharts={sizeCharts} />
        </div>
      </Section>

      <Section id="media" title="Images" description="Order, primary image, alt text and per-variant images." open={open.media} onToggle={() => toggle('media')} errorCount={sectionErrors('media')}>
        <MediaSection form={form} setForm={setForm} errors={errors} status={form.status} />
      </Section>

      <Section id="fashion" title="Fit and fashion details" description="Size confidence shown to shoppers." open={open.fashion} onToggle={() => toggle('fashion')} errorCount={sectionErrors('fashion')}>
        <FashionFields form={form} setForm={setForm} errors={errors} />
      </Section>

      <Section id="relations" title="Related products" description="You may also like, and complete the look." open={open.relations} onToggle={() => toggle('relations')} errorCount={sectionErrors('relations')}>
        {isNew ? <p className="text-sm text-[var(--color-muted)]">Create the product first. Related products can be linked right after.</p> : <RelationFields form={form} setForm={setForm} productId={id} />}
      </Section>

      <Section id="advanced" title="Advanced settings" description="Visibility, extra categories, collections, shipping and attributes." open={open.advanced} onToggle={() => toggle('advanced')} errorCount={sectionErrors('advanced')}>
        <AdvancedFields form={form} setForm={setForm} errors={errors} categoryOptions={categoryOptions} collectionOptions={taxonomyOptions(collections.data, form.collectionIds)} />
      </Section>

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-md)]">
        <p className={`text-xs font-semibold ${isDirty ? 'text-[var(--color-warning)]' : 'text-[var(--color-muted)]'}`} role="status">
          {isDirty ? 'You have unsaved changes.' : isNew ? 'Nothing entered yet.' : 'All changes saved.'}
          {blockers.length && form.status !== 'published' ? <span className="ml-2 font-normal text-[var(--color-muted)]">{blockers.length} thing{blockers.length === 1 ? '' : 's'} to fix before publishing.</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && canPublish && form.status !== 'published' ? <Button variant="secondary" loading={publication.isPending} disabled={busy || Boolean(conflict)} onClick={() => runPublish()}>{isDirty ? 'Save & publish' : 'Publish'}</Button> : null}
          <Button loading={save.isPending} disabled={busy || Boolean(conflict) || (!isNew && !isDirty)} onClick={() => runSave()}>{isNew ? 'Create product' : 'Save changes'}</Button>
        </div>
      </div>
    </div>
  );
});

function Section({ id, title, description, open, onToggle, errorCount, children }) {
  return (
    <details id={`section-${id}`} open={open} tabIndex={-1} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4" onClick={(event) => { event.preventDefault(); onToggle(); }}>
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold">{title}{errorCount ? <Badge tone="danger">{errorCount} to fix</Badge> : null}</span>
          {description ? <span className="mt-0.5 block text-xs font-normal text-[var(--color-muted)]">{description}</span> : null}
        </span>
        <span className="shrink-0 text-xs font-semibold text-[var(--color-muted)]">{open ? 'Hide' : 'Show'}</span>
      </summary>
      {open ? <div className="border-t border-[var(--color-border)] px-5 py-5">{children}</div> : null}
    </details>
  );
}

function BasicFields({ form, setForm, errors, categoryOptions, brands, slugTouched, setSlugTouched, isNew, blockers, onFix, canPublish, initialStatus }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const onNameChange = (locale, value) => setForm((current) => ({
    ...current,
    translations: { ...current.translations, [locale]: { ...current.translations[locale], name: value } },
    // The slug follows the English name until the user edits it. Existing products never auto-change (it creates a redirect).
    ...(locale === 'en' && !slugTouched ? { slug: slugify(value) } : {}),
  }));
  const published = form.status === 'published' || form.status === 'scheduled';
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Product name (English)" required htmlFor={fieldId('translations.en.name')} error={errors['translations.en.name']}>
          <Input value={form.translations.en.name} onChange={(event) => onNameChange('en', event.target.value)} placeholder="e.g. Classic Cotton Shirt" />
        </Field>
        <Field label="Product name (Bangla)" required htmlFor={fieldId('translations.bn.name')} error={errors['translations.bn.name']}>
          <Input value={form.translations.bn.name} onChange={(event) => onNameChange('bn', event.target.value)} placeholder="আপনার পণ্যের নাম লিখুন" lang="bn" />
        </Field>
        <Field label="Slug" htmlFor={fieldId('slug')} error={errors.slug} hint={form.slug ? `Storefront address: /product/${form.slug}${isNew ? '' : '. Changing it adds a redirect from the old address.'}` : 'Generated from the English name.'}>
          <Input value={form.slug} onChange={(event) => { setSlugTouched(true); update('slug', event.target.value.toLowerCase()); }} placeholder="auto-generated from name" />
        </Field>
        <Field label="Product type" htmlFor={fieldId('type')} error={errors.type} hint={form.type === 'variable' ? 'Variable products have options such as size and colour.' : 'Simple products have one price and one stock count.'}>
          <NativeSelect value={form.type} onChange={(event) => update('type', event.target.value)} options={[{ value: 'simple', label: 'Simple (single variant)' }, { value: 'variable', label: 'Variable (multiple variants)' }]} />
        </Field>
        <Field label="Primary category" required={published} htmlFor={fieldId('categoryId')} error={errors.categoryId}>
          <Combobox value={form.categoryId || null} onChange={(value) => update('categoryId', value || '')} options={categoryOptions} placeholder="Select category…" searchPlaceholder="Search categories" />
        </Field>
        <Field label="Brand" htmlFor={fieldId('brandId')} error={errors.brandId}>
          <Combobox value={form.brandId || null} onChange={(value) => update('brandId', value || '')} options={brands} placeholder="No brand" searchPlaceholder="Search brands" />
        </Field>
        <Field label="Status" htmlFor={fieldId('status')} error={errors.status}>
          <NativeSelect value={form.status} onChange={(event) => update('status', event.target.value)} options={STATUS_OPTIONS.map((option) => ({ ...option, disabled: !canPublish && option.value !== initialStatus }))} />
        </Field>
        {form.status === 'scheduled' ? (
          <Field label="Go live at" required htmlFor={fieldId('publishAt')} error={errors.publishAt} hint="Your local time.">
            <Input type="datetime-local" value={form.publishAt} onChange={(event) => update('publishAt', event.target.value)} />
          </Field>
        ) : null}
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
          <Checkbox checked={form.featured} onCheckedChange={(value) => update('featured', Boolean(value))} />
          Featured product
        </label>
      </div>
      {form.status === 'draft' && blockers.length ? (
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3 text-xs">
          <p className="font-semibold">Before this can be published</p>
          <ul className="mt-1 grid gap-0.5">{blockers.map((blocker) => <li key={blocker.id} className="flex flex-wrap items-center gap-1.5 text-[var(--color-muted)]"><Circle size={10} aria-hidden="true" />{blocker.message}<button type="button" className="font-semibold text-[var(--color-primary)] underline underline-offset-2" onClick={() => onFix(blocker.path)}>Fix</button></li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

const countHint = (value, max, recommended) => `${(value || '').length}/${max}${recommended ? `, about ${recommended} works best` : ''}`;

function TranslationFields({ form, setForm, errors }) {
  const update = (locale, key, value) => setForm((current) => ({ ...current, translations: { ...current.translations, [locale]: { ...current.translations[locale], [key]: value } } }));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {['en', 'bn'].map((locale) => {
        const t = form.translations[locale];
        const at = (key) => `translations.${locale}.${key}`;
        const bn = locale === 'bn';
        return (
          <fieldset key={locale} className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4" lang={locale}>
            <legend className="px-2 font-bold">{bn ? 'বাংলা (Bangla)' : 'English'}</legend>
            <Field label="Short description" htmlFor={fieldId(at('shortDescription'))} error={errors[at('shortDescription')]} hint={countHint(t.shortDescription, 2000)}>
              <Textarea rows={3} value={t.shortDescription} onChange={(event) => update(locale, 'shortDescription', event.target.value)} placeholder={bn ? 'তালিকায় দেখানো সংক্ষিপ্ত বিবরণ' : 'Brief description shown in listings'} />
            </Field>
            <Field label="Description" htmlFor={fieldId(at('description'))} error={errors[at('description')]}>
              <Textarea rows={5} value={t.description} onChange={(event) => update(locale, 'description', event.target.value)} />
            </Field>
            <Field label="Care instructions" htmlFor={fieldId(at('careText'))} error={errors[at('careText')]}>
              <Textarea rows={3} value={t.careText} onChange={(event) => update(locale, 'careText', event.target.value)} />
            </Field>
            <Field label="Materials and composition" htmlFor={fieldId(at('materialText'))} error={errors[at('materialText')]} hint="For example: 100% cotton, 180 GSM.">
              <Textarea rows={2} value={t.materialText} onChange={(event) => update(locale, 'materialText', event.target.value)} />
            </Field>
            <Field label="SEO title" htmlFor={fieldId(at('seoTitle'))} error={errors[at('seoTitle')]} hint={countHint(t.seoTitle, 255, 60)}>
              <Input value={t.seoTitle} onChange={(event) => update(locale, 'seoTitle', event.target.value)} placeholder="Defaults to the product name" />
            </Field>
            <Field label="SEO description" htmlFor={fieldId(at('seoDescription'))} error={errors[at('seoDescription')]} hint={countHint(t.seoDescription, 500, 160)}>
              <Textarea rows={2} value={t.seoDescription} onChange={(event) => update(locale, 'seoDescription', event.target.value)} placeholder="Shown in search results" />
            </Field>
          </fieldset>
        );
      })}
    </div>
  );
}

/** Size confidence fields shown on the storefront (BR-CAT-002). */
function FashionFields({ form, setForm, errors }) {
  const fashion = form.fashion || {};
  const update = (key, value) => setForm((current) => ({ ...current, fashion: { ...(current.fashion || {}), [key]: value } }));
  const text = (key, locale) => fashion[key]?.[locale] || '';
  const updateText = (key, locale, value) => setForm((current) => ({ ...current, fashion: { ...(current.fashion || {}), [key]: { en: current.fashion?.[key]?.en || '', bn: current.fashion?.[key]?.bn || '', [locale]: value } } }));
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Fit type" htmlFor={fieldId('fashion.fitType')}><NativeSelect value={fashion.fitType || ''} onChange={(event) => update('fitType', event.target.value || null)} options={[{ value: '', label: 'Not specified' }, { value: 'regular', label: 'Regular fit' }, { value: 'slim', label: 'Slim fit' }, { value: 'loose', label: 'Relaxed / loose' }, { value: 'oversized', label: 'Oversized' }]} /></Field>
        <Field label="Sizing advice" htmlFor={fieldId('fashion.fitNote')}><NativeSelect value={fashion.fitNote || ''} onChange={(event) => update('fitNote', event.target.value || null)} options={[{ value: '', label: 'Not specified' }, { value: 'runs_small', label: 'Runs small' }, { value: 'true_to_size', label: 'True to size' }, { value: 'runs_large', label: 'Runs large' }]} /></Field>
        <Field label="Stitching" htmlFor={fieldId('fashion.stitched')}><NativeSelect value={fashion.stitched == null ? '' : fashion.stitched ? 'yes' : 'no'} onChange={(event) => update('stitched', event.target.value === '' ? null : event.target.value === 'yes')} options={[{ value: '', label: 'Not specified' }, { value: 'yes', label: 'Stitched (ready to wear)' }, { value: 'no', label: 'Unstitched' }]} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Model height (cm)" htmlFor={fieldId('fashion.modelHeightCm')} error={errors['fashion.modelHeightCm']}><Input inputMode="numeric" value={fashion.modelHeightCm ?? ''} onChange={(event) => { const digits = event.target.value.replace(/\D/g, ''); update('modelHeightCm', digits ? Number(digits) : null); }} placeholder="165" /></Field>
        <Field label="Size the model wears" htmlFor={fieldId('fashion.modelSize')}><Input value={fashion.modelSize || ''} maxLength={20} onChange={(event) => update('modelSize', event.target.value || null)} placeholder="M" /></Field>
      </div>
      {[['pieces', 'What is in the set', 'Kameez, salwar, orna'], ['occasion', 'Occasion', 'Eid, party, everyday'], ['origin', 'Made in', 'Bangladesh']].map(([key, label, placeholder]) => (
        <div key={key} className="grid gap-4 md:grid-cols-2">
          <Field label={`${label} (English)`} htmlFor={fieldId(`fashion.${key}.en`)}><Input value={text(key, 'en')} maxLength={300} onChange={(event) => updateText(key, 'en', event.target.value)} placeholder={placeholder} /></Field>
          <Field label={`${label} (Bangla)`} htmlFor={fieldId(`fashion.${key}.bn`)}><Input value={text(key, 'bn')} maxLength={300} lang="bn" onChange={(event) => updateText(key, 'bn', event.target.value)} /></Field>
        </div>
      ))}
    </div>
  );
}

/** Size chart picker. Lives with the variants because a product with a size option cannot be published without one. */
function SizeChartField({ form, setForm, errors, sizeCharts }) {
  const hasSizeOption = form.attributes.some((item) => item.variation && String(item.key || '').toLowerCase() === 'size');
  const chosen = sizeCharts?.data ? taxonomyOptions(sizeCharts.data.filter((chart) => !chart.archivedAt).map((chart) => ({ id: chart.id, slug: chart.name || chart.slug, translations: { en: { name: chart.name || chart.translations?.en?.name } } })), form.sizeChartIds) : [];
  return (
    <Field label="Size charts" required={hasSizeOption} htmlFor={fieldId('sizeChartIds')} error={errors.sizeChartIds} hint={hasSizeOption ? 'Required to publish: this product has a size option. Shoppers see the chart next to the size picker.' : 'Shoppers see the chart next to the size picker. Required to publish a product with a size option.'}>
      {sizeCharts?.data ? (
        <MultiSelect value={form.sizeChartIds} onChange={(value) => setForm((current) => ({ ...current, sizeChartIds: value }))} options={chosen} placeholder="None" max={10} />
      ) : (
        <p id={fieldId('sizeChartIds')} tabIndex={-1} className="min-h-11 py-2.5 text-sm text-[var(--color-muted)]">{form.sizeCharts?.length ? form.sizeCharts.map((chart) => chart.name).join(', ') : 'None assigned'}{sizeCharts?.isLoading ? '' : ' (managed elsewhere)'}</p>
      )}
      {sizeCharts?.data && !sizeCharts.data.some((chart) => !chart.archivedAt) ? <p className="mt-2 text-sm text-[var(--color-muted)]">No size charts yet. <a href="/admin/size-charts/new" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--color-primary)] underline">Create a size chart</a> (opens in a new tab), then reopen this list.</p> : null}
    </Field>
  );
}

/** Curated "you may also like" and "complete the look" links (BR-CAT-001). */
function RelationFields({ form, setForm, productId }) {
  const groups = [
    { key: 'related', label: 'You may also like', hint: 'Similar styles. When empty, the storefront shows products from the same category.' },
    { key: 'cross_sell', label: 'Complete the look', hint: 'Items that go with this product, also suggested in the cart drawer.' },
  ];
  const setGroup = (key, items) => setForm((current) => ({ ...current, relations: { ...current.relations, [key]: items } }));
  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <ProductPicker key={group.key} name={group.key} label={group.label} hint={group.hint} value={form.relations[group.key]} exclude={productId} onChange={(items) => setGroup(group.key, items)} />
      ))}
    </div>
  );
}

function ProductPicker({ name, label, hint, value, exclude, onChange }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const results = useQuery({
    queryKey: ['admin-product-picker', term],
    enabled: term.length >= 2,
    queryFn: () => browserApi.get('/admin/products', { params: { search: term, pageSize: 8 } }).then((response) => response.data.data),
  });
  const chosen = new Set(value.map((item) => item.id));
  const options = (results.data || []).filter((item) => item.id !== exclude && !chosen.has(item.id) && !item.archivedAt);
  const full = value.length >= MAX_RELATED;
  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">{label}</h3>
        <p className="text-xs text-[var(--color-muted)]">{hint}</p>
      </div>
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((item) => (
            <li key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-1 pl-3 pr-1 text-xs font-semibold">
              {item.name}
              {item.status && item.status !== 'published' ? <Badge>{item.status}</Badge> : null}
              <button type="button" className="rounded-full p-1.5 hover:bg-[var(--color-primary-soft)]" aria-label={`Remove ${item.name} from ${label}`} onClick={() => onChange(value.filter((entry) => entry.id !== item.id))}><X size={13} /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-[var(--color-muted)]">No products linked yet.</p>}
      <Field label="Add a product" htmlFor={fieldId(`relations.${name}`)} hint={full ? `Up to ${MAX_RELATED} products can be linked.` : 'Type at least 2 letters of the name or SKU.'}>
        <Input value={search} disabled={full} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product name" />
      </Field>
      {term.length >= 2 && !full ? (
        <ul className="grid gap-1 rounded-xl border border-[var(--color-border)] p-1" aria-live="polite">
          {results.isLoading ? <li className="px-3 py-2 text-xs text-[var(--color-muted)]">Searching…</li> : null}
          {results.error ? <li className="px-3 py-2 text-xs text-[var(--color-danger)]">Search failed.</li> : null}
          {!results.isLoading && !results.error && !options.length ? <li className="px-3 py-2 text-xs text-[var(--color-muted)]">No matching products.</li> : null}
          {options.map((item) => (
            <li key={item.id}>
              <button type="button" className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-primary-soft)]" onClick={() => { onChange([...value, { id: item.id, slug: item.slug, name: item.name, status: item.status }]); setSearch(''); }}>
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-[var(--color-muted)]">{item.status}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AdvancedFields({ form, setForm, errors, categoryOptions, collectionOptions }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const shipping = form.shippingProfile || {};
  const setShipping = (patch) => setForm((current) => ({ ...current, shippingProfile: { ...current.shippingProfile, ...patch } }));
  const usedForVariants = new Set(form.attributes.filter((item) => item.variation).map((item) => item.attributeId));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Visibility" htmlFor={fieldId('visibility')} error={errors.visibility}>
        <NativeSelect value={form.visibility} onChange={(event) => update('visibility', event.target.value)} options={VISIBILITY} />
      </Field>
      <Field label="Tax class" htmlFor={fieldId('taxClass')} error={errors.taxClass}>
        <Input value={form.taxClass} maxLength={80} onChange={(event) => update('taxClass', event.target.value)} placeholder="standard" />
      </Field>
      <Field label="Additional categories" htmlFor={fieldId('categoryIds')} error={errors.categoryIds} hint="The product also appears in these categories.">
        <MultiSelect value={form.categoryIds} onChange={(value) => update('categoryIds', value)} options={categoryOptions.filter((option) => option.value !== form.categoryId)} placeholder="None" max={50} />
      </Field>
      <Field label="Collections" htmlFor={fieldId('collectionIds')} error={errors.collectionIds}>
        <MultiSelect value={form.collectionIds} onChange={(value) => update('collectionIds', value)} options={collectionOptions} placeholder="None" max={50} />
      </Field>
      <Field label="Low stock alert (all variants)" htmlFor={fieldId('lowStockThreshold')} error={errors.lowStockThreshold} hint="Blank uses the store default. A variant can override this.">
        <Input inputMode="numeric" value={form.lowStockThreshold} onChange={(event) => update('lowStockThreshold', event.target.value)} placeholder="Store default" />
      </Field>
      <fieldset className="grid gap-2 md:col-span-2">
        <legend className="text-sm font-semibold">Shipping</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(shipping.requiresShipping)} onCheckedChange={(value) => setShipping({ requiresShipping: Boolean(value) })} /> Requires shipping</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(shipping.freeShipping)} onCheckedChange={(value) => setShipping({ freeShipping: Boolean(value) })} /> Free shipping</label>
        </div>
        <Field label="Shipping class" htmlFor={fieldId('shippingProfile.shippingClass')} error={errors['shippingProfile.shippingClass']} className="max-w-xs">
          <Input value={shipping.shippingClass || ''} maxLength={80} onChange={(event) => setShipping({ shippingClass: event.target.value })} placeholder="Optional" />
        </Field>
      </fieldset>
      {form.attributes.length ? (
        <fieldset className="grid gap-2 md:col-span-2">
          <legend className="text-sm font-semibold">Attributes on this product</legend>
          <ul className="grid gap-2">
            {form.attributes.map((item) => (
              <li key={item.attributeId} className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm">
                <span className="font-semibold">{item.label || item.key || item.attributeId}</span>
                {item.variation ? <Badge tone="primary">Used for variants</Badge> : null}
                <label className="ml-auto flex items-center gap-2"><Checkbox checked={item.visible} onCheckedChange={(value) => setForm((current) => ({ ...current, attributes: current.attributes.map((entry) => (entry.attributeId === item.attributeId ? { ...entry, visible: Boolean(value) } : entry)) }))} /> Show on product page</label>
                <Button variant="ghost" size="sm" aria-label={`Remove attribute ${item.label || item.key}`} disabled={usedForVariants.has(item.attributeId) && form.variants.some((variant) => variant.attributeValueIds?.length)} onClick={() => setForm((current) => ({ ...current, attributes: current.attributes.filter((entry) => entry.attributeId !== item.attributeId) }))}>Remove</Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-muted)]">Add variant attributes with Generate from attributes under Pricing and inventory.</p>
        </fieldset>
      ) : null}
    </div>
  );
}
