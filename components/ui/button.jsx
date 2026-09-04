import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary:
    'bg-[var(--color-primary)] text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--color-primary)_20%,transparent)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-strong)]',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]',
  outline:
    'border border-[var(--color-border-strong)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
  ghost:
    'bg-transparent hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]',
  danger:
    'bg-[var(--color-danger)] text-white hover:brightness-95',
  link: 'bg-transparent text-[var(--color-primary)] underline-offset-4 hover:underline px-0 min-h-0'
};

const SIZES = {
  sm: 'min-h-9 px-3 py-1.5 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
  icon: 'min-h-11 min-w-11 px-0 py-0'
};

export function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  const base = size === 'icon' ? SIZES.icon : SIZES[size];
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-semibold tracking-[-.01em] transition duration-200 ease-out active:translate-y-px active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 disabled:active:scale-100',
    base,
    VARIANTS[variant] ?? VARIANTS.primary,
    className
  );
}

function ButtonLoader() {
  return (
    <span className="button-loader" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** @param {any} props */
export function Button(props) {
  const {
    asChild = false,
    variant = 'primary',
    size = 'md',
    className,
    loading = false,
    disabled = false,
    type = 'button',
    children,
    ...rest
  } = props;
  const Component = asChild ? Slot : 'button';
  const classes = buttonClasses({ variant, size, className });
  return (
    <Component
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : type}
      {...rest}
    >
      {loading ? (
        <>
          <ButtonLoader />
          <span>{typeof children === 'string' ? children : 'Please wait'}</span>
        </>
      ) : (
        children
      )}
    </Component>
  );
}

export function LinkButton({ variant = 'primary', size = 'md', className, ...rest }) {
  return <a className={buttonClasses({ variant, size, className })} {...rest} />;
}

export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'icon', className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" className="h-5 w-5" /> : null}
    </button>
  );
}