'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, Banner, Button, Card, CardBody, ControlledNativeSelect, Field, Input } from '@/components/ui';
import { Save } from 'lucide-react';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

export function ProfileManager() {
  const client = useQueryClient();
  const auth = useAuthStore();
  const profile = useQuery({ queryKey: ['account', 'profile'], queryFn: accountApi.profile, initialData: auth.user });

  const form = useForm({
    resolver: zodResolver(z.object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters'),
      phone: z.string().trim().regex(/^\+?8801[0-9]{9}$/, 'Enter a valid Bangladeshi phone number').or(z.literal('')),
      email: z.string().email('Enter a valid email').or(z.literal('')),
      locale: z.enum(['en', 'bn']),
    })),
    defaultValues: {
      name: profile.data?.name || '',
      phone: profile.data?.phone || '',
      email: profile.data?.email || '',
      locale: profile.data?.locale || 'en',
    }
  });

  const save = useMutation({
    mutationFn: (values) => accountApi.updateProfile({
      ...values,
      phone: values.phone || null,
      email: values.email || null,
      version: profile.data?.version
    }),
    onSuccess: (user) => {
      successToast('Profile saved', 'Your profile has been updated');
      auth.authenticated(user);
      client.setQueryData(['account', 'profile'], user);
    },
    onError: (error) => {
      errorToast('Failed to save profile', apiMessage(error, 'Could not save profile'));
    },
  });

  if (!profile.data) return null;

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Changing your phone or email requires your current password and signs out other sessions.
        </p>
      </div>

      <Field label="Name" required error={form.formState.errors.name?.message}>
        <Input autoComplete="name" required {...form.register('name')} />
      </Field>

      <Field label="Phone" required error={form.formState.errors.phone?.message}>
        <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} />
      </Field>

      <Field label="Email" required error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>

      <Field label="Preferred language">
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
        {save.isSuccess ? <Alert tone="success">Profile saved.</Alert> : null}
      </div>

      <div>
        <Button loading={save.isPending} type="submit">
          <Save size={16} className="mr-1" /> Save profile
        </Button>
      </div>
    </form>
  );
}