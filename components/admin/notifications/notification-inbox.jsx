'use client';

import { useRouter } from 'next/navigation';
import { BellOff, CheckCheck } from 'lucide-react';
import { Button, EmptyState, ErrorState, FilterChip, Skeleton, TableFooter } from '@/components/ui';
import { apiMessage } from '@/lib/api/browser-api';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { AdminPageHeader } from '../admin-page-header';
import { inboxCategories, NotificationRow, useInboxActions, useInboxList, useInboxSync } from './inbox-shared';

const DEFAULTS = { page: 1, pageSize: 20, status: 'all', category: '' };
const dhakaDay = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

function dayLabel(value) {
  const day = dhakaDay(value);
  const today = dhakaDay(Date.now());
  const yesterday = dhakaDay(Date.now() - 86_400_000);
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  return new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDay(items) {
  const groups = [];
  for (const item of items) {
    const label = dayLabel(item.occurredAt);
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(item);
  }
  return groups;
}

export function NotificationInbox() {
  const router = useRouter();
  const [params, setParams] = useTableParams(DEFAULTS);
  const query = { page: params.page, pageSize: Math.min(params.pageSize, 50), status: params.status === 'unread' ? 'unread' : 'all', ...(params.category ? { category: params.category } : {}) };
  const list = useInboxList(query);
  const { setRead, readAll } = useInboxActions();
  useInboxSync();

  const items = list.data?.data || [];
  const meta = list.data?.meta || {};
  const unread = meta.unreadCount || 0;
  const openItem = (item) => {
    if (!item.readAt) setRead.mutate({ id: item.id, read: true });
    router.push(item.link);
  };
  const toggleRead = (item) => setRead.mutate({ id: item.id, read: !item.readAt });
  const filtered = query.status === 'unread' || Boolean(query.category);

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title="Notifications"
        description="Alerts for your role: new and cancelled orders, returns, low stock, failed deliveries and finished exports. Older read alerts are removed after 90 days."
        actions={
          <Button variant="outline" loading={readAll.isPending} disabled={!unread} onClick={() => readAll.mutate(items[0]?.occurredAt)}>
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip label="All" active={query.status === 'all'} onSelect={() => setParams({ status: 'all' })} />
        <FilterChip label="Unread" count={unread || undefined} active={query.status === 'unread'} onSelect={() => setParams({ status: 'unread' })} />
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
          Category
          <select
            value={params.category}
            onChange={(event) => setParams({ category: event.target.value })}
            className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-medium text-[var(--color-text)]"
          >
            <option value="">All categories</option>
            {inboxCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </label>
      </div>
      <section className="admin-card overflow-hidden p-2" aria-busy={list.isFetching}>
        {list.isLoading ? (
          <div className="grid gap-4 p-3">{[0, 1, 2, 3].map((key) => <div key={key} className="flex gap-3"><Skeleton className="size-9 rounded-xl" /><div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>
        ) : list.error ? (
          <ErrorState title="Notifications could not be loaded" description={apiMessage(list.error)} action={<Button variant="outline" onClick={() => list.refetch()}>Try again</Button>} />
        ) : items.length ? (
          groupByDay(items).map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <h2 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--color-muted)]">{group.label}</h2>
              <div className="grid gap-0.5">
                {group.items.map((item) => <NotificationRow key={item.id} item={item} onOpen={openItem} onToggleRead={toggleRead} />)}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={BellOff}
            title={filtered ? 'Nothing matches these filters' : 'No notifications yet'}
            description={filtered ? 'Try showing all notifications or another category.' : 'New orders, returns, low stock and delivery problems for your role will appear here.'}
            action={filtered ? <Button variant="outline" onClick={() => setParams({ status: 'all', category: '' })}>Show all</Button> : null}
          />
        )}
      </section>
      <TableFooter page={params.page} pageSize={query.pageSize} total={meta.total || 0} pageCount={meta.pageCount} pageSizeOptions={[20, 50]} onPageChange={(page) => setParams({ page })} onPageSizeChange={(pageSize) => setParams({ pageSize })} />
    </div>
  );
}
