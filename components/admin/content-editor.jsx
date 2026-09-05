'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, CardBody, CardHeader, DatePicker, Field, FieldGroup, Input, NativeSelect, Skeleton, TabsContent, TabsList, TabsRoot, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { AdminPageHeader } from './admin-page-header';

const translation = () => ({ title: '', excerpt: '', blocks: [], seoTitle: '', seoDescription: '' });
const blank = (kind) => ({
  slug: '',
  status: 'draft',
  publishAt: null,
  template: 'standard',
  type: kind === 'posts' ? 'blog' : undefined,
  categoryId: null,
  coverMediaId: null,
  translations: { en: translation(), bn: translation() },
  changeSummary: '',
  version: 1
});
const blockTypes = ['rich_text', 'image', 'hero', 'banner', 'product_carousel', 'category_grid', 'collection_grid', 'countdown', 'testimonials', 'faq', 'newsletter', 'blog_feed'];
const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' }
];

export function ContentEditor({ kind, id }) {
  const isNew = id === 'new';
  const query = useQuery({
    queryKey: ['admin-content', kind, id],
    enabled: !isNew,
    queryFn: () => browserApi.get(`/admin/${kind}/${id}`).then((response) => response.data.data)
  });

  if (query.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40" />
      </Card>
    );
  }
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;

  return (
    <ContentEditorForm
      key={`${kind}:${id}:${query.data?.version || 'new'}`}
      kind={kind}
      id={id}
      initialContent={query.data || blank(kind)}
    />
  );
}

