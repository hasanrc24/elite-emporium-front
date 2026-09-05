'use client';

import { useState } from 'react';
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

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your phone number or email.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean()
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2),
    phone: z.string(),
    email: z.string(),
    password: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
    confirmation: z.string(),
    termsAccepted: z.literal(true, { error: 'Accept the terms to register.' }),
    rememberMe: z.boolean()
  })
  .refine((value) => value.phone.trim() || value.email.trim(), { path: ['phone'], message: 'Enter a phone number or email.' })
  .refine((value) => value.password === value.confirmation, { path: ['confirmation'], message: 'Passwords do not match.' });

export function AuthForm({ mode, locale, returnToDefault = null }) {
  const isLogin = mode === 'login';
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
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
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
      const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : returnToDefault || `/${locale}/account/orders`;

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
      <aside className="relative order-2 hidden overflow-hidden bg-[#e9ded0] p-9 text-[#151719] lg:flex lg:flex-col">
        <span aria-hidden="true" className="absolute -bottom-24 -right-24 size-80 rounded-full border-[54px] border-white/25" />
        <Link href={`/${locale}`} className="relative inline-flex items-center gap-2 text-sm font-medium text-black/55 hover:text-black">
          <ArrowLeft size={16} />
          Back to the shop
        </Link>
        <div className="relative mt-auto">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-black/45">Your Elite account</p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-.045em]">Keep every order in one calm place.</h2>
          <ul className="mt-7 grid gap-3 text-sm text-black/60">
            <li className="flex items-center gap-2"><Check size={15} />Track orders and delivery</li>
            <li className="flex items-center gap-2"><Check size={15} />Manage returns and reviews</li>
            <li className="flex items-center gap-2"><Check size={15} />Save addresses securely</li>
          </ul>
        </div>
      </aside>

      <div className="order-1 p-7 sm:p-10 lg:p-12">
        <p className="eyebrow">{isLogin ? 'Account access' : 'Join Elite Emporium'}</p>
        <h1 className="mt-2 text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-.055em]">{isLogin ? 'Welcome back!' : 'Create your account'}</h1>
        <p className="mt-3 max-w-[48ch] muted">
          {isLogin ? 'Sign in with your Bangladeshi phone number or email.' : 'Use a phone number or email. You can set up additional verification later.'}
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit(submit)} noValidate>
          {!isLogin ? (
            <>
              <Field label="Name" error={errors.name?.message}>
                <Input autoComplete="name" {...register('name')} invalid={!!errors.name} />
              </Field>
              <Field label="Phone number" error={errors.phone?.message}>
                <Input inputMode="tel" autoComplete="tel" {...register('phone')} invalid={!!errors.phone} />
              </Field>
              <Field label="Email (optional)" error={errors.email?.message}>
                <Input type="email" autoComplete="email" {...register('email')} invalid={!!errors.email} />
              </Field>
              <Field label="Password" hint="At least 8 characters with letters and numbers." error={errors.password?.message}>
                <Input type="password" autoComplete="new-password" {...register('password')} invalid={!!errors.password} />
              </Field>
              <Field label="Confirm password" error={errors.confirmation?.message}>
                <Input type="password" autoComplete="new-password" {...register('confirmation')} invalid={!!errors.confirmation} />
              </Field>
              <ControlledCheckbox
                name="termsAccepted"
                control={control}
                label="I agree to the terms of service and privacy policy."
              />
            </>
          ) : (
            <>
              <Field label="Phone number or email" error={errors.identifier?.message}>
                <Input autoComplete="username" {...register('identifier')} invalid={!!errors.identifier} />
              </Field>
              <Field label="Password" error={errors.password?.message}>
                <Input type="password" autoComplete="current-password" {...register('password')} invalid={!!errors.password} />
              </Field>
              <div className="flex items-center justify-between">
                <ControlledCheckbox
                  name="rememberMe"
                  control={control}
                  label="Keep me signed in"
                  className="items-center"
                />
                <Link href={`/${locale}/forgot-password`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                  Forgot password?
                </Link>
              </div>
            </>
          )}

          {serverError ? <Alert tone="error">{serverError}</Alert> : null}

          <Button type="submit" loading={isSubmitting}>
            {isLogin ? 'Sign in' : 'Create account'}
          </Button>

          <p className="text-sm muted">
            {isLogin ? (
              <>New to Elite Emporium? <Link href={`/${locale}/register`} className="font-semibold text-[var(--color-primary)] hover:underline">Create an account</Link></>
            ) : (
              <>Already have an account? <Link href={`/${locale}/login`} className="font-semibold text-[var(--color-primary)] hover:underline">Sign in</Link></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
