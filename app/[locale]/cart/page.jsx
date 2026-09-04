import { CartView } from '@/components/storefront/cart-view';
export const metadata = { title: 'Cart', robots: { index: false } };
export default async function CartPage({ params }) { const { locale } = await params; return <div className="container py-10 md:py-14"><p className="eyebrow">Your selection</p><h1 className="section-title mb-8 mt-2">Shopping bag</h1><CartView locale={locale} /></div>; }
