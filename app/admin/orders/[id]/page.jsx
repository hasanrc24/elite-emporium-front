import { OrderDetail } from '@/components/admin/orders/order-detail';

export const metadata = { title: 'Order' };

export default async function AdminOrderPage({ params }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
