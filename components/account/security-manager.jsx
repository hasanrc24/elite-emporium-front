'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiMessage } from '@/lib/api/browser-api';
import { authApi } from '@/lib/api/auth-api';
import { accountApi } from '@/lib/api/account-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import {
  Alert,
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  ControlledInput,
  ControlledOTPInput,
  Field,
  Input,
  OTPInput,
  Skeleton
} from '@/components/ui';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

const changePasswordSchema = (t) => z.object({
  // Passwords are sent exactly as typed: trimming would silently change the stored password.
  currentPassword: z.string().min(1, t('errors.currentPassword')),
  password: z.string().min(8, t('errors.passwordLength')).max(128).regex(/[A-Za-z]/, t('errors.passwordLetter')).regex(/\d/, t('errors.passwordNumber')),
  confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: t('errors.mismatch') });

export function SecurityManager({ locale, loginHref = `/${locale}/login` }) {
  const t = useTranslations('Account.security');
  const auth = useAuthStore();
  const client = useQueryClient();
  const router = useRouter();
  const sessions = useQuery({ queryKey: ['account', 'sessions'], queryFn: authApi.sessions });

  async function refreshUser() {
    const user = await accountApi.profile();
    auth.authenticated(user);
    client.setQueryData(['account', 'profile'], user);
  }

  return (
    <div className="grid gap-6">
      <VerificationPanel user={auth.user} onVerified={refreshUser} />
      <PasswordPanel onChanged={refreshUser} />
      <MfaPanel user={auth.user} onChanged={refreshUser} />

      <Card>
        <CardHeader
          title={t('sessionsTitle')}
          description={t('sessionsIntro')}
          action={
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await authApi.logoutAll();
                } catch (error) {
                  errorToast(t('logoutAllPartial'), apiMessage(error, t('logoutAllPartialBody')));
                } finally {
                  client.clear();
                  router.replace(loginHref);
                }
              }}
            >
              {t('logoutAll')}
            </Button>
          }
        />
        <CardBody className="grid gap-3">
          {sessions.isLoading ? <Skeleton className="h-20" /> : null}
          {sessions.error ? <Alert tone="error">{apiMessage(sessions.error)}</Alert> : null}
          {sessions.data?.map((session) => (
            <SessionRow key={session.id} session={session} onRevoked={() => sessions.refetch()} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function VerificationPanel({ user, onVerified }) {
  const t = useTranslations('Account.security');
  return (
    <Card>
      <CardHeader title={t('verificationTitle')} />
      <CardBody className="grid gap-4">
        {user.phone ? <VerificationRow channel="phone" value={user.phone} verified={user.phoneVerified} onVerified={onVerified} /> : null}
        {user.email ? <VerificationRow channel="email" value={user.email} verified={user.emailVerified} onVerified={onVerified} /> : null}
      </CardBody>
    </Card>
  );
}

function VerificationRow({ channel, value, verified, onVerified }) {
  const t = useTranslations('Account.security');
  const [code, setCode] = useState('');
  const resend = useMutation({ mutationFn: () => authApi.resendVerification(channel) });
  const verify = useMutation({
    mutationFn: () => authApi.verifyIdentity(channel, code),
    onSuccess: onVerified
  });

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{t(`channels.${channel}`)}</p>
          <p className="text-sm text-[var(--color-muted)]">{value}</p>
        </div>
        <Badge tone={verified ? 'success' : 'warning'}>{verified ? t('verified') : t('notVerified')}</Badge>
      </div>

      {!verified ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Field label={t('codeLabel', { channel: t(`channels.${channel}`) })} className="grow">
            <OTPInput length={6} value={code} onChange={setCode} />
          </Field>
          <Button disabled={!/^\d{6}$/.test(code)} loading={verify.isPending} onClick={() => verify.mutate()}>
            {t('verify')}
          </Button>
          <Button variant="secondary" loading={resend.isPending} onClick={() => resend.mutate()}>
            {t('resend')}
          </Button>
        </div>
      ) : null}

      {verify.error || resend.error ? (
        <div className="mt-3">
          <Alert tone="error">{apiMessage(verify.error || resend.error)}</Alert>
        </div>
      ) : null}
      {resend.isSuccess ? (
        <div className="mt-3">
          <Alert tone="info">{t('resent')}</Alert>
        </div>
      ) : null}
    </div>
  );
}

function PasswordPanel({ onChanged }) {
  const t = useTranslations('Account.security');
  const schema = useMemo(() => changePasswordSchema(t), [t]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', confirmation: '' }
  });
  const change = useMutation({
    mutationFn: async (values) => {
      return authApi.changePassword({ currentPassword: values.currentPassword, password: values.password });
    },
    onSuccess: () => {
      successToast(t('passwordChanged'), t('passwordChangedBody'));
      form.reset();
      onChanged().catch(() => {});
    },
    onError: (error) => errorToast(t('passwordFailed'), apiMessage(error)),
  });

  return (
    <form
      className="card grid gap-4 p-6"
      onSubmit={form.handleSubmit((values) => {
        change.mutate(values);
      })}
    >
      <CardHeader title={t('passwordTitle')} />
      <Field label={t('currentPassword')} required error={form.formState.errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" required {...form.register('currentPassword')} />
      </Field>
      <Field label={t('newPassword')} required error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="new-password" required {...form.register('password')} />
      </Field>
      <Field label={t('confirmPassword')} required error={form.formState.errors.confirmation?.message}>
        <Input type="password" autoComplete="new-password" required {...form.register('confirmation')} />
      </Field>
      {change.error ? <Alert tone="error">{apiMessage(change.error, change.error.message)}</Alert> : null}
      <div>
        <Button loading={change.isPending}>{t('passwordSubmit')}</Button>
      </div>
    </form>
  );
}

function MfaPanel({ user, onChanged }) {
  const t = useTranslations('Account.security');
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const setupMutation = useMutation({ mutationFn: () => authApi.setupMfa('Elite Emporium'), onSuccess: setSetup });
  const confirmSchema = useMemo(() => z.object({ code: z.string().trim().min(6, t('errors.code6')) }), [t]);
  const disableSchema = useMemo(() => z.object({
    password: z.string().min(1, t('errors.currentPassword')),
    code: z.string().trim().min(1, t('errors.code')),
  }), [t]);
  const confirmForm = useForm({
    resolver: zodResolver(confirmSchema),
    defaultValues: { code: '' }
  });
  const disableForm = useForm({
    resolver: zodResolver(disableSchema),
    defaultValues: { password: '', code: '' }
  });
  const confirm = useMutation({
    mutationFn: ({ code }) => authApi.confirmMfa(setup.enrollmentId, code),
    onSuccess: async (data) => {
      setCodes(data.recoveryCodes);
      setSetup(null);
      await onChanged();
    }
  });
  const disable = useMutation({
    mutationFn: ({ password, code }) => authApi.disableMfa(password, code),
    onSuccess: async () => {
      disableForm.reset();
      await onChanged();
    }
  });

  return (
    <Card>
      <CardHeader title={t('mfaTitle')} description={t('mfaIntro')} />
      <CardBody className="grid gap-4">
        {codes ? (
          <>
            <Alert tone="warning">{t('recoveryWarning')}</Alert>
            <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-4 text-xs">{codes.join('\n')}</pre>
            <Button onClick={() => { successToast(t('recoverySaved')); setCodes(null); }}>{t('recoveryConfirm')}</Button>
          </>
        ) : user.mfaEnabled ? (
          <MfaDisableForm
            form={disableForm}
            disable={disable}
            schema={disableSchema}
            onSuccess={async () => {
              successToast(t('mfaDisabled'));
              disableForm.reset();
              await onChanged();
            }}
            onError={(error) => errorToast(t('mfaDisableFailed'), apiMessage(error))}
          />
        ) : setup ? (
          <MfaConfirmForm
            setup={setup}
            onCancel={() => setSetup(null)}
            form={confirmForm}
            confirm={confirm}
            schema={confirmSchema}
            onSuccess={async (recoveryCodes) => {
              setCodes(recoveryCodes);
              setSetup(null);
              successToast(t('mfaEnabled'));
              await onChanged();
            }}
            onError={(error) => errorToast(t('mfaEnableFailed'), apiMessage(error))}
          />
        ) : (
          <Banner tone="info" title={t('mfaOff')}>
            {t('mfaOffBody')}
            <Button className="ml-3" loading={setupMutation.isPending} onClick={() => setupMutation.mutate()}>
              {t('mfaEnable')}
            </Button>
          </Banner>
        )}
      </CardBody>
    </Card>
  );
}

function MfaConfirmForm({ setup, form, confirm, onCancel }) {
  const t = useTranslations('Account.security');
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => confirm.mutate(values))}>
      <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
        <Image src={setup.qrCodeDataUrl} alt={t('qrAlt')} width={240} height={240} unoptimized />
        <div>
          <p className="font-semibold">{t('scan')}</p>
          <p className="mt-3 break-all rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3 font-mono text-sm">{setup.secret}</p>
        </div>
      </div>
      <Field label={t('sixDigit')} required error={form.formState.errors.code?.message}>
        <ControlledOTPInput name="code" control={form.control} length={6} />
      </Field>
      {confirm.error ? <Alert tone="error">{apiMessage(confirm.error)}</Alert> : null}
      <div className="flex gap-3">
        <Button loading={confirm.isPending}>{t('confirmSetup')}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  );
}

