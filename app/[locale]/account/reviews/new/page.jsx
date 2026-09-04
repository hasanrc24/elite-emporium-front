import { Suspense } from 'react';
import { ReviewForm } from '@/components/account/review-manager';
export const metadata = { title: 'Write a review', robots: { index: false } };
export default async function ReviewPage({ params }) { const { locale } = await params; return <Suspense><ReviewForm locale={locale} /></Suspense>; }
