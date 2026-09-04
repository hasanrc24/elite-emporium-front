import { WishlistView } from '@/components/storefront/wishlist-view';

export const metadata = { title: 'Wishlist', robots: { index: false } };

export default async function WishlistPage({ params }) {
  const { locale } = await params;
  return <div className="container py-12"><div className="mb-8"><p className="font-bold uppercase tracking-widest text-[var(--color-primary)]">Saved for later</p><h1 className="mt-2 text-4xl font-black">Wishlist</h1></div><WishlistView locale={locale} /></div>;
}