function MfaDisableForm({ form, disable }) {
  const t = useTranslations('Account.security');
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => disable.mutate(values))}>
      <Field label={t('currentPassword')} required error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" required {...form.register('password')} />
      </Field>
      <Field label={t('mfaCode')} required error={form.formState.errors.code?.message}>
        <ControlledInput
          name="code"
          control={form.control}
          autoComplete="one-time-code"
          maxLength={40}
          placeholder={t('mfaPlaceholder')}
        />
      </Field>
      {disable.error ? <Alert tone="error">{apiMessage(disable.error)}</Alert> : null}
      <div>
        <Button variant="danger" loading={disable.isPending}>{t('mfaDisable')}</Button>
      </div>
    </form>
  );
}

function SessionRow({ session, onRevoked }) {
  const t = useTranslations('Account.security');
  const revoke = useMutation({ mutationFn: () => authApi.revokeSession(session.id), onSuccess: onRevoked });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <div>
        <p className="font-semibold">{session.current ? t('thisDevice') : session.userAgent || t('unknownDevice')}</p>
        <p className="text-sm text-[var(--color-muted)]">{session.ipPrefix || t('unknownNetwork')}</p>
      </div>
      {session.current ? (
        <Badge tone="success">{t('current')}</Badge>
      ) : (
        <Button variant="secondary" loading={revoke.isPending} onClick={() => revoke.mutate()}>
          {t('revoke')}
        </Button>
      )}
      {revoke.error ? <Alert tone="error">{apiMessage(revoke.error)}</Alert> : null}
    </div>
  );
}