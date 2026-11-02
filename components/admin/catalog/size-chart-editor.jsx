'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, Button, Card, ErrorState, Field, IconButton, Input, NativeSelect, Skeleton, pushToast } from '@/components/ui';
import { AdminPageHeader } from '../admin-page-header';
import { mapFieldErrors } from '../products/product-logic';
import { COLUMN_KEY_RE, SUGGESTED_COLUMNS, chartToForm, cmToInch, columnKeyFromLabel, emptyChart, formToChartPayload, moveItem, titleCaseKey, validateChartForm } from './catalog-logic';

export function SizeChartEditor({ id }) {
  const chart = useQuery({
    queryKey: ['admin', 'size-chart', id],
    enabled: Boolean(id),
    queryFn: () => browserApi.get(`/admin/size-charts/${id}`).then((response) => response.data.data),
  });
  if (!id) return <ChartForm key="new" initial={emptyChart()} />;
  if (chart.isLoading) return <div className="grid gap-4" aria-busy="true"><Skeleton className="h-12 w-72" /><Skeleton className="h-64 w-full" rounded="lg" /></div>;
  if (chart.error) return <ErrorState title="Size chart could not be loaded" description={apiMessage(chart.error, 'It may have been archived.')} action={<Button variant="secondary" onClick={() => chart.refetch()}>Try again</Button>} />;
  // Re-key on version so a refetch after a conflict resets the form to the latest data.
  return <ChartForm key={chart.data.version} id={id} initial={chartToForm(chart.data)} />;
}