function ContentEditorForm({ kind, id, initialContent }) {
  const router = useRouter();
  const isNew = id === 'new';
  const [form, setForm] = useState(() => ({ ...blank(kind), ...initialContent, changeSummary: '' }));
  const save = useMutation({
    mutationFn: () => (isNew ? browserApi.post(`/admin/${kind}`, form) : browserApi.patch(`/admin/${kind}/${id}`, form)).then((response) => response.data.data),
    onSuccess: (saved) => {
      setForm({ ...saved, changeSummary: '' });
      if (isNew) router.replace(`/admin/content/${kind}/${saved.id}`);
    }
  });
  const revisions = useQuery({
    queryKey: ['admin-content-revisions', kind, id],
    enabled: !isNew,
    queryFn: () => browserApi.get(`/admin/${kind}/${id}/revisions`).then((response) => response.data.data)
  });
  const rollback = useMutation({
    mutationFn: (revisionId) =>
      browserApi.post(`/admin/${kind}/${id}/rollback`, { revisionId, version: Number(form.version) }).then((response) => response.data.data),
    onSuccess: setForm
  });
  const updateTranslation = (locale, key, value) =>
    setForm({ ...form, translations: { ...form.translations, [locale]: { ...form.translations[locale], [key]: value } } });

  return (
    <div className="grid gap-5">
      <AdminPageHeader backHref={`/admin/content/${kind}`} backLabel={`Back to ${kind}`} title={isNew ? `New ${kind === 'pages' ? 'page' : 'post'}` : form.translations.en.title} description="Create structured bilingual content with revision history and controlled publishing." actions={<Button loading={save.isPending} onClick={() => save.mutate()}>{isNew ? 'Create' : 'Save changes'}</Button>} />

      <Card>
        <CardBody>
          <FieldGroup columns={3}>
            <Field label="Slug" required>
              <Input
                required
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </Field>
            <Field label="Status">
              <NativeSelect
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                options={statusOptions}
              />
            </Field>
            <Field label="Publish at">
              <DatePicker
                withTime
                value={form.publishAt ? String(form.publishAt).slice(0, 16) : ''}
                onChange={(value) => setForm({ ...form, publishAt: value ? new Date(value).toISOString() : null })}
              />
            </Field>
            {kind === 'posts' ? (
              <Field label="Post type">
                <NativeSelect
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  options={[
                    { value: 'blog', label: 'Blog' },
                    { value: 'lookbook', label: 'Lookbook' }
                  ]}
                />
              </Field>
            ) : (
              <Field label="Template">
                <Input value={form.template} onChange={(event) => setForm({ ...form, template: event.target.value })} />
              </Field>
            )}
          </FieldGroup>
        </CardBody>
      </Card>

      <TabsRoot defaultValue="en">
        <TabsList items={[{ value: 'en', label: 'English' }, { value: 'bn', label: 'বাংলা' }]} />
        {['en', 'bn'].map((locale) => (
          <TabsContent key={locale} value={locale}>
            <Card>
              <CardHeader title={`${locale === 'en' ? 'English' : 'বাংলা'} content`} />
              <CardBody className="grid gap-4">
                <FieldGroup columns={2}>
                  <Field label="Title">
                    <Input
                      value={form.translations[locale].title}
                      onChange={(event) => updateTranslation(locale, 'title', event.target.value)}
                    />
                  </Field>
                  <Field label="Excerpt">
                    <Textarea
                      value={form.translations[locale].excerpt}
                      onChange={(event) => updateTranslation(locale, 'excerpt', event.target.value)}
                    />
                  </Field>
                  <Field label="SEO title">
                    <Input
                      value={form.translations[locale].seoTitle}
                      onChange={(event) => updateTranslation(locale, 'seoTitle', event.target.value)}
                    />
                  </Field>
                  <Field label="SEO description">
                    <Textarea
                      value={form.translations[locale].seoDescription}
                      onChange={(event) => updateTranslation(locale, 'seoDescription', event.target.value)}
                    />
                  </Field>
                </FieldGroup>
                <BlockEditor
                  blocks={form.translations[locale].blocks}
                  onChange={(blocks) => updateTranslation(locale, 'blocks', blocks)}
                />
              </CardBody>
            </Card>
          </TabsContent>
        ))}
      </TabsRoot>

      <Card>
        <CardHeader title="Publish" description="A change summary is required when rolling back to a previous revision." />
        <CardBody className="grid gap-4">
          <Field label="Change summary">
            <Input value={form.changeSummary} onChange={(event) => setForm({ ...form, changeSummary: event.target.value })} placeholder="What changed and why?" />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button loading={save.isPending} onClick={() => save.mutate()}>{isNew ? 'Create' : 'Save changes'}</Button>
            {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}
            {save.isSuccess ? <Alert tone="success">Saved.</Alert> : null}
          </div>
        </CardBody>
      </Card>

      {!isNew && revisions.data?.length ? (
        <Card>
          <CardHeader title="Revision history" />
          <CardBody className="grid gap-3">
            {revisions.data.map((revision) => (
              <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
                <div>
                  <p className="text-sm font-semibold">{revision.changeSummary || 'No summary'}</p>
                  <p className="text-xs text-[var(--color-muted)]">v{revision.version} · {revision.editorName}</p>
                </div>
                <Button variant="secondary" loading={rollback.isPending} onClick={() => rollback.mutate(revision.id)}>
                  Restore this revision
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function BlockEditor({ blocks, onChange }) {
  const add = () => onChange([...blocks, { id: crypto.randomUUID(), type: 'rich_text', data: { html: '' } }]);
  const update = (index, patch) => onChange(blocks.map((block, position) => (position === index ? { ...block, ...patch } : block)));
  const move = (index, offset) => {
    const next = [...blocks];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Structured blocks</h3>
        <Button variant="outline" onClick={add}>Add block</Button>
      </div>
      <div className="mt-3 grid gap-3">
        {blocks.map((block, index) => (
          <fieldset key={block.id || index} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
            <legend className="px-2 font-bold">Block {index + 1}</legend>
            <FieldGroup columns={2}>
              <Field label="Type">
                <NativeSelect
                  value={block.type}
                  onChange={(event) => update(index, { type: event.target.value, data: {} })}
                  options={blockTypes.map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Heading / title">
                <Input
                  value={block.data.title || block.data.heading || ''}
                  onChange={(event) => update(index, { data: { ...block.data, title: event.target.value } })}
                />
              </Field>
              <Field label="Text or approved HTML" className="md:col-span-2">
                <Textarea
                  rows={4}
                  value={block.data.html || block.data.body || ''}
                  onChange={(event) =>
                    update(index, { data: { ...block.data, [block.type === 'rich_text' ? 'html' : 'body']: event.target.value } })
                  }
                />
              </Field>
              <Field label="Managed image URL / safe link">
                <Input
                  value={block.data.imageUrl || block.data.url || ''}
                  onChange={(event) =>
                    update(index, { data: { ...block.data, [block.type === 'image' || block.type === 'hero' ? 'imageUrl' : 'url']: event.target.value } })
                  }
                />
              </Field>
              <Field label="Entity IDs (comma separated)">
                <Input
                  value={(block.data.ids || []).join(', ')}
                  onChange={(event) =>
                    update(index, { data: { ...block.data, ids: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) } })
                  }
                />
              </Field>
            </FieldGroup>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" disabled={index === 0} onClick={() => move(index, -1)}>Move up</Button>
              <Button variant="outline" disabled={index === blocks.length - 1} onClick={() => move(index, 1)}>Move down</Button>
              <Button variant="outline" onClick={() => onChange(blocks.filter((_, position) => position !== index))}>Remove</Button>
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
