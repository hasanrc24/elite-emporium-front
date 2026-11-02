'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { pushToast, Skeleton } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { cn } from '@/lib/utils';
import { formatUnread, NotificationRow, useInboxActions, useInboxList, useInboxSummary, useInboxSync } from './inbox-shared';

const PREVIEW_SIZE = 8;

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const summary = useInboxSummary();
  const list = useInboxList({ status: filter, pageSize: PREVIEW_SIZE }, { enabled: open });
  const { setRead, readAll } = useInboxActions();
  const seenLatest = useRef(undefined);
  useInboxSync();

  const unread = summary.data?.unreadCount || 0;
  const latest = summary.data?.latest;

  // Announce alerts that arrive while the admin is open, but not the backlog
  // already waiting at sign-in.
  useEffect(() => {
    if (!summary.data) return;
    const previous = seenLatest.current;
    seenLatest.current = latest ? { id: latest.id, at: new Date(latest.occurredAt).getTime() } : null;
    if (previous === undefined || !latest || open) return;
    if (previous && (previous.id === latest.id || new Date(latest.occurredAt).getTime() <= previous.at)) return;
    pushToast({
      tone: latest.severity === 'critical' ? 'error' : latest.severity === 'warning' ? 'warning' : latest.severity === 'success' ? 'success' : 'info',
      title: latest.title,
      description: latest.body || undefined,
      duration: 7000,
      action: { label: latest.link ? 'Open' : 'View notifications', onClick: () => router.push(latest.link || '/admin/inbox') }
    });
  }, [summary.data, latest, open, router]);

  const items = list.data?.data || [];
  const openItem = (item) => {
    if (!item.readAt) setRead.mutate({ id: item.id, read: true });
    setOpen(false);
    router.push(item.link);
  };
  const toggleRead = (item) => setRead.mutate({ id: item.id, read: !item.readAt });
  const markAll = () => {
    // Mark only up to the newest alert shown, so one arriving mid-click stays unread.
    const newest = items[0]?.occurredAt || latest?.occurredAt;
    readAll.mutate(newest);
  };

  const label = unread ? `Notifications, ${unread} unread` : 'Notifications';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn('relative grid size-10 place-items-center rounded-xl text-[var(--color-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]', open && 'bg-[var(--color-surface-muted)] text-[var(--color-text)]')}
        >
          <Bell size={18} />
          {unread ? (
            <span aria-hidden="true" className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold leading-none text-[var(--color-on-danger)] ring-2 ring-[var(--color-surface-raised)]">
              {formatUnread(unread)}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label="Notifications"
          className="z-[80] flex max-h-[min(36rem,var(--radix-popover-content-available-height))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)] focus:outline-none"
        >
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <p className="flex-1 text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAll}
              disabled={!unread || readAll.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>
          <div role="tablist" aria-label="Filter notifications" className="flex gap-1 px-3 pt-2">
            {[['all', 'All'], ['unread', unread ? `Unread (${formatUnread(unread)})` : 'Unread']].map(([value, text]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold transition', filter === value ? 'bg-[var(--color-surface-muted)] text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]')}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-busy={list.isLoading}>
            {list.isLoading ? (
              <div className="grid gap-2 p-2">{[0, 1, 2].map((key) => <div key={key} className="flex gap-3"><Skeleton className="size-9 rounded-xl" /><div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>
            ) : list.error ? (
              <div className="grid gap-2 px-3 py-8 text-center text-sm" role="alert">
                <p className="font-semibold">Notifications could not be loaded</p>
                <p className="text-xs text-[var(--color-muted)]">{apiMessage(list.error)}</p>
                <button type="button" onClick={() => list.refetch()} className="mx-auto text-xs font-semibold text-[var(--color-primary)] underline">Try again</button>
              </div>
            ) : items.length ? (
              <div className="grid gap-0.5">
                {items.map((item) => <NotificationRow key={item.id} item={item} compact onOpen={openItem} onToggleRead={toggleRead} />)}
              </div>
            ) : (
              <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
                <BellOff className="size-8 text-[var(--color-muted)]" aria-hidden="true" />
                <p className="text-sm font-semibold">{filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}</p>
                <p className="text-xs text-[var(--color-muted)]">New orders, returns, low stock and delivery problems will appear here.</p>
              </div>
            )}
          </div>
          <div className="border-t border-[var(--color-border)] p-2">
            <Link href="/admin/inbox" onClick={() => setOpen(false)} className="block rounded-lg py-2 text-center text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-surface-muted)]">
              View all notifications
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
