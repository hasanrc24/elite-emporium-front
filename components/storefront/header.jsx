'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Globe, Heart, Home, LayoutGrid, Menu, Moon, PackageSearch, Search, ShoppingBag, Sun, UserRound } from 'lucide-react';
import { wishlistApi } from '@/lib/api/wishlist-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useCart } from '@/lib/hooks/use-cart';
import { formatNumber, localizedHref } from '@/lib/storefront';
import { setTheme, useTheme } from '@/lib/theme';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUiStore } from '@/lib/ui-store';
import { Sheet } from './sheet';
import { SearchOverlay } from './search-overlay';
import { CartDrawer } from './cart-drawer';

function Wordmark({ store, locale }) {
  const name = store?.name?.[locale] || store?.name?.en || 'Elite Emporium';
  if (store?.logo?.url) return <Image src={store.logo.url} alt={store.logo.altText || name} width={300} height={72} className="h-8 w-auto max-w-[150px] object-contain md:h-9" priority />;
  return <span className={`text-[15px] font-medium md:text-[17px] ${locale === 'bn' ? '' : 'uppercase tracking-[.24em]'}`}>{locale === 'bn' ? name : 'Elite Emporium'}</span>;
}

function useCount(locale) {
  const { cart } = useCart(locale);
  const wishlist = useQuery({ queryKey: ['wishlist', locale], queryFn: () => wishlistApi.current(locale) });
  return { cartCount: cart.data?.itemCount || 0, wishlistCount: wishlist.data?.itemCount || 0 };
}

function CountBadge({ count }) {
  const locale = useLocale();
  if (!count) return null;
  return <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--color-text)] px-1 text-[10px] font-medium leading-none text-[var(--color-bg)] tabular-nums">{count > 99 ? `${formatNumber(99, locale)}+` : formatNumber(count, locale)}</span>;
}

