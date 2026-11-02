'use client';

import { useState } from 'react';
import { Banknote, Plus, Smartphone, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, ConfirmAction, DialogContent, DialogRoot, Field, Input, Switch, pushToast } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { cn } from '@/lib/utils';
import { ESTIMATE_ZONE_LABELS, fieldDomId, validateMethod, zoneLabel } from './settings-schema';
import { AffixInput } from './settings-fields';

const PAYMENTS = [
  { value: 'cod', label: 'Cash on delivery', Icon: Banknote },
  { value: 'bkash', label: 'bKash', Icon: Smartphone }
];

const BLANK_METHOD = { labelEn: '', labelBn: '', flatRate: '', freeThreshold: '', allowedPayments: ['cod', 'bkash'] };

function PaymentChoices({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PAYMENTS.map(({ value: option, label, Icon }) => {
        const on = (value || []).includes(option);
        return (
          <button key={option} type="button" role="checkbox" aria-checked={on} disabled={disabled} onClick={() => onChange(on ? value.filter((item) => item !== option) : [...(value || []), option])} className={cn('inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]', on ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-muted)]')}>
            <Icon size={15} aria-hidden="true" />{label}
          </button>
        );
      })}
    </div>
  );
}

/** Adds a delivery method straight away; the backend creates its code and zone. */
function AddMethodDialog({ onAdd, onClose }) {
  const [draft, setDraft] = useState(BLANK_METHOD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = touched ? validateMethod({ ...draft, freeThreshold: draft.freeThreshold || null }) : {};
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  async function submit() {
    setTouched(true);
    if (Object.keys(validateMethod({ ...draft, freeThreshold: draft.freeThreshold || null })).length) return;
    setBusy(true); setError('');
    try { const created = await onAdd(draft); pushToast({ tone: 'success', title: 'Delivery method added', description: created?.labelEn || draft.labelEn }); onClose(); } catch (caught) { setError(apiMessage(caught, 'The delivery method could not be added.')); } finally { setBusy(false); }
  }
  return (
    <DialogRoot open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent title="Add delivery method" description="For example “Express delivery” or “Pickup from store”. It appears at checkout right away." footer={<>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button loading={busy} onClick={submit}><Plus size={16} />Add method</Button>
      </>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name (English)" error={errors.labelEn}><Input autoFocus value={draft.labelEn} maxLength={160} onChange={(event) => set({ labelEn: event.target.value })} /></Field>
          <Field label="Name (Bangla)" error={errors.labelBn}><Input lang="bn" value={draft.labelBn} maxLength={160} onChange={(event) => set({ labelBn: event.target.value })} /></Field>
          <Field label="Delivery charge" error={errors.flatRate}><AffixInput prefix="৳" inputMode="decimal" value={draft.flatRate} onChange={(event) => set({ flatRate: event.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <Field label="Free delivery above" hint="Leave blank for no free delivery." error={errors.freeThreshold}><AffixInput prefix="৳" inputMode="decimal" placeholder="No free delivery" value={draft.freeThreshold} onChange={(event) => set({ freeThreshold: event.target.value.replace(/[^\d.]/g, '') })} /></Field>
          <fieldset className="grid content-start gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold">Payment options</legend>
            <PaymentChoices value={draft.allowedPayments} onChange={(allowedPayments) => set({ allowedPayments })} />
            {errors.allowedPayments ? <p role="alert" className="error">{errors.allowedPayments}</p> : null}
          </fieldset>
        </div>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </DialogContent>
    </DialogRoot>
  );
}

export function DeliveryMethods({ methods, zones, errorsFor, isMethodDirty, setMethod, onAdd, onArchive, disabled }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const zoneName = (id) => zones.find((zone) => zone.id === id)?.nameEn;
  async function remove(method) {
    try { await onArchive(method.id); pushToast({ tone: 'success', title: 'Delivery method deleted', description: method.labelEn }); } catch (caught) { pushToast({ tone: 'error', title: 'Could not delete', description: apiMessage(caught, 'The delivery method could not be deleted.') }); }
  }
  const addButton = onAdd ? <div><Button variant="secondary" disabled={disabled} onClick={() => setAdding(true)}><Plus size={16} />Add delivery method</Button></div> : null;
  const dialogs = (
    <>
      {adding ? <AddMethodDialog onAdd={onAdd} onClose={() => setAdding(false)} /> : null}
      <ConfirmAction open={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }} title={`Delete “${removing?.labelEn || ''}”?`} description="Customers will no longer see it at checkout. Past orders keep their delivery details." confirmLabel="Delete" onConfirm={() => removing && remove(removing)} />
    </>
  );
  if (!methods.length) return <div className="grid gap-3"><p className="text-sm text-[var(--color-muted)]">No delivery methods are set up yet.</p>{addButton}{dialogs}</div>;
  return (
    <div className="grid gap-4">
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
              <div className="flex items-center gap-3">
                <label htmlFor={switchId} className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[var(--color-muted)]">
                  {method.active ? 'Offered at checkout' : 'Hidden from checkout'}
                  <Switch id={switchId} checked={Boolean(method.active)} disabled={disabled} onCheckedChange={(next) => set({ active: Boolean(next) })} />
                </label>
                {onArchive ? <Button size="sm" variant="ghost" disabled={disabled} aria-label={`Delete ${method.labelEn || method.code}`} onClick={() => setRemoving(method)}><Trash2 size={15} />Delete</Button> : null}
              </div>
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
    {addButton}
    {dialogs}
    </div>
  );
}

export function DeliveryEstimates({ value, errors, setValue, disabled, methods = [] }) {
  const estimates = value?.estimates || {};
  // Methods added by the admin get an estimate row too (estimates are keyed by method code).
  const codes = [...new Set([...Object.keys(ESTIMATE_ZONE_LABELS), ...methods.map((method) => method.code), ...Object.keys(estimates)])];
  const label = (code) => ESTIMATE_ZONE_LABELS[code] || methods.find((method) => method.code === code)?.labelEn || zoneLabel(code);
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
              <span className="text-sm font-semibold">{label(code)}</span>
              <Input aria-label={`${label(code)} estimate (English)`} placeholder="2–3 days" maxLength={80} disabled={disabled} invalid={Boolean(error)} value={estimates[code]?.en ?? ''} onChange={(event) => set('en', event.target.value)} />
              <Input lang="bn" aria-label={`${label(code)} estimate (Bangla)`} placeholder="২–৩ দিন" maxLength={80} disabled={disabled} invalid={Boolean(error)} value={estimates[code]?.bn ?? ''} onChange={(event) => set('bn', event.target.value)} />
              {error ? <p role="alert" className="error md:col-span-3">{error}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
