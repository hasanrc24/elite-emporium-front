import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Auth' }); return { title: t('meta.login'), robots: { index: false } }; }
export default async function LoginPage({ params }) { const { locale } = await params; return <div className="container py-10 md:py-16"><Suspense><AuthForm mode="login" locale={locale} /></Suspense></div>; }
