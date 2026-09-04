import { Suspense } from 'react';
import { NewReturn } from '@/components/account/return-manager';
export const metadata = { title: 'Request a return', robots: { index: false } };
export default async function NewReturnPage({ params }) { const { locale } = await params; return <Suspense><NewReturn locale={locale} /></Suspense>; }
