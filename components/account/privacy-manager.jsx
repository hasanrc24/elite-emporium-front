'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { Alert, Banner, Button, Card, CardBody, CardHeader, Field, Input, NativeSelect, Skeleton, StatusBadge, Textarea } from '@/components/ui';

export function PrivacyManager({ locale = 'en' }) {
  const t = useTranslations('Account.privacy');
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
        <p className="text-sm uppercase tracking-widest text-[var(--color-primary)]">{t('eyebrow')}</p>
        <h2 className="text-2xl font-black">{t('title')}</h2>
        <p className="mt-2 text-[var(--color-muted)]">
          {t('intro')}
        </p>
      </div>

      <Card>
        <CardHeader title={t('newTitle')} description={t('newIntro')} />
        <CardBody className="grid gap-4">
          <Field label={t('type')}>
            <NativeSelect
              value={type}
              onChange={(event) => setType(event.target.value)}
              options={[
                { value: 'export', label: t('types.export') },
                { value: 'deletion', label: t('types.deletion') }
              ]}
            />
          </Field>
          <Field label={t('note')}>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>

          {type === 'deletion' ? (
            <>
              <Banner tone="danger" title={t('irreversibleTitle')}>
                {t('irreversibleBody')}
              </Banner>
              <Field label={t('currentPassword')} htmlFor="priv-pw">
                <Input id="priv-pw" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              <Field label={t('confirmLabel', { phrase: 'DELETE MY ACCOUNT' })} htmlFor="priv-confirm">
                <Input id="priv-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </Field>
            </>
          ) : null}

          {create.error ? <Alert tone="error">{apiMessage(create.error)}</Alert> : null}
          <div>
            <Button loading={create.isPending} disabled={requireDeletion} onClick={() => create.mutate()}>
              {t('submit')}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('historyTitle')} description={t('historyIntro')} />
        <CardBody className="grid gap-3">
          {query.isLoading ? <Skeleton className="h-20" /> : null}
          {query.error ? <Alert tone="error">{apiMessage(query.error)}</Alert> : null}
          {query.data?.length ? (
            query.data.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
                <div className="grid gap-1">
                  <strong>{t(`types.${request.type === 'deletion' ? 'deletion' : 'export'}`)}</strong>
                  <p className="text-sm text-[var(--color-muted)]">{request.note || t('noNote')}</p>
                </div>
                <StatusBadge status={request.status} locale={locale} />
              </div>
            ))
          ) : !query.isLoading ? (
            <p className="text-sm text-[var(--color-muted)]">{t('empty')}</p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}