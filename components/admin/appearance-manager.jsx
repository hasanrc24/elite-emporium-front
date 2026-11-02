'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { invalidateStorefrontSettings } from '@/app/actions/revalidate-settings';
import { tokenManager } from '@/lib/auth/token-manager';
import { ActionMenu, Alert, Button, Card, CardBody, CardHeader, Checkbox, ConfirmAction, Field, FieldGroup, Input, NativeSelect, Skeleton, Textarea } from '@/components/ui';
import { ProductsField } from './settings/settings-fields';
import { AdminPageHeader } from './admin-page-header';

const SECTION_TYPES = ['hero', 'banner', 'product_carousel', 'category_grid', 'collection_grid', 'countdown', 'testimonials', 'editorial', 'newsletter', 'blog_feed'];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' }
];

function Heading({ title, body }) {
  return <AdminPageHeader title={title} description={body} />;
}

export function AppearanceManager({ section }) {
  if (section === 'home') return <HomeSections />;
  if (section === 'menus') return <MenuEditor />;
  if (section === 'theme') return <ThemeEditor />;
  return null;
}

const TYPE_LABELS = {
  hero: 'Hero banner (top of the page)',
  banner: 'Promotional banner',
  product_carousel: 'Product row',
  category_grid: 'Category circles',
  collection_grid: 'Collection tiles',
  countdown: 'Countdown',
  testimonials: 'Testimonials',
  editorial: 'Text block',
  newsletter: 'Newsletter signup',
  blog_feed: 'Blog posts'
};
const CAROUSEL_SOURCES = [
  { value: 'newest', label: 'New arrivals (latest products)' },
  { value: 'featured', label: 'Featured products' },
  { value: 'sale', label: 'On sale' },
  { value: 'manual', label: 'Products I pick myself' }
];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const toPayload = (row, patch = {}) => {
  const { id: _id, archivedAt: _archivedAt, ...rest } = { ...row, ...patch };
  return rest;
};
const localInput = (iso) => { if (!iso) return ''; const date = new Date(iso); return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const titleOf = (row) => row.config?.title?.en || row.config?.title || '';

async function refreshStorefront() {
  await invalidateStorefrontSettings(tokenManager.get()).catch(() => undefined);
}

function HomeSections() {
  const query = useQuery({
    queryKey: ['admin', 'home-sections'],
    queryFn: () => browserApi.get('/admin/home-sections').then((response) => response.data.data)
  });
  const [showNew, setShowNew] = useState(false);
  const [moveError, setMoveError] = useState('');
  const rows = (query.data || []).filter((row) => !row.archivedAt).sort((a, b) => a.displayOrder - b.displayOrder);

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setMoveError('');
    const ordered = [...rows];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      for (const [position, row] of ordered.entries()) {
        if (row.displayOrder !== position) await browserApi.patch(`/admin/home-sections/${row.id}`, toPayload(row, { displayOrder: position }));
      }
      await refreshStorefront();
    } catch (error) { setMoveError(apiMessage(error)); }
    query.refetch();
  }

  return (
    <div className="grid gap-5">
      <Heading title="Homepage sections" body="Build the storefront home page: hero image, banners, product rows and more. Published sections show in this order, below the hero." />
      <Alert tone="info">Categories, New arrivals, Featured, On sale, Collections and the trust strip also appear automatically. Switch those on or off in <Link className="underline" href="/admin/settings/homepage">Settings → Homepage</Link>.</Alert>
      <div>
        <Button onClick={() => setShowNew((value) => !value)}>{showNew ? 'Close' : 'Add section'}</Button>
      </div>
      {showNew ? <HomeSectionForm initial={{ ...blankHome, displayOrder: rows.length }} defaultOpen onSaved={() => { setShowNew(false); query.refetch(); }} /> : null}
      <div className="grid gap-4">
        {rows.map((row, index) => (
          <HomeSectionForm key={`${row.id}:${row.version}`} initial={row} onSaved={() => query.refetch()} onMove={(direction) => move(index, direction)} canMoveUp={index > 0} canMoveDown={index < rows.length - 1} />
        ))}
        {query.isLoading ? <Skeleton className="h-24" /> : null}
        {!query.isLoading && !rows.length && !showNew ? <p className="text-sm text-[var(--color-muted)]">No sections yet. The store shows its default home page until you add one.</p> : null}
      </div>
      {moveError ? <Alert tone="error">{moveError}</Alert> : null}
      {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
    </div>
  );
}

