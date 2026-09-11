'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import Decimal from 'decimal.js';
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, ControlledCheckbox, Field, Input, NativeSelect, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { AdminPageHeader } from './admin-page-header';

const groupFields = {
  store: [['name.en', 'Store name (English)'], ['name.bn', 'Store name (Bangla)'], ['contactPhone', 'Contact phone'], ['contactEmail', 'Contact email'], ['address', 'Address'], ['whatsappUrl', 'WhatsApp HTTPS URL']],
  ordering: [['minimumOrder', 'Minimum order', 'number'], ['maximumItemQuantity', 'Maximum item quantity', 'number'], ['allowGuestCheckout', 'Allow guest checkout', 'boolean'], ['orderPrefix', 'Order prefix']],
  inventory: [['defaultStockPolicy', 'Default stock policy', 'select', ['deny', 'allow_backorder', 'preorder']], ['lowStockThreshold', 'Low stock threshold', 'number'], ['showExactStock', 'Show exact stock', 'boolean'], ['reservationMinutes', 'Reservation minutes', 'number']],
  checkout: [['termsPageSlug', 'Terms page slug'], ['orderNotesEnabled', 'Order notes', 'boolean'], ['requireTermsAcceptance', 'Require terms acceptance', 'boolean']],
  tax: [['enabled', 'Enable tax', 'boolean'], ['pricesIncludeTax', 'Prices include tax', 'boolean'], ['rate', 'Tax rate']],
  verification: [['requirePhoneVerification', 'Require phone verification', 'boolean'], ['requireEmailVerification', 'Require email verification', 'boolean'], ['staffMfaRequired', 'Require staff MFA', 'boolean']],
  returns: [['enabled', 'Enable returns', 'boolean'], ['windowDays', 'Return window days', 'number'], ['guestReturns', 'Allow guest returns', 'boolean'], ['excludedProductIds', 'Excluded product IDs', 'array']],
  reviews: [['enabled', 'Enable reviews', 'boolean'], ['moderationRequired', 'Require moderation', 'boolean'], ['allowUpdates', 'Allow review updates', 'boolean'], ['mediaEnabled', 'Allow review media', 'boolean']],
  notifications: [['emailEnabled', 'Enable email', 'boolean'], ['smsEnabled', 'Enable SMS', 'boolean'], ['orderEvents', 'Order event codes', 'array']],
  analytics: [['consentRequired', 'Consent required', 'boolean'], ['provider', 'Provider', 'select', ['none', 'ga4', 'meta']], ['publicMeasurementId', 'Public measurement ID']],
  seo: [['defaultTitle', 'Default title'], ['defaultDescription', 'Default description'], ['robotsIndex', 'Allow indexing', 'boolean'], ['socialImageId', 'Social image ID']],
  maintenance: [['enabled', 'Maintenance mode', 'boolean'], ['message.en', 'Message (English)'], ['message.bn', 'Message (Bangla)'], ['allowAdmin', 'Allow admin access', 'boolean']]
};

function getPath(value, path) { return path.split('.').reduce((result, key) => result?.[key], value); }
function setPath(value, path, next) {
  const result = structuredClone(value);
  const keys = path.split('.');
  let target = result;
  for (const key of keys.slice(0, -1)) target = target[key] ||= {};
  target[keys.at(-1)] = next;
  return result;
}
function inputValue(raw, type, path) {
  if (type === 'number') return Number(raw);
  if (type === 'array') return raw.split(',').map((item) => item.trim()).filter(Boolean);
  if (!raw && ['whatsappUrl', 'publicMeasurementId', 'socialImageId'].includes(path)) return null;
  return raw;
}
const normalizeMoney = (value) => new Decimal(value).toFixed(2);

