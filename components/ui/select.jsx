'use client';

import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function useOutsideDismiss(open, setOpen, rootRef) {
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open, rootRef, setOpen]);
}

function optionLabel(option) { return option?.label ?? String(option?.value ?? ''); }

function OptionContent({ option }) {
  return <span className="flex min-w-0 flex-1 items-center gap-2.5">{option.icon ? <span className="grid size-5 shrink-0 place-items-center">{option.icon}</span> : option.color ? <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} /> : null}<span className="min-w-0"><span className="block truncate">{optionLabel(option)}</span>{option.description ? <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted)]">{option.description}</span> : null}</span></span>;
}

function SelectTrigger({ open, disabled, invalid, placeholder, selected, onClick, listboxId, count, className, triggerRef, ...rest }) {
  return <button ref={triggerRef} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} data-invalid={invalid || undefined} onClick={onClick} className={cn('flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] border bg-[var(--color-surface-raised)] px-3.5 text-left text-sm transition hover:border-[var(--color-border-strong)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-55', open && 'border-[var(--color-primary)] shadow-[var(--shadow-focus)]', invalid && '!border-[var(--color-danger)]', !selected && 'text-[var(--color-muted)]', className)} {...rest}><span className="min-w-0 flex-1 truncate">{selected || placeholder}</span>{count > 0 ? <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">{count}</span> : null}<ChevronDown size={16} aria-hidden="true" className={cn('shrink-0 text-[var(--color-muted)] transition-transform', open && 'rotate-180')} /></button>;
}

function Menu({ id, children, className }) {
  return <div id={id} role="listbox" className={cn('absolute inset-x-0 z-[60] mt-2 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]', className)}>{children}</div>;
}

