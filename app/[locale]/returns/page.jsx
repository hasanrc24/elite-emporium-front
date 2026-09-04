import { Suspense } from 'react';
import { GuestReturnManager } from '@/components/storefront/guest-return-manager';

export const metadata = { title: 'Returns and exchanges', robots: { index: false } };
export default function GuestReturnsPage({ params }) {
  return <div className="container py-14"><Suspense><GuestReturnManager params={params} /></Suspense></div>;
}
