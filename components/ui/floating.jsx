'use client';

import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

/**
 * Shared layer for selects and date pickers. Content renders in a portal so
 * cards, tables and sheets with overflow clipping never cut it off, and it
 * flips or shifts to stay inside the viewport. The z-index sits above
 * dialogs (z-50) and storefront sheets (z-61).
 */
export const FloatingRoot = Popover.Root;
export const FloatingTrigger = Popover.Trigger;

export function FloatingPanel({ children, className, matchTriggerWidth = false, align = 'start', sideOffset = 8, ...rest }) {
  return (
    <Popover.Portal>
      <Popover.Content
        align={align}
        side="bottom"
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-[80] max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-1.5rem)] overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)] focus:outline-none',
          matchTriggerWidth && 'w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)]',
          className
        )}
        {...rest}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
}
