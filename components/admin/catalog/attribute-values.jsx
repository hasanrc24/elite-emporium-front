'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus } from 'lucide-react';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { actionsColumn, Alert, Button, Card, DataTable, ErrorState, Field, Input, StatusBadge, SwitchField, pushToast } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { AdminPageHeader } from '../admin-page-header';
import { mapFieldErrors } from '../products/product-logic';
import { ATTRIBUTES_KEY, TYPE_LABELS, useAttributes } from './attribute-manager';
import { HEX_RE, SLUG_RE, slugify } from './catalog-logic';

export function AttributeValues({ id }) {
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canManage = Boolean(permissions?.includes('catalog.manage'));
  const attributes = useAttributes();
  const [dialog, setDialog] = useState(null);
  const attribute = (attributes.data || []).find((item) => item.id === id);
  const isColor = attribute?.type === 'color';

  if (attributes.error) return <ErrorState title="Attributes could not be loaded" description={apiMessage(attributes.error, 'Try again in a moment.')} action={<Button variant="secondary" onClick={() => attributes.refetch()}>Try again</Button>} />;
  if (!attributes.isLoading && !attribute) return <ErrorState title="Attribute not found" description="It may have been removed." action={<Button asChild variant="secondary"><Link href="/admin/attributes">Back to attributes</Link></Button>} />;

  const label = attribute?.translations?.en?.label || attribute?.key || 'Attribute';
  const values = [...(attribute?.values || [])].sort((a, b) => a.displayOrder - b.displayOrder || a.slug.localeCompare(b.slug));
  const columns = [
    ...(isColor ? [{ header: 'Swatch', id: 'swatch', cell: ({ row }) => row.original.colorHex ? <span className="block size-6 rounded-full border border-[var(--color-border-strong)]" style={{ backgroundColor: row.original.colorHex }} role="img" aria-label={row.original.colorHex} /> : <span className="text-[var(--color-muted)]">—</span> }] : []),
    { header: 'Value', accessorKey: 'value', cell: ({ row }) => <div className="min-w-0"><p className="max-w-56 truncate font-semibold">{row.original.value}</p><p className="max-w-56 truncate font-mono text-xs text-[var(--color-muted)]">{row.original.slug}</p></div> },
    { header: 'English', id: 'en', cell: ({ row }) => row.original.translations?.en?.label || '—' },
    { header: 'Bangla', id: 'bn', cell: ({ row }) => <span lang="bn">{row.original.translations?.bn?.label || '—'}</span> },
    { header: 'Order', accessorKey: 'displayOrder', meta: { align: 'right' }, cell: ({ row }) => <span className="tabular-nums">{row.original.displayOrder}</span> },
    { header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.archivedAt ? 'archived' : row.original.active ? 'active' : 'inactive'} /> },
    actionsColumn((value) => [{ label: 'Edit', icon: Edit3, onSelect: () => setDialog({ value }), hidden: !canManage }], { label: (value) => `Actions for ${value.value}` }),
  ];

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title={`${label} values`}
        description={attribute ? `${TYPE_LABELS[attribute.type] || attribute.type} attribute. Values appear as options in the product editor.` : undefined}
        backHref="/admin/attributes"
        backLabel="Attributes"
        actions={canManage && attribute ? <Button size="lg" onClick={() => setDialog({ value: null })}><Plus size={17} /> Add value</Button> : null}
      />
      <Card>
        <DataTable
          className="!rounded-none !border-0 !shadow-none"
          columns={columns}
          data={values}
          rowKey={(value) => value.id}
          loading={attributes.isLoading}
          fetching={attributes.isFetching}
          minWidth={680}
          caption={`${label} values`}
          onRowClick={canManage ? (value) => setDialog({ value }) : undefined}
          rowLabel={(value) => `Edit ${value.value}`}
          emptyTitle="No values yet"
          emptyDescription="Add the options shoppers can choose, for example S, M, L."
          emptyAction={canManage ? <Button size="sm" onClick={() => setDialog({ value: null })}>Add value</Button> : null}
        />
      </Card>
      {dialog && attribute ? <ValueDialog attribute={attribute} value={dialog.value} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function ValueDialog({ attribute, value, onClose }) {
  const queryClient = useQueryClient();
  const editing = Boolean(value);
  const isColor = attribute.type === 'color';
  const nextOrder = Math.max(-1, ...(attribute.values || []).map((item) => item.displayOrder)) + 1;
  const [form, setForm] = useState({
    value: value?.value || '',
    slug: value?.slug || '',
    slugTouched: false,
    labelEn: value?.translations?.en?.label || '',
    labelBn: value?.translations?.bn?.label || '',
    colorHex: value?.colorHex || '',
    displayOrder: String(value?.displayOrder ?? nextOrder),
    active: value?.active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const patch = (changes) => setForm((current) => ({ ...current, ...changes }));
  const hex = form.colorHex.trim();

  const save = useMutation({
    mutationFn: () => {
      const common = { colorHex: isColor && hex ? hex : null, displayOrder: Number(form.displayOrder) || 0, translations: { en: { label: form.labelEn.trim() }, bn: { label: form.labelBn.trim() } } };
      return editing
        ? browserApi.patch(`/admin/attributes/${attribute.id}/values/${value.id}`, { ...common, active: form.active, version: value.version })
        : browserApi.post(`/admin/attributes/${attribute.id}/values`, { ...common, value: form.value.trim(), slug: form.slug.trim() });
    },
    onSuccess: () => { pushToast({ tone: 'success', title: editing ? 'Value saved.' : 'Value added.' }); queryClient.invalidateQueries({ queryKey: ATTRIBUTES_KEY }); onClose(); },
    onError: (error) => {
      const body = error?.response?.data?.error;
      if (error?.response?.status === 409 && body?.code === 'VERSION_CONFLICT') { queryClient.invalidateQueries({ queryKey: ATTRIBUTES_KEY }); setMessage('This value changed elsewhere. The list was refreshed; close this dialog and reopen it to edit the latest version.'); return; }
      const fields = mapFieldErrors(body?.fieldErrors);
      setErrors({ value: fields.value, slug: fields.slug, labelEn: fields['translations.en.label'], labelBn: fields['translations.bn.label'], colorHex: fields.colorHex, displayOrder: fields.displayOrder });
      setMessage(Object.keys(fields).length ? 'Check the highlighted fields.' : apiMessage(error, 'Could not save the value.'));
    },
  });

  const submit = () => {
    const found = {};
    if (!editing && !form.value.trim()) found.value = 'Enter a value.';
    if (!editing && !SLUG_RE.test(form.slug.trim())) found.slug = 'Use lowercase letters, numbers and single hyphens.';
    if (!form.labelEn.trim()) found.labelEn = 'Enter an English label.';
    if (!form.labelBn.trim()) found.labelBn = 'Enter a Bangla label.';
    if (isColor && hex && !HEX_RE.test(hex)) found.colorHex = 'Use a hex color such as #1a2b3c.';
    if (!/^\d+$/.test(form.displayOrder.trim() || '0')) found.displayOrder = 'Use a whole number, 0 or more.';
    setErrors(found);
    setMessage(Object.keys(found).length ? 'Check the highlighted fields.' : '');
    if (!Object.keys(found).length) save.mutate();
  };

  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        title={editing ? `Edit ${value.value}` : 'Add a value'}
        description={editing ? 'The value and slug are fixed because products already reference them.' : undefined}
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>{editing ? 'Save changes' : 'Add value'}</Button></>}
      >
        <form className="grid gap-4" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
          {message ? <Alert tone="error">{message}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Value" required error={errors.value} hint="The stored option, e.g. XL or Navy."><Input value={form.value} disabled={editing} maxLength={180} onChange={(event) => patch({ value: event.target.value, ...(form.slugTouched ? {} : { slug: slugify(event.target.value) }) })} /></Field>
            <Field label="Slug" required error={errors.slug} hint={editing ? undefined : 'Filled in from the value.'}><Input value={form.slug} disabled={editing} maxLength={120} onChange={(event) => patch({ slug: event.target.value.toLowerCase(), slugTouched: true })} /></Field>
            <Field label="Label (English)" required error={errors.labelEn}><Input value={form.labelEn} maxLength={160} onChange={(event) => patch({ labelEn: event.target.value })} /></Field>
            <Field label="Label (Bangla)" required error={errors.labelBn}><Input lang="bn" value={form.labelBn} maxLength={160} onChange={(event) => patch({ labelBn: event.target.value })} /></Field>
            <Field label="Display order" error={errors.displayOrder} hint="Lower numbers come first."><Input inputMode="numeric" value={form.displayOrder} onChange={(event) => patch({ displayOrder: event.target.value })} /></Field>
            {isColor ? (
              <Field label="Color" error={errors.colorHex} hint="Pick a color or type a hex code.">
                {({ id }) => (
                  <div className="flex items-center gap-2">
                    <input type="color" aria-label="Pick a color" className="!h-11 !w-14 shrink-0 cursor-pointer !p-1" value={HEX_RE.test(hex) ? hex : '#000000'} onChange={(event) => patch({ colorHex: event.target.value })} />
                    <Input id={id} value={form.colorHex} placeholder="#1a2b3c" maxLength={7} invalid={Boolean(errors.colorHex)} onChange={(event) => patch({ colorHex: event.target.value })} />
                  </div>
                )}
              </Field>
            ) : null}
          </div>
          {editing ? <SwitchField label="Active" description="Inactive values cannot be picked for new variants." checked={form.active} onCheckedChange={(checked) => patch({ active: Boolean(checked) })} /> : null}
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