export function SettingsManager() {
  const client = useQueryClient();
  const shipping = useQuery({ queryKey: ['admin', 'shipping'], queryFn: () => browserApi.get('/admin/shipping').then((response) => response.data.data) });
  const groups = useQuery({ queryKey: ['admin', 'settings-groups'], queryFn: () => browserApi.get('/admin/settings').then((response) => response.data.data) });

  if (shipping.isLoading) return <div className="card p-8">Loading delivery settings…</div>;
  if (shipping.error) return <Alert tone="error">{apiMessage(shipping.error, 'Delivery settings could not be loaded.')}</Alert>;

  const methods = shipping.data.methods.filter((method) => !method.archivedAt);

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Settings" description="Control delivery, checkout, inventory, security, notifications, SEO, and storefront behavior." />
      <DeliveryEditor
        methods={methods}
        onSaved={(savedMethods) => {
          client.setQueryData(['admin', 'shipping'], { ...shipping.data, methods: shipping.data.methods.map((method) => savedMethods.find((saved) => saved.id === method.id) || method) });
          client.invalidateQueries({ queryKey: ['storefront-settings'] });
        }}
      />

      <section className="grid gap-4">
        <div><h2 className="text-lg font-bold">Business settings</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Each group is validated, versioned, and audited by the backend.</p></div>
        {groups.error ? <Alert tone="error">{apiMessage(groups.error)}</Alert> : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.data?.map((group) => (
            <SettingGroup key={`${group.key}:${group.version}`} group={group} onSaved={() => { groups.refetch(); client.invalidateQueries({ queryKey: ['storefront-settings'] }); }} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingGroup({ group, onSaved }) {
  const [value, setValue] = useState(group.value);
  const fields = groupFields[group.key] || [];
  const save = useMutation({
    mutationFn: () => browserApi.put(`/admin/settings/${group.key}`, { value, version: Number(group.version) }),
    onSuccess: onSaved
  });
  if (!fields.length) return null;

  return (
    <details className="card p-5" open={group.key === 'store'}>
      <summary className="cursor-pointer text-sm font-bold capitalize">{group.key}</summary>
      {group.key === 'store' ? (
        <StoreLogoUpload
          logo={value.logo}
          storeName={value.name?.en || 'Store logo'}
          onChange={(logo) => setValue({ ...value, logo })}
        />
      ) : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map(([path, label, type = 'text', options]) => {
          const current = getPath(value, path);
          if (type === 'boolean') {
            return (
              <label key={path} className="flex items-center gap-2 self-center text-sm font-semibold">
                <Checkbox checked={Boolean(current)} onCheckedChange={(next) => setValue(setPath(value, path, !!next))} />
                {label}
              </label>
            );
          }
          if (type === 'select') {
            return (
              <Field key={path} label={label}>
                <NativeSelect
                  value={current || ''}
                  onChange={(event) => setValue(setPath(value, path, event.target.value))}
                  options={options.map((option) => ({ value: option, label: option }))}
                />
              </Field>
            );
          }
          if (type === 'array') {
            return (
              <Field key={path} label={label}>
                <Input value={(current || []).join(', ')} onChange={(event) => setValue(setPath(value, path, inputValue(event.target.value, type, path)))} />
              </Field>
            );
          }
          if (type === 'number') {
            return (
              <Field key={path} label={label}>
                <Input type="number" value={current ?? ''} onChange={(event) => setValue(setPath(value, path, inputValue(event.target.value, type, path)))} />
              </Field>
            );
          }
          return (
            <Field key={path} label={label}>
              <Input value={current ?? ''} onChange={(event) => setValue(setPath(value, path, inputValue(event.target.value, type, path)))} />
            </Field>
          );
        })}
      </div>
      {save.error ? <div className="mt-4"><Alert tone="error">{apiMessage(save.error)}</Alert></div> : null}
      <Button className="mt-5" loading={save.isPending} onClick={() => save.mutate()}>Save {group.key}</Button>
    </details>
  );
}

function StoreLogoUpload({ logo, storeName, onChange }) {
  const [file, setFile] = useState(null);
  const [altText, setAltText] = useState(logo?.altText || storeName);
  const [inputKey, setInputKey] = useState(0);
  const upload = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('file', file);
      data.append('privacy', 'public');
      data.append('altText', altText || storeName);
      return browserApi.post('/admin/media/upload', data).then((response) => response.data.data);
    },
    onSuccess: (asset) => {
      onChange({ mediaId: asset.id, url: asset.url, altText: asset.altText || altText || storeName });
      setFile(null);
      setInputKey((key) => key + 1);
    }
  });

  return (
    <div className="mt-5 grid gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 md:grid-cols-[160px_1fr]">
      <div className="grid min-h-28 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3">
        {logo?.url ? (
          <Image src={logo.url} alt={logo.altText || storeName} width={160} height={96} className="max-h-24 max-w-full object-contain" />
        ) : (
          <span className="text-xs font-semibold text-[var(--color-muted)]">No logo</span>
        )}
      </div>
      <div className="grid gap-3">
        <Field label="Store logo">
          <Input key={inputKey} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </Field>
        <Field label="Logo alt text">
          <Input value={altText} onChange={(event) => setAltText(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={!file} loading={upload.isPending} onClick={() => upload.mutate()}>
            Upload logo
          </Button>
          {logo ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => onChange(null)}>
              Remove logo
            </Button>
          ) : null}
        </div>
        {upload.error ? <Alert tone="error">{apiMessage(upload.error, 'Logo could not be uploaded.')}</Alert> : null}
      </div>
    </div>
  );
}

function DeliveryEditor({ methods, onSaved }) {
  const { register, control, handleSubmit, reset } = useForm({ defaultValues: { methods } });
  const { fields } = useFieldArray({ control, name: 'methods' });
  const save = useMutation({
    mutationFn: (value) =>
      Promise.all(
        value.methods.map(({ id, version, archivedAt: _archivedAt, ...method }) =>
          browserApi.patch(`/admin/shipping/methods/${id}`, {
            ...method,
            flatRate: normalizeMoney(method.flatRate),
            freeThreshold: method.freeThreshold ? normalizeMoney(method.freeThreshold) : null,
            displayOrder: Number(method.displayOrder),
            version: Number(version)
          }).then((response) => response.data.data)
        )
      ),
    onSuccess: (savedMethods) => { reset({ methods: savedMethods }); onSaved(savedMethods); }
  });

  return (
    <section className="grid gap-3">
      <div><h2 className="text-lg font-bold">Delivery methods</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Labels, rates, availability, and payment eligibility update checkout without a deployment.</p></div>
      <form onSubmit={handleSubmit((value) => save.mutate(value))}>
        <Card>
          <CardBody className="grid gap-5">
            {fields.map((field, index) => (
              <fieldset key={field.id} className="grid gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-4 md:grid-cols-2 xl:grid-cols-4">
                <legend className="px-2 font-bold">{field.code}</legend>
                <input type="hidden" {...register(`methods.${index}.id`)} />
                <input type="hidden" {...register(`methods.${index}.zoneId`)} />
                <input type="hidden" {...register(`methods.${index}.code`)} />
                <input type="hidden" {...register(`methods.${index}.type`)} />
                <input type="hidden" {...register(`methods.${index}.version`, { valueAsNumber: true })} />
                <Field label="English label">
                  <Input required {...register(`methods.${index}.labelEn`)} />
                </Field>
                <Field label="Bangla label">
                  <Input required {...register(`methods.${index}.labelBn`)} />
                </Field>
                <Field label="Rate (BDT)">
                  <Input required inputMode="decimal" pattern="\d+(\.\d{1,2})?" {...register(`methods.${index}.flatRate`)} />
                </Field>
                <Field label="Free above (optional)">
                  <Input inputMode="decimal" pattern="\d+(\.\d{1,2})?" {...register(`methods.${index}.freeThreshold`)} />
                </Field>
                <ControlledCheckbox name={`methods.${index}.active`} control={control} label="Active at checkout" className="self-end" />
                <ControlledCheckbox name={`methods.${index}.allowedPayments`} control={control} defaultValue={[]} value="cod" label="Cash on delivery" className="self-end" />
                <ControlledCheckbox name={`methods.${index}.allowedPayments`} control={control} defaultValue={[]} value="bkash" label="bKash" className="self-end" />
                <Field label="Display order">
                  <Input type="number" {...register(`methods.${index}.displayOrder`, { valueAsNumber: true })} />
                </Field>
              </fieldset>
            ))}
            {save.error ? <Alert tone="error">{apiMessage(save.error)}</Alert> : null}
            <div>
              <Button loading={save.isPending} type="submit">Save delivery</Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </section>
  );
}
