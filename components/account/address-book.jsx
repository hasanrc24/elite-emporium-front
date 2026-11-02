'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Pencil, Save, Trash2 } from 'lucide-react';
import { accountApi } from '@/lib/api/account-api';
import { apiMessage } from '@/lib/api/browser-api';
import { orderApi } from '@/lib/api/order-api';
import { isBangladeshiPhone } from '@/lib/utils';
import { Alert, Badge, Button, Card, CheckboxField, ConfirmAction, EmptyState, Field, Input, NativeSelect, Skeleton } from '@/components/ui';
import { successToast, errorToast } from '@/components/ui/toast';

const blankAddress = {
  label: '',
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

const addressSchema = (t) => z.object({
  label: z.string().trim().min(1, t('errors.label')).max(80),
  recipientName: z.string().trim().min(2, t('errors.recipient')).max(120),
  phone: z.string().trim().refine(isBangladeshiPhone, t('errors.phone')),
  addressLine: z.string().trim().min(5, t('errors.addressLine')).max(500),
  area: z.string().trim().max(120),
  district: z.string().trim().max(120),
  division: z.string().trim().max(120),
  postcode: z.string().trim().max(20),
  landmark: z.string().trim().max(255),
  isDefaultShipping: z.boolean(),
  isDefaultBilling: z.boolean()
});

// The API treats empty optional fields as null; forms work with strings.
const toPayload = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' && !value.trim() && !['label', 'recipientName', 'phone', 'addressLine'].includes(key) ? null : value]));
const toForm = (address) => Object.fromEntries(Object.keys(blankAddress).map((key) => [key, address?.[key] ?? blankAddress[key]]));

export function AddressBook({ locale = 'en' }) {
  const t = useTranslations('Account.addresses');
  const tUi = useTranslations('ui');
  const client = useQueryClient();
  const [editing, setEditing] = useState(null);
  const addresses = useQuery({ queryKey: ['account', 'addresses'], queryFn: accountApi.addresses });
  const refresh = () => client.invalidateQueries({ queryKey: ['account', 'addresses'] });
  const remove = useMutation({
    mutationFn: (id) => accountApi.deleteAddress(id),
    onSuccess: () => { successToast(t('deleted')); refresh(); },
    onError: (error) => errorToast(t('deleteFailed'), apiMessage(error))
  });

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

  const list = addresses.data || [];
  const full = list.length >= 20;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t('intro')}</p>
        </div>
        {editing ? null : <Button disabled={full} onClick={() => setEditing('new')}>{t('add')}</Button>}
      </div>

      {editing === 'new' ? (
        <AddressForm locale={locale} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      ) : null}

      {list.length ? (
        <div className="grid gap-4">
          {list.map((address) => (editing === address.id ? (
            <AddressForm key={address.id} locale={locale} address={address} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
          ) : (
            <div key={address.id} className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4">
              <div className="grid min-w-0 gap-2">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {address.label}
                  {address.isDefaultShipping ? <Badge tone="primary">{t('defaultShipping')}</Badge> : null}
                  {address.isDefaultBilling ? <Badge>{t('defaultBilling')}</Badge> : null}
                </p>
                <p className="text-sm text-[var(--color-muted)]">
                  {address.recipientName} · {address.phone}
                </p>
                <p className="text-sm text-[var(--color-muted)]">{[address.addressLine, address.area, address.district, address.division, address.postcode].filter(Boolean).join(', ')}</p>
              </div>
              {editing ? null : (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(address.id)}><Pencil size={14} />{t('edit')}</Button>
                  <ConfirmAction title={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={tUi('cancel')} onConfirm={() => remove.mutate(address.id)} trigger={<Button size="sm" variant="ghost" loading={remove.isPending && remove.variables === address.id} aria-label={t('deleteNamed', { label: address.label })}><Trash2 size={14} /></Button>} />
                </div>
              )}
            </div>
          )))}
        </div>
      ) : (
        editing !== 'new' && <EmptyState title={t('emptyTitle')} description={t('emptyBody')} />
      )}
      {full ? <p className="text-sm text-[var(--color-muted)]">{t('limit')}</p> : null}
    </div>
  );
}

