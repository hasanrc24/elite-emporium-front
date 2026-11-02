'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef(function Card({ className, children, ...rest }, ref) {
  return (
    <div ref={ref} className={cn('card overflow-hidden', className)} {...rest}>
      {children}
    </div>
  );
});

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] px-6 py-5', className)}>
      <div className="grid gap-1">
        {title ? <h3 className="text-lg font-semibold tracking-[-.01em]">{title}</h3> : null}
        {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4', className)}>{children}</div>;
}

export function Separator({ className, orientation = 'horizontal' }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-[var(--color-border)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
    />
  );
}

export function Stack({ className, gap = 4, children, as: Tag = 'div' }) {
  return <Tag className={cn('flex flex-col', `gap-${gap}`, className)}>{children}</Tag>;
}

export function Row({ className, gap = 3, children, align = 'center', justify = 'start', wrap = false }) {
  return (
    <div
      className={cn(
        'flex',
        `gap-${gap}`,
        align === 'center' && 'items-center',
        align === 'start' && 'items-start',
        align === 'end' && 'items-end',
        justify === 'between' && 'justify-between',
        justify === 'end' && 'justify-end',
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', className, children }) {
  const tones = {
    neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-text)]',
    primary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]',
    success: 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]',
    warning: 'bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]',
    danger: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]',
    info: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]'
  };
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold uppercase tracking-wider', tones[tone] ?? tones.neutral, className)}>
      {children}
    </span>
  );
}