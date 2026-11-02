'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, ListPlus, Plus } from 'lucide-react';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { actionsColumn, Alert, Button, Card, DataTable, Field, Input, NativeSelect, StatusBadge, SwitchField, pushToast } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { AdminPageHeader } from '../admin-page-header';
import { mapFieldErrors } from '../products/product-logic';

export const ATTRIBUTES_KEY = ['admin', 'attributes'];
export const TYPE_LABELS = { select: 'Select', color: 'Color', text: 'Text' };
const KEY_RE = /^[a-z][a-z0-9_]*$/;

export function useAttributes() {
  return useQuery({ queryKey: ATTRIBUTES_KEY, queryFn: () => browserApi.get('/admin/attributes').then((response) => response.data.data) });
}

export function AttributeManager() {
  const router = useRouter();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canManage = Boolean(permissions?.includes('catalog.manage'));
  const attributes = useAttributes();
  const [dialog, setDialog] = useState(null);
  const rows = attributes.data || [];

  const columns = [
    {
      header: 'Attribute',
      accessorKey: 'key',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="max-w-64 truncate font-semibold">{row.original.translations?.en?.label || row.original.key}</p>
          <p className="max-w-64 truncate font-mono text-xs text-[var(--color-muted)]">{row.original.key}</p>
        </div>
      ),
    },
    { header: 'Type', accessorKey: 'type', cell: ({ row }) => <span className="text-sm">{TYPE_LABELS[row.original.type] || row.original.type}</span> },
    { header: 'Values', id: 'values', meta: { align: 'right' }, cell: ({ row }) => <span className="tabular-nums">{(row.original.values || []).filter((value) => !value.archivedAt).length}</span> },
    { header: 'Filterable', id: 'filterable', cell: ({ row }) => <span className="text-sm text-[var(--color-muted)]">{row.original.filterable ? 'Yes' : 'No'}</span> },
    { header: 'Used for variants', id: 'variationCapable', cell: ({ row }) => <span className="text-sm text-[var(--color-muted)]">{row.original.variationCapable ? 'Yes' : 'No'}</span> },
    { header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.archivedAt ? 'archived' : row.original.active ? 'active' : 'inactive'} /> },
    actionsColumn((attribute) => [
      { label: 'Manage values', icon: ListPlus, href: `/admin/attributes/${attribute.id}` },
      { label: 'Edit', icon: Edit3, onSelect: () => setDialog({ attribute }), hidden: !canManage },
    ], { label: (attribute) => `Actions for ${attribute.translations?.en?.label || attribute.key}` }),
  ];

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title="Attributes"
        description="Options such as size and color that products and variants are built from."
        actions={canManage ? <Button size="lg" onClick={() => setDialog({ attribute: null })}><Plus size={17} /> New attribute</Button> : null}
      />
      <Card>
        <DataTable
          className="!rounded-none !border-0 !shadow-none"
          columns={columns}
          data={rows}
          rowKey={(attribute) => attribute.id}
          loading={attributes.isLoading}
          fetching={attributes.isFetching}
          error={attributes.error ? apiMessage(attributes.error, 'Attributes could not be loaded.') : null}
          onRetry={attributes.refetch}
          minWidth={760}
          caption="Attributes"
          onRowClick={(attribute) => router.push(`/admin/attributes/${attribute.id}`)}
          rowLabel={(attribute) => `Manage values for ${attribute.translations?.en?.label || attribute.key}`}
          emptyTitle="No attributes yet"
          emptyDescription="Create an attribute such as Size or Color, then add its values."
        />
      </Card>
      {dialog ? <AttributeDialog attribute={dialog.attribute} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

function AttributeDialog({ attribute, onClose }) {
  const queryClient = useQueryClient();
  const editing = Boolean(attribute);
  const [form, setForm] = useState({
    key: attribute?.key || '',
    type: attribute?.type || 'select',
    labelEn: attribute?.translations?.en?.label || '',
    labelBn: attribute?.translations?.bn?.label || '',
    filterable: attribute?.filterable ?? true,
    variationCapable: attribute?.variationCapable ?? true,
    active: attribute?.active ?? true,
    displayOrder: String(attribute?.displayOrder ?? 0),
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const patch = (changes) => setForm((current) => ({ ...current, ...changes }));

  const save = useMutation({
    mutationFn: () => {
      const common = { filterable: form.filterable, variationCapable: form.variationCapable, displayOrder: Number(form.displayOrder) || 0, translations: { en: { label: form.labelEn.trim() }, bn: { label: form.labelBn.trim() } } };
      return editing
        ? browserApi.patch(`/admin/attributes/${attribute.id}`, { ...common, active: form.active, version: attribute.version })
        : browserApi.post('/admin/attributes', { ...common, key: form.key.trim(), type: form.type, values: [] });
    },
    onSuccess: () => { pushToast({ tone: 'success', title: editing ? 'Attribute saved.' : 'Attribute created.' }); queryClient.invalidateQueries({ queryKey: ATTRIBUTES_KEY }); onClose(); },
    onError: (error) => {
      if (error?.response?.status === 409 && error.response.data?.error?.code === 'VERSION_CONFLICT') { queryClient.invalidateQueries({ queryKey: ATTRIBUTES_KEY }); setMessage('This attribute changed elsewhere. The list was refreshed; close this dialog and reopen it to edit the latest version.'); return; }
      const fields = mapFieldErrors(error?.response?.data?.error?.fieldErrors);
      setErrors({ key: fields.key, labelEn: fields['translations.en.label'], labelBn: fields['translations.bn.label'], displayOrder: fields.displayOrder });
      setMessage(Object.keys(fields).length ? 'Check the highlighted fields.' : apiMessage(error, 'Could not save the attribute.'));
    },
  });

  const submit = () => {
    const found = {};
    if (!editing && !KEY_RE.test(form.key.trim())) found.key = 'Start with a lowercase letter; use lowercase letters, numbers and underscores.';
    if (!form.labelEn.trim()) found.labelEn = 'Enter an English label.';
    if (!form.labelBn.trim()) found.labelBn = 'Enter a Bangla label.';
    if (!/^\d+$/.test(form.displayOrder.trim() || '0')) found.displayOrder = 'Use a whole number, 0 or more.';
    setErrors(found);
    setMessage(Object.keys(found).length ? 'Check the highlighted fields.' : '');
    if (!Object.keys(found).length) save.mutate();
  };

  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        title={editing ? 'Edit attribute' : 'New attribute'}
        description={editing ? 'The key and type cannot be changed once created.' : 'Add values after creating it.'}
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>{editing ? 'Save changes' : 'Create attribute'}</Button></>}
      >
        <form className="grid gap-4" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
          {message ? <Alert tone="error">{message}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Key" required error={errors.key} hint="Used internally, e.g. size or color."><Input value={form.key} disabled={editing} maxLength={100} onChange={(event) => patch({ key: event.target.value.toLowerCase() })} /></Field>
            <Field label="Type"><NativeSelect value={form.type} disabled={editing} onChange={(event) => patch({ type: event.target.value })} options={[{ value: 'select', label: 'Select (list of options)' }, { value: 'color', label: 'Color (with swatches)' }, { value: 'text', label: 'Text' }]} /></Field>
            <Field label="Label (English)" required error={errors.labelEn}><Input value={form.labelEn} maxLength={160} onChange={(event) => patch({ labelEn: event.target.value })} /></Field>
            <Field label="Label (Bangla)" required error={errors.labelBn}><Input lang="bn" value={form.labelBn} maxLength={160} onChange={(event) => patch({ labelBn: event.target.value })} /></Field>
            <Field label="Display order" error={errors.displayOrder} hint="Lower numbers come first."><Input inputMode="numeric" value={form.displayOrder} onChange={(event) => patch({ displayOrder: event.target.value })} /></Field>
          </div>
          <SwitchField label="Filterable" description="Shoppers can filter the catalog by this attribute." checked={form.filterable} onCheckedChange={(value) => patch({ filterable: Boolean(value) })} />
          <SwitchField label="Used for variants" description="Products can create variants from this attribute." checked={form.variationCapable} onCheckedChange={(value) => patch({ variationCapable: Boolean(value) })} />
          {editing ? <SwitchField label="Active" description="Inactive attributes cannot be picked for new products." checked={form.active} onCheckedChange={(value) => patch({ active: Boolean(value) })} /> : null}
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
