'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const panels = {
  right: 'inset-y-0 right-0 h-dvh w-[min(100%,26rem)] border-l',
  left: 'inset-y-0 left-0 h-dvh w-[min(100%-3rem,22rem)] border-r',
  bottom: 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[14px] border-t'
};

/**
 * Accessible side/bottom sheet with a fixed header and footer and a
 * scrollable body (Radix Dialog handles focus trap and restore).
 */
export function Sheet({ open, onOpenChange, side = 'right', title, description, closeLabel = 'Close', footer, children, className, bodyClassName, headerExtra }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[60] bg-[var(--color-overlay)]" />
        <Dialog.Content data-side={side} className={cn('sheet-panel fixed z-[61] flex flex-col border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-[var(--shadow-md)] focus:outline-none', panels[side], className)}>
          {side === 'bottom' ? <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--color-border-strong)]" /> : null}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-medium">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <div className="flex items-center gap-1">
              {headerExtra}
              <Dialog.Close className="grid size-10 place-items-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-surface-muted)]" aria-label={closeLabel}>
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', bodyClassName)}>{children}</div>
          {footer ? <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
