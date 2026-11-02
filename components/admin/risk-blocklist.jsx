'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ShieldCheck } from 'lucide-react';
import { Alert, Button, DataTable, TableFooter, actionsColumn, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from './admin-page-header';
import { StatusPill, formatDateTime, useCan } from './orders/order-shared';

const DEFAULTS = { page: 1, pageSize: 25 };

export function RiskBlocklist() {
  const client = useQueryClient();
  const can = useCan();
  const [{ page, pageSize }, setTableParams] = useTableParams(DEFAULTS);
  const [form, setForm] = useState({ type: 'phone', value: '', reason: '' });
  const list = useQuery({ queryKey: ['risk-blocklist', page, pageSize], queryFn: () => browserApi.get('/admin/risk/blocklist', { params: { page, pageSize } }).then((response) => response.data), placeholderData: keepPreviousData });
  const save = useMutation({
    mutationFn: ({ id, ...body }) => (id ? browserApi.patch(`/admin/risk/blocklist/${id}`, body) : browserApi.post('/admin/risk/blocklist', body)),
    onSuccess: (_result, variables) => {
      if (variables.id) pushToast({ tone: 'success', title: variables.active ? 'Blocked again' : 'Unblocked' });
      else setForm({ type: 'phone', value: '', reason: '' });
      client.invalidateQueries({ queryKey: ['risk-blocklist'] });
    },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not save', description: apiMessage(error) })
  });
  const rows = list.data?.data || [];
  const meta = list.data?.meta || {};

  const columns = useMemo(() => [
    { id: 'value', header: 'Value', cell: ({ row: { original: row } }) => <div className="max-w-[16rem]"><p className="truncate font-medium" title={row.value}>{row.value}</p><p className="text-xs capitalize text-[var(--color-muted)]">{row.type}</p></div> },
    { id: 'reason', header: 'Reason', cell: ({ row: { original: row } }) => <p className="max-w-xs truncate" title={row.reason}>{row.reason}</p> },
    { id: 'added', header: 'Added', cell: ({ row: { original: row } }) => <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">{formatDateTime(row.createdAt)}{row.actor?.name ? ` · ${row.actor.name}` : ''}</span> },
    { id: 'status', header: 'Status', cell: ({ row: { original: row } }) => <StatusPill value={row.active ? 'cancelled' : 'draft'} label={row.active ? 'Blocked' : 'Lifted'} /> },
    actionsColumn((row) => {
      const change = (active) => save.mutate({ id: row.id, type: row.type, value: row.value, reason: row.reason, active });
      return [
        { label: 'Unblock', icon: ShieldCheck, hidden: !can('risk.manage') || !row.active, onSelect: () => change(false), confirm: { title: `Unblock ${row.value}?`, description: 'This customer will be able to place online orders again.', confirmLabel: 'Unblock' } },
        { label: 'Block again', icon: Ban, hidden: !can('risk.manage') || row.active, onSelect: () => change(true) }
      ];
    }, { label: (row) => `Actions for ${row.value}` })
  ], [can, save]);

  return (
    <div className="grid gap-5">
      <AdminPageHeader title="COD blocklist" description="Phones, emails or IP networks that may not place online orders (fake orders, repeated refusals). Customers see a neutral message and are asked to contact you." />
      {can('risk.manage') ? (
        <form className="admin-card grid gap-3 p-5 md:grid-cols-[140px_1fr_1.5fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); save.mutate(form); }}>
          <label className="field"><span>Type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="phone">Phone</option><option value="email">Email</option><option value="ip_prefix">IP address</option></select></label>
          <label className="field"><span>{form.type === 'phone' ? 'Phone number' : form.type === 'ip_prefix' ? 'IP address (blocks its /24 or /64 network)' : 'Email'}</span><input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder={form.type === 'phone' ? '01XXXXXXXXX' : form.type === 'ip_prefix' ? '203.0.113.7' : 'name@example.com'} /></label>
          <label className="field"><span>Reason</span><input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="e.g. Refused 3 parcels" /></label>
          <Button type="submit" loading={save.isPending} disabled={form.value.trim().length < 3 || form.reason.trim().length < 3}>Block</Button>
          {save.error && !save.variables?.id ? <div className="md:col-span-4"><Alert tone="error">{apiMessage(save.error)}</Alert></div> : null}
        </form>
      ) : null}
      <div className="grid gap-0">
        <DataTable
          caption="COD blocklist"
          columns={columns}
          data={rows}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error ? apiMessage(list.error) : null}
          onRetry={list.refetch}
          minWidth={680}
          emptyTitle="No blocked customers"
          emptyDescription={can('risk.manage') ? 'Add a phone number or email above to stop it placing online orders.' : 'Nothing has been blocked yet.'}
        />
        <TableFooter page={page} pageSize={pageSize} total={meta.total || 0} pageCount={meta.pageCount} onPageChange={(next) => setTableParams({ page: next })} onPageSizeChange={(size) => setTableParams({ pageSize: size })} />
      </div>
    </div>
  );
}
