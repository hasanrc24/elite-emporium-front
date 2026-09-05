'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { Alert, Banner, Button, Card, CardBody, CardHeader, Field, FieldGroup, FormattedMoney, Input, NativeSelect, Skeleton, Textarea } from '@/components/ui';
import { AdminPageHeader } from './admin-page-header';

const blankForm = () => ({
  customer: { name: '', phone: '', email: '' },
  address: { addressLine: '', area: '', district: '', division: '', postcode: '', landmark: '' },
  deliveryCode: '',
  manualDiscount: '0.00',
  discountReason: '',
  overrideReason: '',
  note: '',
  status: 'draft',
  locale: 'en'
});

export function ManualOrderEditor() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState(blankForm());

  const products = useQuery({
    queryKey: ['manual-order-products', search],
    queryFn: () => browserApi.get('/admin/products', { params: { search, pageSize: 20 } }).then((response) => response.data.data),
    enabled: search.trim().length >= 2
  });
  const shipping = useQuery({
    queryKey: ['admin-shipping'],
    queryFn: () => browserApi.get('/admin/shipping').then((response) => response.data.data)
  });

  const create = useMutation({
    mutationFn: () => browserApi.post(
      '/admin/orders',
      { ...form, items: lines.map(({ variantId, quantity, unitPrice }) => ({ variantId, quantity: Number(quantity), ...(unitPrice ? { unitPrice } : {}) })) },
      { headers: { 'Idempotency-Key': crypto.randomUUID() } }
    ).then((response) => response.data.data),
    onSuccess: (order) => router.replace(`/admin/orders/${order.id}`)
  });

  function field(group, key, value) { setForm({ ...form, [group]: { ...form[group], [key]: value } }); }
  function add(product, variant) {
    if (lines.some((line) => line.variantId === variant.id)) return;
    setLines([...lines, { variantId: variant.id, name: product.name, sku: variant.sku, title: variant.title, quantity: 1, standardPrice: variant.salePrice || variant.regularPrice, unitPrice: '' }]);
  }

  return (
    <div className="grid gap-5">
      <AdminPageHeader backHref="/admin/orders" backLabel="Back to orders" title="Create manual order" description="Create a draft for review or place a COD order with transactional stock reservation. Overrides are audited and permission-controlled." />

      <Card>
        <CardHeader title="Customer and delivery" />
        <CardBody>
          <FieldGroup columns={3}>
            <Field label="Customer name" required>
              <Input required value={form.customer.name} onChange={(event) => field('customer', 'name', event.target.value)} />
            </Field>
            <Field label="Customer phone" required>
              <Input required value={form.customer.phone} onChange={(event) => field('customer', 'phone', event.target.value)} />
            </Field>
            <Field label="Customer email">
              <Input type="email" value={form.customer.email} onChange={(event) => field('customer', 'email', event.target.value)} />
            </Field>
            <Field label="Address line" required className="md:col-span-3">
              <Input required value={form.address.addressLine} onChange={(event) => field('address', 'addressLine', event.target.value)} />
            </Field>
            <Field label="Area"><Input value={form.address.area} onChange={(event) => field('address', 'area', event.target.value)} /></Field>
            <Field label="District"><Input value={form.address.district} onChange={(event) => field('address', 'district', event.target.value)} /></Field>
            <Field label="Division"><Input value={form.address.division} onChange={(event) => field('address', 'division', event.target.value)} /></Field>
            <Field label="Postcode"><Input value={form.address.postcode} onChange={(event) => field('address', 'postcode', event.target.value)} /></Field>
            <Field label="Landmark" className="md:col-span-2"><Input value={form.address.landmark} onChange={(event) => field('address', 'landmark', event.target.value)} /></Field>
          </FieldGroup>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Items" />
        <CardBody className="grid gap-4">
          <Field label="Search product name or SKU">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type at least two characters" />
          </Field>
          {products.data?.length ? (
            <div className="max-h-72 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-border)]">
              {products.data.flatMap((product) =>
                product.variants.filter((variant) => variant.active).map((variant) => (
                  <button type="button" key={variant.id} className="flex w-full justify-between border-b border-[var(--color-border)] p-3 text-left last:border-0 hover:bg-[var(--color-primary-soft)]" onClick={() => add(product, variant)}>
                    <span>{product.name} · {variant.title}<br /><small className="text-[var(--color-muted)]">{variant.sku}</small></span>
                    <strong><FormattedMoney value={variant.salePrice || variant.regularPrice} /></strong>
                  </button>
                ))
              )}
            </div>
          ) : null}

          <div className="grid gap-3">
            {lines.map((line, index) => (
              <div key={line.variantId} className="grid items-end gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3 md:grid-cols-[1fr_120px_160px_auto]">
                <div>
                  <strong>{line.name}</strong>
                  <p className="text-sm text-[var(--color-muted)]">{line.title} · {line.sku}</p>
                </div>
                <Field label="Quantity">
                  <Input type="number" min={1} value={line.quantity} onChange={(event) => setLines(lines.map((entry, position) => position === index ? { ...entry, quantity: event.target.value } : entry))} />
                </Field>
                <Field label="Override price">
                  <Input value={line.unitPrice} onChange={(event) => setLines(lines.map((entry, position) => position === index ? { ...entry, unitPrice: event.target.value } : entry))} placeholder={String(line.standardPrice)} />
                </Field>
                <Button variant="outline" onClick={() => setLines(lines.filter((_, position) => position !== index))}>Remove</Button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Shipping, discounts, and notes" />
        <CardBody>
          <FieldGroup columns={3}>
            <Field label="Delivery zone">
              <NativeSelect
                value={form.deliveryCode}
                onChange={(event) => setForm({ ...form, deliveryCode: event.target.value })}
                options={[
                  { value: '', label: 'Pick a zone' },
                  ...(shipping.data?.zones || []).map((zone) => ({ value: zone.code, label: `${zone.code} — ${zone.label}` }))
                ]}
              />
            </Field>
            <Field label="Manual discount (BDT)">
              <Input value={form.manualDiscount} onChange={(event) => setForm({ ...form, manualDiscount: event.target.value })} />
            </Field>
            <Field label="Discount reason">
              <Input value={form.discountReason} onChange={(event) => setForm({ ...form, discountReason: event.target.value })} />
            </Field>
            <Field label="Price override reason" className="md:col-span-2">
              <Input value={form.overrideReason} onChange={(event) => setForm({ ...form, overrideReason: event.target.value })} placeholder="Required when overriding prices" />
            </Field>
            <Field label="Status">
              <NativeSelect
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'placed', label: 'Place order' }
                ]}
              />
            </Field>
            <Field label="Order note" className="md:col-span-3">
              <Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} rows={3} />
            </Field>
          </FieldGroup>

          {create.error ? <Alert tone="error">{apiMessage(create.error)}</Alert> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button loading={create.isPending} onClick={() => create.mutate()}>{form.status === 'placed' ? 'Place order' : 'Create draft'}</Button>
            <Banner tone="info" title="Idempotent submit">
              Each submission uses a fresh Idempotency-Key; client retries within the same submit share a key.
            </Banner>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
