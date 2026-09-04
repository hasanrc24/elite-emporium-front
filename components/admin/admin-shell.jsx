'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Boxes, ClipboardList, FileText, Image, LayoutDashboard, LogOut, Megaphone, Menu, MessageSquareText, PackageSearch, RotateCcw, Search, Settings, ShieldCheck, ShoppingBag, Tags, Truck, UserCog, Users, Webhook, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { authApi } from '@/lib/api/auth-api';
import { cn } from '@/lib/utils';
import { Button, IconButton, NativeSelect } from '@/components/ui';

const links = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/admin/products', label: 'Products', Icon: ShoppingBag, permission: 'catalog.view' },
  { href: '/admin/categories', label: 'Categories', Icon: Tags, permission: 'catalog.view' },
  { href: '/admin/collections', label: 'Collections', Icon: PackageSearch, permission: 'catalog.view' },
  { href: '/admin/brands', label: 'Brands', Icon: Tags, permission: 'catalog.view' },
  { href: '/admin/attributes', label: 'Attributes', Icon: Boxes, permission: 'catalog.view' },
  { href: '/admin/inventory', label: 'Inventory', Icon: Boxes, permission: 'inventory.view' },
  { href: '/admin/orders', label: 'Orders', Icon: ClipboardList, permission: 'orders.view' },
  { href: '/admin/payments', label: 'Payments', Icon: Boxes, permission: 'payments.view' },
  { href: '/admin/refunds', label: 'Refunds', Icon: Boxes, permission: 'payments.view' },
  { href: '/admin/returns', label: 'Returns', Icon: RotateCcw, permission: 'returns.view' },
  { href: '/admin/shipments', label: 'Shipments', Icon: Truck, permission: 'orders.view' },
  { href: '/admin/customers', label: 'Customers', Icon: Users, permission: 'customers.view' },
  { href: '/admin/privacy-requests', label: 'Privacy', Icon: ShieldCheck, permission: 'customers.view' },
  { href: '/admin/contact-messages', label: 'Contact inbox', Icon: MessageSquareText, permission: 'customers.view' },
  { href: '/admin/coupons', label: 'Coupons', Icon: Megaphone, permission: 'promotions.manage' },
  { href: '/admin/reviews', label: 'Reviews', Icon: MessageSquareText, permission: 'reviews.moderate' },
  { href: '/admin/content/pages', label: 'Pages', Icon: FileText, permission: 'cms.manage' },
  { href: '/admin/content/posts', label: 'Posts', Icon: FileText, permission: 'cms.manage' },
  { href: '/admin/appearance/home', label: 'Homepage', Icon: Image, permission: 'cms.manage' },
  { href: '/admin/appearance/menus', label: 'Menus', Icon: Menu, permission: 'cms.manage' },
  { href: '/admin/appearance/theme', label: 'Theme', Icon: Image, permission: 'cms.manage' },
  { href: '/admin/media', label: 'Media', Icon: Image, permission: 'media.manage' },
  { href: '/admin/reports', label: 'Reports', Icon: BarChart3, permission: 'reports.view' },
  { href: '/admin/exports', label: 'Exports', Icon: BarChart3, permission: 'reports.view' },
  { href: '/admin/notifications', label: 'Notifications', Icon: Megaphone, permission: 'notifications.manage' },
  { href: '/admin/notification-deliveries', label: 'Delivery outbox', Icon: Megaphone, permission: 'notifications.manage' },
  { href: '/admin/integrations', label: 'Integrations', Icon: Settings, permission: 'integrations.manage' },
  { href: '/admin/webhooks', label: 'Webhooks', Icon: Webhook, permission: 'webhooks.manage' },
  { href: '/admin/staff', label: 'Staff', Icon: UserCog, permission: 'staff.view' },
  { href: '/admin/roles', label: 'Roles', Icon: ShieldCheck, permission: 'staff.view' },
  { href: '/admin/audits', label: 'Audits', Icon: ShieldCheck, permission: 'audits.view' },
  { href: '/admin/settings', label: 'Settings', Icon: Settings, permission: 'settings.manage' }
];

const groups = [
  { label: 'Overview', test: ({ href }) => href === '/admin' },
  { label: 'Catalog', test: ({ href }) => ['/admin/products', '/admin/categories', '/admin/collections', '/admin/brands', '/admin/attributes', '/admin/inventory'].includes(href) },
  { label: 'Commerce', test: ({ href }) => ['/admin/orders', '/admin/payments', '/admin/refunds', '/admin/returns', '/admin/shipments', '/admin/coupons'].includes(href) },
  { label: 'Customers', test: ({ href }) => ['/admin/customers', '/admin/privacy-requests', '/admin/contact-messages', '/admin/reviews'].includes(href) },
  { label: 'Store experience', test: ({ href }) => href.startsWith('/admin/content') || href.startsWith('/admin/appearance') || href === '/admin/media' },
  { label: 'Insights', test: ({ href }) => ['/admin/reports', '/admin/exports'].includes(href) }
];