function AddressForm({ locale, address = null, onCancel, onSaved }) {
  const t = useTranslations('Account.addresses');
  const schema = useMemo(() => addressSchema(t), [t]);
  const locations = useQuery({ queryKey: ['locations'], queryFn: orderApi.locations, staleTime: Infinity });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: address ? toForm(address) : { ...blankAddress, label: t('labelHome') }
  });
  const errors = form.formState.errors;
  const [division, district, isDefaultShipping, isDefaultBilling] = useWatch({ control: form.control, name: ['division', 'district', 'isDefaultShipping', 'isDefaultBilling'] });
  const rows = locations.data || [];
  const label = (row) => row.name?.[locale] || row.name?.en;
  // Address snapshots store English names, matching checkout.
  const divisionRow = rows.find((row) => row.level === 'division' && row.name?.en === division);
  const districtRow = rows.find((row) => row.level === 'district' && row.name?.en === district);
  const withCurrent = (options, current) => (current && !options.some((option) => option.value === current) ? [...options, { value: current, label: current }] : options);
  const divisionOptions = withCurrent(rows.filter((row) => row.level === 'division').map((row) => ({ value: row.name.en, label: label(row) })), division);
  const districtOptions = withCurrent(rows.filter((row) => row.level === 'district' && (!divisionRow || row.parentCode === divisionRow.code)).map((row) => ({ value: row.name.en, label: label(row) })), district);
  const thanas = rows.filter((row) => row.level === 'thana' && districtRow && row.parentCode === districtRow.code);

  const save = useMutation({
    mutationFn: (values) => (address ? accountApi.updateAddress(address.id, { ...toPayload(values), version: Number(address.version) }) : accountApi.createAddress(toPayload(values))),
    onSuccess: () => {
      successToast(address ? t('updated') : t('created'));
      onSaved();
    },
    onError: (error) => errorToast(t('saveFailed'), apiMessage(error))
  });

  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="card grid gap-4 p-6" noValidate>
      <h3 className="text-lg font-semibold">{address ? t('editTitle') : t('newTitle')}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('label')} hint={t('labelHint')} required error={errors.label?.message}>
          <Input {...form.register('label')} invalid={!!errors.label} />
        </Field>
        <Field label={t('recipient')} required error={errors.recipientName?.message}>
          <Input autoComplete="name" {...form.register('recipientName')} invalid={!!errors.recipientName} />
        </Field>
        <Field label={t('phone')} required error={errors.phone?.message}>
          <Input inputMode="tel" autoComplete="tel" {...form.register('phone')} invalid={!!errors.phone} />
        </Field>
        <Field label={t('division')}>
          <NativeSelect value={division} onChange={(event) => { form.setValue('division', event.target.value); form.setValue('district', ''); form.setValue('area', ''); }} options={[{ value: '', label: t('selectDivision') }, ...divisionOptions]} />
        </Field>
        <Field label={t('district')}>
          <NativeSelect value={district} onChange={(event) => { const next = event.target.value; form.setValue('district', next); form.setValue('area', ''); const row = rows.find((item) => item.level === 'district' && item.name?.en === next); const parent = rows.find((item) => item.code === row?.parentCode); if (parent && !division) form.setValue('division', parent.name.en); }} options={[{ value: '', label: t('selectDistrict') }, ...districtOptions]} />
        </Field>
        <Field label={t('area')} hint={thanas.length ? undefined : t('areaHint')}>
          <Input list={thanas.length ? 'address-thanas' : undefined} {...form.register('area')} />
          {thanas.length ? <datalist id="address-thanas">{thanas.map((row) => <option key={row.code} value={row.name.en}>{label(row)}</option>)}</datalist> : null}
        </Field>
      </div>
      <Field label={t('addressLine')} hint={t('addressLineHint')} required error={errors.addressLine?.message}>
        <Input autoComplete="street-address" {...form.register('addressLine')} invalid={!!errors.addressLine} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('landmark')}>
          <Input {...form.register('landmark')} />
        </Field>
        <Field label={t('postcode')}>
          <Input inputMode="numeric" autoComplete="postal-code" {...form.register('postcode')} />
        </Field>
      </div>
      <div className="grid gap-2">
        <CheckboxField label={t('makeDefaultShipping')} checked={isDefaultShipping} onCheckedChange={(checked) => form.setValue('isDefaultShipping', checked === true)} />
        <CheckboxField label={t('makeDefaultBilling')} checked={isDefaultBilling} onCheckedChange={(checked) => form.setValue('isDefaultBilling', checked === true)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={save.isPending}>
          <Save size={16} className="mr-1" /> {t('save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      </div>
    </form>
  );
}
