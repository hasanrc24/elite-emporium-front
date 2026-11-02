import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ReviewForm } from '@/components/account/review-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.newReview'), robots: { index: false } }; }
export default async function ReviewPage({ params }) { const { locale } = await params; return <Suspense><ReviewForm locale={locale} /></Suspense>; }
