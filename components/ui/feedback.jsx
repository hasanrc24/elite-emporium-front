'use client';

import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  info: { cls: 'border-[var(--color-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]', Icon: Info },
  success: { cls: 'border-[color-mix(in_srgb,var(--color-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_7%,transparent)] text-[var(--color-success)]', Icon: CheckCircle2 },
  warning: { cls: 'border-[color-mix(in_srgb,var(--color-warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_7%,transparent)] text-[var(--color-warning)]', Icon: AlertTriangle },
  error: { cls: 'border-[color-mix(in_srgb,var(--color-danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_7%,transparent)] text-[var(--color-danger)]', Icon: AlertCircle }
};

export function Alert({ tone = 'info', title, children, action, className, icon: IconOverride, role }) {
  const config = TONES[tone] || TONES.info;
  const Icon = IconOverride || config.Icon;
  return (
    <div
      role={role || (tone === 'error' ? 'alert' : 'status')}
      className={cn('flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-sm', config.cls, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="grid flex-1 gap-1">
        {title ? <p className="font-semibold leading-5">{title}</p> : null}
        <div className="leading-6">{children}</div>
      </div>
      {action ? <div className="ml-2 flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function InlineError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-xs font-semibold text-[var(--color-danger)]">
      {children}
    </p>
  );
}

export function Skeleton({ className, rounded = 'sm' }) {
  return <div aria-hidden="true" className={cn('skeleton', rounded === 'full' && 'rounded-full', rounded === 'lg' && 'rounded-[var(--radius-lg)]', rounded === 'sm' && 'rounded-[var(--radius-sm)]', className)} />;
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="grid max-w-md gap-3 text-center">
        {Icon ? <Icon className="mx-auto h-10 w-10 text-[var(--color-muted)]" aria-hidden="true" /> : null}
        {title ? <p className="text-base font-semibold text-[var(--color-text)]">{title}</p> : null}
        {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
        {action ? <div className="mx-auto mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({ title, description, action, requestId, className }) {
  return (
    <div className={cn('empty-state', className)}>
      <div className="grid max-w-md gap-3 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-[var(--color-danger)]" aria-hidden="true" />
        {title ? <p className="text-base font-semibold text-[var(--color-text)]">{title}</p> : null}
        {description ? <p className="text-sm text-[var(--color-muted)]">{description}</p> : null}
        {requestId ? <p className="text-xs text-[var(--color-muted)]">Reference: <code className="font-mono">{requestId}</code></p> : null}
        {action ? <div className="mx-auto mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}