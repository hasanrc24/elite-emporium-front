import { notFound } from 'next/navigation';
import { OrderSuccess } from '@/components/storefront/order-success';

export const metadata = { title: 'Order placed', robots: { index: false } };

export default async function SuccessPage({ params }) {
  const { locale, reference } = await params;
  if (!/^[A-Z0-9_-]{4,40}$/i.test(reference)) notFound();
  return <div className="container"><OrderSuccess locale={locale} reference={reference} /></div>;
}
