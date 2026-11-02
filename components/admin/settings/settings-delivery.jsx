'use client';

import { Banknote, Smartphone } from 'lucide-react';
import { Badge, Field, Input, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ESTIMATE_ZONE_LABELS, fieldDomId, zoneLabel } from './settings-schema';
import { AffixInput } from './settings-fields';

const PAYMENTS = [
  { value: 'cod', label: 'Cash on delivery', Icon: Banknote },
  { value: 'bkash', label: 'bKash', Icon: Smartphone }
];

export function DeliveryMethods({ methods, zones, errorsFor, isMethodDirty, setMethod, disabled }) {
  if (!methods.length) return <p className="text-sm text-[var(--color-muted)]">No delivery methods are set up yet.</p>;
  const zoneName = (id) => zones.find((zone) => zone.id === id)?.nameEn;
  return (
    <ul className="grid gap-4">
      {methods.map((method) => {
        const errors = errorsFor(`method:${method.id}`);
        const set = (patch) => setMethod(method.id, patch);
        const switchId = `method-${method.id}-active`;
        return (
          <li key={method.id} id={`method-${method.id}`} className={cn('rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] transition', !method.active && 'bg-[var(--color-surface-muted)]/50')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold">{method.labelEn || method.code}</span>
                {zoneName(method.zoneId) && zoneName(method.zoneId) !== method.labelEn ? <span className="text-xs text-[var(--color-muted)]">{zoneName(method.zoneId)}</span> : null}
                {isMethodDirty(method.id) ? <Badge tone="warning">Edited</Badge> : null}
              </div>
              <label htmlFor={switchId} className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[var(--color-muted)]">
                {method.active ? 'Offered at checkout' : 'Hidden from checkout'}
                <Switch id={switchId} checked={Boolean(method.active)} disabled={disabled} onCheckedChange={(next) => set({ active: Boolean(next) })} />
              </label>
            </div>
            <div className={cn('grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4', !method.active && 'opacity-70')}>
              <Field label="Name (English)" error={errors.labelEn}>
                <Input value={method.labelEn ?? ''} maxLength={160} disabled={disabled} onChange={(event) => set({ labelEn: event.target.value })} />
              </Field>
              <Field label="Name (Bangla)" error={errors.labelBn}>
                <Input lang="bn" value={method.labelBn ?? ''} maxLength={160} disabled={disabled} onChange={(event) => set({ labelBn: event.target.value })} />
              </Field>
              <Field label="Delivery charge" error={errors.flatRate}>
                <AffixInput prefix="৳" inputMode="decimal" value={method.flatRate ?? ''} disabled={disabled} onChange={(event) => set({ flatRate: event.target.value.replace(/[^\d.]/g, '') })} />
              </Field>
              <Field label="Free delivery above" hint="Leave blank for no free delivery." error={errors.freeThreshold}>
                <AffixInput prefix="৳" inputMode="decimal" placeholder="No free delivery" value={method.freeThreshold ?? ''} disabled={disabled} onChange={(event) => { const raw = event.target.value.replace(/[^\d.]/g, ''); set({ freeThreshold: raw === '' ? null : raw }); }} />
              </Field>
              <fieldset className="grid content-start gap-2 sm:col-span-2" disabled={disabled}>
                <legend className="mb-2 text-sm font-semibold">Payment options</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {PAYMENTS.map(({ value, label, Icon }) => {
                    const on = (method.allowedPayments || []).includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        disabled={disabled}
                        onClick={() => set({ allowedPayments: on ? method.allowedPayments.filter((item) => item !== value) : [...(method.allowedPayments || []), value] })}
                        className={cn('inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]', on ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)]')}
                      >
                        <Icon size={15} aria-hidden="true" />{label}
                      </button>
                    );
                  })}
                </div>
                {errors.allowedPayments ? <p role="alert" className="error">{errors.allowedPayments}</p> : null}
              </fieldset>
              <Field label="Position at checkout" hint="Lower numbers are listed first." error={errors.displayOrder}>
                <Input inputMode="numeric" value={method.displayOrder ?? 0} disabled={disabled} onChange={(event) => set({ displayOrder: Number(event.target.value.replace(/\D/g, '')) || 0 })} />
              </Field>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DeliveryEstimates({ value, errors, setValue, disabled }) {
  const estimates = value?.estimates || {};
  const codes = [...new Set([...Object.keys(ESTIMATE_ZONE_LABELS), ...Object.keys(estimates)])];
  return (
    <div className="grid gap-1">
      <div className="hidden grid-cols-[minmax(0,180px)_1fr_1fr] gap-4 px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] md:grid">
        <span>Zone</span><span>English</span><span>Bangla</span>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {codes.map((code) => {
          const path = `estimates.${code}`;
          const error = errors[path];
          const set = (locale, text) => setValue('delivery', path, { en: estimates[code]?.en ?? '', bn: estimates[code]?.bn ?? '', [locale]: text });
          return (
            <li key={code} id={fieldDomId('delivery', path)} className="settings-target grid gap-2 py-3 md:grid-cols-[minmax(0,180px)_1fr_1fr] md:items-center md:gap-4">
              <span className="text-sm font-semibold">{zoneLabel(code)}</span>
              <Input aria-label={`${zoneLabel(code)} estimate (English)`} placeholder="2–3 days" maxLength={80} disabled={disabled} invalid={Boolean(error)} value={estimates[code]?.en ?? ''} onChange={(event) => set('en', event.target.value)} />
              <Input lang="bn" aria-label={`${zoneLabel(code)} estimate (Bangla)`} placeholder="২–৩ দিন" maxLength={80} disabled={disabled} invalid={Boolean(error)} value={estimates[code]?.bn ?? ''} onChange={(event) => set('bn', event.target.value)} />
              {error ? <p role="alert" className="error md:col-span-3">{error}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
