'use client';

import * as Tabs from '@radix-ui/react-tabs';
import * as Accordion from '@radix-ui/react-accordion';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function TabsRoot({ defaultValue, value, onValueChange, children, className }) {
  return (
    <Tabs.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} className={cn('grid gap-4', className)}>
      {children}
    </Tabs.Root>
  );
}

export function TabsList({ items = [], className }) {
  return (
    <Tabs.List className={cn('flex flex-wrap items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1', className)}>
      {items.map((item) => (
        <Tabs.Trigger
          key={item.value}
          value={item.value}
          className="inline-flex min-h-9 items-center justify-center rounded-[calc(var(--radius-sm)-.25rem)] px-3 py-1.5 text-sm font-semibold text-[var(--color-muted)] transition data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {item.label}
          {item.count !== undefined ? (
            <span className="ml-2 rounded-full bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[0.65rem] tabular-nums data-[parent=active]:bg-white/20">
              {item.count}
            </span>
          ) : null}
        </Tabs.Trigger>
      ))}
    </Tabs.List>
  );
}

export function TabsContent({ value, children, className }) {
  return (
    <Tabs.Content value={value} className={cn('focus-visible:outline-none', className)}>
      {children}
    </Tabs.Content>
  );
}

export { Tabs };

export function AccordionRoot({ items = [], type = 'single', defaultValue, collapsible = true, className }) {
  return (
    <Accordion.Root type={type} collapsible={collapsible} defaultValue={defaultValue} className={cn('divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]', className)}>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value} className="group">
          <Accordion.Header asChild>
            <h3>
              <Accordion.Trigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] [&[data-state=open]>svg]:rotate-180">
                <span>{item.label}</span>
                <ChevronDown className="h-4 w-4 transition-transform" aria-hidden="true" />
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden text-sm text-[var(--color-muted)] data-[state=open]:animate-[accordion-open_.25s_ease-out] data-[state=closed]:animate-[accordion-close_.25s_ease-out]">
            <div className="px-5 pb-5 pt-0">{item.content}</div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

export { Accordion };

export function TooltipProvider({ children, delayDuration = 200 }) {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>{children}</Tooltip.Provider>
  );
}

export function InfoTooltip({ label, children, side = 'top', className }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} className={cn('z-50 max-w-xs rounded-[var(--radius-sm)] bg-[var(--color-text)] px-3 py-1.5 text-xs font-medium text-white shadow-md', className)}>
          {label}
          <Tooltip.Arrow className="fill-[var(--color-text)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function PopoverRoot({ trigger, children, align = 'end', sideOffset = 8, contentClassName }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={sideOffset} className={cn('z-50 w-72 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-md)] focus:outline-none', contentClassName)}>
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Pagination({ page, totalPages, onChange, siblingCount = 1, className }) {
  const t = useTranslations('ui');
  if (totalPages <= 1) return null;
  const pages = [];
  const around = siblingCount;
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= around) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  const go = (next) => {
    if (next >= 1 && next <= totalPages) onChange?.(next);
  };
  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label={t('previous')}
        className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('previous')}</span>
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-[var(--color-muted)]">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => go(p)}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border text-sm font-semibold transition',
              p === page
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label={t('next')}
        className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="hidden sm:inline">{t('next')}</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function Breadcrumb({ items = [], separator = '/', className }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)]', className)}>
      {items.map((item, i) => (
        <span key={`${item.href || item.label}-${i}`} className="inline-flex items-center gap-1.5">
          {item.href && i < items.length - 1 ? (
            <a href={item.href} className="hover:text-[var(--color-primary)]">
              {item.label}
            </a>
          ) : (
            <span aria-current={i === items.length - 1 ? 'page' : undefined} className={i === items.length - 1 ? 'font-semibold text-[var(--color-text)]' : ''}>
              {item.label}
            </span>
          )}
          {i < items.length - 1 ? <span aria-hidden="true">{separator}</span> : null}
        </span>
      ))}
    </nav>
  );
}