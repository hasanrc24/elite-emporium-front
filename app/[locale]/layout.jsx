import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/storefront/header';
import { Footer } from '@/components/storefront/footer';
import { ChatButton } from '@/components/storefront/chat-button';
import { AttributionCapture } from '@/components/storefront/attribution-capture';
import { StorefrontProvider } from '@/components/storefront/storefront-context';
import { serverGet } from '@/lib/api/server-api';
import { ConsentManager } from '@/components/providers/consent-manager';

const hex = /^#[0-9a-f]{6}$/i;
const safeColor = (value) => (typeof value === 'string' && hex.test(value) ? value : undefined);
const safeRadius = (value) => (typeof value === 'string' && /^(0|0?\.\d+|1(\.0+)?)rem$/.test(value) ? value : undefined);

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!['en', 'bn'].includes(locale)) notFound();
  const messages = await getMessages({ locale });
  const [navigation, home, settings, categories] = await Promise.all([
    serverGet('/storefront/navigation', { locale, tags: ['navigation'], revalidate: 60 }).catch(() => ({})),
    serverGet('/storefront/home', { locale, tags: ['homepage', 'theme'], revalidate: 60 }).catch(() => ({})),
    serverGet('/storefront/settings', { locale, tags: ['settings'], revalidate: 60 }).catch(() => ({})),
    serverGet('/categories', { locale, tags: ['categories'], revalidate: 300 }).catch(() => [])
  ]);
  const theme = home?.theme || {};
  // Only validated token values reach CSS (FE-UI-001); anything else keeps the defaults.
  // They are set on the root so portaled sheets and dialogs pick them up too.
  const tokens = Object.entries({ '--theme-primary': safeColor(theme.primary), '--theme-accent': safeColor(theme.accent), '--theme-background': safeColor(theme.background), '--theme-text': safeColor(theme.text), '--theme-radius': safeRadius(theme.radius) }).filter(([, value]) => value);
  const themeCss = tokens.length ? `:root{${tokens.map(([name, value]) => `${name}:${value}`).join(';')}}` : null;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <StorefrontProvider locale={locale} settings={settings}>
        {themeCss ? <style>{themeCss}</style> : null}
        <div className="storefront">
          <Header locale={locale} menu={navigation.header} categories={Array.isArray(categories) ? categories : []} announcement={theme.announcement} store={settings.store} />
          <main id="main">{children}</main>
          <Footer locale={locale} menu={navigation.footer} settings={settings} />
          <ChatButton store={settings.store} locale={locale} />
          <ConsentManager settings={settings.analytics} />
          <AttributionCapture />
        </div>
      </StorefrontProvider>
    </NextIntlClientProvider>
  );
}
