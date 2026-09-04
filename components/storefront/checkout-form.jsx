'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardBody, ControlledCheckbox, ControlledRadioGroup, Field, FormattedMoney, Input, RadioItem, Textarea } from '@/components/ui';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { cartApi } from '@/lib/api/cart-api';
import { orderApi } from '@/lib/api/order-api';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  phone: z.string().trim().min(10, 'Enter a valid phone number.'),
  email: z.string().email('Enter a valid email.').or(z.literal('')),
  addressLine: z.string().trim().min(5, 'Enter your delivery address.'),
  area: z.string().trim().max(120),
  district: z.string().trim().max(120),
  division: z.string().trim().max(120),
  postcode: z.string().trim().max(20),
  landmark: z.string().trim().max(255),
  deliveryCode: z.string().min(1),
  paymentMethod: z.enum(['cod', 'bkash']),
  termsAccepted: z.literal(true, { error: 'Accept the terms before ordering.' }),
  note: z.string().max(1000).default('')
});

export function CheckoutForm({ locale }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [quote, setQuote] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      addressLine: '',
      area: '',
      district: '',
      division: '',
      postcode: '',
      landmark: '',
      deliveryCode: 'inside_dhaka',
      paymentMethod: 'cod',
      termsAccepted: false,
      note: ''
    }
  });

  const cart = useQuery({ queryKey: ['cart', locale], queryFn: () => cartApi.current(locale) });
  const settings = useQuery({
    queryKey: ['storefront-settings'],
    queryFn: () => browserApi.get('/storefront/settings').then((response) => response.data.data),
    staleTime: 60000
  });

  async function review(values) {
    setSubmitError('');
    try {
      const address = {
        recipientName: values.name,
        phone: values.phone,
        addressLine: values.addressLine,
        area: values.area || null,
        district: values.district || null,
        division: values.division || null,
        postcode: values.postcode || null,
        landmark: values.landmark || null
      };
      const result = await orderApi.quote({
        customer: { name: values.name, phone: values.phone, email: values.email },
        address,
        deliveryCode: values.deliveryCode,
        paymentMethod: values.paymentMethod,
        locale,
        note: values.note
      });
      setIdempotencyKey(crypto.randomUUID());
      setQuote(result);
    } catch (error) {
      setSubmitError(apiMessage(error));
    }
  }

  async function place() {
    if (!quote || !idempotencyKey) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (quote.paymentMethod === 'bkash') {
        const attempt = await orderApi.startBkash(quote.quoteId, idempotencyKey);
        sessionStorage.setItem('ee_bkash_recovery', JSON.stringify({
          attemptId: attempt.attemptId,
          recoveryToken: attempt.recoveryToken,
          orderReference: attempt.orderReference,
          expiresAt: attempt.expiresAt
        }));
        if (!attempt.redirectUrl) throw new Error('bKash did not return a payment page.');
        window.location.assign(attempt.redirectUrl);
        return;
      }
      const order = await orderApi.create({ quoteId: quote.quoteId }, idempotencyKey);
      queryClient.setQueryData(['cart', locale], { items: [], itemCount: 0, coupons: [], notices: [], totals: { subtotal: '0.00', discount: '0.00', total: '0.00' } });
      router.push(`/${locale}/order/success/${order.reference}`);
    } catch (error) {
      setSubmitError(apiMessage(error));
      if (error?.response?.data?.error?.code !== 'IDEMPOTENCY_KEY_REUSED') {
        setIdempotencyKey(null);
        setQuote(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.isLoading || settings.isLoading) {
    return (
      <Card>
        <CardBody>Preparing checkout…</CardBody>
      </Card>
    );
  }
  if (!cart.data?.items.length) return <Alert>Your cart is empty.</Alert>;

  return (
    <form
      onChange={() => { if (quote) { setQuote(null); setIdempotencyKey(null); } }}
      onSubmit={handleSubmit(review)}
      className="grid gap-8 lg:grid-cols-[1fr_390px]"
    >
      <Card>
        <CardBody className="grid gap-5">
          <div>
            <h2 className="text-xl font-bold">Delivery details</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">No account is required.</p>
          </div>

          <Field label="Name" error={errors.name?.message}>
            <Input autoComplete="name" {...register('name')} invalid={!!errors.name} />
          </Field>
          <Field label="Bangladeshi phone number" error={errors.phone?.message}>
            <Input inputMode="tel" autoComplete="tel" {...register('phone')} invalid={!!errors.phone} />
          </Field>
          <Field label="Email (optional)" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} invalid={!!errors.email} />
          </Field>
          <Field label="Address line" error={errors.addressLine?.message}>
            <Textarea rows={3} autoComplete="street-address" {...register('addressLine')} invalid={!!errors.addressLine} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Area"><Input {...register('area')} /></Field>
            <Field label="District"><Input {...register('district')} /></Field>
            <Field label="Division"><Input {...register('division')} /></Field>
            <Field label="Postcode"><Input autoComplete="postal-code" {...register('postcode')} /></Field>
          </div>

          <Field label="Landmark (optional)"><Input {...register('landmark')} /></Field>

          <fieldset>
            <legend className="font-semibold">Delivery area</legend>
            <ControlledRadioGroup name="deliveryCode" control={control} className="mt-3 sm:grid-cols-2">
              {settings.data.shippingMethods.map((method) => (
                <RadioItem
                  key={method.code}
                  value={method.code}
                  label={method.label[locale] || method.label.en}
                  description={<FormattedMoney value={method.price} locale={locale} />}
                />
              ))}
            </ControlledRadioGroup>
          </fieldset>

          <fieldset>
            <legend className="font-semibold">Payment</legend>
            <ControlledRadioGroup name="paymentMethod" control={control} className="mt-3 sm:grid-cols-2">
              <RadioItem value="cod" label="Cash on delivery" description="Pay when your order arrives." />
              {settings.data.payments.bkash.enabled ? (
                <RadioItem value="bkash" label="bKash" description="Pay securely on bKash." />
              ) : null}
            </ControlledRadioGroup>
          </fieldset>

          <Field label="Order note (optional)">
            <Textarea rows={3} {...register('note')} />
          </Field>

          <ControlledCheckbox
            name="termsAccepted"
            control={control}
            label={<>I agree to the{' '}
              <Link className="font-semibold text-[var(--color-primary)]" href={`/${locale}/page/${settings.data.checkout.termsPageSlug}`}>
                terms and conditions
              </Link>
              .</>}
          />
        </CardBody>
      </Card>

      <aside className="card h-fit p-6">
        <h2 className="text-xl font-bold">Review order</h2>
        {cart.data.items.map((item) => (
          <div key={item.id} className="mt-4 flex justify-between gap-4 text-sm">
            <span>{item.product.name} × {item.quantity}</span>
            <strong><FormattedMoney value={item.discountedLineTotal} locale={locale} /></strong>
          </div>
        ))}
        <hr className="my-5 border-[var(--color-border)]" />
        {quote ? (
          <>
            <SummaryRow label="Subtotal" value={quote.totals.subtotal} locale={locale} />
            {quote.totals.discount !== '0.00' ? <SummaryRow label="Discount" value={quote.totals.discount} locale={locale} negative /> : null}
            <SummaryRow label={quote.delivery.label} value={quote.totals.delivery} locale={locale} />
            {quote.totals.tax !== '0.00' ? <SummaryRow label="Tax" value={quote.totals.tax} locale={locale} /> : null}
            <SummaryRow label="Total" value={quote.totals.grand} locale={locale} strong />
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              Quote expires {new Date(quote.expiresAt).toLocaleTimeString('en-BD', { timeZone: 'Asia/Dhaka' })}.
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Complete the form and review authoritative totals before ordering.</p>
        )}
        {submitError ? <div className="mt-4"><Alert tone="error">{submitError}</Alert></div> : null}
        {quote ? (
          <Button type="button" className="mt-6 w-full" loading={submitting} onClick={place}>
            {quote.paymentMethod === 'bkash' ? 'Continue to bKash' : 'Place COD order'}
          </Button>
        ) : (
          <Button type="submit" className="mt-6 w-full">Review totals</Button>
        )}
      </aside>
    </form>
  );
}

function SummaryRow({ label, value, locale, strong = false, negative = false }) {
  return (
    <div className={`mt-3 flex justify-between ${strong ? 'text-lg font-bold' : ''} ${negative ? 'text-[var(--color-success)]' : ''}`}>
      <span>{label}</span>
      <span>{negative ? '−' : ''}<FormattedMoney value={value} locale={locale} /></span>
    </div>
  );
}
