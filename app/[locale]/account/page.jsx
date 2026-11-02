import { getTranslations } from 'next-intl/server';
import { AccountDashboard } from '@/components/account/account-dashboard';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.overview'), robots: { index: false } }; }
export default async function AccountPage({ params }) { const { locale } = await params; return <AccountDashboard locale={locale} />; }
