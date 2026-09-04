'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Field, FieldGroup, Input, NativeSelect, Skeleton } from '@/components/ui';

const SECTION_TYPES = ['hero', 'banner', 'product_carousel', 'category_grid', 'collection_grid', 'countdown', 'testimonials', 'editorial', 'newsletter', 'blog_feed'];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' }
];

function Heading({ title, body }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-widest text-[var(--color-primary)]">Appearance</p>
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-2 text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

export function AppearanceManager({ section }) {
  if (section === 'home') return <HomeSections />;
  if (section === 'menus') return <MenuEditor />;
  if (section === 'theme') return <ThemeEditor />;
  return null;
}

function HomeSections() {
  const query = useQuery({
    queryKey: ['admin', 'home-sections'],
    queryFn: () => browserApi.get('/admin/home-sections').then((response) => response.data.data)
  });
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="grid gap-5">
      <Heading title="Homepage sections" body="Reorder, schedule, draft, and publish structured homepage sections without code changes." />
      <div>
        <Button onClick={() => setShowNew((value) => !value)}>{showNew ? 'Close' : 'Add section'}</Button>
      </div>
      {showNew ? <HomeSectionForm onSaved={() => { setShowNew(false); query.refetch(); }} /> : null}
      <div className="grid gap-4">
        {query.data?.map((row) => (
          <HomeSectionForm key={`${row.id}:${row.version}`} initial={row} onSaved={() => query.refetch()} />
        ))}
      </div>
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

function HomeSectionForm({ initial = blankHome, onSaved }) {
  const [form, setForm] = useState(() => structuredClone(initial));
  const id = initial.id;
  const mutate = useMutation({
    mutationFn: () => (id ? browserApi.patch(`/admin/home-sections/${id}`, form) : browserApi.post('/admin/home-sections', form)),
    onSuccess: onSaved
  });
  const text = (path) => path.split('.').reduce((value, key) => value?.[key], form.config) || '';
  const setText = (path, value) => {
    const config = structuredClone(form.config);
    const keys = path.split('.');
    let target = config;
    for (const key of keys.slice(0, -1)) target = target[key] ||= {};
    target[keys.at(-1)] = value;
    setForm({ ...form, config });
  };

  return (
    <Card>
      <CardBody className="grid gap-4">
        <FieldGroup columns={4}>
          <Field label="Section type">
            <NativeSelect
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
              options={SECTION_TYPES.map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Status">
            <NativeSelect
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              options={STATUS_OPTIONS}
            />
          </Field>
          <Field label="Display order">
            <Input
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold">
            <Checkbox checked={form.enabled} onCheckedChange={(value) => setForm({ ...form, enabled: !!value })} />
            Enabled
          </label>
          {['title.en', 'title.bn', 'body.en', 'body.bn', 'cta.label.en', 'cta.label.bn', 'cta.href'].map((path) => (
            <Field label={path} key={path}>
              <Input value={text(path)} onChange={(event) => setText(path, event.target.value)} />
            </Field>
          ))}
        </FieldGroup>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={mutate.isPending} onClick={() => mutate.mutate()}>Save section</Button>
          {mutate.error ? <Alert tone="error">{apiMessage(mutate.error)}</Alert> : null}
        </div>
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
    onSuccess: () => { onSaved(); if (!initial) setForm({ location: '', name: '', status: 'draft', items: [], version: 1 }); }
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
            <div className="flex items-end gap-1">
              <Button size="sm" variant="outline" disabled={!index} onClick={() => move(index, -1)}>↑</Button>
              <Button size="sm" variant="outline" disabled={index === form.items.length - 1} onClick={() => move(index, 1)}>↓</Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setForm({ ...form, items: form.items.filter((_, position) => position !== index) })}>Remove</Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setForm({ ...form, items: [...form.items, { clientKey: crypto.randomUUID(), labelEn: '', labelBn: '', targetType: 'url', url: '', targetId: null, displayOrder: form.items.length }] })}>
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
    onSuccess: onSaved
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