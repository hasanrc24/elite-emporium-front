'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, ChevronDown, Lock, ShoppingBag, Smartphone } from 'lucide-react';
import { apiMessage, isRetryableFailure } from '@/lib/api/browser-api';
import { orderApi } from '@/lib/api/order-api';
import { readAttribution } from '@/lib/attribution';
import { trackCommerceEvent } from '@/lib/analytics';
import { useCart } from '@/lib/hooks/use-cart';
import { useUiStore } from '@/lib/ui-store';
import { formatMoney, isBangladeshiPhone } from '@/lib/utils';
import { CouponForm } from './cart-lines';
import { deliveryEstimate, useStorefront } from './storefront-context';

function buildSchema(t, requireTerms) {
  return z.object({
    phone: z.string().trim().refine(isBangladeshiPhone, t('invalidPhone')),
    name: z.string().trim().min(2, t('invalidName')).max(120),
    email: z.union([z.literal(''), z.string().trim().email(t('invalidEmail')).max(190)]),
    addressLine: z.string().trim().min(5, t('invalidAddress')).max(500),
    deliveryCode: z.string().min(1),
    paymentMethod: z.enum(['cod', 'bkash']),
    note: z.string().max(1000),
    termsAccepted: requireTerms ? z.literal(true, { error: t('acceptTerms') }) : z.boolean()
  });
}

/** Identity of a quote request; attribution is context, not order content. */
const bodyHash = (body) => JSON.stringify({ ...body, attribution: undefined });

/** Usable when it was made for exactly this form (note included) and has 15s+ left. */
function quoteStillValid(quote, body) {
  return Boolean(quote?.quoteId) && quote.bodyHash === bodyHash(body) && new Date(quote.expiresAt).getTime() > Date.now() + 15000;
}

const fieldMap = { 'customer.phone': 'phone', 'customer.name': 'name', 'customer.email': 'email', 'address.addressLine': 'addressLine', deliveryCode: 'deliveryCode', paymentMethod: 'paymentMethod' };

function toPayload(values, locale) {
  return {
    customer: { name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim() },
    address: {
      recipientName: values.name.trim(),
      phone: values.phone.trim(),
      addressLine: values.addressLine.trim()
    },
    deliveryCode: values.deliveryCode,
    paymentMethod: values.paymentMethod,
    locale,
    note: values.note.trim(),
    attribution: readAttribution()
  };
}

