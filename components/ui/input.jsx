'use client';

import { Children, cloneElement, forwardRef, isValidElement, useId } from 'react';
import { cn } from '@/lib/utils';

const baseInput =
  'flex w-full min-h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] transition duration-200 ease-out hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

export const Input = forwardRef(function Input({ className, invalid = false, inputMode, type = 'text', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      inputMode={inputMode}
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      className={cn(baseInput, invalid && 'border-[var(--color-danger)] focus:border-[var(--color-danger)]', className)}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, invalid = false, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      className={cn(baseInput, 'min-h-[7rem] resize-y', className)}
      {...rest}
    />
  );
});

/** @param {any} props */
export function Field(props) {
  const {
    label,
    hint,
    error,
    required = false,
    htmlFor,
    children,
    className,
    srLabel = false,
    trailing
  } = props;
  const autoId = useId();
  const id = htmlFor || `field-${autoId}`;
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const content = typeof children === 'function'
    ? children({ id, describedBy: messageId, invalid: Boolean(error) })
    : Children.map(children, (child, index) => {
        if (index !== 0 || !isValidElement(child)) return child;
        return cloneElement(child, {
          id: child.props.id || id,
          'aria-describedby': child.props['aria-describedby'] || messageId,
          invalid: child.props.invalid ?? Boolean(error)
        });
      });
  return (
    <div className={cn('field', className)} data-invalid={error ? 'true' : undefined}>
      {label ? (
        <label htmlFor={id} className={cn('text-sm font-semibold', srLabel && 'sr-only')}>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-[var(--color-danger)]">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="relative">
        {content}
        {trailing ? <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[var(--color-muted)]">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={messageId} role="alert" className="error">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-[var(--color-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/** @param {any} props */
export function FieldGroup(props) {
  const { children, className, columns = 1 } = props;
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}
