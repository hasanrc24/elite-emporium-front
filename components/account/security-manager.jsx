'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(1, 'Current password is required'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters').max(128).regex(/[A-Za-z]/, 'Must contain at least one letter').regex(/\d/, 'Must contain at least one number'),
  confirmation: z.string().trim(),
});

export function SecurityManager({ locale, loginHref = `/${locale}/login` }) {
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
      <PasswordPanel />
      <MfaPanel user={auth.user} onChanged={refreshUser} />

      <Card>
        <CardHeader
          title="Active sessions"
          description="Revoke devices you no longer recognize."
          action={
            <Button
              variant="danger"
              onClick={async () => {
                await authApi.logoutAll();
                client.clear();
                router.replace(loginHref);
              }}
            >
              Sign out every device
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
  return (
    <Card>
      <CardHeader title="Contact verification" />
      <CardBody className="grid gap-4">
        {user.phone ? <VerificationRow channel="phone" value={user.phone} verified={user.phoneVerified} onVerified={onVerified} /> : null}
        {user.email ? <VerificationRow channel="email" value={user.email} verified={user.emailVerified} onVerified={onVerified} /> : null}
      </CardBody>
    </Card>
  );
}

function VerificationRow({ channel, value, verified, onVerified }) {
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
          <p className="font-semibold capitalize">{channel}</p>
          <p className="text-sm text-[var(--color-muted)]">{value}</p>
        </div>
        <Badge tone={verified ? 'success' : 'warning'}>{verified ? 'Verified' : 'Not verified'}</Badge>
      </div>

      {!verified ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Field label={`${channel} verification code`} className="grow">
            <OTPInput length={6} value={code} onChange={setCode} />
          </Field>
          <Button disabled={!/^\d{6}$/.test(code)} loading={verify.isPending} onClick={() => verify.mutate()}>
            Verify
          </Button>
          <Button variant="secondary" loading={resend.isPending} onClick={() => resend.mutate()}>
            Resend code
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
          <Alert tone="info">A new code was requested. Resend cooldowns apply.</Alert>
        </div>
      ) : null}
    </div>
  );
}

function PasswordPanel() {
  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmation: '' }
  });
  const change = useMutation({
    mutationFn: async (values) => {
      if (values.password !== values.confirmation) throw new Error('New passwords do not match.');
      return authApi.changePassword({ currentPassword: values.currentPassword, password: values.password });
    },
    onSuccess: () => {
      successToast('Password changed', 'Your password has been updated. Other sessions were signed out.');
      form.reset();
      refreshUser();
    },
    onError: (error) => errorToast('Failed to change password', apiMessage(error, 'Could not change password')),
  });

  return (
    <form
      className="card grid gap-4 p-6"
      onSubmit={form.handleSubmit((values) => {
        change.mutate(values);
      })}
    >
      <CardHeader title="Change password" />
      <Field label="Current password" required error={form.formState.errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" required {...form.register('currentPassword')} />
      </Field>
      <Field label="New password" required error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="new-password" required {...form.register('password')} />
      </Field>
      <Field label="Confirm new password" required error={form.formState.errors.confirmation?.message}>
        <Input type="password" autoComplete="new-password" required {...form.register('confirmation')} />
      </Field>
      {change.error ? <Alert tone="error">{apiMessage(change.error, change.error.message)}</Alert> : null}
      <div>
        <Button loading={change.isPending}>Change password</Button>
      </div>
    </form>
  );
}

