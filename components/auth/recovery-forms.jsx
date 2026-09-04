'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, ControlledInput, Field, Input } from '@/components/ui';
import { authApi } from '@/lib/api/auth-api';
import { apiMessage } from '@/lib/api/browser-api';
import { mfaChallenge } from '@/lib/auth/mfa-challenge';

const password = z
  .string()
  .min(8, 'Use at least eight characters.')
  .max(128)
  .regex(/[A-Za-z]/, 'Include a letter.')
  .regex(/\d/, 'Include a number.');

function AuthCard({ title, intro, children }) {
  return (
    <div className="mx-auto grid max-w-lg gap-7 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)] sm:p-10">
      <div>
        <p className="eyebrow">Secure account access</p>
        <h1 className="page-title mt-3 text-[clamp(2.2rem,5vw,3.25rem)]">{title}</h1>
        <p className="mt-3 leading-7 muted">{intro}</p>
      </div>
      {children}
    </div>
  );
}

export function ForgotPasswordForm({ locale }) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const form = useForm({
    resolver: zodResolver(z.object({ identifier: z.string().trim().min(3) })),
    defaultValues: { identifier: '' }
  });

  async function submit(values) {
    setError('');
    try {
      await authApi.forgotPassword(values.identifier);
      setAccepted(true);
    } catch (caught) {
      setError(apiMessage(caught));
    }
  }

  return (
    <AuthCard title="Reset your password" intro="Enter your phone number or email. For privacy, the confirmation is the same whether an account exists.">
      {accepted ? (
        <>
          <Alert>If the account exists, password reset instructions have been sent.</Alert>
          <Button asChild>
            <Link href={`/${locale}/login`}>Return to sign in</Link>
          </Button>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label="Phone number or email" error={form.formState.errors.identifier?.message}>
            <Input autoComplete="username" {...form.register('identifier')} invalid={!!form.formState.errors.identifier} />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" loading={form.formState.isSubmitting}>Send reset instructions</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordForm({ locale }) {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const schema = z
    .object({ password, confirmation: z.string() })
    .refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: 'Passwords do not match.' });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', confirmation: '' } });

  async function submit(values) {
    setError('');
    if (!token) {
      setError('This reset link is incomplete. Request a new one.');
      return;
    }
    try {
      await authApi.resetPassword(token, values.password);
      setComplete(true);
    } catch (caught) {
      setError(apiMessage(caught));
      form.reset();
    }
  }

  return (
    <AuthCard title="Choose a new password" intro="Resetting your password signs out all existing sessions.">
      {complete ? (
        <>
          <Alert>Your password has been changed. Sign in again.</Alert>
          <Button asChild>
            <Link href={`/${locale}/login`}>Sign in</Link>
          </Button>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label="New password" error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} invalid={!!form.formState.errors.password} />
          </Field>
          <Field label="Confirm password" error={form.formState.errors.confirmation?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('confirmation')} invalid={!!form.formState.errors.confirmation} />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" loading={form.formState.isSubmitting}>Change password</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function MfaChallengeForm({ locale }) {
  const router = useRouter();
  const search = useSearchParams();
  const challenge = mfaChallenge.get();
  const [error, setError] = useState('');
  const form = useForm({ defaultValues: { code: '' } });

  async function submit(values) {
    setError('');
    if (!challenge?.challengeToken) return;
    try {
      await authApi.verifyMfa(challenge.challengeToken, values.code);
      const returnTo = search.get('returnTo');
      router.replace(returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : `/${locale}/account`);
    } catch (caught) {
      setError(apiMessage(caught));
      form.reset();
    }
  }

  if (!challenge?.challengeToken) {
    return (
      <AuthCard title="Verification expired" intro="Start a new sign-in attempt to continue.">
        <Button asChild>
          <Link href={`/${locale}/login`}>Return to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Two-step verification" intro="Enter the six-digit authenticator code or one of your recovery codes.">
      <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label="Authentication or recovery code" error={error}>
          <ControlledInput
            name="code"
            control={form.control}
            autoComplete="one-time-code"
            maxLength={40}
            placeholder="6-digit code or recovery code"
          />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" loading={form.formState.isSubmitting}>Verify and sign in</Button>
      </form>
    </AuthCard>
  );
}
