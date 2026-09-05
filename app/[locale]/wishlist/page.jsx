import { WishlistView } from '@/components/storefront/wishlist-view';

export const metadata = { title: 'Wishlist', robots: { index: false } };

export default async function WishlistPage({ params }) {
  const { locale } = await params;
  return <div className="container py-8 md:py-11"><div className="mb-7"><p className="eyebrow">Saved for later</p><h1 className="storefront-page-title mt-2">My wishlist</h1></div><WishlistView locale={locale} /></div>;
}
