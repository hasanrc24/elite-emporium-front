import { getTranslations } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/auth/recovery-forms';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Auth' }); return { title: t('meta.forgot'), robots: { index: false } }; }
export default async function ForgotPasswordPage({ params }) { const { locale } = await params; return <div className="container py-16"><ForgotPasswordForm locale={locale} /></div>; }
