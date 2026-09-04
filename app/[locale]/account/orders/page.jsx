import { OrderList } from '@/components/account/order-list';
export const metadata = { title: 'My orders', robots: { index: false } };
export default async function AccountOrders({ params }) { const { locale } = await params; return <OrderList locale={locale} />; }