export function AdminShell({ children }) {
  const auth = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const loginPage = pathname === '/admin/login';
  const isAdmin = auth.user?.permissions?.includes('admin.access');

  useEffect(() => {
    if (!loginPage && auth.status === 'anonymous') router.replace('/admin/login');
    else if (auth.status === 'authenticated' && !isAdmin) router.replace('/en');
    else if (loginPage && isAdmin) router.replace('/admin');
  }, [auth.status, isAdmin, loginPage, router]);

  if (loginPage) return children;
  if (auth.status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
        <div className="text-center">
          <span className="mx-auto mb-4 block size-10 rounded-xl bg-[var(--color-primary)]" />
          <p className="text-sm font-medium text-[var(--color-muted)]">Checking administrator session…</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return null;

  const permitted = links.filter(({ permission }) => auth.user.permissions.includes(permission));
  const activeLink = [...permitted]
    .sort((a, b) => b.href.length - a.href.length)
    .find(({ href }) => (href === '/admin' ? pathname === href : pathname.startsWith(href)));
  const grouped = groups
    .map((group) => ({ ...group, items: permitted.filter(group.test) }))
    .filter((group) => group.items.length);
  const closeNavigation = () => setNavigationOpen(false);

  return (
    <div className="min-h-screen bg-[#f4f5f1] lg:grid lg:grid-cols-[260px_1fr]">
      {navigationOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden"
          onClick={closeNavigation}
        />
      ) : null}

      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[260px] -translate-x-full flex-col border-r border-white/5 bg-[#17312c] text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', navigationOpen && 'translate-x-0')}>
        <div className="flex min-h-[76px] items-center justify-between border-b border-white/8 px-5">
          <Link href="/admin" onClick={closeNavigation} className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[.7rem] bg-white text-xs font-semibold tracking-[-.08em] text-[#17312c]">EE</span>
            <span className="leading-tight">
              <span className="block text-[12px] font-semibold tracking-[.13em]">ELITE EMPORIUM</span>
              <span className="mt-1 block text-[9px] font-medium uppercase tracking-[.18em] text-white/40">Owner workspace</span>
            </span>
          </Link>
          <button className="grid size-10 place-items-center rounded-[var(--radius-sm)] hover:bg-white/10 lg:hidden" aria-label="Close navigation" onClick={closeNavigation}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Administration">
          {grouped.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">{group.label}</p>
              <div className="grid gap-1">
                {group.items.map(({ href, label, Icon }) => {
                  const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeNavigation}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-[.7rem] px-3 py-2.5 text-[13px] font-medium text-white/62 transition hover:bg-white/[.07] hover:text-white',
                        active && 'bg-white/[.11] text-white hover:bg-white/[.14]'
                      )}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      <span className="flex-1">{label}</span>
                      {active ? <span className="size-1.5 rounded-full bg-white/75" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-3">
          <button
            onClick={() => authApi.logout().then(() => router.replace('/en/login'))}
            className="flex w-full items-center gap-3 rounded-[.7rem] px-3 py-2.5 text-[13px] font-medium text-white/60 transition hover:bg-white/[.07] hover:text-white"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-[var(--color-border)] bg-[#f4f5f1]/88 px-4 backdrop-blur-xl md:px-8">
          <IconButton
            icon={Menu}
            label="Open administration navigation"
            variant="outline"
            className="lg:hidden"
            onClick={() => setNavigationOpen(true)}
          />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--color-muted)]">Administration</p>
            <p className="truncate text-sm font-semibold">{activeLink?.label || 'Workspace'}</p>
          </div>
          <div className="relative ml-auto hidden w-full max-w-xs md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={16} />
            <NativeSelect
              aria-label="Jump to administration section"
              className="!pl-10 !min-h-10 text-sm"
              value={activeLink?.href || ''}
              onChange={(event) => event.target.value && router.push(event.target.value)}
              options={[{ value: '', label: 'Find a section…' }, ...permitted.map(({ href, label }) => ({ value: href, label }))]}
            />
          </div>
          <div className="ml-2 hidden text-right sm:block">
            <p className="max-w-44 truncate text-sm font-semibold">{auth.user.name}</p>
            <p className="text-[11px] text-[var(--color-muted)]">Owner / administrator</p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-[.7rem] bg-[var(--color-primary)] text-xs font-semibold text-white">
            {auth.user.name?.slice(0, 1)?.toUpperCase()}
          </span>
        </header>

        <div className="p-4 md:p-8 lg:p-10 xl:p-12">{children}</div>
      </main>
    </div>
  );
}