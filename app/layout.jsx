import { headers } from 'next/headers';
import localFont from 'next/font/local';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

const geist = localFont({
  src: '../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2',
  variable: '--font-geist',
  display: 'swap',
});

export const metadata = {
  title: { default: 'Elite Emporium', template: '%s | Elite Emporium' },
  description: 'Thoughtfully selected women’s fashion for comfort, confidence, and everyday life.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: { title: 'Elite Emporium', description: 'Thoughtfully selected women’s fashion for everyday life.', type: 'website' },
};

export default async function RootLayout({ children }) {
  const locale = (await headers()).get('x-ee-locale') || 'en';
  return <html lang={locale} className={geist.variable}><body><a href="#main" className="skip-link">Skip to content</a><AppProviders>{children}</AppProviders></body></html>;
}
