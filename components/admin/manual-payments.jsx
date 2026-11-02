'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Alert, Button, DataTable, DialogContent, DialogRoot, FormattedMoney, TableFooter, actionsColumn, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from './admin-page-header';
import { StatusPill, formatDateTime, useCan } from './orders/order-shared';

const DEFAULTS = { page: 1, pageSize: 25, status: 'submitted' };
const STATUSES = ['submitted', 'verified', 'rejected', 'expired'];
const PILL = { submitted: 'placed', verified: 'paid', rejected: 'cancelled', expired: 'draft' };
const PROVIDERS = { bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket', upay: 'Upay' };

/** BR-PAY-006: staff check each reported TrxID against the wallet statement. */
export function ManualPayments() {
  const client = useQueryClient();
  const can = useCan();
  const [{ page, pageSize, status }, setTableParams] = useTableParams(DEFAULTS);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const list = useQuery({
    queryKey: ['manual-payments', page, pageSize, status],
    queryFn: () => browserApi.get('/admin/manual-payments', { params: { page, pageSize, status: status || undefined } }).then((response) => response.data),
    placeholderData: keepPreviousData
  });
  const decide = useMutation({
    mutationFn: ({ id, verdict, reason: why }) => browserApi.post(`/admin/manual-payments/${id}/${verdict}`, verdict === 'reject' ? { reason: why } : undefined).then((response) => response.data.data),
    onSuccess: (_data, variables) => {
      pushToast({ tone: 'success', title: variables.verdict === 'verify' ? 'Payment verified' : 'Payment rejected' });
      setRejecting(null); setReason('');
      client.invalidateQueries({ queryKey: ['manual-payments'] });
      client.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not save', description: apiMessage(error) })
  });
  const rows = useMemo(() => list.data?.data || [], [list.data]);
  const meta = list.data?.meta || {};
  const duplicateSenders = useMemo(() => {
    const seen = new Map();
    for (const row of rows) seen.set(row.senderPhone, (seen.get(row.senderPhone) || 0) + 1);
    return seen;
  }, [rows]);

  const columns = useMemo(() => [
    { id: 'order', header: 'Order', cell: ({ row: { original: row } }) => <div><p className="font-medium">{row.order?.reference}</p><p className="text-xs text-[var(--color-muted)]">{row.order?.customerName} · {row.order?.customerPhone}</p></div> },
    { id: 'trx', header: 'TrxID', cell: ({ row: { original: row } }) => <div><p className="select-all font-mono font-medium">{row.trxId}</p><p className="text-xs text-[var(--color-muted)]">{PROVIDERS[row.provider] || row.provider} from {row.senderPhone}{duplicateSenders.get(row.senderPhone) > 1 ? ' · repeated sender' : ''}</p></div> },
    { id: 'amount', header: 'Amount due', cell: ({ row: { original: row } }) => <FormattedMoney value={row.amount} className="tabular-nums font-medium" /> },
    { id: 'submitted', header: 'Submitted', cell: ({ row: { original: row } }) => <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">{formatDateTime(row.createdAt)}</span> },
    { id: 'status', header: 'Status', cell: ({ row: { original: row } }) => <div><StatusPill value={PILL[row.status]} label={row.status} />{row.rejectionReason ? <p className="mt-1 max-w-[14rem] truncate text-xs text-[var(--color-muted)]" title={row.rejectionReason}>{row.rejectionReason}</p> : null}</div> },
    actionsColumn((row) => [
      { label: 'Verify payment', icon: Check, hidden: !can('payments.verify_manual') || row.status !== 'submitted', onSelect: () => decide.mutate({ id: row.id, verdict: 'verify' }), confirm: { title: `Verify ${row.trxId}?`, description: `Confirm the wallet statement shows ${row.amount} BDT received. The order will be marked paid.`, confirmLabel: 'Verify payment' } },
      { label: 'Reject', icon: X, hidden: !can('payments.verify_manual') || row.status !== 'submitted', onSelect: () => { setReason(''); setRejecting(row); } }
    ], { label: (row) => `Actions for ${row.trxId}` })
  ], [can, decide, duplicateSenders]);

  return (
    <div className="grid gap-5">
      <AdminPageHeader title="Wallet payments" description="Customers report a bKash, Nagad, Rocket or Upay TrxID after paying. Match it with your wallet statement, then verify or reject. Each TrxID can be used once." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUSES.map((value) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setTableParams({ status: value, page: 1 })} className={`rounded-full border px-3 py-1 text-sm capitalize ${status === value ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]' : 'border-[var(--color-border)]'}`}>{value}</button>)}
      </div>
      <div className="grid gap-0">
        <DataTable caption="Wallet payments" columns={columns} data={rows} loading={list.isLoading} fetching={list.isFetching} error={list.error ? apiMessage(list.error) : null} onRetry={list.refetch} minWidth={720} emptyTitle="Nothing to check" emptyDescription="No wallet payments match this status." />
        <TableFooter page={page} pageSize={pageSize} total={meta.total || 0} pageCount={meta.pageCount} onPageChange={(next) => setTableParams({ page: next })} onPageSizeChange={(size) => setTableParams({ pageSize: size })} />
      </div>
      {rejecting ? (
        <DialogRoot open onOpenChange={(open) => { if (!open && !decide.isPending) setRejecting(null); }}>
          <DialogContent title={`Reject ${rejecting.trxId}?`} description="The customer sees that the reference could not be verified and can pay on delivery." footer={<>
            <Button variant="secondary" onClick={() => setRejecting(null)} disabled={decide.isPending}>Back</Button>
            <Button variant="danger" loading={decide.isPending} disabled={reason.trim().length < 3} onClick={() => decide.mutate({ id: rejecting.id, verdict: 'reject', reason: reason.trim() })}>Reject payment</Button>
          </>}>
            <label className="field"><span>Reason (required)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} placeholder="e.g. No matching transaction in the statement" autoFocus /></label>
            {decide.error ? <Alert tone="error">{apiMessage(decide.error)}</Alert> : null}
          </DialogContent>
        </DialogRoot>
      ) : null}
    </div>
  );
}
