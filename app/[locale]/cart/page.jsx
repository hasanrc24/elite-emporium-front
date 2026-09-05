import { CartView } from '@/components/storefront/cart-view';
export const metadata = { title: 'Cart', robots: { index: false } };
export default async function CartPage({ params }) { const { locale } = await params; return <div className="container py-8 md:py-11"><div className="mb-7 flex items-end justify-between"><div><p className="eyebrow">Your selection</p><h1 className="storefront-page-title mt-2">Your cart</h1></div></div><CartView locale={locale} /></div>; }
