'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function OTPInput({ length = 6, value = '', onChange, autoFocus = true, className, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setDigit(i, char) {
    const next = digits.slice();
    next[i] = char;
    const merged = next.join('').slice(0, length);
    onChange?.(merged);
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKey(i, e) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        setDigit(i, '');
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        setDigit(i - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (text) {
      e.preventDefault();
      onChange?.(text);
      const last = Math.min(text.length - 1, length - 1);
      refs.current[last]?.focus();
    }
  }

  return (
    <div className={cn('flex gap-2', className)} role="group" aria-label="One-time code" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={digits[i]}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            setDigit(i, ch);
          }}
          onKeyDown={(e) => handleKey(i, e)}
          className={cn(
            'h-12 w-10 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-center text-lg font-semibold tracking-widest text-[var(--color-text)] focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none',
            invalid && 'border-[var(--color-danger)]'
          )}
        />
      ))}
    </div>
  );
}

export function QuantitySelector({ value = 1, onChange, min = 1, max = 99, disabled, className, label = 'Quantity' }) {
  function clamp(n) {
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }
  return (
    <div className={cn('inline-flex items-stretch overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]', className)} aria-label={label}>
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        onClick={() => onChange?.(clamp(value - 1))}
        className="grid h-11 w-11 place-items-center text-lg font-semibold transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        −
      </button>
      <input
        key={value}
        type="text"
        inputMode="numeric"
        aria-label={label}
        defaultValue={value}
        onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ''); }}
        onBlur={(e) => onChange?.(clamp(Number(e.currentTarget.value)))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onChange?.(clamp(Number(e.currentTarget.value)));
          }
        }}
        className="h-11 w-12 border-x border-[var(--color-border)] bg-transparent text-center text-sm font-semibold focus:outline-none"
      />
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => onChange?.(clamp(value + 1))}
        className="grid h-11 w-11 place-items-center text-lg font-semibold transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

export function FileUpload({ label, accept, multiple = false, onFiles, disabled, className, hint, error }) {
  const ref = useRef(null);
  const [files, setFiles] = useState([]);
  function onChange(e) {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    onFiles?.(list);
  }
  return (
    <div className={cn('grid gap-2', className)}>
      {label ? <label className="text-sm font-semibold">{label}</label> : null}
      <label
        className={cn(
          'flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-6 text-center text-sm text-[var(--color-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        <input
          ref={ref}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <span className="font-semibold text-[var(--color-text)]">Click to upload or drop files</span>
        {hint ? <span className="text-xs">{hint}</span> : null}
      </label>
      {files.length > 0 ? (
        <ul className="grid gap-1 text-xs text-[var(--color-muted)]">
          {files.map((f) => (
            <li key={f.name} className="truncate">
              • {f.name} ({Math.round(f.size / 1024)} KB)
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
    </div>
  );
}
