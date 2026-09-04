'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MS_DAY = 86_400_000;

function toIso(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(year, month) {
  return new Date(year, month, 1);
}

function buildGrid(date) {
  const first = startOfMonth(date.getFullYear(), date.getMonth());
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DatePicker({ value, onChange, placeholder = 'Select date', min, max, disabled, className, name, locale = 'en' }) {
  const containerRef = useRef(null);
  const initial = value ? new Date(value) : new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  useEffect(() => {
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selected = value ? new Date(value) : null;
  const minDate = min ? new Date(min) : null;
  const maxDate = max ? new Date(max) : null;
  const display = selected ? selected.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-BD', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  function pick(d) {
    if (minDate && d < minDate) return;
    if (maxDate && d > maxDate) return;
    onChange?.(toIso(d));
    setOpen(false);
  }

  function shift(delta) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={value || ''} /> : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={cn('flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 text-sm transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60', !value && 'text-[var(--color-muted)]')}
      >
        <span className="truncate">{display || placeholder}</span>
        <CalendarIcon className="h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
      </button>
      {open ? (
        <div role="dialog" className="absolute left-0 right-0 z-50 mt-1 w-72 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 shadow-[var(--shadow-md)]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded-full p-1 hover:bg-[var(--color-surface-muted)]">‹</button>
            <p className="text-sm font-semibold">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </p>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded-full p-1 hover:bg-[var(--color-surface-muted)]">›</button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold uppercase text-[var(--color-muted)]">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {buildGrid(view).map((d, i) => {
              const inMonth = d.getMonth() === view.getMonth();
              const isSelected = selected && Math.abs(d - selected) < MS_DAY;
              const disabledDay = (minDate && d < minDate) || (maxDate && d > maxDate);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => pick(d)}
                  className={cn(
                    'grid h-9 place-items-center rounded-[calc(var(--radius-sm)-.25rem)] text-sm transition',
                    !inMonth && 'text-[var(--color-muted)]/40',
                    isSelected && 'bg-[var(--color-primary)] text-white',
                    !isSelected && !disabledDay && 'hover:bg-[var(--color-primary-soft)]',
                    disabledDay && 'cursor-not-allowed opacity-40'
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <button type="button" onClick={() => pick(new Date())} className="font-semibold text-[var(--color-primary)]">Today</button>
            {value ? (
              <button type="button" onClick={() => { onChange?.(''); setOpen(false); }} className="text-[var(--color-muted)]">Clear</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}