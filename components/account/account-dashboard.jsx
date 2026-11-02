'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api/order-api';
import { accountApi } from '@/lib/api/account-api';
import { Card, CardBody, CardHeader, FormattedMoney, StatusBadge } from '@/components/ui';

export function AccountDashboard({ locale }) {
  const t = useTranslations('Account.dashboard');
  const orders = useQuery({ queryKey: ['orders', { pageSize: 3 }], queryFn: () => orderApi.list({ pageSize: 3 }) });
  const returns = useQuery({ queryKey: ['account', 'returns', { pageSize: 3 }], queryFn: () => accountApi.returns({ pageSize: 3 }) });

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary title={t('orders')} value={orders.data?.meta?.total ?? '—'} href={`/${locale}/account/orders`} />
        <Summary title={t('returns')} value={returns.data?.meta?.total ?? '—'} href={`/${locale}/account/returns`} />
        <Summary title={t('saved')} value="—" href={`/${locale}/wishlist`} />
      </div>

      <Card>
        <CardHeader
          title={t('latest')}
          action={
            <Link href={`/${locale}/account/orders`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
              {t('viewAll')}
            </Link>
          }
        />
        <div className="divide-y divide-[var(--color-border)]">
          {orders.data?.data?.length ? (
            orders.data.data.map((order) => (
              <Link
                key={order.id}
                href={`/${locale}/account/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-[var(--color-primary-soft)]"
              >
                <span className="grid gap-1">
                  <strong className="font-semibold">{order.reference}</strong>
                  <StatusBadge status={order.orderStatus} locale={locale} />
                </span>
                <strong className="font-semibold">
                  <FormattedMoney value={order.totals.grand} locale={locale} />
                </strong>
              </Link>
            ))
          ) : (
            <CardBody>
              <p className="text-center text-sm text-[var(--color-muted)]">{t('noOrders')}</p>
            </CardBody>
          )}
        </div>
      </Card>
    </div>
  );
}

function Summary({ title, value, href }) {
  const t = useTranslations('Account.dashboard');
  return (
    <Link href={href} className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 transition hover:border-[var(--color-primary)]">
      <p className="text-xs font-medium text-[var(--color-muted)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-.05em]" data-numeric>{value}</p>
      <p className="mt-4 text-xs font-semibold text-[var(--color-primary)]">
        {t('viewAll')} <span className="inline-block transition group-hover:translate-x-1">→</span>
      </p>
    </Link>
  );
}
