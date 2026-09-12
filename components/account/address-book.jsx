'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { Alert, Badge, Button, Card, CardBody, EmptyState, Field, FieldGroup, Input, Skeleton } from '@/components/ui';
import { Save } from 'lucide-react';
import { pushToast, successToast, errorToast } from '@/components/ui/toast';

const emptyAddress = {
  label: 'Home',
  recipientName: '',
  phone: '',
  addressLine: '',
  area: '',
  district: '',
  division: '',
  postcode: '',
  landmark: '',
  isDefaultShipping: false,
  isDefaultBilling: false,
};

const addressSchema = z.object({
  label: z.string().min(1, 'Address label is required'),
  recipientName: z.string().trim().min(2, 'Recipient name must be at least 2 characters'),
  phone: z.string().trim().regex(/^\+?8801[0-9]{9}$/, 'Enter a valid Bangladeshi phone number').or(z.literal('')),
  addressLine: z.string().trim().min(5, 'Delivery address is required'),
  area: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  division: z.string().trim().max(120).optional(),
  postcode: z.string().trim().max(20).optional(),
  landmark: z.string().trim().max(255).optional(),
});

function defaultValues() {
  return {
    label: 'Home',
    recipientName: '',
    phone: '',
    addressLine: '',
    area: '',
    district: '',
    division: '',
    postcode: '',
    landmark: '',
    isDefaultShipping: false,
    isDefaultBilling: false,
  };
}

export function AddressBook() {
  const client = useQueryClient();
  const [creating, setCreating] = useState(false);
  const addresses = useQuery({ queryKey: ['account', 'addresses'], queryFn: accountApi.addresses });
  const refresh = () => client.invalidateQueries({ queryKey: ['account', 'addresses'] });

  if (addresses.isLoading) {
    return (
      <Card>
        <Skeleton className="h-40 rounded-none" />
      </Card>
    );
  }
  if (addresses.error) {
    return <Alert tone="error">{apiMessage(addresses.error)}</Alert>;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Saved addresses</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Store up to 20 Bangladesh delivery addresses.</p>
        </div>
        <Button onClick={() => setCreating((value) => !value)}>{creating ? 'Close' : 'Add address'}</Button>
      </div>

      {creating ? (
        <AddressForm initial={emptyAddress} onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />
      ) : null}

      {addresses.data?.length ? (
        <div className="grid gap-4">
          {addresses.data.map((address) => (
            <div key={address.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
              <div className="grid gap-2">
                <p className="font-semibold capitalize">{address.label}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {address.recipientName} · {address.phone} · {address.addressLine}
                  {address.area && `, ${address.area}`}
                  {address.district && `, ${address.district}`}
                  {address.division && `, ${address.division}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !creating && <EmptyState title="No saved addresses yet" description="Add your first delivery address to speed up checkout." />
      )}
    </div>
  );
}

function AddressForm({ initial, onCancel, onSaved }) {
  const form = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultValues(),
  });

  const save = useMutation({
    mutationFn: (values) => accountApi.createAddress(values),
    onSuccess: (created) => {
      successToast('Address created', 'Your new address has been saved');
      onSaved(created);
      form.reset(defaultValues());
      setCreating(false);
    },
    onError: (error) => {
      errorToast('Failed to create address', apiMessage(error, 'Could not create address'));
      setCreating(false);
    },
  });

  function handleSubmit(values) {
    save.mutate(values);
  }

  if (form.formState.isSubmitting) return <div className="card p-8">Creating…</div>;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="card p-6 grid gap-4">
      <Field label="Address label" required error={form.formState.errors.label?.message}>
        <Input {...form.register('label')} />
      </Field>
      <Field label="Recipient name" required error={form.formState.errors.recipientName?.message}>
        <Input {...form.register('recipientName')} />
      </Field>
      <Field label="Phone" required error={form.formState.errors.phone?.message}>
        <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} />
      </Field>
      <Field label="Delivery address" required error={form.formState.errors.addressLine?.message}>
        <Input {...form.register('addressLine')} />
      </Field>
      <Field label="Area (optional)" error={form.formState.errors.area?.message}>
        <Input {...form.register('area')} />
      </Field>
      <Field label="District (optional)" error={form.formState.errors.district?.message}>
        <Input {...form.register('district')} />
      </Field>
      <Field label="Division (optional)" error={form.formState.errors.division?.message}>
        <Input {...form.register('division')} />
      </Field>
      <Field label="Postcode (optional)" error={form.formState.errors.postcode?.message}>
        <Input {...form.register('postcode')} />
      </Field>
      <Field label="Landmark (optional)" error={form.formState.errors.landmark?.message}>
        <Input {...form.register('landmark')} />
      </Field>
      <div>
        <Button type="submit" loading={save.isPending}>
          <Save size={16} className="mr-1" /> Save address
        </Button>
      </div>
    </form>
  );
}