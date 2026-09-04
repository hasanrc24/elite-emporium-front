'use client';

import { MoreHorizontal, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, DropdownItem, DropdownMenuRoot, DropdownSeparator, IconButton, pushToast } from '@/components/ui';

/**
 * Three-dot "Action menu" — a primitive used everywhere in admin tables.
 * Pass an `actions` array of { label, onSelect, icon, destructive, separator? } items.
 */
export function ActionMenu({ actions = [], label = 'Open actions', align = 'end', sideOffset = 6 }) {
  return (
    <DropdownMenuRoot
      align={align}
      sideOffset={sideOffset}
      trigger={
        <IconButton
          icon={MoreHorizontal}
          label={label}
          variant="ghost"
          size="icon"
          aria-haspopup="menu"
        />
      }
    >
      {actions.map((action, i) => (
        action.separator ? (
          <DropdownSeparator key={`sep-${i}`} />
        ) : (
          <DropdownItem key={action.label} onSelect={action.onSelect} disabled={action.disabled} destructive={action.destructive}>
            {action.icon ? <action.icon className="h-4 w-4" aria-hidden="true" /> : null}
            <span>{action.label}</span>
          </DropdownItem>
        )
      ))}
    </DropdownMenuRoot>
  );
}

export function CopyButton({ value, label = 'Copy', className, successLabel = 'Copied' }) {
  const [done, setDone] = useState(false);
  async function onClick() {
    try {
      await navigator.clipboard.writeText(String(value ?? ''));
      setDone(true);
      pushToast({ tone: 'success', title: successLabel, duration: 1800 });
      setTimeout(() => setDone(false), 1500);
    } catch (error) {
      pushToast({ tone: 'error', title: 'Could not copy', description: error?.message });
    }
  }
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onClick} className={className}>
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span>{done ? successLabel : label}</span>
    </Button>
  );
}

export function Kbd({ children, className }) {
  return (
    <kbd className={cn('inline-flex items-center rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold text-[var(--color-text)]', className)}>
      {children}
    </kbd>
  );
}

export function Avatar({ name, src, size = 'md', className }) {
  const dims = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' }[size] || 'h-10 w-10 text-sm';
  const initials = (name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return <Image src={src} alt={name || 'avatar'} width={56} height={56} unoptimized className={cn('inline-block object-cover', dims, className)} />;
  }
  return (
    <span
      aria-hidden={name ? undefined : true}
      aria-label={name || undefined}
      className={cn('inline-grid place-items-center rounded-full bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-strong)]', dims, className)}
    >
      {initials}
    </span>
  );
}

export function Progress({ value = 0, max = 100, label, tone = 'primary', className }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tones = {
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]'
  };
  return (
    <div className={cn('grid gap-1', className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-muted)]">
          <span>{label}</span>
          <span data-numeric>{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className={cn('h-full transition-[width] duration-300', tones[tone] || tones.primary)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function FilterChip({ label, active = false, onSelect, onClear, count }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
      )}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={cn('rounded-full px-1.5 py-0.5 tabular-nums', active ? 'bg-white/20' : 'bg-[var(--color-surface-muted)]')}>{count}</span>
      ) : null}
      {onClear && active ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear filter"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-1 text-xs"
        >
          ×
        </span>
      ) : null}
    </button>
  );
}

export function Banner({ tone = 'info', title, children, action, onDismiss, className, icon: Icon }) {
  const tones = {
    info: 'border-[var(--color-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]',
    success: 'border-[color-mix(in_srgb,var(--color-success)_24%,white)] bg-[color-mix(in_srgb,var(--color-success)_7%,white)] text-[var(--color-success)]',
    warning: 'border-[color-mix(in_srgb,var(--color-warning)_24%,white)] bg-[color-mix(in_srgb,var(--color-warning)_7%,white)] text-[var(--color-warning)]',
    danger: 'border-[color-mix(in_srgb,var(--color-danger)_24%,white)] bg-[color-mix(in_srgb,var(--color-danger)_7%,white)] text-[var(--color-danger)]'
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-sm', tones[tone] || tones.info, className)}>
      {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : null}
      <div className="grid flex-1 gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="leading-6">{children}</div>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="self-start rounded-full p-1 hover:bg-black/5">×</button>
      ) : null}
    </div>
  );
}

export function StatTile({ label, value, trend, icon: Icon, className }) {
  const trendUp = typeof trend === 'number' ? trend >= 0 : null;
  return (
    <div className={cn('card flex items-start gap-3 p-5', className)}>
      {Icon ? (
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
        <p className="text-2xl font-black tracking-tight text-[var(--color-text)]" data-numeric>{value}</p>
        {trendUp !== null ? (
          <p className={cn('text-xs font-semibold', trendUp ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>
            {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Stepper({ steps = [], current = 0, className }) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-2 text-sm', className)} aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.label || i} className="flex items-center gap-2">
            <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', done && 'bg-[var(--color-success)] text-white', active && 'bg-[var(--color-primary)] text-white', !done && !active && 'bg-[var(--color-surface-muted)] text-[var(--color-muted)]')}>
              {done ? '✓' : i + 1}
            </span>
            <span className={cn('font-semibold', active ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]')}>{step.label}</span>
            {i < steps.length - 1 ? <span aria-hidden="true" className="h-px w-6 bg-[var(--color-border-strong)]" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