export function Header({ locale, menu, categories = [], announcement, store }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const auth = useAuthStore();
  const { cartCount, wishlistCount } = useCount(locale);
  const { setCartOpen, setSearchOpen, menuOpen, setMenuOpen } = useUiStore();
  const [scrolled, setScrolled] = useState(false);
  const otherLocale = locale === 'en' ? 'bn' : 'en';
  const translatedPath = (pathname || `/${locale}`).replace(/^\/(en|bn)(?=\/|$)/, `/${otherLocale}`);
  const topCategories = categories.filter((category) => !category.parentId).slice(0, 8);
  const items = menu?.items?.length
    ? menu.items
    : [
        { id: 'new', label: t('newArrivals'), url: '/shop?sort=newest' },
        ...topCategories.slice(0, 5).map((category) => ({ id: category.id, label: category.name, url: `/category/${category.slug}` })),
        { id: 'sale', label: t('sale'), url: '/shop?sale=true' }
      ];
  const accountHref = auth.status === 'authenticated' ? `/${locale}/account` : `/${locale}/login`;
  const checkout = pathname?.startsWith(`/${locale}/checkout`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Navigating closes any open storefront overlay.
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname, setMenuOpen, setSearchOpen]);

  const announcementText = announcement?.enabled ? (locale === 'bn' ? announcement.textBn : announcement.textEn) : null;

  return (
    <>
      {announcementText && !checkout ? (
        <div className="bg-[var(--color-text)] px-4 py-2 text-center text-[12px] tracking-[.02em] text-[var(--color-bg)]">
          {announcement.url ? <Link className="inline-flex items-center gap-1 hover:underline" href={localizedHref(announcement.url, locale)}>{announcementText}<ChevronRight size={13} /></Link> : announcementText}
        </div>
      ) : null}
      <header className={`sticky top-0 z-40 border-b bg-[var(--color-bg)]/95 backdrop-blur transition-[border-color,box-shadow] ${scrolled ? 'border-[var(--color-border)] shadow-[0_1px_0_rgb(0_0_0/.02)]' : 'border-transparent'}`}>
        <div className="container grid h-[var(--header-height)] grid-cols-[1fr_auto_1fr] items-center gap-3 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex items-center gap-1 lg:hidden">
            {!checkout ? <button type="button" onClick={() => setMenuOpen(true)} aria-label={t('menu')} aria-expanded={menuOpen} className="-ml-2 grid size-11 place-items-center"><Menu size={22} /></button> : null}
            {!checkout ? <button type="button" onClick={() => setSearchOpen(true)} aria-label={t('search')} className="grid size-11 place-items-center"><Search size={20} /></button> : null}
          </div>
          <Link href={`/${locale}`} className="justify-self-center lg:justify-self-start" aria-label={`${store?.name?.[locale] || 'Elite Emporium'} — ${t('home')}`}>
            <Wordmark store={store} locale={locale} />
          </Link>
          {!checkout ? (
            <nav aria-label="Main" className="hidden justify-center lg:flex">
              <ul className="flex items-center gap-1">
                {items.map((item) => <DesktopNavItem key={item.id} item={item} locale={locale} pathname={pathname} />)}
              </ul>
            </nav>
          ) : <span className="hidden lg:block" />}
          <div className="flex items-center justify-end gap-0.5">
            {!checkout ? (
              <>
                <button type="button" onClick={() => setSearchOpen(true)} aria-label={t('search')} className="hidden size-11 place-items-center lg:grid"><Search size={20} /></button>
                <Link href={translatedPath} hrefLang={otherLocale} lang={otherLocale} aria-label={t('languageLabel')} className="hidden h-11 items-center gap-1.5 px-2 text-[13px] lg:flex"><Globe size={17} />{t('language')}</Link>
                <ThemeToggle label={t('theme')} className="hidden size-11 lg:grid" />
                <Link href={accountHref} aria-label={auth.status === 'authenticated' ? t('account') : t('login')} className="hidden size-11 place-items-center lg:grid"><UserRound size={20} /></Link>
                <Link href={`/${locale}/wishlist`} aria-label={`${t('wishlist')} (${wishlistCount})`} className="relative hidden size-11 place-items-center lg:grid"><Heart size={20} /><CountBadge count={wishlistCount} /></Link>
              </>
            ) : null}
            <button type="button" onClick={() => setCartOpen(true)} aria-label={`${t('cart')} (${cartCount})`} className="relative -mr-2 grid size-11 place-items-center"><ShoppingBag size={21} /><CountBadge count={cartCount} /></button>
          </div>
        </div>
      </header>

      <MobileMenu locale={locale} items={items} categories={topCategories} open={menuOpen} onOpenChange={setMenuOpen} translatedPath={translatedPath} otherLocale={otherLocale} accountHref={accountHref} />
      <SearchOverlay locale={locale} categories={topCategories} />
      <CartDrawer locale={locale} />

      {!checkout ? (
        <nav aria-label={t('menu')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-bg)] pb-[env(safe-area-inset-bottom)] md:hidden">
          <BottomLink href={`/${locale}`} label={t('home')} Icon={Home} active={pathname === `/${locale}`} />
          <BottomButton label={t('categories')} Icon={LayoutGrid} onClick={() => setMenuOpen(true)} active={menuOpen} />
          <BottomButton label={t('search')} Icon={Search} onClick={() => setSearchOpen(true)} />
          <BottomLink href={`/${locale}/wishlist`} label={t('wishlist')} Icon={Heart} count={wishlistCount} active={pathname?.startsWith(`/${locale}/wishlist`)} />
          <BottomLink href={accountHref} label={t('account')} Icon={UserRound} active={pathname?.includes('/account') || pathname?.endsWith('/login')} />
        </nav>
      ) : null}
    </>
  );
}