const blankHome = {
  type: 'hero',
  enabled: true,
  displayOrder: 0,
  startsAt: null,
  endsAt: null,
  status: 'draft',
  config: {
    eyebrow: { en: '', bn: '' },
    title: { en: '', bn: '' },
    body: { en: '', bn: '' },
    cta: { label: { en: '', bn: '' }, href: '/shop' }
  }
};

/** Image picker for hero and banner backgrounds: uploads to the media library and stores its public URL. */
function SectionImage({ config, onChange }) {
  const [error, setError] = useState('');
  const upload = useMutation({
    mutationFn: (file) => {
      const data = new FormData();
      data.append('file', file);
      data.append('privacy', 'public');
      data.append('altText', config.imageAlt?.en || titleOf({ config }) || 'Homepage image');
      return browserApi.post('/admin/media/upload', data).then((response) => response.data.data);
    },
    onSuccess: (asset) => onChange({ imageUrl: asset.url, imageMediaId: asset.id }),
    onError: (caught) => setError(apiMessage(caught, 'The image could not be uploaded.'))
  });
  function pick(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError('Use a JPG, PNG, WebP or AVIF image.'); return; }
    setError(''); upload.mutate(file);
  }
  return (
    <div className="grid gap-2 md:col-span-2">
      <span className="text-sm font-semibold">Background image</span>
      <div className="flex flex-wrap items-center gap-4">
        <div role="img" aria-label={config.imageUrl ? 'Current background image' : 'No image'} className="grid h-24 w-40 place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] bg-cover bg-top text-xs text-[var(--color-muted)]" style={config.imageUrl ? { backgroundImage: `url("${config.imageUrl}")` } : undefined}>
          {config.imageUrl ? null : 'No image'}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-muted)]">
            {upload.isPending ? 'Uploading…' : config.imageUrl ? 'Replace image' : 'Upload image'}
            <input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" disabled={upload.isPending} onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
          {config.imageUrl ? <Button variant="ghost" onClick={() => onChange({ imageUrl: undefined, imageMediaId: undefined })}>Remove</Button> : null}
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted)]">Wide photos (at least 1600 px) work best. The subject should sit in the upper part of the picture.</p>
      {error ? <p role="alert" className="error">{error}</p> : null}
    </div>
  );
}

function Pair({ label, config, path, onText, multiline = false }) {
  const read = (locale) => path.split('.').reduce((value, key) => value?.[key], config)?.[locale] ?? '';
  const Control = multiline ? Textarea : Input;
  return (
    <>
      <Field label={`${label} (English)`}><Control value={read('en')} onChange={(event) => onText(`${path}.en`, event.target.value)} /></Field>
      <Field label={`${label} (Bangla)`}><Control lang="bn" value={read('bn')} onChange={(event) => onText(`${path}.bn`, event.target.value)} /></Field>
    </>
  );
}

