'use client';

import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { ImagePlus, Link2, Plus, Search, Trash2, X } from 'lucide-react';
import { Alert, Button, Field, IconButton, Input, RadioGroup, RadioItem, Spinner, Switch, Textarea } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { cn } from '@/lib/utils';
import { fieldDomId, getPath, isFieldHidden, isFieldInactive } from './settings-schema';

const affixShell = 'flex min-h-11 w-full items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] transition duration-200 ease-out hover:border-[var(--color-border-strong)] focus-within:border-[var(--color-primary)] focus-within:shadow-[var(--shadow-focus)]';
// Inner inputs drop the global input chrome (globals.css) so only the shell draws a border.
export const bareInput = 'min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3.5 py-2.5 text-base text-[var(--color-text)] shadow-none outline-none placeholder:text-[var(--color-muted)] hover:border-0 focus:border-0 focus:shadow-none disabled:cursor-not-allowed md:text-sm';
const affix = 'flex shrink-0 items-center bg-[var(--color-surface-muted)] px-3 text-sm font-medium text-[var(--color-muted)]';

/** Input with a fixed prefix or suffix (currency, units, URL stem). Accepts the props Field injects. */
export const AffixInput = forwardRef(function AffixInput({ prefix, suffix, invalid, className, disabled, ...rest }, ref) {
  return (
    <div className={cn(affixShell, invalid && 'border-[var(--color-danger)] focus-within:border-[var(--color-danger)]', disabled && 'cursor-not-allowed opacity-60', className)}>
      {prefix ? <span className={cn(affix, 'border-r border-[var(--color-border)]')} aria-hidden="true">{prefix}</span> : null}
      <input ref={ref} aria-invalid={invalid || undefined} disabled={disabled} className={bareInput} {...rest} />
      {suffix ? <span className={cn(affix, 'border-l border-[var(--color-border)]')} aria-hidden="true">{suffix}</span> : null}
    </div>
  );
});

function CharacterCount({ value = '', target, max }) {
  const length = value?.length || 0;
  return <span className={cn('text-xs tabular-nums', length > (max || Infinity) ? 'text-[var(--color-danger)]' : length > target ? 'text-[var(--color-warning)]' : 'text-[var(--color-muted)]')}>{length} / {target} recommended</span>;
}

export function ToggleRow({ id, label, description, checked, onChange, disabled, tone }) {
  const autoId = useId();
  const switchId = `${id || autoId}-switch`;
  return (
    <div className="flex items-start justify-between gap-6">
      <label htmlFor={switchId} className={cn('grid cursor-pointer gap-0.5', disabled && 'cursor-not-allowed opacity-60')}>
        <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
        {description ? <span id={`${switchId}-description`} className="text-[13px] leading-5 text-[var(--color-muted)]">{description}</span> : null}
      </label>
      <Switch
        id={switchId}
        checked={Boolean(checked)}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-describedby={description ? `${switchId}-description` : undefined}
        className={cn('mt-0.5', tone === 'danger' && 'data-[state=checked]:bg-[var(--color-danger)]')}
      />
    </div>
  );
}

/**
 * Renders a card's fields: toggles collect into a divided list, inputs into a two-column grid, in
 * schema order so related controls stay together.
 */
