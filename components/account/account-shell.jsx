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
    <div className="container py-8 md:py-11">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="storefront-page-title mt-2">Welcome back, {auth.user.name.split(' ')[0]}!</h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[var(--color-muted)]">
          Orders, returns, profile details, and privacy controls in one place.
        </p>
      </header>

      <div className="grid items-start gap-7 md:grid-cols-[190px_1fr]">
      <nav aria-label="Account" className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pb-px md:sticky md:top-24 md:grid md:overflow-visible md:rounded-[var(--radius-lg)] md:border md:bg-[var(--color-surface)] md:p-2">
        {links.map(([suffix, label]) => {
          const href = `${base}${suffix}`;
          const active = pathname === href || (suffix && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative whitespace-nowrap px-3 py-2.5 text-xs font-medium transition md:rounded-[var(--radius-sm)]',
                active
                  ? 'text-[var(--color-primary)] after:absolute after:inset-x-2 after:bottom-[-1px] after:h-0.5 after:bg-[var(--color-primary)] md:bg-[var(--color-primary-soft)] md:after:hidden'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
