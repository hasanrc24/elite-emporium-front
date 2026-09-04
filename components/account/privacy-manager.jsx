'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { Alert, Banner, Button, Card, CardBody, CardHeader, Field, Input, NativeSelect, Skeleton, StatusBadge, Textarea } from '@/components/ui';

export function PrivacyManager() {
  const query = useQuery({ queryKey: ['account', 'privacy'], queryFn: accountApi.privacyRequests });
  const [type, setType] = useState('export');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [note, setNote] = useState('');
  const create = useMutation({
    mutationFn: () => accountApi.createPrivacyRequest({
      type,
      note,
      ...(type === 'deletion' ? { currentPassword: password, confirmation } : {})
    }),
    onSuccess: () => { setPassword(''); setConfirmation(''); setNote(''); query.refetch(); }
  });

  const requireDeletion = type === 'deletion' && (!password || confirmation !== 'DELETE MY ACCOUNT');

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm uppercase tracking-widest text-[var(--color-primary)]">Data rights</p>
        <h2 className="text-2xl font-black">Privacy requests</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          Request a portable account export or ask us to delete personal account data. Statutory order and payment records may be retained where required.
        </p>
      </div>

      <Card>
        <CardHeader title="Submit a new request" description="Reviews typically begin within 48 hours." />
        <CardBody className="grid gap-4">
          <Field label="Request type">
            <NativeSelect
              value={type}
              onChange={(event) => setType(event.target.value)}
              options={[
                { value: 'export', label: 'Export my data' },
                { value: 'deletion', label: 'Delete my account data' }
              ]}
            />
          </Field>
          <Field label="Optional note">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>

          {type === 'deletion' ? (
            <>
              <Banner tone="danger" title="This action is irreversible">
                Deletion signs you out after approval and cannot be undone. Open orders and returns must be resolved first.
              </Banner>
              <Field label="Current password" htmlFor="priv-pw">
                <Input id="priv-pw" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              <Field label="Type DELETE MY ACCOUNT to confirm" htmlFor="priv-confirm">
                <Input id="priv-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </Field>
            </>
          ) : null}

          {create.error ? <Alert tone="error">{apiMessage(create.error)}</Alert> : null}
          <div>
            <Button loading={create.isPending} disabled={requireDeletion} onClick={() => create.mutate()}>
              Submit request
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Request history" description="Track status and reviewer activity." />
        <CardBody className="grid gap-3">
          {query.isLoading ? <Skeleton className="h-20" /> : null}
          {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
          {query.data?.length ? (
            query.data.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
                <div className="grid gap-1">
                  <strong className="capitalize">{request.type}</strong>
                  <p className="text-sm text-[var(--color-muted)]">{request.note || 'No note provided.'}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            ))
          ) : !query.isLoading ? (
            <p className="text-sm text-[var(--color-muted)]">No requests yet.</p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}