export function FieldList({ fields, values, errors, onChange, disabled }) {
  const blocks = [];
  for (const field of fields) {
    const value = values[field.group];
    if (isFieldHidden(field, value)) continue;
    const kind = field.type === 'toggle' ? 'toggles' : 'grid';
    if (blocks.at(-1)?.kind !== kind) blocks.push({ kind, fields: [] });
    blocks.at(-1).fields.push(field);
  }
  return (
    <div className="grid gap-6">
      {blocks.map((block, index) => (
        block.kind === 'toggles' ? (
          <div key={index} className="divide-y divide-[var(--color-border)]">
            {block.fields.map((field) => (
              <div key={`${field.group}:${field.path}`} id={fieldDomId(field.group, field.path)} className="settings-target py-4 first:pt-0 last:pb-0">
                <ToggleRow
                  id={fieldDomId(field.group, field.path)}
                  label={field.label}
                  description={field.description}
                  tone={field.tone}
                  checked={Boolean(getPath(values[field.group], field.path))}
                  disabled={disabled || isFieldInactive(field, values[field.group])}
                  onChange={(next) => onChange(field.group, field.path, Boolean(next))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div key={index} className="grid gap-x-5 gap-y-5 md:grid-cols-2">
            {block.fields.map((field) => (
              <div key={`${field.group}:${field.path}`} id={fieldDomId(field.group, field.path)} className={cn('settings-target min-w-0', (field.wide || ['localized', 'logo', 'links', 'products', 'tags', 'choice', 'textarea'].includes(field.type)) && 'md:col-span-2')}>
                <SettingField
                  field={field}
                  value={getPath(values[field.group], field.path)}
                  error={errors[field.group]?.[field.path]}
                  disabled={disabled || isFieldInactive(field, values[field.group])}
                  onChange={(next) => onChange(field.group, field.path, next)}
                />
              </div>
            ))}
          </div>
        )
      ))}
    </div>
  );
}

function SettingField({ field, value, error, disabled, onChange }) {
  const { type, label, description, placeholder } = field;
  if (type === 'localized') return <LocalizedField field={field} value={value} error={error} disabled={disabled} onChange={onChange} />;
  if (type === 'logo') return <LogoField value={value} disabled={disabled} onChange={onChange} />;
  if (type === 'wallets') return <WalletsField field={field} value={value || []} error={error} disabled={disabled} onChange={onChange} />;
  if (type === 'links') return <LinksField field={field} value={value || []} error={error} disabled={disabled} onChange={onChange} />;
  if (type === 'products') return <ProductsField field={field} value={value || []} error={error} disabled={disabled} onChange={onChange} />;
  if (type === 'tags') return <TagsField field={field} value={value || []} error={error} disabled={disabled} onChange={onChange} />;
  if (type === 'choice') {
    return (
      <fieldset className="grid content-start gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold">{label}</legend>
        <RadioGroup value={value ?? field.options[0].value} onValueChange={onChange} className={cn('grid gap-2', field.options.length > 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')} aria-label={label}>
          {field.options.map((option) => <RadioItem key={option.value} value={option.value} label={option.label} description={option.description} disabled={disabled} />)}
        </RadioGroup>
      </fieldset>
    );
  }
  if (type === 'textarea') {
    return (
      <Field label={label} hint={description} error={error}>
        <Textarea rows={3} value={value ?? ''} placeholder={placeholder} disabled={disabled} maxLength={field.max} onChange={(event) => onChange(event.target.value)} />
        {field.counter ? <div className="mt-1 flex justify-end"><CharacterCount value={value} target={field.counter} max={field.max} /></div> : null}
      </Field>
    );
  }
  if (type === 'number') {
    return (
      <Field label={label} hint={description || rangeHint(field)} error={error}>
        <AffixInput
          inputMode="numeric"
          suffix={field.suffix}
          value={value ?? ''}
          disabled={disabled}
          placeholder={value === undefined ? 'Default' : undefined}
          onChange={(event) => {
            const raw = event.target.value.replace(/[^\d-]/g, '');
            onChange(raw === '' ? null : Number(raw));
          }}
        />
      </Field>
    );
  }
  if (type === 'money') {
    return (
      <Field label={label} hint={description} error={error}>
        <AffixInput prefix="৳" suffix="BDT" inputMode="decimal" value={value ?? ''} disabled={disabled} placeholder="0.00" onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))} />
      </Field>
    );
  }
  if (type === 'percent') {
    return (
      <Field label={label} hint={description} error={error}>
        <AffixInput suffix="%" inputMode="decimal" value={value ?? ''} disabled={disabled} placeholder="15" onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))} />
      </Field>
    );
  }
  const inputType = { email: 'email', url: 'url', tel: 'tel' }[type] || 'text';
  const transform = (raw) => {
    const next = field.uppercase ? raw.toUpperCase() : raw;
    return field.nullable && next === '' ? null : next;
  };
  return (
    <Field label={label} hint={description} error={error}>
      {field.prefix ? (
        <AffixInput prefix={field.prefix} value={value ?? ''} disabled={disabled} placeholder={placeholder} maxLength={field.max} onChange={(event) => onChange(transform(event.target.value))} />
      ) : (
        <Input type={inputType} value={value ?? ''} disabled={disabled} placeholder={placeholder} maxLength={field.max} autoComplete="off" spellCheck={type === 'text' ? undefined : false} onChange={(event) => onChange(transform(event.target.value))} />
      )}
      {field.counter ? <div className="mt-1 flex justify-end"><CharacterCount value={value} target={field.counter} max={field.max} /></div> : null}
    </Field>
  );
}

