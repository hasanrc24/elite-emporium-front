import { OrderDetail } from '@/components/account/order-detail';
export const metadata = { title: 'Order details', robots: { index: false } };
export default async function OrderDetailPage({ params }) { const { locale, id } = await params; return <OrderDetail id={id} locale={locale} />; }
