'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NativeSelect = forwardRef(function NativeSelect({ className, invalid, options = [], placeholder, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] bg-[length:1rem_1rem] bg-[right_.75rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-[var(--color-text)] transition focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none',
        invalid && 'border-[var(--color-danger)]',
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2365706d' stroke-width='1.6'><path d='M5 8l5 5 5-5'/></svg>\")"
      }}
      {...rest}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

export function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'No matches',
  disabled,
  className,
  invalid,
  name,
  clearable = true
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find((o) => o.value === value);

  function commit(option) {
    onChange?.(option.value, option);
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 text-sm text-left transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          invalid && 'border-[var(--color-danger)]',
          !selected && 'text-[var(--color-muted)]'
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <span className="flex items-center gap-1">
          {clearable && selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(null);
              }}
              className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div role="dialog" className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]">
          <div className="border-b border-[var(--color-border)] p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={searchPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(0, i - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered[activeIndex]) commit(filtered[activeIndex]);
                } else if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-muted)]">{emptyMessage}</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(opt)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm',
                    i === activeIndex && 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]',
                    opt.value === value && 'font-semibold text-[var(--color-primary-strong)]'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.description ? <span className="text-xs text-[var(--color-muted)]">{opt.description}</span> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = 'Select items…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  disabled,
  className,
  invalid,
  max
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selectedSet = new Set(value);
  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  function toggle(option) {
    const next = new Set(selectedSet);
    if (next.has(option.value)) next.delete(option.value);
    else {
      if (typeof max === 'number' && next.size >= max) return;
      next.add(option.value);
    }
    onChange?.(Array.from(next));
  }

  function clear() {
    onChange?.([]);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1.5 text-left text-sm transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          invalid && 'border-[var(--color-danger)]'
        )}
      >
        {value.length === 0 ? (
          <span className="px-1 text-[var(--color-muted)]">{placeholder}</span>
        ) : (
          value.slice(0, 4).map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary-strong)]">
                {opt?.label || v}
                <button
                  type="button"
                  aria-label={`Remove ${opt?.label || v}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle({ value: v });
                  }}
                  className="rounded-full p-0.5 hover:bg-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            );
          })
        )}
        {value.length > 4 ? <span className="text-xs text-[var(--color-muted)]">+{value.length - 4} more</span> : null}
        <span className="ml-auto flex items-center gap-1">
          {value.length > 0 ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear all"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div role="dialog" className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]">
          <div className="border-b border-[var(--color-border)] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-muted)]">{emptyMessage}</li>
            ) : (
              filtered.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(opt)}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-primary-soft)]"
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-[5px] border',
                        checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border-strong)] bg-white'
                      )}
                      aria-hidden="true"
                    >
                      {checked ? '✓' : ''}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}