function rangeHint(field) {
  if (field.min === undefined || field.max === undefined) return undefined;
  return `Between ${field.min.toLocaleString('en-US')} and ${field.max.toLocaleString('en-US')}.`;
}

function LocalizedField({ field, value, error, disabled, onChange }) {
  const Control = field.textarea ? Textarea : AffixInput;
  const id = useId();
  return (
    <fieldset className="grid content-start gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">{field.label}{field.required ? <span aria-hidden="true" className="ml-0.5 text-[var(--color-danger)]">*</span> : null}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {[['en', 'English', 'EN'], ['bn', 'Bangla', 'বাংলা']].map(([locale, name, tag]) => (
          <div key={locale} className="grid gap-1.5">
            {field.textarea ? <label htmlFor={`${id}-${locale}`} className="text-xs font-semibold text-[var(--color-muted)]">{name}</label> : null}
            <Control
              id={`${id}-${locale}`}
              lang={locale}
              rows={field.textarea ? 2 : undefined}
              prefix={field.textarea ? undefined : tag}
              aria-label={`${field.label} (${name})`}
              invalid={Boolean(error) && !value?.[locale]?.trim() ? true : undefined}
              maxLength={field.max}
              value={value?.[locale] ?? ''}
              onChange={(event) => onChange({ ...(value || {}), [locale]: event.target.value })}
            />
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="error">{error}</p> : null}
    </fieldset>
  );
}

function TagsField({ field, value, error, disabled, onChange }) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const add = () => {
    const items = draft.split(',').map((item) => item.trim()).filter(Boolean);
    if (items.length) onChange([...new Set([...value, ...items])]);
    setDraft('');
  };
  return (
    <Field label={field.label} hint={field.description} error={error} htmlFor={id}>
      {() => (
        <div className={cn(affixShell, 'flex-wrap items-center gap-1.5 p-1.5', error && 'border-[var(--color-danger)]', disabled && 'opacity-60')}>
          {value.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] py-1 pl-2.5 pr-1 font-mono text-xs">
              {item}
              <button type="button" disabled={disabled} className="rounded-full p-0.5 hover:bg-[var(--color-primary-soft)]" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((entry) => entry !== item))}><X size={12} /></button>
            </span>
          ))}
          <input
            id={id}
            value={draft}
            disabled={disabled}
            placeholder={value.length ? 'Add another…' : 'Type and press Enter'}
            className={cn(bareInput, 'min-w-[10rem] px-2 py-1.5')}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={add}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(); }
              if (event.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
            }}
          />
        </div>
      )}
    </Field>
  );
}

const WALLET_PROVIDERS = [['bkash', 'bKash'], ['nagad', 'Nagad'], ['rocket', 'Rocket'], ['upay', 'Upay']];

