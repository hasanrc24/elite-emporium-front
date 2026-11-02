'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { Alert, Button, ControlledCheckbox, Field, Input } from '@/components/ui';
import { authApi } from '@/lib/api/auth-api';
import { apiMessage } from '@/lib/api/browser-api';
import { safeReturnPath } from '@/lib/utils';

const loginSchema = (t) => z.object({
  identifier: z.string().trim().min(3, t('errors.identifier')),
  password: z.string().min(1, t('errors.password')),
  rememberMe: z.boolean()
});

const registerSchema = (t) => z
  .object({
    name: z.string().trim().min(2, t('errors.name')),
    phone: z.string(),
    email: z.string(),
    password: z.string().min(8, t('errors.passwordLength')).regex(/[A-Za-z]/, t('errors.passwordLetter')).regex(/\d/, t('errors.passwordNumber')),
    confirmation: z.string(),
    termsAccepted: z.literal(true, { error: t('errors.terms') }),
    rememberMe: z.boolean()
  })
  .refine((value) => value.phone.trim() || value.email.trim(), { path: ['phone'], message: t('errors.contact') })
  .refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: t('errors.mismatch') });

export function AuthForm({ mode, locale, returnToDefault = null }) {
  const isLogin = mode === 'login';
  const t = useTranslations('Auth');
  const schema = useMemo(() => (isLogin ? loginSchema(t) : registerSchema(t)), [isLogin, t]);
  const router = useRouter();
  const search = useSearchParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isLogin
      ? { identifier: '', password: '', rememberMe: true }
      : { name: '', phone: '', email: '', password: '', confirmation: '', termsAccepted: false, rememberMe: true }
  });

  async function submit(values) {
    setServerError('');
    try {
      const result = isLogin
        ? await authApi.login(values)
        : await authApi.register({
            name: values.name,
            phone: values.phone,
            email: values.email,
            password: values.password,
            rememberMe: values.rememberMe,
            locale,
            ...(search.get('orderReference') ? { orderReference: search.get('orderReference') } : {})
          });

      const returnTo = search.get('returnTo');
      const safeReturnTo = safeReturnPath(returnTo, returnToDefault || `/${locale}/account/orders`);

      if (result?.mfaRequired) {
        router.replace(`/${locale}/mfa?returnTo=${encodeURIComponent(safeReturnTo)}`);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
        queryClient.invalidateQueries({ queryKey: ['cart'] })
      ]);
      router.replace(safeReturnTo);
    } catch (error) {
      setServerError(apiMessage(error));
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:grid-cols-[1fr_.8fr]">
      <aside className="relative order-2 hidden overflow-hidden bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-bg))] p-9 text-[var(--color-text)] lg:flex lg:flex-col">
        <span aria-hidden="true" className="absolute -bottom-24 -right-24 size-80 rounded-full border-[54px] border-[var(--color-bg)]/25" />
        <Link href={`/${locale}`} className="relative inline-flex items-center gap-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft size={16} />
          {t('backToShop')}
        </Link>
        <div className="relative mt-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--color-muted)]">{t('asideEyebrow')}</p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-.045em]">{t('asideTitle')}</h2>
          <ul className="mt-7 grid gap-3 text-sm text-[var(--color-muted)]">
            <li className="flex items-center gap-2"><Check size={15} />{t('asideTrack')}</li>
            <li className="flex items-center gap-2"><Check size={15} />{t('asideReturns')}</li>
            <li className="flex items-center gap-2"><Check size={15} />{t('asideAddresses')}</li>
          </ul>
        </div>
      </aside>

      <div className="order-1 p-7 sm:p-10 lg:p-12">
        <p className="eyebrow">{isLogin ? t('loginEyebrow') : t('registerEyebrow')}</p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-.055em]">{isLogin ? t('loginTitle') : t('registerTitle')}</h1>
        <p className="mt-3 max-w-[48ch] muted">
          {isLogin ? t('loginIntro') : t('registerIntro')}
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit(submit)} noValidate>
          {!isLogin ? (
            <>
              <Field label={t('name')} error={errors.name?.message}>
                <Input autoComplete="name" {...register('name')} invalid={!!errors.name} />
              </Field>
              <Field label={t('phone')} error={errors.phone?.message}>
                <Input inputMode="tel" autoComplete="tel" {...register('phone')} invalid={!!errors.phone} />
              </Field>
              <Field label={t('emailOptional')} error={errors.email?.message}>
                <Input type="email" autoComplete="email" {...register('email')} invalid={!!errors.email} />
              </Field>
              <Field label={t('password')} hint={t('passwordHint')} error={errors.password?.message}>
                <Input type="password" autoComplete="new-password" {...register('password')} invalid={!!errors.password} />
              </Field>
              <Field label={t('confirmPassword')} error={errors.confirmation?.message}>
                <Input type="password" autoComplete="new-password" {...register('confirmation')} invalid={!!errors.confirmation} />
              </Field>
              <ControlledCheckbox
                name="termsAccepted"
                control={control}
                label={t('terms')}
              />
            </>
          ) : (
            <>
              <Field label={t('identifier')} error={errors.identifier?.message}>
                <Input autoComplete="username" {...register('identifier')} invalid={!!errors.identifier} />
              </Field>
              <Field label={t('password')} error={errors.password?.message}>
                <Input type="password" autoComplete="current-password" {...register('password')} invalid={!!errors.password} />
              </Field>
              <div className="flex items-center justify-between">
                <ControlledCheckbox
                  name="rememberMe"
                  control={control}
                  label={t('rememberMe')}
                  className="items-center"
                />
                <Link href={`/${locale}/forgot-password`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                  {t('forgot')}
                </Link>
              </div>
            </>
          )}

          {serverError ? <Alert tone="error">{serverError}</Alert> : null}

          <Button type="submit" loading={isSubmitting}>
            {isLogin ? t('signIn') : t('createAccount')}
          </Button>

          <p className="text-sm muted">
            {isLogin ? (
              <>{t('newHere')} <Link href={`/${locale}/register`} className="font-semibold text-[var(--color-primary)] hover:underline">{t('createAnAccount')}</Link></>
            ) : (
              <>{t('haveAccount')} <Link href={`/${locale}/login`} className="font-semibold text-[var(--color-primary)] hover:underline">{t('signIn')}</Link></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
