'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api/order-api';
import { accountApi } from '@/lib/api/account-api';
import { Card, CardBody, CardHeader, FormattedMoney, StatusBadge } from '@/components/ui';

export function AccountDashboard({ locale }) {
  const orders = useQuery({ queryKey: ['orders', { pageSize: 3 }], queryFn: () => orderApi.list({ pageSize: 3 }) });
  const returns = useQuery({ queryKey: ['account', 'returns', { pageSize: 3 }], queryFn: () => accountApi.returns({ pageSize: 3 }) });

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Summary title="Recent orders" value={orders.data?.meta?.total ?? '—'} href={`/${locale}/account/orders`} />
        <Summary title="Return requests" value={returns.data?.meta?.total ?? '—'} href={`/${locale}/account/returns`} />
      </div>

      <Card>
        <CardHeader
          title="Latest orders"
          action={
            <Link href={`/${locale}/account/orders`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
              View all
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
                  <StatusBadge status={order.orderStatus} />
                </span>
                <strong className="font-semibold">
                  <FormattedMoney value={order.totals.grand} locale={locale} />
                </strong>
              </Link>
            ))
          ) : (
            <CardBody>
              <p className="text-center text-sm text-[var(--color-muted)]">No account orders yet.</p>
            </CardBody>
          )}
        </div>
      </Card>
    </div>
  );
}

function Summary({ title, value, href }) {
  return (
    <Link href={href} className="group rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] p-6 transition hover:-translate-y-0.5 hover:bg-[var(--color-primary-soft)]">
      <p className="text-sm font-medium text-[var(--color-muted)]">{title}</p>
      <p className="mt-3 text-4xl font-semibold tracking-[-.05em]" data-numeric>{value}</p>
      <p className="mt-5 text-sm font-semibold text-[var(--color-primary)]">
        View all <span className="inline-block transition group-hover:translate-x-1">→</span>
      </p>
    </Link>
  );
}