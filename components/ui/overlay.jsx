'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DialogRoot({ open, onOpenChange, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
}

export function DialogTrigger({ asChild = true, children }) {
  return <Dialog.Trigger asChild={asChild}>{children}</Dialog.Trigger>;
}

export function DialogContent({ title, description, children, footer, size = 'md', className }) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] backdrop-blur-sm data-[state=open]:animate-[fade-in_.18s_ease-out]" />
      <Dialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-md)] focus:outline-none',
          sizes[size],
          className
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <Dialog.Title className="text-lg font-semibold tracking-[-.01em]">{title}</Dialog.Title>
            {description ? <Dialog.Description className="text-sm text-[var(--color-muted)]">{description}</Dialog.Description> : null}
          </div>
          <Dialog.Close className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </Dialog.Close>
        </div>
        <div className="grid gap-4">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function Drawer({ open, onOpenChange, title, description, children, footer, side = 'right', className }) {
  const sides = {
    right: 'inset-y-0 right-0 h-full w-[min(100%,28rem)] rounded-l-[var(--radius-lg)]',
    left: 'inset-y-0 left-0 h-full w-[min(100%,28rem)] rounded-r-[var(--radius-lg)]',
    bottom: 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-[var(--radius-lg)]'
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)] backdrop-blur-sm" />
        <Dialog.Content className={cn('fixed z-50 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-md)] focus:outline-none', sides[side], className)}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="text-sm text-[var(--color-muted)]">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]" aria-label="Close">
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="grid gap-4">{children}</div>
          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Confirmation dialog. Pass `trigger`, or control it with `open`/`onOpenChange`. */
export function ConfirmAction({ trigger, open, onOpenChange, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger', onConfirm }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger> : null}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--color-text)_50%,transparent)] backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-md)] focus:outline-none">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          {description ? <AlertDialog.Description className="mt-2 text-sm text-[var(--color-muted)]">{description}</AlertDialog.Description> : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-5 text-sm font-semibold hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm?.();
                  onOpenChange?.(false);
                }}
                className={cn(
                  'inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] px-5 text-sm font-semibold focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                  tone === 'danger' ? 'bg-[var(--color-danger)] text-[var(--color-on-danger)] hover:brightness-95' : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-strong)]'
                )}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function DropdownMenuRoot({ trigger, children, align = 'end', sideOffset = 8 }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={sideOffset} collisionPadding={12} className="z-[80] min-w-[10rem] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 shadow-[var(--shadow-md)] focus:outline-none">
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DropdownItem({ children, onSelect, disabled, destructive, asChild }) {
  return (
    <DropdownMenu.Item
      asChild={asChild}
      onSelect={(e) => {
        if (onSelect) {
          e.preventDefault();
          onSelect();
        }
      }}
      disabled={disabled}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-[calc(var(--radius-sm)-.25rem)] px-3 py-2 text-sm outline-none transition data-[highlighted]:bg-[var(--color-primary-soft)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        destructive && 'text-[var(--color-danger)] data-[highlighted]:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)]'
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
}

export function DropdownSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />;
}

export function DropdownLabel({ children }) {
  return <DropdownMenu.Label className="px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-muted)]">{children}</DropdownMenu.Label>;
}