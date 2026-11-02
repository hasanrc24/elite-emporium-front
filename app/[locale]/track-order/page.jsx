import { Suspense } from 'react';
import { TrackForm } from '@/components/storefront/track-form';

export const metadata = { title: 'Track order', robots: { index: false } };

export default async function TrackOrderPage({ params }) {
  const { locale } = await params;
  return <div className="container"><Suspense><TrackForm locale={locale} /></Suspense></div>;
}
