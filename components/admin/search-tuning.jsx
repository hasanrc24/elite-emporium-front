'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Alert, Button, DataTable, TableFooter, actionsColumn, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from './admin-page-header';
import { formatDateTime } from './orders/order-shared';

const SYNONYM_DEFAULTS = { page: 1, pageSize: 25 };
const MISS_DEFAULTS = { page: 1, pageSize: 25 };

/** Banglish/Bangla synonyms and the searches that found nothing (BE-SEARCH-001). */
export function SearchTuning() {
  const client = useQueryClient();
  const [form, setForm] = useState({ term: '', synonyms: '' });
  const [synonymParams, setSynonymParams] = useTableParams(SYNONYM_DEFAULTS, { prefix: 'syn_' });
  const [missParams, setMissParams] = useTableParams(MISS_DEFAULTS, { prefix: 'miss_' });
  const synonyms = useQuery({ queryKey: ['search-synonyms', synonymParams.page, synonymParams.pageSize], queryFn: () => browserApi.get('/admin/search/synonyms', { params: { page: synonymParams.page, pageSize: synonymParams.pageSize } }).then((response) => response.data), placeholderData: keepPreviousData });
  const misses = useQuery({ queryKey: ['search-misses', missParams.page, missParams.pageSize], queryFn: () => browserApi.get('/admin/search/misses', { params: { page: missParams.page, pageSize: missParams.pageSize } }).then((response) => response.data), placeholderData: keepPreviousData });
  const refresh = () => client.invalidateQueries({ queryKey: ['search-synonyms'] });
  const save = useMutation({ mutationFn: () => browserApi.post('/admin/search/synonyms', { term: form.term, synonyms: form.synonyms.split(',').map((value) => value.trim()).filter(Boolean) }), onSuccess: () => { setForm({ term: '', synonyms: '' }); refresh(); } });
  const remove = useMutation({
    mutationFn: (id) => browserApi.delete(`/admin/search/synonyms/${id}`),
    onSuccess: () => { pushToast({ tone: 'success', title: 'Synonym set deleted' }); refresh(); },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not delete', description: apiMessage(error) })
  });
  const synonymRows = synonyms.data?.data || [];
  const synonymMeta = synonyms.data?.meta || {};
  const missRows = misses.data?.data || [];
  const missMeta = misses.data?.meta || {};

  const synonymColumns = useMemo(() => [
    { id: 'term', header: 'Term', cell: ({ row: { original: row } }) => <strong className="block max-w-[10rem] truncate" title={row.term}>{row.term}</strong> },
    { id: 'synonyms', header: 'Also matches', cell: ({ row: { original: row } }) => <p className="max-w-xs truncate text-[var(--color-muted)]" title={row.synonyms.join(', ')}>{row.synonyms.join(', ')}</p> },
    actionsColumn((row) => [
      { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => remove.mutate(row.id), confirm: { title: `Delete synonyms for “${row.term}”?`, description: 'Search will stop treating these words as the same term.', confirmLabel: 'Delete' } }
    ], { label: (row) => `Actions for ${row.term}` })
  ], [remove]);
  const missColumns = useMemo(() => [
    { id: 'query', header: 'Search', cell: ({ row: { original: row } }) => <span className="block max-w-[12rem] truncate" title={row.query}>{row.query} <span className="text-xs text-[var(--color-muted)]">({row.locale})</span></span> },
    { id: 'count', header: 'Times', meta: { align: 'right' }, cell: ({ row: { original: row } }) => <span className="tabular-nums">{row.count}×</span> },
    { id: 'last', header: 'Last seen', cell: ({ row: { original: row } }) => <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">{formatDateTime(row.lastSeenAt)}</span> }
  ], []);

  return (
    <div className="grid gap-5">
      <AdminPageHeader title="Search tuning" description="Teach search that “shalwar”, “salwar” and “সালোয়ার” mean the same thing, and see what customers searched for without results." />
      <form className="admin-card grid gap-3 p-5 md:grid-cols-[1fr_2fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <label className="field"><span>Main term</span><input value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} placeholder="salwar" /></label>
        <label className="field"><span>Also matches (comma separated)</span><input value={form.synonyms} onChange={(event) => setForm({ ...form, synonyms: event.target.value })} placeholder="shalwar, সালোয়ার" /></label>
        <Button type="submit" loading={save.isPending} disabled={form.term.trim().length < 2 || !form.synonyms.trim()}>Add</Button>
        {save.error ? <div className="md:col-span-3"><Alert tone="error">{apiMessage(save.error)}</Alert></div> : null}
      </form>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Synonym sets</h2>
          <DataTable caption="Synonym sets" columns={synonymColumns} data={synonymRows} loading={synonyms.isLoading} fetching={synonyms.isFetching} error={synonyms.error ? apiMessage(synonyms.error) : null} onRetry={synonyms.refetch} minWidth={420} emptyTitle="No synonym sets yet" emptyDescription="Add a main term and the words that should match it." />
          <TableFooter page={synonymParams.page} pageSize={synonymParams.pageSize} total={synonymMeta.total || 0} pageCount={synonymMeta.pageCount} onPageChange={(next) => setSynonymParams({ page: next })} onPageSizeChange={(size) => setSynonymParams({ pageSize: size })} />
        </section>
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Searches with no results</h2>
          <DataTable caption="Searches with no results" columns={missColumns} data={missRows} loading={misses.isLoading} fetching={misses.isFetching} error={misses.error ? apiMessage(misses.error) : null} onRetry={misses.refetch} minWidth={420} emptyTitle="No missed searches yet" emptyDescription="Searches that return nothing will be listed here." />
          <TableFooter page={missParams.page} pageSize={missParams.pageSize} total={missMeta.total || 0} pageCount={missMeta.pageCount} onPageChange={(next) => setMissParams({ page: next })} onPageSizeChange={(size) => setMissParams({ pageSize: size })} />
        </section>
      </div>
    </div>
  );
}
