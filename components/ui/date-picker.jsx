'use client';

import { forwardRef, useId, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingPanel, FloatingRoot, FloatingTrigger } from './floating';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function outputValue(date, withTime, previous) {
  if (!withTime) return isoDate(date);
  const old = parseDate(previous);
  const hours = old?.getHours() ?? 9;
  const minutes = old?.getMinutes() ?? 0;
  return `${isoDate(date)}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function dayStamp(date) { return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : null; }
function addMonths(date, amount) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
function monthsAgo(date, amount) { const target = addMonths(date, -amount); const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate(); return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay)); }
function startMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addDays(date, amount) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount); }
function startOfYear(date) { return new Date(date.getFullYear(), 0, 1); }
function startOfQuarter(date) { return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1); }

function monthGrid(view) {
  const first = startMonth(view);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatDate(value, locale = 'en', options = {}) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-BD', { day: '2-digit', month: 'short', year: 'numeric', ...options });
}

export function DatePicker({ id, 'aria-describedby': describedBy, value = '', onChange, placeholder = 'Select date', min, max, disabled, className, name, locale = 'en', withTime = false, invalid = false }) {
  const dialogId = useId();
  const selected = parseDate(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startMonth(selected || new Date()));
  const changeOpen = (next) => { if (next) setView(startMonth(selected || new Date())); setOpen(next); };
  const display = selected ? `${formatDate(selected, locale)}${withTime ? ` · ${selected.toLocaleTimeString(locale === 'bn' ? 'bn-BD' : 'en-BD', { hour: '2-digit', minute: '2-digit' })}` : ''}` : '';

  const choose = (date) => {
    onChange?.(outputValue(date, withTime, value));
    if (!withTime) setOpen(false);
  };

  return <FloatingRoot open={open} onOpenChange={changeOpen}><div className={cn('relative', className)}>
    {name ? <input type="hidden" name={name} value={value || ''} /> : null}
    <FloatingTrigger asChild><PickerTrigger id={id} describedBy={describedBy} open={open} disabled={disabled} invalid={invalid} dialogId={dialogId} empty={!selected} label={display || placeholder} /></FloatingTrigger>
    {open ? <FloatingPanel id={dialogId} aria-label="Choose a date" className="w-[min(22rem,calc(100vw-1.5rem))] rounded-xl p-4">
      <MonthCalendar view={view} onViewChange={setView} selectedStart={selected} min={parseDate(min)} max={parseDate(max)} onSelect={choose} />
      {withTime ? <div className="mt-3 flex items-end gap-3 border-t border-[var(--color-border)] pt-3"><label className="field flex-1"><span>Time</span><input type="time" value={String(value || '').match(/T(\d{2}:\d{2})/)?.[1] || '09:00'} onChange={(event) => onChange?.(`${isoDate(selected || new Date())}T${event.target.value}`)} /></label><button type="button" className="min-h-11 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)]" onClick={() => setOpen(false)}>Set date</button></div> : null}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs"><button type="button" className="font-semibold text-[var(--color-primary)]" onClick={() => choose(new Date())}>Today</button>{value ? <button type="button" className="text-[var(--color-muted)]" onClick={() => { onChange?.(''); setOpen(false); }}>Clear</button> : null}</div>
    </FloatingPanel> : null}
  </div></FloatingRoot>;
}

export function DateRangePicker({ id, 'aria-describedby': describedBy, value = { from: '', to: '' }, onChange, placeholder = 'Select date range', disabled, className, nameFrom, nameTo, locale = 'en', min, max, invalid = false }) {
  const dialogId = useId();
  const committed = { from: value?.from || '', to: value?.to || '' };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(committed);
  const initial = parseDate(committed.from) || new Date();
  const [view, setView] = useState(() => startMonth(initial));
  const changeOpen = (next) => { if (next) setDraft(committed); setOpen(next); };

  const from = parseDate(draft.from); const to = parseDate(draft.to);
  const label = committed.from ? `${formatDate(committed.from, locale)} — ${committed.to ? formatDate(committed.to, locale) : '…'}` : placeholder;

  const select = (date) => {
    const next = isoDate(date);
    if (!draft.from || draft.to || dayStamp(date) < dayStamp(from)) setDraft({ from: next, to: '' });
    else setDraft({ from: draft.from, to: next });
  };
  const apply = () => { if (!draft.from || !draft.to) return; onChange?.(draft); setOpen(false); };
  const preset = (getRange) => { const range = getRange(new Date()); setDraft({ from: isoDate(range.from), to: isoDate(range.to) }); setView(startMonth(range.from)); };

  return <FloatingRoot open={open} onOpenChange={changeOpen}><div className={cn('relative', className)}>
    {nameFrom ? <input type="hidden" name={nameFrom} value={committed.from} /> : null}{nameTo ? <input type="hidden" name={nameTo} value={committed.to} /> : null}
    <FloatingTrigger asChild><PickerTrigger id={id} describedBy={describedBy} open={open} disabled={disabled} invalid={invalid} dialogId={dialogId} empty={!committed.from} label={label} /></FloatingTrigger>
    {open ? <FloatingPanel id={dialogId} aria-label="Choose a date range" className="w-[min(58rem,calc(100vw-1.5rem))] rounded-xl">
      <div className="grid md:grid-cols-[170px_1fr]">
        <aside className="border-b border-[var(--color-border)] p-2 md:border-b-0 md:border-r"><p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--color-muted)]">Quick select</p><div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-1">{PRESETS.map((item) => { const range = item.range(new Date()); const active = draft.from === isoDate(range.from) && draft.to === isoDate(range.to); return <button key={item.label} type="button" aria-pressed={active} className={cn('rounded-lg px-3 py-2 text-left text-xs font-medium transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]', active && 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]')} onClick={() => preset(item.range)}>{item.label}</button>; })}</div></aside>
        <div><div className="grid gap-4 p-4 md:grid-cols-2"><MonthCalendar view={view} onViewChange={setView} selectedStart={from} selectedEnd={to} min={parseDate(min)} max={parseDate(max)} onSelect={select} /><MonthCalendar view={addMonths(view, 1)} onViewChange={(next) => setView(addMonths(next, -1))} selectedStart={from} selectedEnd={to} min={parseDate(min)} max={parseDate(max)} onSelect={select} /></div>
          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] p-4 sm:flex-row sm:items-center"><div className="flex flex-1 items-center gap-2"><DateReadout value={draft.from} label="Start date" /><span aria-hidden="true">→</span><DateReadout value={draft.to} label="End date" /></div><div className="flex justify-end gap-2"><button type="button" className="min-h-10 rounded-lg px-4 text-xs font-semibold hover:bg-[var(--color-surface-muted)]" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={!draft.from || !draft.to} className="min-h-10 rounded-lg bg-[var(--color-primary)] px-5 text-xs font-semibold text-[var(--color-on-primary)] disabled:opacity-40" onClick={apply}>Set dates</button></div></div>
        </div>
      </div>
    </FloatingPanel> : null}
  </div></FloatingRoot>;
}

const PickerTrigger = forwardRef(function PickerTrigger({ id, describedBy, open, disabled, invalid, dialogId, empty, label, ...rest }, ref) {
  // `id` lets a wrapping <Field> label name this control; a <button> is a labelable element.
  return <button {...rest} ref={ref} id={id} aria-describedby={describedBy} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={dialogId} data-invalid={invalid || undefined} className={cn('flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border bg-[var(--color-surface-raised)] px-3.5 text-left text-sm transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-50', invalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]', empty && 'text-[var(--color-muted)]')}><span className="truncate">{label}</span><CalendarDays size={16} className="shrink-0 text-[var(--color-muted)]" /></button>;
});

function MonthCalendar({ view, onViewChange, selectedStart, selectedEnd = null, min, max, onSelect }) {
  const days = useMemo(() => monthGrid(view), [view]);
  const start = dayStamp(selectedStart); const end = dayStamp(selectedEnd);
  return <section className="min-w-0"><div className="mb-3 flex items-center justify-between"><button type="button" aria-label="Previous month" className="grid size-9 place-items-center rounded-lg hover:bg-[var(--color-surface-muted)]" onClick={() => onViewChange(addMonths(view, -1))}><ChevronLeft size={17} /></button><h3 className="text-sm font-bold">{MONTHS[view.getMonth()]} {view.getFullYear()}</h3><button type="button" aria-label="Next month" className="grid size-9 place-items-center rounded-lg hover:bg-[var(--color-surface-muted)]" onClick={() => onViewChange(addMonths(view, 1))}><ChevronRight size={17} /></button></div><div className="grid grid-cols-7 text-center">{WEEKDAYS.map((day) => <span key={day} className="py-1 text-[10px] font-bold text-[var(--color-muted)]">{day}</span>)}{days.map((date) => { const stamp = dayStamp(date); const inMonth = date.getMonth() === view.getMonth(); const selected = stamp === start || stamp === end; const inRange = start != null && end != null && stamp > start && stamp < end; const blocked = (min && stamp < dayStamp(min)) || (max && stamp > dayStamp(max)); return <button key={isoDate(date)} type="button" disabled={blocked} aria-label={date.toLocaleDateString('en-US', { dateStyle: 'full' })} aria-pressed={selected} onClick={() => onSelect(date)} className={cn('relative grid h-9 place-items-center text-xs transition', !inMonth && 'text-[var(--color-muted)]/35', inRange && 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]', selected && 'rounded-lg bg-[var(--color-primary)] font-bold text-[var(--color-on-primary)]', !selected && !inRange && !blocked && 'rounded-lg hover:bg-[var(--color-surface-muted)]', blocked && 'cursor-not-allowed opacity-25')}>{date.getDate()}</button>; })}</div></section>;
}

function DateReadout({ value, label }) { return <div className="min-w-0 flex-1 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2"><span className="sr-only">{label}</span><span className="block truncate text-xs font-medium">{value || 'Select date'}</span></div>; }

const PRESETS = [
  { label: 'Last 7 days', range: (now) => ({ from: addDays(now, -6), to: now }) },
  { label: 'Last 14 days', range: (now) => ({ from: addDays(now, -13), to: now }) },
  { label: 'Last 30 days', range: (now) => ({ from: addDays(now, -29), to: now }) },
  { label: 'Last 3 months', range: (now) => ({ from: monthsAgo(now, 3), to: now }) },
  { label: 'Last 12 months', range: (now) => ({ from: monthsAgo(now, 12), to: now }) },
  { label: 'Month to date', range: (now) => ({ from: startMonth(now), to: now }) },
  { label: 'Quarter to date', range: (now) => ({ from: startOfQuarter(now), to: now }) },
  { label: 'Year to date', range: (now) => ({ from: startOfYear(now), to: now }) },
  { label: 'All time', range: (now) => ({ from: new Date(2016, 0, 1), to: now }) }
];
