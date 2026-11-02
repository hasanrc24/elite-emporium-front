import { OrderConfirmation } from '@/components/storefront/order-confirmation';

export const metadata = { title: 'Confirm order', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function ConfirmOrderPage({ params }) {
  const { locale, token } = await params;
  return <div className="container"><OrderConfirmation locale={locale} token={decodeURIComponent(token)} /></div>;
}
