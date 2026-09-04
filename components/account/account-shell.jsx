'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Alert, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const links = [
  ['', 'Overview'],
  ['/orders', 'Orders'],
  ['/returns', 'Returns'],
  ['/reviews', 'Reviews'],
  ['/profile', 'Profile'],
  ['/addresses', 'Addresses'],
  ['/security', 'Security'],
  ['/privacy', 'Privacy']
];

export function AccountShell({ locale, children }) {
  const auth = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const base = `/${locale}/account`;

  useEffect(() => {
    if (auth.status === 'anonymous') {
      router.replace(`/${locale}/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [auth.status, locale, pathname, router]);

  if (auth.status === 'checking') {
    return (
      <div className="container py-16">
        <Skeleton className="h-32 rounded-[var(--radius-lg)]">
          <span className="sr-only">Checking your session…</span>
        </Skeleton>
      </div>
    );
  }
  if (auth.status === 'unavailable') {
    return (
      <div className="container py-16">
        <Alert tone="warning" title="Account services are temporarily unavailable">
          Refresh to try again.
        </Alert>
      </div>
    );
  }
  if (auth.status !== 'authenticated') return null;

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="page-title mt-2">Hello, {auth.user.name}</h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[var(--color-muted)]">
          Orders, returns, profile details, and privacy controls in one place.
        </p>
      </header>

      <nav aria-label="Account" className="mb-9 flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pb-px">
        {links.map(([suffix, label]) => {
          const href = `${base}${suffix}`;
          const active = pathname === href || (suffix && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative whitespace-nowrap px-3 py-3 text-sm font-medium transition',
                active
                  ? 'text-[var(--color-primary)] after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:bg-[var(--color-primary)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <section className="min-w-0">{children}</section>
    </div>
  );
}