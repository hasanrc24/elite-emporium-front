'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, CircleDollarSign, ClipboardList, PackagePlus, RotateCcw, ShoppingBag, SlidersHorizontal, Users } from 'lucide-react';
import { browserApi, apiMessage } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, DateRangePicker, FormattedMoney, LinkButton, Skeleton } from '@/components/ui';

const STATUS_COLORS = { pending_payment: '#f5ad2f', placed: '#7b6ef2', confirmed: '#5f7ff0', processing: '#4e65de', completed: '#28b875', cancelled: '#ef5366', failed: '#a2a8b7', draft: '#c4c8d2' };

export function Dashboard() {
  const auth = useAuthStore();
  const [range, setRange] = useState(defaultDashboardRange);
  const query = useQuery({ queryKey: ['admin', 'dashboard', range], queryFn: () => browserApi.get('/admin/dashboard', { params: range }).then((response) => response.data.data) });
  if (query.isLoading) return <DashboardSkeleton />;
  if (query.error) return <Alert tone="error">{apiMessage(query.error)}</Alert>;

  const data = query.data;
  const cards = [
    { label: 'Total revenue', value: <FormattedMoney value={data.revenue} />, Icon: CircleDollarSign, href: '/admin/reports', tone: 'violet', note: 'Completed sales in range' },
    { label: 'Orders', value: Number(data.orders).toLocaleString('en-BD'), Icon: ClipboardList, href: '/admin/orders', tone: 'blue', note: 'Placed in selected range' },
    { label: 'Average order value', value: <FormattedMoney value={data.averageOrderValue} />, Icon: ShoppingBag, href: '/admin/reports', tone: 'amber', note: 'Revenue per order' },
    { label: 'New customers', value: Number(data.customers).toLocaleString('en-BD'), Icon: Users, href: '/admin/customers', tone: 'green', note: 'Joined in selected range' },
    { label: 'Pending returns', value: Number(data.pendingReturns).toLocaleString('en-BD'), Icon: RotateCcw, href: '/admin/returns', tone: 'rose', note: `${data.lowStock} low-stock items` }
  ];

  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-[-.035em] md:text-[1.75rem]">Welcome back, {auth.user?.name?.split(' ')[0] || 'there'}! <span aria-hidden="true">👋</span></h1><p className="mt-1 text-sm text-[var(--color-muted)]">Here&apos;s what&apos;s happening with your store today.</p></div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto"><DateRangePicker value={range} onChange={setRange} className="min-w-0 flex-1 sm:w-64 sm:flex-none" /><LinkButton href="/admin/products/new" size="sm"><PackagePlus size={15} /> Add product</LinkButton></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Store highlights">{cards.map((card) => <MetricCard key={card.label} {...card} />)}</section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <div className="admin-card min-w-0 p-5">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Revenue overview</h2><p className="mt-1 text-xs text-[var(--color-muted)]">Daily performance for the selected period</p></div><Link href="/admin/reports" className="text-xs font-semibold text-[var(--color-primary)]">View report</Link></div>
          <RevenueChart rows={data.orderTrend || []} />
        </div>
        <div className="admin-card p-5"><div className="mb-5"><h2 className="text-sm font-bold">Order status</h2><p className="mt-1 text-xs text-[var(--color-muted)]">Live fulfillment distribution</p></div><OrderStatus rows={data.orderStatuses || []} total={data.orders} /></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <TopProducts rows={data.topProducts || []} />
        <div className="admin-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">Store health</h2><SlidersHorizontal size={16} className="text-[var(--color-muted)]" /></div><HealthRow label="Published catalog" value={`${data.products} products`} href="/admin/products" /><HealthRow label="Inventory attention" value={`${data.lowStock} items`} href="/admin/inventory" warning={data.lowStock > 0} /><HealthRow label="Returns awaiting action" value={`${data.pendingReturns} requests`} href="/admin/returns" warning={data.pendingReturns > 0} /></div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, Icon, href, tone, note }) {
  const tones = { violet: 'bg-violet-100 text-violet-600', blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600', green: 'bg-emerald-100 text-emerald-600', rose: 'bg-rose-100 text-rose-600' };
  return <Link href={href} className="admin-card group flex min-h-32 flex-col p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-[var(--color-muted)]">{label}</p><span className={`grid size-9 place-items-center rounded-full ${tones[tone]}`}><Icon size={17} /></span></div><p className="mt-auto text-[1.35rem] font-bold tracking-[-.04em]" data-numeric>{value}</p><p className="mt-1 text-[10px] text-[var(--color-muted)]">{note}</p></Link>;
}

function RevenueChart({ rows }) {
  const values = rows.map((row) => Number(row.revenue));
  const max = Math.max(...values, 1);
  const points = values.length < 2 ? '' : values.map((value, index) => `${(index / (values.length - 1)) * 100},${92 - (value / max) * 78}`).join(' ');
  const orderMax = Math.max(...rows.map((row) => Number(row.orders)), 1);
  const orderPoints = rows.length < 2 ? '' : rows.map((row, index) => `${(index / (rows.length - 1)) * 100},${92 - (Number(row.orders) / orderMax) * 62}`).join(' ');
  if (rows.length < 2) return <div className="grid h-56 place-items-center rounded-xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted)]">Sales activity will appear here.</div>;
  return <div><div className="mb-3 flex gap-4 text-[11px] text-[var(--color-muted)]"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#6c5ce7]" />Revenue</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#2dbd7f]" />Orders</span></div><div className="chart-grid h-52 w-full overflow-hidden rounded-lg"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Revenue and orders trend"><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6c5ce7" stopOpacity=".2"/><stop offset="1" stopColor="#6c5ce7" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#revenueFill)" /><polyline points={points} className="chart-line" stroke="#6c5ce7" strokeWidth="2" /><polyline points={orderPoints} className="chart-line" stroke="#2dbd7f" strokeWidth="1.7" /></svg></div><div className="mt-2 flex justify-between text-[10px] text-[var(--color-muted)]"><span>{formatChartDate(rows[0]?.date)}</span><span>{formatChartDate(rows.at(-1)?.date)}</span></div></div>;
}

function OrderStatus({ rows, total }) {
  const shown = rows.filter((row) => row.count > 0);
  const segments = shown.reduce((result, row) => {
    const start = result.end;
    const end = start + (row.count / Math.max(total, 1)) * 100;
    return { end, values: [...result.values, `${STATUS_COLORS[row.status] || '#a2a8b7'} ${start}% ${end}%`] };
  }, { end: 0, values: [] }).values;
  return <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row"><div className="relative grid size-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${segments.join(', ') || 'var(--color-surface-muted) 0 100%'})` }}><div className="grid size-24 place-items-center rounded-full bg-[var(--color-surface-raised)] text-center"><div><strong className="block text-xl" data-numeric>{Number(total).toLocaleString()}</strong><span className="text-[10px] text-[var(--color-muted)]">Total orders</span></div></div></div><div className="grid w-full gap-2.5">{shown.slice(0, 6).map((row) => <div key={row.status} className="flex items-center gap-2 text-xs"><i className="size-2 rounded-full" style={{ background: STATUS_COLORS[row.status] || '#a2a8b7' }} /><span className="flex-1 capitalize text-[var(--color-muted)]">{row.status.replaceAll('_', ' ')}</span><strong data-numeric>{row.count}</strong></div>)}</div></div>;
}

function TopProducts({ rows }) {
  const max = Math.max(...rows.map((row) => row.quantity), 1);
  return <div className="admin-card p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-sm font-bold">Top-selling products</h2><p className="mt-1 text-xs text-[var(--color-muted)]">Ranked by units sold</p></div><Link href="/admin/products" className="text-xs font-semibold text-[var(--color-primary)]">View all</Link></div><div className="grid gap-4">{rows.length ? rows.map((row, index) => <div key={row.name} className="grid grid-cols-[28px_1fr_auto] items-center gap-3"><span className="grid size-7 place-items-center rounded-lg bg-[var(--color-surface-muted)] text-[10px] font-bold">{index + 1}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{row.name}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(row.quantity / max) * 100}%` }} /></div></div><div className="text-right"><p className="text-xs font-semibold"><FormattedMoney value={row.revenue} /></p><p className="text-[10px] text-[var(--color-muted)]">{row.quantity} sold</p></div></div>) : <p className="py-8 text-center text-sm text-[var(--color-muted)]">Product sales will appear here.</p>}</div></div>;
}

function HealthRow({ label, value, href, warning }) { return <Link href={href} className="flex items-center gap-3 border-t border-[var(--color-border)] py-3 first:border-0"><span className={`grid size-8 place-items-center rounded-lg ${warning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{warning ? <AlertTriangle size={15} /> : <ShoppingBag size={15} />}</span><span className="flex-1 text-xs font-medium">{label}</span><span className="text-xs font-semibold text-[var(--color-muted)]">{value}</span><ArrowUpRight size={14} className="text-[var(--color-muted)]" /></Link>; }
function formatChartDate(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }) : ''; }
function dateValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function defaultDashboardRange() { const to = new Date(); const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 29); return { from: dateValue(from), to: dateValue(to) }; }
function DashboardSkeleton() { return <div className="grid gap-5"><Skeleton className="h-16 rounded-xl" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div></div>; }
