'use client';

import { forwardRef, useEffect, useId, useRef } from 'react';
import * as RCheckbox from '@radix-ui/react-checkbox';
import * as RRadio from '@radix-ui/react-radio-group';
import * as RSwitch from '@radix-ui/react-switch';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Checkbox = forwardRef(function Checkbox({ className, checked, onCheckedChange, indeterminate, disabled, ...rest }, ref) {
  const value = indeterminate ? 'indeterminate' : checked === true;
  return (
    <RCheckbox.Root
      ref={ref}
      checked={value}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'group inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] transition data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)] data-[state=indeterminate]:border-[var(--color-primary)] data-[state=indeterminate]:bg-[var(--color-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...rest}
    >
      <RCheckbox.Indicator className="text-[var(--color-on-primary)]">
        {indeterminate ? <Minus className="h-3.5 w-3.5" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
});

export function CheckboxField({ label, description, error, className, id: providedId, ...checkboxProps }) {
  const generatedId = useId();
  const id = providedId || `checkbox-${generatedId}`;
  const describedBy = [description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 text-sm', checkboxProps.disabled && 'cursor-not-allowed opacity-60', className)}>
      <Checkbox
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        {...checkboxProps}
      />
      <span className="grid gap-0.5">
        <span className="font-semibold text-[var(--color-text)]">{label}</span>
        {description ? (
          <span id={`${id}-description`} className="text-xs text-[var(--color-muted)]">
            {description}
          </span>
        ) : null}
        {error ? (
          <span id={`${id}-error`} role="alert" className="error">
            {error}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export const RadioGroup = forwardRef(function RadioGroup({ className, orientation = 'vertical', ...rest }, ref) {
  return (
    <RRadio.Root
      ref={ref}
      orientation={orientation}
      className={cn('grid gap-2', orientation === 'horizontal' && 'flex flex-wrap gap-3', className)}
      {...rest}
    />
  );
});

export function RadioItem({ value, label, description, disabled, id: providedId }) {
  const generatedId = useId();
  const id = providedId || `radio-${generatedId}`;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-sm transition hover:border-[var(--color-border-strong)] has-[[data-state=checked]]:border-[var(--color-primary)] has-[[data-state=checked]]:bg-[var(--color-primary-soft)]', disabled && 'cursor-not-allowed opacity-60')}>
      <RRadio.Item id={id} value={value} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] text-[var(--color-primary)] focus:outline-none focus-visible:shadow-[var(--shadow-focus)] data-[state=checked]:border-[var(--color-primary)]">
        <RRadio.Indicator className="flex h-full w-full items-center justify-center after:h-2 after:w-2 after:rounded-full after:bg-[var(--color-primary)] after:content-['']" />
      </RRadio.Item>
      <span className="grid gap-0.5">
        <span className="font-semibold">{label}</span>
        {description ? <span className="text-xs text-[var(--color-muted)]">{description}</span> : null}
      </span>
    </label>
  );
}

export const Switch = forwardRef(function Switch({ className, ...rest }, ref) {
  return (
    <RSwitch.Root
      ref={ref}
      className={cn(
        'group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-[var(--color-border-strong)] transition data-[state=checked]:bg-[var(--color-primary)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...rest}
    >
      <RSwitch.Thumb className="pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-[var(--color-surface-raised)] shadow-sm transition-transform group-data-[state=checked]:bg-[var(--color-on-primary)] group-data-[state=checked]:translate-x-[1.4rem]" />
    </RSwitch.Root>
  );
});

export function SwitchField({ label, description, error, id: providedId, className, ...props }) {
  const generatedId = useId();
  const id = providedId || `switch-${generatedId}`;
  return (
    <div className={cn('flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3', className)}>
      <label htmlFor={id} className="grid gap-0.5 text-sm">
        <span className="font-semibold">{label}</span>
        {description ? <span id={`${id}-description`} className="text-xs text-[var(--color-muted)]">{description}</span> : null}
        {error ? <span id={`${id}-error`} role="alert" className="error">{error}</span> : null}
      </label>
      <Switch id={id} aria-describedby={[description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} aria-invalid={error ? 'true' : undefined} {...props} />
    </div>
  );
}

export function Slider({ value = 0, min = 0, max = 100, step = 1, onValueChange, label, id, disabled, className }) {
  const trackRef = useRef(null);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  function commit(clientX) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const next = min + ratio * (max - min);
    const snapped = Math.round(next / step) * step;
    onValueChange?.(Math.max(min, Math.min(max, snapped)));
  }
  useEffect(() => {
    function onMove(e) {
      if (e.buttons !== 1) return;
      commit(e.clientX);
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  });
  return (
    <div className={cn('grid gap-2', className)}>
      {label ? <label htmlFor={id} className="text-sm font-semibold">{label}</label> : null}
      <div
        ref={trackRef}
        role="slider"
        id={id}
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled || undefined}
        onMouseDown={(e) => commit(e.clientX)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onValueChange?.(Math.min(max, value + step));
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onValueChange?.(Math.max(min, value - step));
        }}
        className={cn('relative h-2 w-full rounded-full bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-surface-raised)] bg-[var(--color-primary)] shadow" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}
