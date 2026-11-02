import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { NewReturn } from '@/components/account/return-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.newReturn'), robots: { index: false } }; }
export default async function NewReturnPage({ params }) { const { locale } = await params; return <Suspense><NewReturn locale={locale} /></Suspense>; }
