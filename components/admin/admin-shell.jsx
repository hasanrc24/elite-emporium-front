'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Bell, Boxes, ClipboardList, Crown, FileText, Image, LayoutDashboard, LogOut, Megaphone, Menu, MessageSquareText, PackageSearch, RotateCcw, Settings, ShieldCheck, ShoppingBag, Tags, Truck, UserCog, Users, Webhook, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { authApi } from '@/lib/api/auth-api';
import { cn } from '@/lib/utils';
import { DropdownItem, DropdownLabel, DropdownMenuRoot, DropdownSeparator, IconButton } from '@/components/ui';
import { ThemeToggle } from './theme-toggle';

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
  { label: 'Commerce', test: ({ href }) => ['/admin/orders', '/admin/payments', '/admin/refunds', '/admin/returns', '/admin/shipments'].includes(href) },
  { label: 'Customers', test: ({ href }) => ['/admin/customers', '/admin/privacy-requests', '/admin/contact-messages', '/admin/reviews'].includes(href) },
  { label: 'Store experience', test: ({ href }) => href.startsWith('/admin/content') || href.startsWith('/admin/appearance') || href === '/admin/media' },
  { label: 'Marketing & insights', test: ({ href }) => ['/admin/coupons', '/admin/reports', '/admin/exports'].includes(href) },
  { label: 'Platform', test: ({ href }) => ['/admin/notifications', '/admin/notification-deliveries', '/admin/integrations', '/admin/webhooks'].includes(href) },
  { label: 'Administration', test: ({ href }) => ['/admin/staff', '/admin/roles', '/admin/audits', '/admin/settings'].includes(href) }
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
    <div className="admin-shell-bg min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {navigationOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden"
          onClick={closeNavigation}
        />
      ) : null}

      <aside className={cn('admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[240px] -translate-x-full flex-col border-r border-white/5 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', navigationOpen && 'translate-x-0')}>
        <div className="flex min-h-[68px] items-center justify-between border-b border-white/8 px-5">
          <Link href="/admin" onClick={closeNavigation} className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-[.7rem] bg-[#d6a72e]/12 text-[#e9bb45]"><Crown size={23} /></span>
            <span className="leading-tight">
              <span className="block text-[12px] font-bold tracking-[.14em]">ELITE</span>
              <span className="block text-[12px] font-bold tracking-[.14em]">EMPORIUM</span>
            </span>
          </Link>
          <button className="grid size-10 place-items-center rounded-[var(--radius-sm)] hover:bg-white/10 lg:hidden" aria-label="Close navigation" onClick={closeNavigation}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Administration">
          {grouped.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-white/32">{group.label}</p>
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
                        'flex items-center gap-3 rounded-[.6rem] px-3 py-2 text-[12.5px] font-medium text-white/65 transition hover:bg-white/[.07] hover:text-white',
                        active && 'bg-[#665ce7] text-white shadow-[0_8px_18px_rgb(63_52_190_/_25%)] hover:bg-[#7066ef]'
                      )}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      <span className="flex-1">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-3">
          <Link
            href="/admin/account"
            onClick={closeNavigation}
            className={cn(
              'mb-1 flex w-full items-center gap-3 rounded-[.7rem] px-3 py-2.5 text-[13px] font-medium text-white/60 transition hover:bg-white/[.07] hover:text-white',
              pathname === '/admin/account' && 'bg-white/[.1] text-white',
            )}
          >
            <UserCog size={17} />
            My account
          </Link>
          <button
            onClick={() => authApi.logout().then(() => router.replace('/admin/login'))}
            className="flex w-full items-center gap-3 rounded-[.7rem] px-3 py-2.5 text-[13px] font-medium text-white/60 transition hover:bg-white/[.07] hover:text-white"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="admin-topbar sticky top-0 z-30 flex min-h-[68px] items-center gap-3 border-b border-[var(--color-border)] px-4 backdrop-blur-xl md:px-7">
          <IconButton
            icon={Menu}
            label="Open administration navigation"
            variant="outline"
            className="lg:hidden"
            onClick={() => setNavigationOpen(true)}
          />
          <div className="min-w-0 lg:hidden">
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--color-muted)]">Administration</p>
            <p className="truncate text-sm font-semibold">{activeLink?.label || 'Workspace'}</p>
          </div>
          <span className="ml-auto hidden text-xs font-semibold text-[var(--color-muted)] xl:block">EN</span>
          <ThemeToggle />
          <button type="button" aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]">
            <Bell size={18} />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-surface-raised)]" />
          </button>
          <DropdownMenuRoot
            trigger={
              <button
                type="button"
                aria-label="Open account menu"
                aria-haspopup="menu"
                className="ml-2 flex items-center gap-2 rounded-xl p-1 text-left transition hover:bg-[var(--color-surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-44 truncate text-sm font-semibold">{auth.user.name}</span>
                  <span className="block text-[11px] text-[var(--color-muted)]">Account menu</span>
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-[.7rem] bg-[var(--color-primary)] text-xs font-semibold text-white">
                  {auth.user.name?.slice(0, 1)?.toUpperCase()}
                </span>
              </button>
            }
          >
            <DropdownLabel>{auth.user.name}</DropdownLabel>
            <DropdownItem onSelect={() => router.push('/admin/account')}>
              <UserCog size={16} />
              My account
            </DropdownItem>
            {auth.user.permissions.includes('settings.manage') ? (
              <DropdownItem onSelect={() => router.push('/admin/settings')}>
                <Settings size={16} />
                Store settings
              </DropdownItem>
            ) : null}
            <DropdownSeparator />
            <DropdownItem destructive onSelect={() => authApi.logout().then(() => router.replace('/admin/login'))}>
              <LogOut size={16} />
              Sign out
            </DropdownItem>
          </DropdownMenuRoot>
        </header>

        <div className="p-4 md:p-7 xl:p-8">{children}</div>
      </main>
    </div>
  );
}
