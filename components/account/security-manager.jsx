'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
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

export function SecurityManager({ locale }) {
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
                router.replace(`/${locale}/login`);
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
  const form = useForm({ defaultValues: { currentPassword: '', password: '', confirmation: '' } });
  const [message, setMessage] = useState('');
  const change = useMutation({
    mutationFn: (values) => {
      if (values.password !== values.confirmation) throw new Error('New passwords do not match.');
      if (values.password.length < 8 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
        throw new Error('Use 8–128 characters with at least one letter and number.');
      }
      return authApi.changePassword({ currentPassword: values.currentPassword, password: values.password });
    },
    onSuccess: () => {
      form.reset();
      setMessage('Password changed. Other sessions were signed out.');
    }
  });

  return (
    <form
      className="card grid gap-4 p-6"
      onSubmit={form.handleSubmit((values) => {
        setMessage('');
        change.mutate(values);
      })}
    >
      <CardHeader title="Change password" />
      <Field label="Current password" required>
        <Input type="password" autoComplete="current-password" required {...form.register('currentPassword')} />
      </Field>
      <Field label="New password" required>
        <Input type="password" autoComplete="new-password" required {...form.register('password')} />
      </Field>
      <Field label="Confirm new password" required>
        <Input type="password" autoComplete="new-password" required {...form.register('confirmation')} />
      </Field>
      {change.error ? <Alert tone="error">{apiMessage(change.error, change.error.message)}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
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
  const confirmForm = useForm({ defaultValues: { code: '' } });
  const disableForm = useForm({ defaultValues: { password: '', code: '' } });
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
            <Button onClick={() => setCodes(null)}>I saved them</Button>
          </>
        ) : user.mfaEnabled ? (
          <form className="grid gap-4" onSubmit={disableForm.handleSubmit((values) => disable.mutate(values))}>
            <Field label="Current password" required>
              <Input type="password" autoComplete="current-password" required {...disableForm.register('password')} />
            </Field>
            <Field label="Authenticator or recovery code" required>
              <ControlledInput
                name="code"
                control={disableForm.control}
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
        ) : setup ? (
          <form className="grid gap-4" onSubmit={confirmForm.handleSubmit((values) => confirm.mutate(values))}>
            <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
              <Image src={setup.qrCodeDataUrl} alt="Authenticator enrollment QR code" width={240} height={240} unoptimized />
              <div>
                <p className="font-semibold">Scan this code with your authenticator app.</p>
                <p className="mt-3 break-all rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3 font-mono text-sm">{setup.secret}</p>
              </div>
            </div>
            <Field label="Six-digit code" required>
              <ControlledOTPInput name="code" control={confirmForm.control} length={6} />
            </Field>
            {confirm.error ? <Alert tone="error">{apiMessage(confirm.error)}</Alert> : null}
            <div className="flex gap-3">
              <Button loading={confirm.isPending}>Confirm setup</Button>
              <Button type="button" variant="secondary" onClick={() => setSetup(null)}>Cancel</Button>
            </div>
          </form>
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
