'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api/order-api';
import { useTableParams } from '@/lib/hooks/use-table-params';
import { FormattedDate, FormattedMoney, Button, StatusBadge } from '@/components/ui';
import { AccountList } from './list-parts';

const PAGE_SIZE = 10;

export function OrderList({ locale }) {
  const t = useTranslations('Account.orders');
  const [params, setParams] = useTableParams({ page: 1 });
  const orders = useQuery({ queryKey: ['orders', params.page], queryFn: () => orderApi.list({ page: params.page, pageSize: PAGE_SIZE }), placeholderData: (previous) => previous });
  const href = (order) => `/${locale}/account/orders/${order.id}`;

  const columns = [
    { id: 'reference', header: t('columns.order'), cell: ({ row }) => <Link href={href(row.original)} className="font-semibold text-[var(--color-primary)] hover:underline">{row.original.reference}</Link> },
    { id: 'date', header: t('columns.date'), cell: ({ row }) => <FormattedDate value={row.original.createdAt} locale={locale} className="text-[var(--color-muted)]" /> },
    { id: 'status', header: t('columns.status'), cell: ({ row }) => <StatusBadge status={row.original.orderStatus} locale={locale} /> },
    { id: 'total', header: t('columns.total'), meta: { align: 'right', className: 'tabular-nums font-semibold', headerClassName: 'text-right' }, cell: ({ row }) => <FormattedMoney value={row.original.totals.grand} locale={locale} /> },
    { id: 'view', header: <span className="sr-only">{t('view')}</span>, meta: { align: 'right' }, cell: ({ row }) => <Link href={href(row.original)} aria-label={`${t('view')} ${row.original.reference}`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{t('view')} →</Link> }
  ];

  return (
    <div className="grid gap-4">
      <div><h2 className="text-xl font-bold">{t('title')}</h2><p className="mt-1 text-xs text-[var(--color-muted)]">{t('intro')}</p></div>
      <AccountList
        query={orders}
        columns={columns}
        caption={t('title')}
        page={params.page}
        pageSize={PAGE_SIZE}
        onPageChange={(page) => setParams({ page })}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyBody')}
        emptyAction={<Button asChild><Link href={`/${locale}/shop`}>{t('startShopping')}</Link></Button>}
        renderCard={(order) => (
          <Link href={href(order)} className="storefront-panel flex items-center justify-between gap-4 px-4 py-4 transition hover:border-[var(--color-primary)]">
            <div className="grid min-w-0 gap-1">
              <p className="text-sm font-semibold">{order.reference}</p>
              <StatusBadge status={order.orderStatus} locale={locale} />
              <FormattedDate value={order.createdAt} locale={locale} className="text-sm text-[var(--color-muted)]" />
            </div>
            <div className="grid shrink-0 justify-items-end gap-1">
              <strong className="tabular-nums"><FormattedMoney value={order.totals.grand} locale={locale} /></strong>
              <span className="text-sm font-semibold text-[var(--color-primary)]">{t('view')} →</span>
            </div>
          </Link>
        )}
      />
    </div>
  );
}