export const Select = forwardRef(function Select({ className, invalid, options = [], placeholder = 'Select…', value, defaultValue = '', onChange, disabled, name, required, ...rest }, forwardedRef) {
  const rootRef = useRef(null); const listboxId = useId();
  const [open, setOpen] = useState(false); const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const selected = options.find((option) => option.value === current);
  useOutsideDismiss(open, setOpen, rootRef);
  const choose = (option) => { if (option.disabled) return; if (value === undefined) setInternal(option.value); onChange?.({ target: { value: option.value, name } }); setOpen(false); };
  const onKeyDown = (event) => { if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const enabled = options.filter((option) => !option.disabled); if (!enabled.length) return; const index = enabled.findIndex((option) => option.value === current); if (event.key === 'Home') choose(enabled[0]); else if (event.key === 'End') choose(enabled.at(-1)); else choose(enabled[(index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]); };
  return <div ref={rootRef} className="relative">{name ? <input type="hidden" name={name} value={current ?? ''} required={required} /> : null}<SelectTrigger {...rest} className={className} triggerRef={forwardedRef} onKeyDown={onKeyDown} open={open} disabled={disabled} invalid={invalid} placeholder={placeholder} selected={selected ? optionLabel(selected) : ''} listboxId={listboxId} onClick={() => setOpen((next) => !next)} />{open ? <Menu id={listboxId}><ul className="max-h-64 overflow-y-auto py-1">{options.map((option) => { const active = option.value === current; return <li key={String(option.value)} role="option" aria-selected={active} aria-disabled={option.disabled || undefined} onClick={() => choose(option)} className={cn('flex min-h-11 cursor-pointer items-center gap-3 px-3.5 py-2 text-sm transition hover:bg-[var(--color-surface-muted)]', active && 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]', option.disabled && 'cursor-not-allowed opacity-45')}><OptionContent option={option} />{active ? <Check size={16} className="shrink-0 text-[var(--color-primary)]" /> : null}</li>; })}</ul></Menu> : null}</div>;
});

export const NativeSelect = Select;

export function Combobox({ value, onChange, options = [], placeholder = 'Select…', searchPlaceholder = 'Type to search…', emptyMessage = 'No matches', disabled, className, invalid, name, clearable = true, ...triggerProps }) {
  const rootRef = useRef(null); const inputRef = useRef(null); const listboxId = useId();
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [activeIndex, setActiveIndex] = useState(0);
  useOutsideDismiss(open, setOpen, rootRef);
  const filtered = useMemo(() => query ? options.filter((option) => optionLabel(option).toLowerCase().includes(query.toLowerCase())) : options, [options, query]);
  const selected = options.find((option) => option.value === value);
  const commit = (option) => { if (!option || option.disabled) return; onChange?.(option.value, option); setOpen(false); setQuery(''); setActiveIndex(0); };
  const toggle = () => { setOpen((next) => !next); setTimeout(() => inputRef.current?.focus(), 0); };
  return <div ref={rootRef} className={cn('relative', className)}>{name ? <input type="hidden" name={name} value={value ?? ''} /> : null}<SelectTrigger {...triggerProps} open={open} disabled={disabled} invalid={invalid} placeholder={placeholder} selected={selected ? optionLabel(selected) : ''} listboxId={listboxId} onClick={toggle} />{open ? <Menu id={listboxId}><div className="border-b border-[var(--color-border)] p-2"><label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 focus-within:border-[var(--color-primary)]"><Search size={14} className="text-[var(--color-muted)]" /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(filtered.length - 1, index + 1)); } else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); } else if (event.key === 'Enter') { event.preventDefault(); commit(filtered[activeIndex]); } }} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div><ul className="max-h-64 overflow-y-auto py-1">{clearable && selected ? <li role="option" aria-selected="false" onClick={() => { onChange?.(null); setOpen(false); }} className="cursor-pointer px-3.5 py-2 text-xs font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]">Clear selection</li> : null}{filtered.length ? filtered.map((option, index) => { const active = option.value === value; return <li key={String(option.value)} role="option" aria-selected={active} onMouseEnter={() => setActiveIndex(index)} onClick={() => commit(option)} className={cn('flex min-h-11 cursor-pointer items-center gap-3 px-3.5 py-2 text-sm', index === activeIndex && 'bg-[var(--color-surface-muted)]', active && 'text-[var(--color-primary-strong)]')}><OptionContent option={option} />{active ? <Check size={16} className="shrink-0 text-[var(--color-primary)]" /> : null}</li>; }) : <li className="px-3.5 py-4 text-center text-sm text-[var(--color-muted)]">{emptyMessage}</li>}</ul></Menu> : null}</div>;
}

export function MultiSelect({ value = [], onChange, options = [], placeholder = 'Select items…', searchPlaceholder = 'Search…', emptyMessage = 'No matches', disabled, className, invalid, max, name, ...triggerProps }) {
  const rootRef = useRef(null); const inputRef = useRef(null); const listboxId = useId();
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  useOutsideDismiss(open, setOpen, rootRef);
  const selectedSet = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => query ? options.filter((option) => optionLabel(option).toLowerCase().includes(query.toLowerCase())) : options, [options, query]);
  const toggleOption = (option) => { if (option.disabled) return; const next = new Set(selectedSet); if (next.has(option.value)) next.delete(option.value); else { if (typeof max === 'number' && next.size >= max) return; next.add(option.value); } onChange?.([...next]); };
  const selectedLabel = value.length === 1 ? optionLabel(options.find((option) => option.value === value[0]) || { value: value[0] }) : value.length > 1 ? `${value.length} selected` : '';
  return <div ref={rootRef} className={cn('relative', className)}>{name ? value.map((item) => <input key={String(item)} type="hidden" name={name} value={item} />) : null}<SelectTrigger {...triggerProps} open={open} disabled={disabled} invalid={invalid} placeholder={placeholder} selected={selectedLabel} count={value.length > 1 ? value.length : 0} listboxId={listboxId} onClick={() => { setOpen((next) => !next); setTimeout(() => inputRef.current?.focus(), 0); }} />{open ? <Menu id={listboxId} className="min-w-56"><div className="border-b border-[var(--color-border)] p-2"><label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 focus-within:border-[var(--color-primary)]"><Search size={14} className="text-[var(--color-muted)]" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div><ul role="presentation" className="max-h-64 overflow-y-auto py-1">{filtered.length ? filtered.map((option) => { const checked = selectedSet.has(option.value); return <li key={String(option.value)} role="option" aria-selected={checked} aria-disabled={option.disabled || undefined} onClick={() => toggleOption(option)} className={cn('flex min-h-11 cursor-pointer items-center gap-3 px-3.5 py-2 text-sm hover:bg-[var(--color-surface-muted)]', checked && 'bg-[var(--color-primary-soft)]', option.disabled && 'cursor-not-allowed opacity-45')}><span className={cn('grid size-5 shrink-0 place-items-center rounded-[5px] border', checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]')}>{checked ? <Check size={13} /> : null}</span><OptionContent option={option} /></li>; }) : <li className="px-3.5 py-4 text-center text-sm text-[var(--color-muted)]">{emptyMessage}</li>}</ul></Menu> : null}</div>;
}
