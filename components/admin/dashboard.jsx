'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Boxes, CircleDollarSign, ClipboardList, PackagePlus, Settings, ShoppingBag, Users } from 'lucide-react';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { Alert, Button, Card, CardBody, CardHeader, FormattedMoney, LinkButton, Skeleton, StatTile } from '@/components/ui';

export function Dashboard() {
  const query = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => browserApi.get('/admin/dashboard').then((response) => response.data.data)
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    );
  }
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;

  const cards = [
    { label: 'Orders', value: query.data.orders, Icon: ClipboardList, href: '/admin/orders' },
    { label: 'Published products', value: query.data.products, Icon: ShoppingBag, href: '/admin/products' },
    { label: 'Customers', value: query.data.customers, Icon: Users, href: '/admin/customers' },
    { label: 'Low-stock items', value: query.data.lowStock, Icon: AlertTriangle, href: '/admin/inventory' }
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Business overview</p>
          <h1 className="page-title mt-2 text-[clamp(2.25rem,4vw,3.5rem)]">Good to see you</h1>
          <p className="mt-3 text-[var(--color-muted)]">A clear view of what is happening across your store.</p>
        </div>
        <LinkButton href="/admin/products">
          <PackagePlus size={17} /> Add product
        </LinkButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, Icon, href }) => (
          <Link href={href} key={label} className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-[.75rem] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <ArrowRight size={16} className="text-[var(--color-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-.05em]" data-numeric>{value}</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Card>
          <CardHeader title="Revenue recorded" description="Authoritative order and payment totals." />
          <CardBody>
            <p className="text-3xl font-semibold tracking-[-.05em] text-[var(--color-primary)]">
              <FormattedMoney value={query.data.revenue} />
            </p>
            <div className="admin-grid mt-6 min-h-44 rounded-[var(--radius-sm)] p-6">
              <div className="inline-flex max-w-md rounded-[var(--radius-sm)] bg-white/90 p-4 ring-1 ring-[var(--color-border)]">
                <p className="text-sm leading-6 text-[var(--color-muted)]">Use Reports for detailed periods and exports.</p>
              </div>
            </div>
          </CardBody>
          <Link className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-4 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-soft)]" href="/admin/reports">
            Open reports
            <ArrowRight size={17} />
          </Link>
        </Card>

        <section className="rounded-[var(--radius-lg)] bg-[var(--color-primary-strong)] p-6 text-white">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <p className="mt-1 text-sm text-white/55">Common owner tasks, one click away.</p>
          <div className="mt-5 grid gap-2">
            <QuickLink href="/admin/inventory" Icon={Boxes} label="Adjust inventory" />
            <QuickLink href="/admin/orders/new" Icon={ClipboardList} label="Create manual order" />
            <QuickLink href="/admin/settings" Icon={Settings} label="Store settings" />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickLink({ href, Icon, label }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-[.7rem] bg-white/[.07] p-3 text-sm font-medium text-white/75 transition hover:bg-white/[.13] hover:text-white">
      <Icon size={17} />
      <span className="flex-1">{label}</span>
      <ArrowRight size={15} className="text-white/35 transition group-hover:translate-x-1" />
    </Link>
  );
}