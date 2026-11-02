'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, CheckCircle2, ClipboardList, CreditCard, Download, Megaphone, MessageSquareText, PackageX, RotateCcw, ShoppingBag, Webhook } from 'lucide-react';
import { pushToast } from '@/components/ui';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { cn } from '@/lib/utils';

export const INBOX_KEY = ['admin-inbox'];
const SYNC_CHANNEL = 'ee-admin-inbox';
const POLL_MS = 30_000;

export const inboxCategories = [
  { value: 'order', label: 'Orders' },
  { value: 'payment', label: 'Payments' },
  { value: 'return', label: 'Returns' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'contact', label: 'Messages' },
  { value: 'export', label: 'Exports' },
  { value: 'notification', label: 'Deliveries' },
  { value: 'webhook', label: 'Webhooks' }
];

const categoryIcons = { order: ClipboardList, payment: CreditCard, return: RotateCcw, inventory: PackageX, catalog: ShoppingBag, contact: MessageSquareText, export: Download, notification: Megaphone, webhook: Webhook };
const severityTone = {
  info: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]',
  success: 'bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]',
  warning: 'bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)]',
  critical: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]'
};

/** Tells other admin tabs to refetch after this tab changes read state. */
function broadcastInboxChange() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(SYNC_CHANNEL);
  channel.postMessage({ type: 'changed' });
  channel.close();
}

export function useInboxSync() {
  const client = useQueryClient();
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.onmessage = () => client.invalidateQueries({ queryKey: INBOX_KEY });
    return () => channel.close();
  }, [client]);
}

/** Unread count for the bell. Polls only while the tab is visible. */
export function useInboxSummary() {
  const authenticated = useAuthStore((state) => state.status === 'authenticated');
  return useQuery({
    queryKey: [...INBOX_KEY, 'summary'],
    queryFn: () => browserApi.get('/admin/inbox/summary').then((response) => response.data.data),
    enabled: authenticated,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    retry: false
  });
}

export function useInboxList(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...INBOX_KEY, 'list', params],
    queryFn: () => browserApi.get('/admin/inbox', { params }).then((response) => response.data),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true
  });
}

export function useInboxActions() {
  const client = useQueryClient();
  const settle = () => {
    client.invalidateQueries({ queryKey: INBOX_KEY });
    broadcastInboxChange();
  };
  const onError = (error) => pushToast({ tone: 'error', title: 'Could not update notifications', description: apiMessage(error) });
  const setRead = useMutation({
    mutationFn: ({ id, read }) => browserApi.patch(`/admin/inbox/${id}`, { read }),
    onSuccess: settle,
    onError
  });
  const readAll = useMutation({
    // Only what the person has seen; anything newer stays unread.
    mutationFn: (before) => browserApi.post('/admin/inbox/read-all', before ? { before } : {}).then((response) => response.data.data),
    onSuccess: settle,
    onError
  });
  return { setRead, readAll };
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const steps = [['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3_600], ['minute', 60]];

export function timeAgo(value, now = Date.now()) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (Math.abs(seconds) < 45) return 'just now';
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  return relative.format(Math.round(seconds / 60), 'minute');
}

export function formatUnread(count) {
  return count > 99 ? '99+' : String(count);
}

export function NotificationGlyph({ item, className }) {
  const Icon = item.severity === 'critical' ? AlertTriangle : item.severity === 'success' ? CheckCircle2 : categoryIcons[item.category] || Bell;
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', severityTone[item.severity] || severityTone.info, className)} aria-hidden="true">
      <Icon size={17} strokeWidth={1.9} />
    </span>
  );
}

/** One alert row; `onOpen` follows its link, `onToggleRead` flips read state. */
export function NotificationRow({ item, onOpen, onToggleRead, compact = false }) {
  const unread = !item.readAt;
  const content = (
    <>
      <NotificationGlyph item={item} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn('min-w-0 flex-1 text-[13px] leading-5', unread ? 'font-semibold text-[var(--color-text)]' : 'font-medium text-[var(--color-muted)]')}>
            {item.title}
            {item.occurrences > 1 ? <><span aria-hidden="true" className="ml-1.5 rounded-full bg-[var(--color-surface-muted)] px-1.5 py-px text-[10px] font-semibold text-[var(--color-muted)]">×{item.occurrences}</span><span className="sr-only"> ({item.occurrences} times)</span></> : null}
          </span>
        </span>
        {item.body ? <span className={cn('mt-0.5 block text-xs leading-5 text-[var(--color-muted)]', compact && 'line-clamp-2')}>{item.body}</span> : null}
        <time dateTime={item.occurredAt} title={new Date(item.occurredAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} className="mt-1 block text-[11px] text-[var(--color-muted)]">{timeAgo(item.occurredAt)}</time>
      </span>
    </>
  );
  return (
    <div className={cn('group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--color-surface-muted)]', unread && 'bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)]')}>
      {item.link ? (
        <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-lg">
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
      )}
      <button
        type="button"
        onClick={() => onToggleRead(item)}
        aria-label={unread ? `Mark "${item.title}" as read` : `Mark "${item.title}" as unread`}
        title={unread ? 'Mark as read' : 'Mark as unread'}
        className="mt-1 grid size-6 shrink-0 place-items-center rounded-full hover:bg-[var(--color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <span className={cn('size-2.5 rounded-full transition', unread ? 'bg-[var(--color-primary)]' : 'border border-[var(--color-border-strong)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100')} />
      </button>
    </div>
  );
}
