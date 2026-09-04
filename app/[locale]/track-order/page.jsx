import { Suspense } from 'react';
import { TrackForm } from '@/components/storefront/track-form';
export const metadata = { title: 'Track order', robots: { index: false } };
export default function TrackOrderPage() { return <div className="container py-16"><Suspense><TrackForm /></Suspense></div>; }