/** One receiving number per wallet; an empty number drops that wallet from the saved list. */
function WalletsField({ field, value, error, disabled, onChange }) {
  const byProvider = Object.fromEntries(value.map((item) => [item.provider, item]));
  const update = (provider, patch) => {
    const next = { provider, number: '', accountType: 'personal', ...byProvider[provider], ...patch };
    const rest = value.filter((item) => item.provider !== provider);
    // Keep a row while the number is being typed so the input does not lose focus.
    onChange(next.number === '' && patch.number !== undefined ? rest : [...rest, next]);
  };
  return (
    <fieldset className="grid content-start gap-3" disabled={disabled}>
      <legend className="mb-1 text-sm font-semibold">{field.label}</legend>
      {field.description ? <p className="-mt-1 text-xs text-[var(--color-muted)]">{field.description}</p> : null}
      <ul className="grid gap-2">
        {WALLET_PROVIDERS.map(([provider, name]) => (
          <li key={provider} className="grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)_150px] sm:items-center">
            <span className="text-sm font-medium">{name}</span>
            <Input aria-label={`${name} number`} inputMode="tel" placeholder="01XXXXXXXXX" maxLength={20} value={byProvider[provider]?.number || ''} onChange={(event) => update(provider, { number: event.target.value })} />
            <select aria-label={`${name} account type`} className="input" value={byProvider[provider]?.accountType || 'personal'} disabled={!byProvider[provider]} onChange={(event) => update(provider, { accountType: event.target.value })}>
              <option value="personal">Personal</option><option value="agent">Agent</option><option value="merchant">Merchant</option>
            </select>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="error">{error}</p> : null}
    </fieldset>
  );
}

function LinksField({ field, value, error, disabled, onChange }) {
  const update = (index, patch) => onChange(value.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  return (
    <fieldset className="grid content-start gap-3" disabled={disabled}>
      <legend className="mb-1 text-sm font-semibold">{field.label}</legend>
      {field.description ? <p className="-mt-1 text-xs text-[var(--color-muted)]">{field.description}</p> : null}
      {value.length ? (
        <ul className="grid gap-2">
          {value.map((item, index) => (
            <li key={index} className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
              <Input aria-label={`Link ${index + 1} name`} placeholder="Facebook" maxLength={80} value={item.label} onChange={(event) => update(index, { label: event.target.value })} />
              <AffixInput aria-label={`Link ${index + 1} address`} prefix={<Link2 size={15} />} type="url" placeholder="https://facebook.com/yourpage" value={item.url} onChange={(event) => update(index, { url: event.target.value.trim() })} />
              <IconButton icon={Trash2} label={`Remove link ${index + 1}`} variant="ghost" onClick={() => onChange(value.filter((_, position) => position !== index))} />
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      <div>
        <Button size="sm" variant="secondary" disabled={disabled || value.length >= (field.max || 20)} onClick={() => onChange([...value, { label: '', url: '' }])}><Plus size={15} />Add link</Button>
      </div>
    </fieldset>
  );
}

const productName = (product) => product?.translations?.en?.name || product?.name || product?.slug;

export function ProductsField({ field, value, error, disabled, onChange }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const id = useId();
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const names = useQueries({
    queries: value.map((productId) => ({
      queryKey: ['admin', 'product-name', productId],
      queryFn: () => browserApi.get(`/admin/products/${productId}`).then((response) => productName(response.data.data)),
      staleTime: 5 * 60_000,
      retry: false
    }))
  });
  const results = useQuery({
    queryKey: ['admin-product-picker', term],
    enabled: term.length >= 2,
    queryFn: () => browserApi.get('/admin/products', { params: { search: term, pageSize: 8 } }).then((response) => response.data.data)
  });
  const chosen = new Set(value);
  const options = (results.data || []).filter((item) => !chosen.has(item.id) && !item.archivedAt);
  return (
    <div className={cn('grid gap-3', disabled && 'opacity-60')}>
      <Field label={field.label} hint={field.description} error={error} htmlFor={id}>
        <AffixInput id={id} prefix={<Search size={15} />} value={search} disabled={disabled} placeholder="Search products by name or SKU" onChange={(event) => setSearch(event.target.value)} />
      </Field>
      {term.length >= 2 && !disabled ? (
        <ul className="grid max-h-64 gap-0.5 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-[var(--shadow-sm)]" aria-live="polite">
          {results.isLoading ? <li className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-muted)]"><Spinner className="h-3 w-3" />Searching…</li> : null}
          {results.error ? <li className="px-3 py-2 text-xs text-[var(--color-danger)]">Search failed. Try again.</li> : null}
          {!results.isLoading && !results.error && !options.length ? <li className="px-3 py-2 text-xs text-[var(--color-muted)]">No matching products.</li> : null}
          {options.map((item) => (
            <li key={item.id}>
              <button type="button" className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-primary-soft)]" onClick={() => { onChange([...value, item.id]); setSearch(''); }}>
                <span className="truncate">{productName(item)}</span>
                <Plus size={15} className="shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((productId, index) => {
            const name = names[index]?.data;
            return (
              <li key={productId} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] py-1 pl-3 pr-1 text-xs font-semibold">
                <span className="truncate">{names[index]?.isLoading ? 'Loading…' : name || <span className="font-mono font-normal">{productId}</span>}</span>
                <button type="button" disabled={disabled} className="rounded-full p-1 hover:bg-[var(--color-primary-soft)]" aria-label={`Remove ${name || productId}`} onClick={() => onChange(value.filter((entry) => entry !== productId))}><X size={13} /></button>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-xs text-[var(--color-muted)]">Every product can be returned.</p>}
    </div>
  );
}

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

function LogoField({ value, disabled, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [typeError, setTypeError] = useState('');
  const upload = useMutation({
    mutationFn: (file) => {
      const data = new FormData();
      data.append('file', file);
      data.append('privacy', 'public');
      data.append('altText', value?.altText || 'Store logo');
      return browserApi.post('/admin/media/upload', data).then((response) => response.data.data);
    },
    onSuccess: (asset) => onChange({ mediaId: asset.id, url: asset.url, altText: value?.altText || asset.altText || null })
  });
  const pick = (file) => {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { setTypeError('Use a JPG, PNG, WebP or AVIF image.'); return; }
    setTypeError('');
    upload.mutate(file);
  };
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold">Logo</span>
      <div className="grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-start">
        <button
          type="button"
          disabled={disabled || upload.isPending}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files?.[0]); }}
          className={cn('group relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-3 transition hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]', dragging && 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]')}
          aria-label={value?.url ? 'Replace logo' : 'Upload logo'}
        >
          {upload.isPending ? <Spinner label="Uploading logo" /> : value?.url ? (
            <Image src={value.url} alt={value.altText || 'Store logo'} width={176} height={110} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="grid justify-items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]"><ImagePlus size={22} aria-hidden="true" />Drop or click to upload</span>
          )}
        </button>
        <div className="grid gap-3">
          <p className="text-[13px] leading-5 text-[var(--color-muted)]">Use a PNG or WebP with a transparent background, at least 400px wide. It appears in the storefront header, emails and invoices.</p>
          <Field label="Alt text" hint="Describes the logo for screen readers.">
            <Input value={value?.altText || ''} disabled={disabled || !value} maxLength={500} placeholder="Store name logo" onChange={(event) => onChange({ ...value, altText: event.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={disabled} loading={upload.isPending} onClick={() => inputRef.current?.click()}><ImagePlus size={15} />{value?.url ? 'Replace' : 'Upload'}</Button>
            {value ? <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(null)}><Trash2 size={15} />Remove</Button> : null}
          </div>
          {typeError || upload.error ? <Alert tone="error">{typeError || apiMessage(upload.error, 'The logo could not be uploaded.')}</Alert> : null}
        </div>
      </div>
      <input ref={inputRef} type="file" hidden accept={LOGO_TYPES.join(',')} onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
    </div>
  );
}
