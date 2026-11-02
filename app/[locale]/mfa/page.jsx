import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MfaChallengeForm } from '@/components/auth/recovery-forms';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Auth' }); return { title: t('meta.mfa'), robots: { index: false } }; }
export default async function MfaPage({ params }) { const { locale } = await params; return <div className="container py-16"><Suspense><MfaChallengeForm locale={locale} /></Suspense></div>; }
