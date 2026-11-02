import { getTranslations } from 'next-intl/server';
import { WishlistView } from '@/components/storefront/wishlist-view';

export const metadata = { title: 'Wishlist', robots: { index: false } };

export default async function WishlistPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Wishlist' });
  return <div className="container py-6 md:py-10"><h1 className="page-heading mb-6">{t('title')}</h1><WishlistView locale={locale} /></div>;
}
