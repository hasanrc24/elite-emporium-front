'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { isBangladeshiPhone } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, Banner, Button, Card, CardBody, ControlledNativeSelect, Field, Input } from '@/components/ui';
import { Save } from 'lucide-react';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

export function ProfileManager() {
  const t = useTranslations('Account.profile');
  const client = useQueryClient();
  const auth = useAuthStore();
  const profile = useQuery({ queryKey: ['account', 'profile'], queryFn: accountApi.profile, initialData: auth.user });

  const form = useForm({
    resolver: zodResolver(z.object({
      name: z.string().trim().min(2, t('errors.name')),
      phone: z.string().trim().refine((value) => !value || isBangladeshiPhone(value), t('errors.phone')),
      email: z.string().email(t('errors.email')).or(z.literal('')),
      locale: z.enum(['en', 'bn']),
      currentPassword: z.string().max(128),
    })),
    defaultValues: {
      name: profile.data?.name || '',
      phone: profile.data?.phone || '',
      email: profile.data?.email || '',
      locale: profile.data?.locale || 'en',
      currentPassword: '',
    }
  });

  const save = useMutation({
    mutationFn: ({ currentPassword, ...values }) => accountApi.updateProfile({
      ...values,
      phone: values.phone || null,
      email: values.email || null,
      ...(currentPassword ? { currentPassword } : {}),
      version: profile.data?.version
    }),
    onSuccess: (user) => {
      form.resetField('currentPassword');
      successToast(t('saved'));
      auth.authenticated(user);
      client.setQueryData(['account', 'profile'], user);
    },
    onError: (error) => {
      form.resetField('currentPassword');
      errorToast(t('saveFailed'), apiMessage(error));
    },
  });

  if (!profile.data) return null;

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <div>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t('intro')}
        </p>
      </div>

      <Field label={t('name')} required error={form.formState.errors.name?.message}>
        <Input autoComplete="name" required {...form.register('name')} />
      </Field>

      <Field label={t('phone')} error={form.formState.errors.phone?.message}>
        <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} />
      </Field>

      <Field label={t('email')} error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>

      <Field label={t('currentPassword')} hint={t('currentPasswordHint')} error={form.formState.errors.currentPassword?.message}>
        <Input type="password" autoComplete="current-password" {...form.register('currentPassword')} />
      </Field>

      <Field label={t('language')}>
        <ControlledNativeSelect
          name="locale"
          control={form.control}
          options={[
            { value: 'en', label: 'English' },
            { value: 'bn', label: 'বাংলা' }
          ]}
        />
      </Field>

      <div>
        {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}
        {save.isSuccess ? <Alert tone="success">{t('saved')}</Alert> : null}
      </div>

      <div>
        <Button loading={save.isPending} type="submit">
          <Save size={16} className="mr-1" /> {t('save')}
        </Button>
      </div>
    </form>
  );
}