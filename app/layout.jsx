import { headers } from 'next/headers';
import localFont from 'next/font/local';
import { AppProviders } from '@/providers/app-providers';
import { themeBootstrapScript } from '@/lib/theme-script';
import './globals.css';

// Self-hosted brand fonts (FE-DESIGN-003): Jost for Latin, Hind Siliguri for Bangla.
const jost = localFont({
  src: [{ path: '../node_modules/@fontsource-variable/jost/files/jost-latin-wght-normal.woff2', weight: '300 700', style: 'normal' }],
  variable: '--font-jost',
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});
const hind = localFont({
  src: [
    { path: '../node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../node_modules/@fontsource/hind-siliguri/files/hind-siliguri-bengali-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-hind',
  display: 'swap',
  preload: false,
  fallback: ['Noto Sans Bengali', 'system-ui', 'sans-serif'],
});

export const metadata = {
  title: { default: 'Elite Emporium', template: '%s | Elite Emporium' },
  description: 'Women’s fashion for Bangladesh: dresses, three-pieces, sarees and more, with cash on delivery nationwide.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: { title: 'Elite Emporium', description: 'Women’s fashion for Bangladesh with cash on delivery nationwide.', type: 'website' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
  ],
};

export default async function RootLayout({ children }) {
  const locale = (await headers()).get('x-ee-locale') || 'en';
  // The theme script sets data-theme before first paint, so the root attribute
  // intentionally differs from the server render.
  return <html lang={locale} className={`${jost.variable} ${hind.variable}`} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head><body><a href="#main" className="skip-link">{locale === 'bn' ? 'মূল অংশে যান' : 'Skip to content'}</a><AppProviders>{children}</AppProviders></body></html>;
}
