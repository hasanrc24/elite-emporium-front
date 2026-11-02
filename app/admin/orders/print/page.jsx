import { Suspense } from 'react';
import { OrderDocuments } from '@/components/admin/orders/order-documents';
import { serverGet } from '@/lib/api/server-api';

export const metadata = { title: 'Print documents' };

export default async function OrderPrintPage() {
  const settings = await serverGet('/storefront/settings', { tags: ['settings'], revalidate: 60 }).catch(() => ({}));
  return <Suspense><OrderDocuments store={settings.store} /></Suspense>;
}
