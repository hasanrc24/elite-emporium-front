import { notFound } from 'next/navigation';
import { ManualWalletPay } from '@/components/storefront/manual-wallet-pay';

export const metadata = { title: 'Pay for your order', robots: { index: false } };

export default async function PayPage({ params }) {
  const { locale, reference } = await params;
  if (!/^[A-Z0-9_-]{4,40}$/i.test(reference)) notFound();
  return <div className="container"><ManualWalletPay locale={locale} reference={reference} /></div>;
}
