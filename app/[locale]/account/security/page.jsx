import { getTranslations } from 'next-intl/server';
import { SecurityManager } from '@/components/account/security-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.security'), robots: { index: false } }; }
export default async function SecurityPage({ params }) { const { locale } = await params; return <SecurityManager locale={locale} />; }
