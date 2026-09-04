import { CheckoutForm } from '@/components/storefront/checkout-form';
export const metadata = { title: 'Checkout', robots: { index: false } };
export default async function CheckoutPage({ params }) { const { locale } = await params; return <div className="container py-12"><h1 className="mb-8 text-4xl font-black">Checkout</h1><CheckoutForm locale={locale} /></div>; }
