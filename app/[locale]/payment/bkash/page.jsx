import { Suspense } from 'react';
import { BkashRecovery } from '@/components/storefront/bkash-recovery';
export const metadata = { title: 'bKash payment', robots: { index: false } };
export default async function BkashPage({ params }) { const { locale } = await params; return <div className="container py-16"><Suspense><BkashRecovery locale={locale} /></Suspense></div>; }
