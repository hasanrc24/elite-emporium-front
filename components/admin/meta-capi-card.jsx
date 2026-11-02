'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Field, FieldGroup, Input, pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { StatusPill, formatDateTime, useCan } from './orders/order-shared';

const STATUS_KEY = ['meta-capi-status'];

/**
 * Rendered inside the Analytics card, under the Pixel ID and the server-side switch.
 * One button saves the token, proves it with a test event and switches the integration on;
 * turning the switch above off is how it is paused.
 */
export function MetaCapiPanel() {
  const client = useQueryClient();
  const can = useCan();
  const manage = can('integrations.manage');
  const [form, setForm] = useState({ accessToken: '', testEventCode: '' });
  const status = useQuery({ queryKey: STATUS_KEY, queryFn: () => browserApi.get('/admin/integrations/meta-capi/status').then((response) => response.data.data), enabled: manage, refetchInterval: 30000 });
  const data = status.data;
  const credential = data?.credential;
  const configured = Boolean(credential);
  const connect = useMutation({
    mutationFn: () => browserApi.post('/admin/integrations/meta-capi/connect', { ...(form.accessToken.trim() ? { accessToken: form.accessToken.trim() } : {}), testEventCode: form.testEventCode.trim(), version: credential?.version ?? null }).then((response) => response.data.data),
    onSuccess: () => { pushToast({ tone: 'success', title: 'Connected to Meta' }); setForm({ accessToken: '', testEventCode: '' }); },
    onError: (error) => pushToast({ tone: 'error', title: 'Could not connect', description: apiMessage(error) }),
    onSettled: () => client.invalidateQueries({ queryKey: STATUS_KEY })
  });
  if (!manage) return null;
  const canConnect = form.testEventCode.trim().length >= 3 && (form.accessToken.trim().length >= 20 || configured);
  // Saved settings decide what is sent, so unsaved edits above are not counted yet.
  const settingsSaved = Boolean(data?.providerIsMeta && data?.pixelId && data?.serverSide);

  return (
    <div className="grid gap-4 border-t border-[var(--color-border)] pt-5">
      <div className="grid gap-1">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          Conversions API connection
          {data ? <StatusPill value={data.ready ? 'paid' : 'draft'} label={data.ready ? 'Sending events' : 'Not sending yet'} /> : null}
        </h3>
        <p className="text-[13px] leading-5 text-[var(--color-muted)]">Sends purchases and key shopper actions from our server, so ads keep working when browsers block the pixel. Each event shares one ID with the browser pixel, so nothing is counted twice.</p>
      </div>
      {data && !settingsSaved ? <Alert tone="info">Save the Pixel ID and the server-side switch above first; connecting uses the saved values.</Alert> : null}
      <FieldGroup columns={2}>
        <Field label="Access token" hint={configured ? `Saved (${credential.maskedLabel}). Leave blank to keep it.` : 'Events Manager → Settings → Conversions API → Generate access token. Stored encrypted.'}>
          <Input type="password" autoComplete="off" value={form.accessToken} placeholder={configured ? '••••••••••••' : 'EAAG…'} onChange={(event) => setForm({ ...form, accessToken: event.target.value })} />
        </Field>
        <Field label="Test event code" hint="Events Manager → Test events. Used once to check the connection; it is not saved.">
          <Input autoComplete="off" value={form.testEventCode} placeholder="TEST12345" onChange={(event) => setForm({ ...form, testEventCode: event.target.value })} />
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap items-center gap-3">
        <Button loading={connect.isPending} disabled={!canConnect || !settingsSaved} onClick={() => connect.mutate()}>{credential?.active ? 'Save and reconnect' : 'Save and connect'}</Button>
        {credential?.active && data?.serverSide ? <span className="text-xs text-[var(--color-muted)]">To pause, turn the server-side switch off above.</span> : null}
      </div>
      {data ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-[var(--color-muted)]">Sent (24h)</dt><dd className="font-semibold tabular-nums">{data.queue.sent24h}</dd></div>
          <div><dt className="text-[var(--color-muted)]">Waiting</dt><dd className="font-semibold tabular-nums">{data.queue.pending}</dd></div>
          <div><dt className="text-[var(--color-muted)]">Awaiting payment</dt><dd className="font-semibold tabular-nums">{data.queue.held}</dd></div>
          <div><dt className="text-[var(--color-muted)]">Failed (24h)</dt><dd className="font-semibold tabular-nums">{data.queue.failed24h}</dd></div>
        </dl>
      ) : null}
      {data?.lastSentAt ? <p className="text-xs text-[var(--color-muted)]">Last event delivered {formatDateTime(data.lastSentAt)}.</p> : null}
      {data?.lastError ? <Alert tone="warning">Latest failure: {data.lastError}</Alert> : null}
    </div>
  );
}
