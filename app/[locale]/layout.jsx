import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/storefront/header';
import { Footer } from '@/components/storefront/footer';
import { serverGet } from '@/lib/api/server-api';
import { ConsentManager } from '@/components/providers/consent-manager';

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!['en', 'bn'].includes(locale)) notFound();
  const messages = await getMessages();
  let navigation = {}; let home = {}; let settings = {};
  try { [navigation, home, settings] = await Promise.all([serverGet('/storefront/navigation', { locale, tags: ['navigation'], revalidate: 60 }), serverGet('/storefront/home', { locale, tags: ['homepage', 'theme'], revalidate: 60 }), serverGet('/storefront/settings', { locale, tags: ['settings'], revalidate: 60 })]); } catch { /* Safe launch defaults remain available while the API starts. */ }
  const theme = home?.theme || {};
  const style = /** @type {import('react').CSSProperties} */ ({ '--color-primary': theme.primary, '--color-accent': theme.accent, '--color-bg': theme.background, '--color-text': theme.text, '--radius': theme.radius });
  return <NextIntlClientProvider messages={messages}><div className="storefront min-h-screen" style={style}><Header locale={locale} labels={messages.Nav} menu={navigation.header} announcement={theme.announcement} store={settings.store} /><main id="main">{children}</main><Footer locale={locale} menu={navigation.footer} /><ConsentManager settings={settings.analytics} /></div></NextIntlClientProvider>;
}
