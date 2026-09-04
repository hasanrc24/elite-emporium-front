'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { Alert, Badge, Button, Card, CardBody, ControlledSwitch, EmptyState, Field, FieldGroup, Input, Skeleton } from '@/components/ui';

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
  isDefaultBilling: false
};

const toPayload = (values) => ({
  ...values,
  area: values.area || null,
  district: values.district || null,
  division: values.division || null,
  postcode: values.postcode || null,
  landmark: values.landmark || null
});

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
            <AddressCard key={address.id} address={address} onChanged={refresh} />
          ))}
        </div>
      ) : (
        !creating && <EmptyState title="No saved addresses yet" description="Add your first delivery address to speed up checkout." />
      )}
    </div>
  );
}

function AddressCard({ address, onChanged }) {
  const [editing, setEditing] = useState(false);
  const remove = useMutation({ mutationFn: () => accountApi.deleteAddress(address.id), onSuccess: onChanged });

  if (editing) {
    return <AddressForm initial={address} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />;
  }

  return (
    <Card>
      <CardBody className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{address.label}</h3>
            {address.isDefaultShipping ? <Badge tone="success">Default shipping</Badge> : null}
            {address.isDefaultBilling ? <Badge tone="primary">Default billing</Badge> : null}
          </div>
          <p>{address.recipientName} · {address.phone}</p>
          <p className="text-[var(--color-muted)]">{[address.addressLine, address.area, address.district, address.division, address.postcode].filter(Boolean).join(', ')}</p>
          {address.landmark ? <p className="text-sm text-[var(--color-muted)]">Landmark: {address.landmark}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete</Button>
        </div>
      </CardBody>
      {remove.error ? (
        <CardBody>
          <Alert tone="error">{apiMessage(remove.error)}</Alert>
        </CardBody>
      ) : null}
    </Card>
  );
}

function AddressForm({ initial, onSaved, onCancel }) {
  const form = useForm({ defaultValues: initial });
  const editing = Boolean(initial.id);
  const save = useMutation({
    mutationFn: (values) =>
      editing
        ? accountApi.updateAddress(initial.id, { ...toPayload(values), version: initial.version })
        : accountApi.createAddress(toPayload(values)),
    onSuccess: onSaved
  });

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="card grid gap-4 p-5">
      <h3 className="text-xl font-bold">{editing ? 'Edit address' : 'New address'}</h3>

      <FieldGroup columns={2}>
        <Field label="Label" required error={form.formState.errors.label?.message}>
          <Input {...form.register('label')} required invalid={!!form.formState.errors.label} />
        </Field>
        <Field label="Recipient" required>
          <Input autoComplete="name" required {...form.register('recipientName')} />
        </Field>
        <Field label="Phone" required>
          <Input inputMode="tel" autoComplete="tel" required {...form.register('phone')} />
        </Field>
        <Field label="Address line" required className="sm:col-span-2">
          <Input autoComplete="street-address" required {...form.register('addressLine')} />
        </Field>
        <Field label="Area">
          <Input {...form.register('area')} />
        </Field>
        <Field label="District">
          <Input {...form.register('district')} />
        </Field>
        <Field label="Division">
          <Input {...form.register('division')} />
        </Field>
        <Field label="Postcode">
          <Input autoComplete="postal-code" {...form.register('postcode')} />
        </Field>
        <Field label="Landmark" className="sm:col-span-2">
          <Input {...form.register('landmark')} />
        </Field>
      </FieldGroup>

      <div className="grid gap-3 sm:grid-cols-2">
        <ControlledSwitch
          name="isDefaultShipping"
          control={form.control}
          id={`ship-${initial.id || 'new'}`}
          label="Default shipping address"
          description="Use for deliveries unless another address is chosen."
        />
        <ControlledSwitch
          name="isDefaultBilling"
          control={form.control}
          id={`bill-${initial.id || 'new'}`}
          label="Default billing address"
          description="Use for invoices and refunds."
        />
      </div>

      {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={save.isPending}>Save address</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