function HomeSectionForm({ initial = blankHome, onSaved, onMove, canMoveUp, canMoveDown, defaultOpen = false }) {
  const [form, setForm] = useState(() => structuredClone(initial));
  const [open, setOpen] = useState(defaultOpen);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = initial.id;
  const mutate = useMutation({
    mutationFn: () => (id ? browserApi.patch(`/admin/home-sections/${id}`, toPayload(form)) : browserApi.post('/admin/home-sections', toPayload(form))),
    onSuccess: async () => { onSaved(); await refreshStorefront(); }
  });
  const remove = useMutation({
    mutationFn: () => browserApi.post(`/admin/home-sections/${id}/archive`),
    onSuccess: async () => { onSaved(); await refreshStorefront(); }
  });
  const merge = (patch) => setForm((current) => ({ ...current, config: Object.fromEntries(Object.entries({ ...current.config, ...patch }).filter(([, value]) => value !== undefined)) }));
  const setText = (path, value) => setForm((current) => {
    const config = structuredClone(current.config);
    const keys = path.split('.');
    let target = config;
    for (const key of keys.slice(0, -1)) target = target[key] ||= {};
    target[keys.at(-1)] = value;
    return { ...current, config };
  });
  const type = form.type;
  const hasImage = type === 'hero' || type === 'banner';
  const hasCta = ['hero', 'banner', 'editorial', 'newsletter', 'countdown'].includes(type);
  const config = form.config || {};
  const ids = Array.isArray(config.ids) ? config.ids : [];
  const source = ids.length || config.source === 'manual' ? 'manual' : config.source || 'featured';
  const heading = titleOf(form) || '(no title yet)';

  return (
    <Card>
      <CardBody className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-semibold">{id ? heading : 'New section'}</span>
              <span className="text-xs text-[var(--color-muted)]">{TYPE_LABELS[type] || type} · {form.status === 'published' && form.enabled ? 'Live' : form.status === 'published' ? 'Published but switched off' : 'Draft'}</span>
            </span>
          </button>
          <div className="flex items-center gap-1.5">
            {id ? <>
              <Button size="sm" variant="ghost" aria-label="Move up" disabled={!canMoveUp} onClick={() => onMove(-1)}>↑</Button>
              <Button size="sm" variant="ghost" aria-label="Move down" disabled={!canMoveDown} onClick={() => onMove(1)}>↓</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>Delete</Button>
            </> : null}
            <Button size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>{open ? 'Close' : 'Edit'}</Button>
          </div>
        </div>
        <ConfirmAction open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete “${heading}”?`} description="It disappears from the home page right away." confirmLabel="Delete" onConfirm={() => remove.mutate()} />
        {open ? (
          <>
            <FieldGroup columns={3}>
              <Field label="Section type">
                <NativeSelect value={type} disabled={Boolean(id)} onChange={(event) => setForm({ ...form, type: event.target.value })} options={SECTION_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] || value }))} />
              </Field>
              <Field label="Status" hint="Drafts are never shown to shoppers.">
                <NativeSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} options={STATUS_OPTIONS} />
              </Field>
              <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
                <Checkbox checked={form.enabled} onCheckedChange={(value) => setForm({ ...form, enabled: !!value })} />
                Switched on
              </label>
              <Field label="Show from" hint="Optional."><Input type="datetime-local" value={localInput(form.startsAt)} onChange={(event) => setForm({ ...form, startsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
              <Field label="Show until" hint="Optional."><Input type="datetime-local" value={localInput(form.endsAt)} onChange={(event) => setForm({ ...form, endsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>
            </FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              {type === 'hero' ? <Pair label="Small label above title" config={config} path="eyebrow" onText={setText} /> : null}
              <Pair label="Title" config={config} path="title" onText={setText} />
              {!['category_grid', 'collection_grid', 'product_carousel'].includes(type) ? <Pair label="Text" config={config} path="body" onText={setText} multiline /> : null}
              {hasImage ? <SectionImage config={config} onChange={merge} /> : null}
              {hasImage ? <Pair label="Image description (for screen readers)" config={config} path="imageAlt" onText={setText} /> : null}
              {hasCta ? <Pair label="Button text" config={config} path="cta.label" onText={setText} /> : null}
              {hasCta ? <Field label="Button link" hint="A shop page like /shop?sale=true, or a full https:// address."><Input value={config.cta?.href || ''} onChange={(event) => setText('cta.href', event.target.value)} /></Field> : null}
              {type === 'hero' ? <Pair label="Second button text" config={config} path="secondaryCta" onText={setText} /> : null}
              {type === 'hero' ? <Field label="Second button link"><Input value={config.secondaryUrl || ''} onChange={(event) => merge({ secondaryUrl: event.target.value || undefined })} /></Field> : null}
              {type === 'product_carousel' ? (
                <>
                  <Field label="Products shown">
                    <NativeSelect value={source} onChange={(event) => (event.target.value === 'manual' ? merge({ source: 'manual' }) : merge({ source: event.target.value, ids: undefined }))} options={CAROUSEL_SOURCES} />
                  </Field>
                  {source === 'manual' ? <div className="md:col-span-2"><ProductsField field={{ label: 'Choose products', description: 'They appear in the order you add them (up to 24).', max: 24 }} value={ids} error={null} disabled={false} onChange={(next) => merge({ source: 'manual', ids: next })} /></div> : null}
                </>
              ) : null}
              {type === 'category_grid' ? <p className="text-sm text-[var(--color-muted)] md:col-span-2">Shows your top-level categories with their pictures. Edit those under Catalog → Categories.</p> : null}
              {type === 'collection_grid' ? <p className="text-sm text-[var(--color-muted)] md:col-span-2">Shows your collections with their pictures. Edit those under Catalog → Collections.</p> : null}
            </div>
          </>
        ) : null}
        {open ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={mutate.isPending} onClick={() => mutate.mutate()}>Save section</Button>
            {mutate.error ? <Alert tone="error">{apiMessage(mutate.error)}</Alert> : null}
          </div>
        ) : null}
        {remove.error ? <Alert tone="error">{apiMessage(remove.error)}</Alert> : null}
      </CardBody>
    </Card>
  );
}

function MenuEditor() {
  const query = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: () => browserApi.get('/admin/menus').then((response) => response.data.data)
  });
  return (
    <div className="grid gap-5">
      <Heading title="Navigation menus" body="Use safe internal entities or HTTPS destinations. Keyboard move controls remain available for every item." />
      <div className="grid gap-5">
        {query.isLoading ? <Skeleton className="h-32" /> : null}
        {query.data?.map((menu) => (
          <MenuForm key={`${menu.id}:${menu.version}`} initial={menu} onSaved={() => query.refetch()} />
        ))}
        <MenuForm onSaved={() => query.refetch()} />
      </div>
      {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
    </div>
  );
}

function MenuForm({ initial, onSaved }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, items: initial.items.map((item) => ({ ...item, clientKey: item.id, parentKey: item.parentId })) }
      : { location: '', name: '', status: 'draft', items: [], version: 1 }
  );
  const mutation = useMutation({
    mutationFn: () => (initial ? browserApi.patch(`/admin/menus/${initial.id}`, form) : browserApi.post('/admin/menus', form)),
    onSuccess: async () => { onSaved(); if (!initial) setForm({ location: '', name: '', status: 'draft', items: [], version: 1 }); await invalidateStorefrontSettings(tokenManager.get()); }
  });
  const updateItem = (index, patch) =>
    setForm({ ...form, items: form.items.map((item, position) => (position === index ? { ...item, ...patch } : item)) });
  const move = (index, offset) => {
    const items = [...form.items];
    const destination = index + offset;
    if (destination < 0 || destination >= items.length) return;
    [items[index], items[destination]] = [items[destination], items[index]];
    setForm({ ...form, items: items.map((item, displayOrder) => ({ ...item, displayOrder })) });
  };

  return (
    <details className="card p-5" open={!initial}>
      <summary className="cursor-pointer text-lg font-bold">{initial?.name || 'Create a menu'}</summary>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Location">
          <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </Field>
        <Field label="Name">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label="Status">
          <NativeSelect
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
            options={STATUS_OPTIONS}
          />
        </Field>
      </div>
      <div className="mt-4 grid gap-3">
        {form.items.map((item, index) => (
          <div key={item.clientKey} className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 md:grid-cols-6">
            <Field label="English label">
              <Input value={item.labelEn} onChange={(event) => updateItem(index, { labelEn: event.target.value })} />
            </Field>
            <Field label="Bangla label">
              <Input value={item.labelBn} onChange={(event) => updateItem(index, { labelBn: event.target.value })} />
            </Field>
            <Field label="Target type">
              <NativeSelect
                value={item.targetType}
                onChange={(event) => updateItem(index, { targetType: event.target.value })}
                options={['url', 'product', 'category', 'collection', 'page'].map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label={item.targetType === 'url' ? 'Safe URL' : 'Entity ID'}>
              <Input
                value={item.targetType === 'url' ? item.url || '' : item.targetId || ''}
                onChange={(event) =>
                  updateItem(index, item.targetType === 'url' ? { url: event.target.value, targetId: null } : { targetId: event.target.value, url: null })
                }
              />
            </Field>
            <div className="flex items-end justify-end md:col-span-2">
              <ActionMenu
                label={`Actions for menu item ${item.labelEn || index + 1}`}
                actions={[
                  { label: 'Move up', disabled: !index, onSelect: () => move(index, -1) },
                  { label: 'Move down', disabled: index === form.items.length - 1, onSelect: () => move(index, 1) },
                  { separator: true },
                  { label: 'Remove', destructive: true, onSelect: () => setForm({ ...form, items: form.items.filter((_, position) => position !== index) }) }
                ]}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setForm({ ...form, items: [...form.items, { clientKey: crypto.randomUUID(), labelEn: '', labelBn: '', targetType: 'url', url: '', targetId: null, displayOrder: form.items.length, visible: true }] })}>
          Add item
        </Button>
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>{initial ? 'Save menu' : 'Create menu'}</Button>
        {mutation.error ? <Alert tone="error">{apiMessage(mutation.error)}</Alert> : null}
      </div>
    </details>
  );
}

function ThemeEditor() {
  const query = useQuery({
    queryKey: ['admin', 'theme'],
    queryFn: () => browserApi.get('/admin/theme').then((response) => response.data.data)
  });
  const draft = query.data?.find((item) => item.status === 'draft') || query.data?.[0];
  return (
    <div className="grid gap-5">
      <Heading title="Theme" body="Only approved tokens, fonts, media URLs, and header/footer options are accepted; custom CSS and scripts are not supported." />
      {draft ? (
        <ThemeForm key={`${draft.id}:${draft.version}`} initial={draft} onSaved={() => query.refetch()} />
      ) : query.isLoading ? (
        <Card>
          <Skeleton className="h-40" />
        </Card>
      ) : query.data ? (
        // No theme row exists yet: start a first draft instead of rendering nothing.
        <ThemeForm initial={{ status: 'draft', settings: {}, version: 1 }} onSaved={() => query.refetch()} />
      ) : null}
      {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
    </div>
  );
}

function ThemeForm({ initial, onSaved }) {
  const defaults = { primary: '#6f1d46', accent: '#d4a373', background: '#fffaf7', text: '#24151d', radius: '0.75rem' };
  const [settings, setSettings] = useState({ ...defaults, ...initial.settings });
  const [status, setStatus] = useState(initial.status);
  const mutation = useMutation({
    mutationFn: () => browserApi.put('/admin/theme', { status, settings, version: Number(initial.version), sourceId: initial.id }),
    onSuccess: async () => { onSaved(); await invalidateStorefrontSettings(tokenManager.get()); }
  });

  return (
    <Card>
      <CardBody className="grid gap-4">
        <FieldGroup columns={3}>
          {['primary', 'accent', 'background', 'text'].map((key) => (
            <Field label={`${key} color`} key={key}>
              <Input
                type="color"
                value={settings[key]}
                onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
              />
            </Field>
          ))}
          <Field label="Corner radius">
            <NativeSelect
              value={settings.radius}
              onChange={(event) => setSettings({ ...settings, radius: event.target.value })}
              options={['0rem', '0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem'].map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Save as">
            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: 'draft', label: 'Draft preview' },
                { value: 'published', label: 'Published' }
              ]}
            />
          </Field>
        </FieldGroup>
        <div className="flex items-center gap-3">
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Save theme</Button>
          {mutation.error ? <Alert tone="error">{apiMessage(mutation.error)}</Alert> : null}
        </div>
      </CardBody>
    </Card>
  );
}
