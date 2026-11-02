import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Mail, MapPin, Phone } from 'lucide-react';
import { localizedHref } from '@/lib/storefront';
import { ConsentLink } from '@/components/providers/consent-manager';

function phoneHref(value) {
  const digits = String(value || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

export async function Footer({ locale, menu, settings }) {
  const t = await getTranslations({ locale, namespace: 'Footer' });
  const store = settings?.store || {};
  const socials = (store.socialLinks || []).filter((link) => /^https:\/\//.test(link.url));
  const careLinks = menu?.items?.length
    ? menu.items.slice(0, 8).map((item) => ({ id: item.id, label: item.label, href: localizedHref(item.url, locale) }))
    : [
        { id: 'contact', label: t('contact'), href: `/${locale}/contact` },
        { id: 'track', label: t('track'), href: `/${locale}/track-order` },
        { id: 'returns', label: t('returns'), href: `/${locale}/returns` },
        { id: 'size', label: t('sizeGuide'), href: `/${locale}/page/size-guide` },
        { id: 'shipping', label: t('shipping'), href: `/${locale}/page/shipping` },
        { id: 'faq', label: t('faq'), href: `/${locale}/page/faq` }
      ];
  const legal = [
    store.tradeLicenseNumber ? t('tradeLicense', { value: store.tradeLicenseNumber }) : null,
    store.dbid ? t('dbid', { value: store.dbid }) : null,
    store.bin ? t('bin', { value: store.bin }) : null
  ].filter(Boolean);
  const payments = ['COD', settings?.payments?.bkash?.enabled ? 'bKash' : null].filter(Boolean);
  return (
    <footer className="mt-20 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-[14px]">
      <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className={`text-[15px] font-medium ${locale === 'bn' ? '' : 'uppercase tracking-[.22em]'}`}>{locale === 'bn' ? store.name?.bn || 'এলিট এম্পোরিয়াম' : 'Elite Emporium'}</p>
          <p className="mt-4 max-w-xs leading-6 text-[var(--color-muted)]">{t('about')}</p>
          {socials.length ? (
            <div className="mt-6">
              <p className="eyebrow">{t('follow')}</p>
              <ul className="mt-3 flex flex-wrap gap-2">{socials.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border-strong)] px-3.5 text-[13px] hover:border-[var(--color-text)]">{link.label}</a></li>)}</ul>
            </div>
          ) : null}
        </div>
        <FooterColumn title={t('shop')}>
          <Link href={`/${locale}/shop?sort=newest`}>{locale === 'bn' ? 'নতুন এসেছে' : 'New in'}</Link>
          <Link href={`/${locale}/shop`}>{locale === 'bn' ? 'সব পণ্য' : 'Shop all'}</Link>
          <Link href={`/${locale}/shop?sale=true`}>{locale === 'bn' ? 'সেল' : 'Sale'}</Link>
          <Link href={`/${locale}/blog`}>{locale === 'bn' ? 'লুকবুক ও ব্লগ' : 'Lookbook & journal'}</Link>
        </FooterColumn>
        <FooterColumn title={t('help')}>
          {careLinks.map((link) => <Link key={link.id} href={link.href}>{link.label}</Link>)}
        </FooterColumn>
        <FooterColumn title={t('company')}>
          {store.address ? <p className="flex items-start gap-2 text-[var(--color-muted)]"><MapPin size={15} className="mt-1 shrink-0" />{store.address}</p> : null}
          {phoneHref(store.contactPhone) ? <a href={phoneHref(store.contactPhone)} className="flex items-center gap-2"><Phone size={15} />{store.contactPhone}</a> : null}
          {store.contactEmail ? <a href={`mailto:${store.contactEmail}`} className="flex items-center gap-2"><Mail size={15} />{store.contactEmail}</a> : null}
          <Link href={`/${locale}/page/about`}>{t('about2')}</Link>
        </FooterColumn>
      </div>
      <div className="border-t border-[var(--color-border)]">
        <div className="container flex flex-col gap-4 py-6 text-[12px] text-[var(--color-muted)] md:flex-row md:items-center md:justify-between">
          <div className="grid gap-1">
            <p>{t('rights', { year: new Date().getFullYear() })}</p>
            {legal.length ? <p>{legal.join(' · ')}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2">{t('payments')}: {payments.map((method) => <span key={method} className="rounded-[3px] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-0.5 font-medium text-[var(--color-text)]">{method}</span>)}</span>
            <Link href={`/${locale}/page/privacy-policy`} className="hover:text-[var(--color-text)]">{t('privacy')}</Link>
            <Link href={`/${locale}/page/terms`} className="hover:text-[var(--color-text)]">{t('terms')}</Link>
            <ConsentLink />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return <div><h2 className="eyebrow">{title}</h2><div className="mt-4 grid gap-3 [&_a:hover]:underline [&_a]:underline-offset-4">{children}</div></div>;
}
