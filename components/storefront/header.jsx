'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, Crown, Heart, Home, Menu, Search, ShoppingBag, Store, UserRound, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/cart-api';
import { wishlistApi } from '@/lib/api/wishlist-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { Badge, IconButton, Input } from '@/components/ui';

function localizedHref(url, locale) {
  if (!url) return `/${locale}`;
  if (/^https:\/\//.test(url)) return url;
  return `/${locale}${url.startsWith('/') ? url : `/${url}`}`;
}

export function Header({ locale, labels, menu, announcement }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const auth = useAuthStore();
  const cart = useQuery({ queryKey: ['cart', locale], queryFn: () => cartApi.current(locale) });
  const wishlist = useQuery({ queryKey: ['wishlist', locale], queryFn: () => wishlistApi.current(locale) });
  const otherLocale = locale === 'en' ? 'bn' : 'en';
  const translatedPath = pathname.replace(/^\/(en|bn)(?=\/|$)/, `/${otherLocale}`);
  const items = menu?.items?.length
    ? menu.items
    : [
        { id: 'home', label: labels.home, url: '/' },
        { id: 'shop', label: labels.shop, url: '/shop' },
        { id: 'track', label: labels.track, url: '/track-order' }
      ];
  const isActive = (url) => pathname === localizedHref(url, locale) || (url !== '/' && pathname.startsWith(localizedHref(url, locale)));

  return (
    <>
      {announcement?.enabled ? (
        <div className="bg-[var(--color-primary-strong)] px-4 py-2 text-center text-[11px] font-medium tracking-[.08em] text-white/90 sm:text-xs">
          {announcement.url ? (
            <Link className="inline-flex items-center gap-1.5 transition hover:text-white" href={localizedHref(announcement.url, locale)}>
              {locale === 'bn' ? announcement.textBn : announcement.textEn}
              <ChevronRight size={13} />
            </Link>
          ) : (
            locale === 'bn' ? announcement.textBn : announcement.textEn
          )}
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-xl">
        <div className="container flex min-h-[68px] items-center gap-4">
          <IconButton
            icon={mobileOpen ? X : Menu}
            label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            variant="ghost"
            className="md:hidden"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          />
          <Link href={`/${locale}`} className="group flex shrink-0 items-center gap-3" aria-label="Elite Emporium home">
            <span className="grid size-9 place-items-center text-[var(--color-primary)] transition group-hover:scale-105"><Crown size={27} strokeWidth={1.7} /></span>
            <span className="hidden leading-none sm:block">
              <span className="block text-[12px] font-bold tracking-[.13em]">ELITE</span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[.2em] text-[var(--color-muted)]">EMPORIUM</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="ml-4 hidden items-stretch self-stretch md:flex">
            {items.map((item) => (
              <Link
                key={item.id}
                href={localizedHref(item.url, locale)}
                aria-current={isActive(item.url) ? 'page' : undefined}
                className={`relative flex items-center px-3 text-[12px] font-semibold transition ${isActive(item.url) ? 'text-[var(--color-primary)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-[var(--color-primary)]' : 'text-[var(--color-text)] hover:text-[var(--color-primary)]'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={`/${locale}/search`} className="ml-auto hidden max-w-72 flex-1 lg:flex">
            <label className="sr-only" htmlFor="header-search">Search products</label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={17} />
              <Input id="header-search" name="q" minLength={2} placeholder={locale === 'bn' ? 'পণ্য খুঁজুন…' : 'Search dresses, styles…'} className="pl-10 pr-3" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link href={translatedPath} hrefLang={otherLocale} aria-label={`Switch language to ${otherLocale}`} className="grid min-h-10 min-w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[11px] font-bold uppercase transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
              {otherLocale}
            </Link>
            <UtilityLink href={`/${locale}/wishlist`} label={`Wishlist, ${wishlist.data?.itemCount || 0} items`} count={wishlist.data?.itemCount}>
              <Heart size={20} />
            </UtilityLink>
            <UtilityLink href={auth.status === 'authenticated' ? `/${locale}/account/orders` : `/${locale}/login`} label={auth.status === 'authenticated' ? labels.account : labels.login}>
              <UserRound size={20} />
            </UtilityLink>
            <UtilityLink href={`/${locale}/cart`} label={`${labels.cart}, ${cart.data?.itemCount || 0} items`} count={cart.data?.itemCount}>
              <ShoppingBag size={21} />
            </UtilityLink>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] md:hidden">
            <nav aria-label="Mobile navigation" className="container grid gap-1 py-4">
              <form action={`/${locale}/search`} className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={18} />
                <Input name="q" minLength={2} aria-label="Search products" placeholder="Search products…" className="pl-10" />
              </form>
              {items.map((item) => (
                <Link key={item.id} className={`flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold transition ${isActive(item.url) ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'hover:bg-[var(--color-surface-muted)]'}`} onClick={() => setMobileOpen(false)} href={localizedHref(item.url, locale)}>
                  {item.label}
                  <ChevronRight size={17} />
                </Link>
              ))}
              <Link className="flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold hover:bg-[var(--color-surface-muted)]" onClick={() => setMobileOpen(false)} href={`/${locale}/wishlist`}>
                Wishlist
                <ChevronRight size={17} />
              </Link>
            </nav>
          </div>
        ) : null}
      </header>
      <nav aria-label="Mobile shortcuts" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--color-border)] bg-white/96 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(20_18_15_/.08)] backdrop-blur-xl md:hidden">
        <MobileShortcut href={`/${locale}`} label="Home" Icon={Home} active={pathname === `/${locale}`} />
        <MobileShortcut href={`/${locale}/shop`} label="Shop" Icon={Store} active={pathname.startsWith(`/${locale}/shop`)} />
        <MobileShortcut href={`/${locale}/wishlist`} label="Saved" Icon={Heart} count={wishlist.data?.itemCount} active={pathname.startsWith(`/${locale}/wishlist`)} />
        <MobileShortcut href={auth.status === 'authenticated' ? `/${locale}/account` : `/${locale}/login`} label="Account" Icon={UserRound} active={pathname.includes('/account') || pathname.includes('/login')} />
        <MobileShortcut href={`/${locale}/cart`} label="Bag" Icon={ShoppingBag} count={cart.data?.itemCount} active={pathname.startsWith(`/${locale}/cart`)} />
      </nav>
    </>
  );
}

function MobileShortcut({ href, label, Icon, active, count = 0 }) {
  return <Link href={href} className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`}><span className="relative"><Icon size={18} />{count ? <i className="absolute -right-2 -top-1 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-[var(--color-primary-strong)] px-1 text-[8px] not-italic text-white">{count}</i> : null}</span>{label}</Link>;
}

function UtilityLink({ href, label, count = 0, children }) {
  return (
    <Link href={href} aria-label={label} className="relative grid size-10 place-items-center rounded-[var(--radius-sm)] text-[var(--color-muted)] transition hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] active:scale-95 sm:size-11">
      {children}
      {count ? (
        <Badge tone="danger" className="absolute right-0 top-0 grid min-h-[18px] min-w-[18px] place-items-center !rounded-md border-2 !border-[var(--color-bg)] !bg-[var(--color-primary)] !px-1 !text-[9px] !text-white">
          {count > 99 ? '99+' : count}
        </Badge>
      ) : null}
    </Link>
  );
}
