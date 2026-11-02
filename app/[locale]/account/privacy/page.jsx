import { getTranslations } from 'next-intl/server';
import { PrivacyManager } from '@/components/account/privacy-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.privacy'), robots: { index: false } }; }
export default async function PrivacyPage({ params }) { const { locale } = await params; return <PrivacyManager locale={locale} />; }
