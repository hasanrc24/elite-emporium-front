'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, ControlledInput, Field, Input } from '@/components/ui';
import { authApi } from '@/lib/api/auth-api';
import { apiMessage } from '@/lib/api/browser-api';
import { mfaChallenge } from '@/lib/auth/mfa-challenge';
import { safeReturnPath } from '@/lib/utils';

const password = (t) => z
  .string()
  .min(8, t('errors.passwordLength'))
  .max(128)
  .regex(/[A-Za-z]/, t('errors.passwordLetter'))
  .regex(/\d/, t('errors.passwordNumber'));

function AuthCard({ title, intro, children }) {
  const t = useTranslations('Auth');
  return (
    <div className="mx-auto grid max-w-lg gap-7 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)] sm:p-10">
      <div>
        <p className="eyebrow">{t('secureAccess')}</p>
        <h1 className="page-title mt-3 text-[clamp(2.2rem,5vw,3.25rem)]">{title}</h1>
        <p className="mt-3 leading-7 muted">{intro}</p>
      </div>
      {children}
    </div>
  );
}

export function ForgotPasswordForm({ locale }) {
  const t = useTranslations('Auth');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const schema = useMemo(() => z.object({ identifier: z.string().trim().min(3, t('errors.identifier')) }), [t]);
  const form = useForm({
    resolver: zodResolver(schema),
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
    <AuthCard title={t('forgotTitle')} intro={t('forgotIntro')}>
      {accepted ? (
        <>
          <Alert>{t('forgotSent')}</Alert>
          <Button asChild>
            <Link href={`/${locale}/login`}>{t('returnToSignIn')}</Link>
          </Button>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label={t('identifier')} error={form.formState.errors.identifier?.message}>
            <Input autoComplete="username" {...form.register('identifier')} invalid={!!form.formState.errors.identifier} />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" loading={form.formState.isSubmitting}>{t('sendReset')}</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordForm({ locale }) {
  const t = useTranslations('Auth');
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const schema = useMemo(() => z
    .object({ password: password(t), confirmation: z.string() })
    .refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: t('errors.mismatch') }), [t]);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: '', confirmation: '' } });

  async function submit(values) {
    setError('');
    if (!token) {
      setError(t('resetIncomplete'));
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
    <AuthCard title={t('resetTitle')} intro={t('resetIntro')}>
      {complete ? (
        <>
          <Alert>{t('resetDone')}</Alert>
          <Button asChild>
            <Link href={`/${locale}/login`}>{t('signIn')}</Link>
          </Button>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
          <Field label={t('newPassword')} error={form.formState.errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('password')} invalid={!!form.formState.errors.password} />
          </Field>
          <Field label={t('confirmPassword')} error={form.formState.errors.confirmation?.message}>
            <Input type="password" autoComplete="new-password" {...form.register('confirmation')} invalid={!!form.formState.errors.confirmation} />
          </Field>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" loading={form.formState.isSubmitting}>{t('changePassword')}</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function MfaChallengeForm({ locale }) {
  const t = useTranslations('Auth');
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
      router.replace(safeReturnPath(returnTo, `/${locale}/account`));
    } catch (caught) {
      setError(apiMessage(caught));
      form.reset();
    }
  }

  if (!challenge?.challengeToken) {
    return (
      <AuthCard title={t('mfaExpiredTitle')} intro={t('mfaExpiredIntro')}>
        <Button asChild>
          <Link href={`/${locale}/login`}>{t('returnToSignIn')}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('mfaTitle')} intro={t('mfaIntro')}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <Field label={t('mfaCode')} error={error}>
          <ControlledInput
            name="code"
            control={form.control}
            autoComplete="one-time-code"
            maxLength={40}
            placeholder={t('mfaPlaceholder')}
          />
        </Field>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Button type="submit" loading={form.formState.isSubmitting}>{t('mfaSubmit')}</Button>
      </form>
    </AuthCard>
  );
}