function ChartForm({ id, initial }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canManage = Boolean(permissions?.includes('catalog.manage'));
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [newColumn, setNewColumn] = useState('');
  const [columnError, setColumnError] = useState('');
  const disabled = !canManage;

  const patch = (changes) => setForm((current) => ({ ...current, ...changes }));
  const patchRow = (index, changes) => setForm((current) => ({ ...current, rows: current.rows.map((row, i) => (i === index ? { ...row, ...changes } : row)) }));
  const setCell = (index, key, value) => setForm((current) => ({ ...current, rows: current.rows.map((row, i) => (i === index ? { ...row, cells: { ...row.cells, [key]: value } } : row)) }));

  const addColumn = (raw) => {
    const key = columnKeyFromLabel(raw);
    if (!key || !COLUMN_KEY_RE.test(key)) { setColumnError('Use a name that starts with a letter, such as "bust" or "waist".'); return; }
    if (form.columns.includes(key)) { setColumnError('That column already exists.'); return; }
    setColumnError('');
    setNewColumn('');
    setForm((current) => ({ ...current, columns: [...current.columns, key], rows: current.rows.map((row) => ({ ...row, cells: { ...row.cells, [key]: '' } })) }));
  };
  const removeColumn = (key) => setForm((current) => ({ ...current, columns: current.columns.filter((item) => item !== key), rows: current.rows.map((row) => ({ ...row, cells: Object.fromEntries(Object.entries(row.cells).filter(([cellKey]) => cellKey !== key)) })) }));
  const addRow = () => setForm((current) => ({ ...current, rows: [...current.rows, { labelEn: '', labelBn: '', cells: Object.fromEntries(current.columns.map((key) => [key, ''])) }] }));
  const removeRow = (index) => setForm((current) => ({ ...current, rows: current.rows.filter((_, i) => i !== index) }));

  const save = useMutation({
    mutationFn: () => {
      const payload = formToChartPayload(form);
      return id ? browserApi.patch(`/admin/size-charts/${id}`, payload).then((response) => response.data.data) : browserApi.post('/admin/size-charts', payload).then((response) => response.data.data);
    },
    onSuccess: (saved) => {
      pushToast({ tone: 'success', title: id ? 'Size chart saved.' : 'Size chart created.' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'size-charts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-editor', 'size-charts'] });
      if (id) queryClient.setQueryData(['admin', 'size-chart', id], saved);
      else router.replace(`/admin/size-charts/${saved.id}`);
    },
    onError: (error) => {
      if (error?.response?.status === 409 && error?.response?.data?.error?.code === 'VERSION_CONFLICT') { setConflict(true); return; }
      const fields = mapFieldErrors(error?.response?.data?.error?.fieldErrors);
      setErrors(fields);
      setFormError(Object.keys(fields).length ? 'Check the highlighted fields.' : apiMessage(error, 'Could not save the size chart.'));
    },
  });

  const submit = (event) => {
    event.preventDefault();
    setFormError('');
    setConflict(false);
    const found = validateChartForm(form);
    setErrors(found);
    if (Object.keys(found).length) { setFormError('Check the highlighted fields.'); return; }
    save.mutate();
  };
  const reload = () => queryClient.invalidateQueries({ queryKey: ['admin', 'size-chart', id] });
  const showInches = form.units === 'cm';
  const unitLabel = form.units === 'in' ? 'in' : 'cm';

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <AdminPageHeader
        title={id ? form.name || 'Size chart' : 'New size chart'}
        description="Shoppers see this table next to the size picker."
        backHref="/admin/size-charts"
        backLabel="Size charts"
        actions={canManage ? <Button type="submit" size="lg" loading={save.isPending}><Save size={17} /> {id ? 'Save changes' : 'Create size chart'}</Button> : null}
      />
      {!canManage ? <Alert tone="info">You can view this chart but not change it.</Alert> : null}
      {conflict ? <Alert tone="warning" title="This chart changed elsewhere" action={<Button type="button" size="sm" variant="secondary" onClick={reload}>Load latest</Button>}>Someone saved a newer version. Load it, then reapply your changes.</Alert> : null}
      {formError && !conflict ? <Alert tone="error">{formError}</Alert> : null}

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Internal name" required error={errors.name} hint="Only admins see this, for example “Women's tops”." className="md:col-span-2"><Input value={form.name} disabled={disabled} maxLength={160} onChange={(event) => patch({ name: event.target.value })} /></Field>
        <Field label="Title (English)" required error={errors.titleEn}><Input value={form.titleEn} disabled={disabled} maxLength={180} onChange={(event) => patch({ titleEn: event.target.value })} /></Field>
        <Field label="Title (Bangla)" required error={errors.titleBn}><Input lang="bn" value={form.titleBn} disabled={disabled} maxLength={180} onChange={(event) => patch({ titleBn: event.target.value })} /></Field>
        <Field label="Units" hint={showInches ? 'Enter centimetres. Inches are shown as a preview only.' : 'Values are stored and shown in inches.'}>
          <NativeSelect value={form.units} disabled={disabled} onChange={(event) => patch({ units: event.target.value })} options={[{ value: 'cm', label: 'Centimetres (cm)' }, { value: 'in', label: 'Inches (in)' }]} />
        </Field>
      </Card>

      <Card className="grid gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Measurement columns</h2>
          <p className="text-sm text-[var(--color-muted)]">Pick the measurements this chart lists.</p>
        </div>
        {errors.columns ? <p role="alert" className="error text-sm">{errors.columns}</p> : null}
        <ul className="flex flex-wrap gap-2" aria-label="Columns">
          {form.columns.map((key) => (
            <li key={key} className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] py-1 pl-3 pr-1 text-sm font-semibold">
              {titleCaseKey(key)}
              {canManage ? <IconButton icon={Trash2} label={`Remove ${titleCaseKey(key)} column`} className="!size-7" onClick={() => removeColumn(key)} /> : null}
            </li>
          ))}
        </ul>
        {canManage ? (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-start gap-2">
              <Field label="Add a column" srLabel error={columnError} className="min-w-52 flex-1">
                <Input value={newColumn} maxLength={40} placeholder="e.g. bust, waist, sleeve" onChange={(event) => { setNewColumn(event.target.value); setColumnError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addColumn(newColumn); } }} />
              </Field>
              <Button type="button" variant="secondary" onClick={() => addColumn(newColumn)}><Plus size={16} /> Add column</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
              Quick add:
              {SUGGESTED_COLUMNS.filter((key) => !form.columns.includes(key)).map((key) => <Button key={key} type="button" size="sm" variant="ghost" onClick={() => addColumn(key)}>+ {titleCaseKey(key)}</Button>)}
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Sizes</h2>
            <p className="text-sm text-[var(--color-muted)]">Measurements in {unitLabel}. Leave a cell blank if it does not apply. Order here is the order shoppers see.</p>
          </div>
          {canManage ? <Button type="button" variant="secondary" onClick={addRow} disabled={form.rows.length >= 40}><Plus size={16} /> Add size</Button> : null}
        </div>
        {errors.rows ? <p role="alert" className="error text-sm">{errors.rows}</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
            <caption className="sr-only">Size chart rows</caption>
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                <th scope="col" className="px-1">Size (English)</th>
                <th scope="col" className="px-1">Size (Bangla)</th>
                {form.columns.map((key) => <th scope="col" key={key} className="px-1">{titleCaseKey(key)} ({unitLabel})</th>)}
                <th scope="col" className="w-28 px-1"><span className="sr-only">Row actions</span></th>
              </tr>
            </thead>
            <tbody>
              {form.rows.map((row, index) => (
                <tr key={index} className="align-top">
                  <td className="px-1"><Input aria-label={`Size ${index + 1} label (English)`} invalid={Boolean(errors[`rows.${index}.labelEn`])} title={errors[`rows.${index}.labelEn`]} value={row.labelEn} disabled={disabled} maxLength={120} onChange={(event) => patchRow(index, { labelEn: event.target.value })} placeholder="S" />{errors[`rows.${index}.labelEn`] ? <p role="alert" className="error mt-1 text-xs">{errors[`rows.${index}.labelEn`]}</p> : null}</td>
                  <td className="px-1"><Input lang="bn" aria-label={`Size ${index + 1} label (Bangla)`} invalid={Boolean(errors[`rows.${index}.labelBn`])} value={row.labelBn} disabled={disabled} maxLength={120} onChange={(event) => patchRow(index, { labelBn: event.target.value })} placeholder="এস" />{errors[`rows.${index}.labelBn`] ? <p role="alert" className="error mt-1 text-xs">{errors[`rows.${index}.labelBn`]}</p> : null}</td>
                  {form.columns.map((key) => {
                    const cellError = errors[`rows.${index}.cells.${key}`];
                    const inch = showInches ? cmToInch(row.cells[key]) : '';
                    return (
                      <td key={key} className="px-1">
                        <Input inputMode="decimal" aria-label={`Size ${index + 1} ${titleCaseKey(key)} (${unitLabel})`} invalid={Boolean(cellError)} value={row.cells[key] ?? ''} disabled={disabled} onChange={(event) => setCell(index, key, event.target.value)} />
                        {cellError ? <p role="alert" className="error mt-1 text-xs">{cellError}</p> : inch ? <p className="mt-1 text-xs tabular-nums text-[var(--color-muted)]" aria-label={`${inch} inches`}>{inch} in</p> : null}
                      </td>
                    );
                  })}
                  <td className="px-1">
                    {canManage ? (
                      <div className="flex gap-0.5">
                        <IconButton icon={ArrowUp} label={`Move size ${index + 1} up`} disabled={index === 0} onClick={() => patch({ rows: moveItem(form.rows, index, -1) })} />
                        <IconButton icon={ArrowDown} label={`Move size ${index + 1} down`} disabled={index === form.rows.length - 1} onClick={() => patch({ rows: moveItem(form.rows, index, 1) })} />
                        <IconButton icon={Trash2} label={`Remove size ${index + 1}`} disabled={form.rows.length === 1} onClick={() => removeRow(index)} />
                      </div>
                    ) : null}
                    {errors[`rows.${index}.cells`] ? <p role="alert" className="error mt-1 text-xs">{errors[`rows.${index}.cells`]}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </form>
  );
}
