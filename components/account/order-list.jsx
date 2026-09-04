'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api/order-api';
import { Card, CardBody, EmptyState, FormattedDate, FormattedMoney, Skeleton, StatusBadge } from '@/components/ui';

export function OrderList({ locale }) {
  const orders = useQuery({ queryKey: ['orders'], queryFn: () => orderApi.list() });

  if (orders.isLoading) {
    return (
      <Card>
        <CardBody>
          <Skeleton className="h-10 w-40" />
          <Skeleton className="mt-4 h-24" />
        </CardBody>
      </Card>
    );
  }

  const list = orders.data?.data || [];

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-bold">Orders</h2>
      {list.length ? (
        list.map((order) => (
          <Card key={order.id}>
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="grid gap-1">
                <p className="text-sm text-[var(--color-muted)]">{order.reference}</p>
                <StatusBadge status={order.orderStatus} />
                <FormattedDate value={order.createdAt} locale={locale} className="text-sm text-[var(--color-muted)]" />
              </div>
              <div className="grid gap-1 text-right">
                <strong><FormattedMoney value={order.totals.grand} locale={locale} /></strong>
                <Link href={`/${locale}/account/orders/${order.id}`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                  View order →
                </Link>
              </div>
            </CardBody>
          </Card>
        ))
      ) : (
        <EmptyState title="You have no account-linked orders yet" description="Guest orders can be tracked using the order reference and phone number." />
      )}
    </div>
  );
}