function MfaPanel({ user, onChanged }) {
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const setupMutation = useMutation({ mutationFn: () => authApi.setupMfa('Elite Emporium'), onSuccess: setSetup });
  const confirmSchema = z.object({ code: z.string().trim().min(6, 'Enter a 6-digit code') });
  const disableSchema = z.object({
    password: z.string().trim().min(1, 'Password is required'),
    code: z.string().trim().min(1, 'Code is required'),
  });
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
      <CardHeader title="Two-step verification" description="Use an authenticator app and keep your one-time recovery codes offline." />
      <CardBody className="grid gap-4">
        {codes ? (
          <>
            <Alert tone="warning">Save these recovery codes now. They will not be shown again.</Alert>
            <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-4 text-xs">{codes.join('\n')}</pre>
            <Button onClick={() => { successToast('Recovery codes saved', 'Store these codes somewhere safe.'); setCodes(null); }}>I saved them</Button>
          </>
        ) : user.mfaEnabled ? (
          <MfaDisableForm
            form={disableForm}
            disable={disable}
            schema={disableSchema}
            onSuccess={async () => {
              successToast('Two-step verification disabled', 'Two-factor authentication has been turned off for your account.');
              disableForm.reset();
              await onChanged();
            }}
            onError={(error) => errorToast('Failed to disable two-step verification', apiMessage(error, 'Could not disable two-factor authentication'))}
          />
        ) : setup ? (
          <MfaConfirmForm
            setup={setup}
            form={confirmForm}
            confirm={confirm}
            schema={confirmSchema}
            onSuccess={async (recoveryCodes) => {
              setCodes(recoveryCodes);
              setSetup(null);
              successToast('Two-step verification enabled', 'Authenticator app is now active. Save your recovery codes.');
              await onChanged();
            }}
            onError={(error) => errorToast('Failed to enable two-step verification', apiMessage(error, 'Could not enable two-factor authentication'))}
          />
        ) : (
          <Banner tone="info" title="Two-step verification is off">
            Enable it to require a second factor on every sign-in.
            <Button className="ml-3" loading={setupMutation.isPending} onClick={() => setupMutation.mutate()}>
              Enable two-step verification
            </Button>
          </Banner>
        )}
      </CardBody>
    </Card>
  );
}

function MfaConfirmForm({ setup, form, confirm, schema, onSuccess, onError }) {
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => confirm.mutate(values))}>
      <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
        <Image src={setup.qrCodeDataUrl} alt="Authenticator enrollment QR code" width={240} height={240} unoptimized />
        <div>
          <p className="font-semibold">Scan this code with your authenticator app.</p>
          <p className="mt-3 break-all rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3 font-mono text-sm">{setup.secret}</p>
        </div>
      </div>
      <Field label="Six-digit code" required error={form.formState.errors.code?.message}>
        <ControlledOTPInput name="code" control={form.control} length={6} />
      </Field>
      {confirm.error ? <Alert tone="error">{apiMessage(confirm.error)}</Alert> : null}
      <div className="flex gap-3">
        <Button loading={confirm.isPending}>Confirm setup</Button>
        <Button type="button" variant="secondary" onClick={() => setSetup(null)}>Cancel</Button>
      </div>
    </form>
  );
}

function MfaDisableForm({ form, disable, schema, onSuccess, onError }) {
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => disable.mutate(values))}>
      <Field label="Current password" required error={form.formState.errors.password?.message}>
        <Input type="password" autoComplete="current-password" required {...form.register('password')} />
      </Field>
      <Field label="Authenticator or recovery code" required error={form.formState.errors.code?.message}>
        <ControlledInput
          name="code"
          control={form.control}
          autoComplete="one-time-code"
          maxLength={40}
          placeholder="6-digit code or recovery code"
        />
      </Field>
      {disable.error ? <Alert tone="error">{apiMessage(disable.error)}</Alert> : null}
      <div>
        <Button variant="danger" loading={disable.isPending}>Disable two-step verification</Button>
      </div>
    </form>
  );
}

function SessionRow({ session, onRevoked }) {
  const revoke = useMutation({ mutationFn: () => authApi.revokeSession(session.id), onSuccess: onRevoked });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
      <div>
        <p className="font-semibold">{session.current ? 'This device' : session.userAgent || 'Unknown device'}</p>
        <p className="text-sm text-[var(--color-muted)]">{session.ipPrefix || 'Unknown network'}</p>
      </div>
      {session.current ? (
        <Badge tone="success">Current</Badge>
      ) : (
        <Button variant="secondary" loading={revoke.isPending} onClick={() => revoke.mutate()}>
          Revoke
        </Button>
      )}
      {revoke.error ? <Alert tone="error">{apiMessage(revoke.error)}</Alert> : null}
    </div>
  );
}