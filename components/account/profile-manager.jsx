'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, Banner, Button, Card, CardBody, ControlledNativeSelect, Field, Input } from '@/components/ui';

export function ProfileManager() {
  const client = useQueryClient();
  const auth = useAuthStore();
  const profile = useQuery({ queryKey: ['account', 'profile'], queryFn: accountApi.profile, initialData: auth.user });

  if (!profile.data) return null;

  return (
    <ProfileForm
      key={profile.data.version}
      profile={profile.data}
      onSaved={(user) => {
        auth.authenticated(user);
        client.setQueryData(['account', 'profile'], user);
      }}
    />
  );
}

function ProfileForm({ profile, onSaved }) {
  const form = useForm({
    defaultValues: {
      name: profile.name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      locale: profile.locale || 'en',
      currentPassword: ''
    }
  });
  const save = useMutation({
    mutationFn: (values) => accountApi.updateProfile({
      ...values,
      phone: values.phone || null,
      email: values.email || null,
      currentPassword: values.currentPassword || undefined,
      version: profile.version
    }),
    onSuccess: (user) => {
      form.reset({ name: user.name || '', phone: user.phone || '', email: user.email || '', locale: user.locale, currentPassword: '' });
      onSaved(user);
    }
  });

  return (
    <form className="card grid gap-5 p-6" onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Changing your phone or email requires your current password and signs out other sessions.
        </p>
      </div>

      <Field label="Name" required>
        <Input autoComplete="name" required {...form.register('name')} />
      </Field>

      <Field label="Phone">
        <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} />
        <VerificationState verified={profile.phoneVerified} present={profile.phone} channel="phone" />
      </Field>

      <Field label="Email">
        <Input type="email" autoComplete="email" {...form.register('email')} />
        <VerificationState verified={profile.emailVerified} present={profile.email} channel="email" />
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

      <Field label="Current password (only for phone/email changes)">
        <Input type="password" autoComplete="current-password" {...form.register('currentPassword')} />
      </Field>

      {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}
      {save.isSuccess ? <Alert tone="success">Profile saved.</Alert> : null}

      <div>
        <Button loading={save.isPending}>Save profile</Button>
      </div>
    </form>
  );
}

function VerificationState({ present, verified, channel }) {
  if (!present) return null;
  return (
    <p className={`mt-1 text-sm ${verified ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
      {verified ? 'Verified' : `Unverified — verify this ${channel} from Security.`}
    </p>
  );
}