export function CheckoutForm({ locale }) {
  const t = useTranslations('Checkout');
  const tc = useTranslations('Cart');
  const router = useRouter();
  const client = useQueryClient();
  const { settings } = useStorefront();
  const cartState = useCart(locale);
  const cart = cartState.cart;
  const setLastOrder = useUiStore((state) => state.setLastOrder);
  const methods = useMemo(() => settings?.shippingMethods || [], [settings]);
  const bkashEnabled = Boolean(settings?.payments?.bkash?.enabled);
  const requireTerms = settings?.checkout?.requireTermsAcceptance !== false;
  const notesEnabled = settings?.checkout?.orderNotesEnabled !== false;
  const schema = useMemo(() => buildSchema(t, requireTerms), [t, requireTerms]);
  const { register, control, handleSubmit, setError, getValues, setFocus, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', phone: '', addressLine: '', email: '', deliveryCode: methods[0]?.code || 'inside_dhaka', paymentMethod: 'cod', note: '', termsAccepted: false }
  });
  const values = useWatch({ control });
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [idempotency, setIdempotency] = useState({ quoteId: null, key: null });

  const ready = isBangladeshiPhone(values.phone) && (values.name || '').trim().length >= 2 && (values.addressLine || '').trim().length >= 5;
  const payload = useMemo(() => (ready ? toPayload(getValues(), locale) : null), [ready, values, locale, getValues]); // eslint-disable-line react-hooks/exhaustive-deps
  const payloadHash = payload ? JSON.stringify({ ...payload, note: undefined, attribution: undefined }) : null;
  // Coupon or quantity changes alter the cart totals and must re-quote.
  const cartVersion = `${cart.data?.version ?? ''}:${cart.data?.itemCount ?? 0}:${cart.data?.totals?.subtotal ?? ''}:${cart.data?.totals?.discount ?? ''}`;

  // Re-quote (debounced) whenever the address, delivery, payment or bag changes.
  // `isCurrent` lets a superseded (slower) quote be ignored instead of overwriting a newer one.
  const requestQuote = useCallback(async (body, isCurrent = () => true) => {
    setQuoting(true); setQuoteError('');
    try {
      const result = await orderApi.quote(body);
      if (!isCurrent()) return null;
      const stamped = { ...result, bodyHash: bodyHash(body) };
      setQuote(stamped);
      return stamped;
    } catch (error) {
      if (!isCurrent()) return null;
      setQuote(null);
      const fieldErrors = error?.response?.data?.error?.fieldErrors || {};
      for (const [field, messages] of Object.entries(fieldErrors)) if (fieldMap[field]) setError(fieldMap[field], { message: messages[0] });
      setQuoteError(apiMessage(error, t('loadError')));
      return null;
    } finally {
      if (isCurrent()) setQuoting(false);
    }
  }, [setError, t]);

  useEffect(() => {
    if (!payload) { queueMicrotask(() => setQuote(null)); return undefined; }
    let current = true;
    const timer = setTimeout(() => requestQuote(payload, () => current), 500);
    return () => { current = false; clearTimeout(timer); };
  }, [payloadHash, cartVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (cart.data?.items?.length) trackCommerceEvent('begin_checkout', { value: cart.data.totals?.subtotal, currency: 'BDT', items: cart.data.itemCount }); }, [cart.data?.items?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function place(formValues) {
    setSubmitError('');
    const body = toPayload(formValues, locale);
    setPlacing(true);
    try {
      const fresh = !quoting && quoteStillValid(quote, body) ? quote : await requestQuote(body);
      if (!fresh) { setPlacing(false); return; }
      // One key per quote: retrying the same quote replays the original request
      // instead of creating a second order; a new quote gets a new key.
      const key = idempotency.quoteId === fresh.quoteId && idempotency.key ? idempotency.key : crypto.randomUUID();
      setIdempotency({ quoteId: fresh.quoteId, key });
      if (fresh.paymentMethod === 'bkash') {
        const attempt = await orderApi.startBkash(fresh.quoteId, key);
        // Recovery needs only these opaque identifiers (FE-AUTH: no tokens or personal data).
        sessionStorage.setItem('ee_bkash_recovery', JSON.stringify({ attemptId: attempt.attemptId, recoveryToken: attempt.recoveryToken, orderReference: attempt.orderReference, expiresAt: attempt.expiresAt }));
        if (!attempt.redirectUrl) { router.push(`/${locale}/payment/bkash`); return; }
        window.location.assign(attempt.redirectUrl);
        return;
      }
      const order = await orderApi.create({ quoteId: fresh.quoteId }, key);
      setLastOrder({ reference: order.reference, firstName: formValues.name.trim().split(/\s+/)[0], paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, confirmationStatus: order.confirmationStatus, total: order.totals?.grand, itemCount: order.items?.length || 0, contents: (order.items || []).filter((item) => item.productId).map((item) => ({ id: item.productId, quantity: item.quantity, price: item.unitPrice })) });
      client.setQueryData(['cart', locale], { items: [], itemCount: 0, coupons: [], notices: [], totals: { subtotal: '0.00', discount: '0.00', total: '0.00' } });
      client.invalidateQueries({ queryKey: ['cart'] });
      router.push(`/${locale}/order/success/${order.reference}`);
    } catch (error) {
      setSubmitError(apiMessage(error, t('loadError')));
      // An uncertain outcome keeps the key so a retry replays instead of duplicating.
      if (!isRetryableFailure(error)) setIdempotency({ quoteId: null, key: null });
      setPlacing(false);
    }
  }

  function onInvalid(fieldErrors) {
    const first = ['name', 'phone', 'addressLine', 'email', 'deliveryCode', 'paymentMethod', 'termsAccepted'].find((key) => fieldErrors[key]);
    if (first) { try { setFocus(first); } catch { /* not focusable */ } }
  }

  if (cart.isLoading) return <div className="grid gap-6 lg:grid-cols-[1fr_420px]"><div className="grid gap-4">{[0, 1, 2].map((key) => <div key={key} className="skeleton h-40 rounded" />)}</div><div className="skeleton hidden h-80 rounded lg:block" /></div>;
  if (cart.error) return <p role="alert" className="py-10 text-sm">{apiMessage(cart.error, t('loadError'))}</p>;
  if (!cart.data?.items?.length) return (
    <div className="grid place-items-center gap-3 py-20 text-center">
      <ShoppingBag size={28} />
      <h2 className="text-xl font-medium">{t('emptyTitle')}</h2>
      <p className="text-sm text-[var(--color-muted)]">{t('emptyBody')}</p>
      <Link href={`/${locale}/shop`} className="mt-2 inline-flex min-h-12 items-center rounded-[var(--radius-sm)] bg-[var(--color-text)] px-8 text-[15px] text-[var(--color-bg)]">{tc('continue')}</Link>
    </div>
  );

  const totals = quote?.totals;
  const displayTotal = totals?.grand || cart.data.totals?.total || cart.data.totals?.subtotal;
  const placeLabel = values.paymentMethod === 'bkash' ? t('payWithBkash') : t('placeOrder');
  const summary = <OrderSummary cart={cart.data} quote={quote} quoting={quoting} locale={locale} cartState={cartState} />;

  return (
    <form onSubmit={handleSubmit(place, onInvalid)} noValidate className="grid items-start gap-6 lg:grid-cols-[1fr_420px] lg:gap-12">
      <div className="-mx-4 border-y border-[var(--color-border)] bg-[var(--color-surface)] lg:hidden">
        <button type="button" onClick={() => setSummaryOpen((open) => !open)} aria-expanded={summaryOpen} className="flex w-full items-center justify-between px-4 py-3.5 text-[14px]">
          <span className="flex items-center gap-2"><ShoppingBag size={17} />{summaryOpen ? t('hideSummary') : t('showSummary')}<ChevronDown size={16} className={`transition ${summaryOpen ? 'rotate-180' : ''}`} /></span>
          <strong className="font-medium tabular-nums">{formatMoney(displayTotal, locale)}</strong>
        </button>
        {summaryOpen ? <div className="border-t border-[var(--color-border)] px-4 pb-4">{summary}</div> : null}
      </div>

      <div className="grid gap-8">
        <Section number={1} title={t('details')} aside={t('noAccount')}>
          <TextField id="name" label={t('name')} error={errors.name?.message} inputProps={{ ...register('name'), autoComplete: 'name' }} />
          <TextField id="phone" label={t('phone')} hint={t('phoneHint')} error={errors.phone?.message} inputProps={{ ...register('phone'), type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '01XXXXXXXXX' }} />
          <TextField id="addressLine" label={t('addressLine')} hint={t('addressHint')} error={errors.addressLine?.message} multiline inputProps={{ ...register('addressLine'), autoComplete: 'street-address', rows: 3 }} />
          <TextField id="email" label={t('email')} error={errors.email?.message} inputProps={{ ...register('email'), type: 'email', inputMode: 'email', autoComplete: 'email' }} />
        </Section>

        <Section number={2} title={t('deliveryMethod')}>
          <div className="grid gap-2" role="radiogroup" aria-label={t('deliveryMethod')}>
            {methods.map((method) => {
              const estimate = deliveryEstimate(settings, method.code, locale);
              const checked = values.deliveryCode === method.code;
              const price = checked && quote?.delivery?.code === method.code ? quote.delivery.price : method.price;
              return (
                <label key={method.code} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 transition ${checked ? 'border-[var(--color-text)] bg-[var(--color-surface)]' : 'border-[var(--color-border-strong)]'}`}>
                  <input type="radio" value={method.code} {...register('deliveryCode')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">{method.label?.[locale] || method.label?.en}</span>
                    {estimate ? <span className="block text-[13px] text-[var(--color-muted)]">{t('deliveryDays', { days: estimate })}</span> : null}
                  </span>
                  <span className="text-[15px] tabular-nums">{Number(price) === 0 ? t('free') : formatMoney(price, locale)}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Section number={3} title={t('payment')}>
          <div className="grid gap-2" role="radiogroup" aria-label={t('payment')}>
            <PaymentOption value="cod" checked={values.paymentMethod === 'cod'} register={register} Icon={Banknote} title={t('cod')} hint={t('codHint')} />
            {bkashEnabled ? <PaymentOption value="bkash" checked={values.paymentMethod === 'bkash'} register={register} Icon={Smartphone} title={t('bkash')} hint={t('bkashHint')} /> : null}
          </div>
          {errors.paymentMethod ? <p role="alert" className="text-[13px] text-[var(--color-danger)]">{errors.paymentMethod.message}</p> : null}
        </Section>

        {notesEnabled ? <TextField id="note" label={t('note')} multiline inputProps={{ ...register('note'), rows: 2, placeholder: t('notePlaceholder') }} /> : null}
        {requireTerms ? (
          <div>
            <label className="flex items-start gap-3 text-[14px] leading-6">
              <input type="checkbox" className="mt-1" {...register('termsAccepted')} aria-invalid={Boolean(errors.termsAccepted)} />
              <span>{t.rich('terms', { link: (chunks) => <Link href={`/${locale}/page/${settings?.checkout?.termsPageSlug || 'terms'}`} target="_blank" className="underline underline-offset-4">{chunks}</Link> })}</span>
            </label>
            {errors.termsAccepted ? <p role="alert" className="mt-1 text-[13px] text-[var(--color-danger)]">{errors.termsAccepted.message}</p> : null}
          </div>
        ) : null}

        {quoteError || submitError ? <p role="alert" className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_6%,transparent)] px-4 py-3 text-[14px] text-[var(--color-danger)]">{submitError || quoteError}</p> : null}

        <div className="hidden lg:block">
          <PlaceButton placing={placing} label={placeLabel} placingLabel={t('placing')} />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[var(--color-muted)]"><Lock size={13} />{t('trust')}</p>
        </div>
      </div>

      <aside className="hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:block">
        <h2 className="mb-4 text-lg font-medium">{t('summary')}</h2>
        {summary}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
        <div className="mb-2 flex items-baseline justify-between text-[14px]"><span>{t('total')}{values.paymentMethod === 'cod' ? <span className="text-[var(--color-muted)]"> · {t('payOnDelivery')}</span> : null}</span><strong className="text-[17px] font-medium tabular-nums">{quoting ? '…' : formatMoney(displayTotal, locale)}</strong></div>
        <PlaceButton placing={placing} label={placeLabel} placingLabel={t('placing')} />
      </div>
      <div className="h-28 lg:hidden" aria-hidden="true" />
    </form>
  );
}

function PlaceButton({ placing, label, placingLabel }) {
  return <button type="submit" disabled={placing} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[16px] font-medium text-[var(--color-bg)] transition hover:opacity-90 disabled:opacity-60"><Lock size={16} aria-hidden="true" />{placing ? placingLabel : label}</button>;
}

function Section({ number, title, aside, children }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 flex w-full items-baseline justify-between gap-3"><span className="flex items-baseline gap-2 text-[18px] font-medium"><span className="grid size-6 place-items-center rounded-full bg-[var(--color-text)] text-[12px] text-[var(--color-bg)]" aria-hidden="true">{number}</span>{title}</span>{aside ? <span className="text-[13px] text-[var(--color-muted)]">{aside}</span> : null}</legend>
      {children}
    </fieldset>
  );
}

function TextField({ id, label, hint, error, multiline = false, inputProps }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  const Component = multiline ? 'textarea' : 'input';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Component id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={error ? '!border-[var(--color-danger)]' : ''} {...inputProps} />
      {hint && !error ? <p id={`${id}-hint`} className="text-[12px] text-[var(--color-muted)]">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="text-[13px] text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}

function PaymentOption({ value, checked, register, Icon, title, hint }) {
  return (
    <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 transition ${checked ? 'border-[var(--color-text)] bg-[var(--color-surface)]' : 'border-[var(--color-border-strong)]'}`}>
      <input type="radio" value={value} {...register('paymentMethod')} />
      <span className="min-w-0 flex-1"><span className="block text-[15px]">{title}</span><span className="block text-[13px] text-[var(--color-muted)]">{hint}</span></span>
      <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
    </label>
  );
}

function OrderSummary({ cart, quote, quoting, locale, cartState }) {
  const t = useTranslations('Checkout');
  const totals = quote?.totals;
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 pt-3 lg:pt-0">
        {cart.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <span className="product-media relative w-14 shrink-0 rounded-[var(--radius-sm)]">{item.image ? <Image src={item.image.url} alt="" fill sizes="56px" /> : null}<span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-[var(--color-muted)] text-[11px] text-[var(--color-bg)]">{item.quantity}</span></span>
            <span className="min-w-0 flex-1"><span className="line-clamp-1 text-[14px]">{item.product.name}</span>{item.variantTitle ? <span className="block text-[12px] text-[var(--color-muted)]">{item.variantTitle}</span> : null}</span>
            <span className="text-[14px] tabular-nums">{formatMoney(item.discountedLineTotal, locale)}</span>
          </li>
        ))}
      </ul>
      <CouponForm cartState={cartState} locale={locale} />
      <dl className="grid gap-2 border-t border-[var(--color-border)] pt-4 text-[14px]">
        <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t('subtotal')}</dt><dd className="tabular-nums">{formatMoney(totals?.subtotal || cart.totals?.subtotal, locale)}</dd></div>
        {(totals?.discount || cart.totals?.discount) && (totals?.discount || cart.totals?.discount) !== '0.00' ? <div className="flex justify-between text-[var(--color-success)]"><dt>{t('discount')}</dt><dd className="tabular-nums">−{formatMoney(totals?.discount || cart.totals?.discount, locale)}</dd></div> : null}
        <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t('delivery')}{quote?.delivery?.label ? ` · ${quote.delivery.label}` : ''}</dt><dd className="tabular-nums">{totals ? (Number(totals.delivery) === 0 ? t('free') : formatMoney(totals.delivery, locale)) : '—'}</dd></div>
        {totals?.tax && totals.tax !== '0.00' ? <div className="flex justify-between"><dt className="text-[var(--color-muted)]">Tax</dt><dd className="tabular-nums">{formatMoney(totals.tax, locale)}</dd></div> : null}
        <div className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-3 text-[16px]"><dt className="font-medium">{t('total')}</dt><dd className="text-[19px] font-medium tabular-nums" aria-live="polite">{quoting ? <span className="text-[14px] text-[var(--color-muted)]">{t('calculating')}</span> : totals ? formatMoney(totals.grand, locale) : '—'}</dd></div>
      </dl>
      {!totals && !quoting ? <p className="text-[12px] text-[var(--color-muted)]">{t('completeForm')}</p> : null}
      {quote?.expiresAt ? <p className="text-[12px] text-[var(--color-muted)]">{t('quoteExpires', { time: new Date(quote.expiresAt).toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-GB', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' }) })}</p> : null}
    </div>
  );
}