function DesktopNavItem({ item, locale, pathname }) {
  const href = localizedHref(item.url, locale);
  const active = pathname === href.split('?')[0];
  const linkClass = `relative inline-flex h-[var(--header-height)] items-center gap-1 px-3 text-[14px] transition after:absolute after:inset-x-3 after:bottom-[18px] after:h-px after:origin-left after:bg-current after:transition-transform ${active ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'}`;
  if (!item.children?.length) return <li><Link href={href} className={linkClass} aria-current={active ? 'page' : undefined}>{item.label}</Link></li>;
  return (
    <li className="group relative">
      <Link href={href} className={linkClass} aria-haspopup="true">{item.label}<ChevronDown size={14} className="transition group-hover:rotate-180" /></Link>
      <div className="invisible absolute left-1/2 top-full z-50 min-w-56 -translate-x-1/2 border border-[var(--color-border)] bg-[var(--color-bg)] p-2 opacity-0 shadow-[var(--shadow-md)] transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <ul className="grid">
          {item.children.map((child) => <li key={child.id}><Link href={localizedHref(child.url, locale)} className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm hover:bg-[var(--color-surface)]">{child.label}</Link></li>)}
        </ul>
      </div>
    </li>
  );
}

function MobileMenu({ locale, items, categories, open, onOpenChange, translatedPath, otherLocale, accountHref }) {
  const t = useTranslations('Nav');
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="left" title={t('menu')} closeLabel={t('closeMenu')}>
      <div className="grid gap-6 p-5">
        {categories.length ? (
          <div className="grid grid-cols-3 gap-3">
            {categories.slice(0, 6).map((category) => (
              <Link key={category.id} href={`/${locale}/category/${category.slug}`} onClick={close} className="grid justify-items-center gap-2 text-center text-[12px]">
                <span className="relative block aspect-square w-full overflow-hidden rounded-full bg-[var(--color-surface)]">{category.imageUrl ? <Image src={category.imageUrl} alt="" fill sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center text-lg font-medium text-[var(--color-muted)]">{category.name.slice(0, 1)}</span>}</span>
                <span className="line-clamp-2">{category.name}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={localizedHref(item.url, locale)} onClick={close} className="flex min-h-12 items-center justify-between text-[15px]">{item.label}<ChevronRight size={16} className="text-[var(--color-muted)]" /></Link>
              {item.children?.length ? <ul className="pb-2 pl-3">{item.children.map((child) => <li key={child.id}><Link href={localizedHref(child.url, locale)} onClick={close} className="flex min-h-10 items-center text-sm text-[var(--color-muted)]">{child.label}</Link></li>)}</ul> : null}
            </li>
          ))}
        </ul>
        <ul className="grid gap-1 text-[15px]">
          <li><Link href={accountHref} onClick={close} className="flex min-h-11 items-center gap-3"><UserRound size={18} />{t('account')}</Link></li>
          <li><Link href={`/${locale}/track-order`} onClick={close} className="flex min-h-11 items-center gap-3"><PackageSearch size={18} />{t('track')}</Link></li>
          <li><Link href={`/${locale}/contact`} onClick={close} className="flex min-h-11 items-center gap-3"><ChevronRight size={18} />{t('help')}</Link></li>
          <li><Link href={translatedPath} hrefLang={otherLocale} lang={otherLocale} onClick={close} className="flex min-h-11 items-center gap-3"><Globe size={18} />{t('language')}</Link></li>
          <li><ThemeSwitchRow label={t('theme')} /></li>
        </ul>
      </div>
    </Sheet>
  );
}

function ThemeSwitchRow({ label }) {
  const dark = useTheme() === 'dark';
  return (
    <button type="button" role="switch" aria-checked={dark} onClick={() => setTheme(dark ? 'light' : 'dark')} className="flex min-h-11 w-full items-center gap-3 text-left">
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className={`relative h-6 w-10 rounded-full transition-colors ${dark ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-strong)]'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-[var(--color-bg)] shadow-sm transition-[left] ${dark ? 'left-[1.125rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function BottomLink({ href, label, Icon, active, count = 0 }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] ${active ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
      <span className="relative"><Icon size={20} strokeWidth={active ? 2.1 : 1.7} /><CountBadge count={count} /></span>
      {label}
    </Link>
  );
}

function BottomButton({ label, Icon, onClick, active = false }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] ${active ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}`}>
      <Icon size={20} strokeWidth={1.7} />
      {label}
    </button>
  );
}
