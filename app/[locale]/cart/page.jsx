import { getTranslations } from 'next-intl/server';
import { CartView } from '@/components/storefront/cart-view';

export const metadata = { title: 'Bag', robots: { index: false } };

export default async function CartPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Cart' });
  return <div className="container py-6 pb-28 md:py-10 md:pb-16"><h1 className="page-heading mb-6">{t('title')}</h1><CartView locale={locale} /></div>;
}
